
import React, { useState, useEffect, useRef, useCallback } from 'react';
import YouTube from 'react-youtube';
import { formatTime } from '../utils/formatTime';
import {
    Play, Pause, Volume2, Volume1, VolumeX, Maximize, Minimize, Settings, Check, RefreshCw, AlertTriangle, ExternalLink
} from 'lucide-react';

interface CustomYouTubePlayerProps {
    videoId: string;
    onPlayerReady: (player: any) => void;
    onProgress: () => void;
}

const formatQualityLabel = (quality: string): string => {
    const qualityMap: { [key: string]: string } = {
        'hd2160': '2160p 4K',
        'hd1440': '1440p HD',
        'hd1080': '1080p HD',
        'hd720': '720p HD',
        'large': '480p',
        'medium': '360p',
        'small': '240p',
        'tiny': '144p',
        'auto': 'Auto'
    };
    return qualityMap[quality] || quality;
};

const CustomYouTubePlayer: React.FC<CustomYouTubePlayerProps> = ({ videoId, onPlayerReady, onProgress }) => {
    const playerRef = useRef<any>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<number | null>(null);
    const seekbarRef = useRef<HTMLDivElement>(null);

    // Player State
    const [isPlaying, setIsPlaying] = useState(false);
    const [videoEnded, setVideoEnded] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [quality, setQuality] = useState('auto');
    const [availableQualities, setAvailableQualities] = useState<string[]>([]);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [activeSettingsTab, setActiveSettingsTab] = useState<'main' | 'speed' | 'quality'>('main');
    const [playerError, setPlayerError] = useState<string | null>(null);
    const [isSeeking, setIsSeeking] = useState(false);

    const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

    const opts = {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 1,
            controls: 0,
            rel: 0,
            showinfo: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            playsinline: 1,
        } as const,
    };

    useEffect(() => {
        setPlayerError(null);
        setVideoEnded(false);
        setIsPlaying(false);
        setProgress(0);
    }, [videoId]);

    const handlePlayerReady = (event: any) => {
        playerRef.current = event.target;
        onPlayerReady(event.target);
        setAvailableQualities(playerRef.current.getAvailableQualityLevels() || []);
        const iframe = playerRef.current?.getIframe();
        if (iframe) {
            iframe.setAttribute('allow', 'fullscreen; autoplay');
        }
    };

    const handlePlayerStateChange = (event: any) => {
        const state = event.data;
        setIsPlaying(state === YouTube.PlayerState.PLAYING);
        if (state === YouTube.PlayerState.PLAYING) {
            setDuration(playerRef.current.getDuration());
            setAvailableQualities(playerRef.current.getAvailableQualityLevels() || []);
            setVideoEnded(false);
        } else if (state === YouTube.PlayerState.ENDED) {
            setVideoEnded(true);
        }
    };

    const handlePlayerError = (event: any) => {
        console.error("YouTube Player Error:", event.data);
        setPlayerError("This video is unavailable or cannot be played here due to its privacy settings.");
    };
    
    useEffect(() => {
        const progressInterval = setInterval(() => {
            if (playerRef.current && isPlaying && !isSeeking) {
                const currentTime = playerRef.current.getCurrentTime() || 0;
                const currentDuration = playerRef.current.getDuration() || 0;
                setProgress(currentTime);
                setDuration(currentDuration);
                setBuffered(playerRef.current.getVideoLoadedFraction() * currentDuration);
            }
        }, 500);

        const saveInterval = setInterval(() => {
            if (isPlaying) {
                onProgress();
            }
        }, 5000);

        return () => {
            clearInterval(progressInterval);
            clearInterval(saveInterval);
        };
    }, [onProgress, isPlaying, isSeeking]);

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = (window as any).setTimeout(() => {
            if(isPlaying) {
                setShowControls(false);
                setShowSettingsMenu(false);
            }
        }, 3000);
    };

    const handleMouseLeave = () => {
        if(isPlaying) {
            setShowControls(false);
            setShowSettingsMenu(false);
        }
    };

    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();
    
    const togglePlay = () => {
        if (playerError) return;
        if (videoEnded) {
            handleReplay();
            return;
        }
        if (isPlaying) playerRef.current?.pauseVideo();
        else playerRef.current?.playVideo();
    };

    const handleReplay = () => {
        playerRef.current?.seekTo(0, true);
        playerRef.current?.playVideo();
    };

    const handleSeek = useCallback((e: MouseEvent | React.MouseEvent<HTMLDivElement>) => {
        if (!seekbarRef.current || duration === 0) return;
        e.preventDefault();
        const seekbar = seekbarRef.current;
        const rect = (seekbar as any).getBoundingClientRect();
        const clientX = 'clientX' in e ? e.clientX : 0;
        const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const newTime = (offsetX / rect.width) * duration;
        playerRef.current?.seekTo(newTime, true);
        setProgress(newTime);
    }, [duration]);

    const handleMouseDownOnSeekbar = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        setIsSeeking(true);
        handleSeek(e);
    };

    useEffect(() => {
        const handleMouseMoveOnWindow = (e: MouseEvent) => {
            if (isSeeking) {
                handleSeek(e);
            }
        };
        const handleMouseUpOnWindow = () => {
            if (isSeeking) {
                setIsSeeking(false);
            }
        };

        if (isSeeking) {
            (window as any).addEventListener('mousemove', handleMouseMoveOnWindow);
            (window as any).addEventListener('mouseup', handleMouseUpOnWindow);
        }

        return () => {
            (window as any).removeEventListener('mousemove', handleMouseMoveOnWindow);
            (window as any).removeEventListener('mouseup', handleMouseUpOnWindow);
        };
    }, [isSeeking, handleSeek]);
    
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat((e.target as any).value);
        setVolume(newVolume);
        playerRef.current?.setVolume(newVolume * 100);
        if (newVolume > 0 && isMuted) {
            setIsMuted(false);
            playerRef.current?.unMute();
        } else if (newVolume === 0 && !isMuted) {
             setIsMuted(true);
        }
    };

    const toggleMute = () => {
        if (isMuted) {
            playerRef.current?.unMute();
            if (volume === 0) {
                 setVolume(0.5);
                 playerRef.current?.setVolume(50);
            }
        } else {
            playerRef.current?.mute();
        }
        setIsMuted(!isMuted);
    };

    const toggleFullscreen = async () => {
        const isMobile = (window as any).innerWidth < 768;

        if (!(window as any).document.fullscreenElement) {
            try {
                if (playerContainerRef.current) {
                    await (playerContainerRef.current as any).requestFullscreen();
                }
                if (isMobile && (window as any).screen.orientation && (window as any).screen.orientation.lock) {
                    await (window as any).screen.orientation.lock('landscape');
                }
            } catch (error) {
                console.error("Error entering fullscreen:", error);
            }
        } else {
            try {
                await (window as any).document.exitFullscreen();
                if (isMobile && (window as any).screen.orientation && (window as any).screen.orientation.unlock) {
                    (window as any).screen.orientation.unlock();
                }
            } catch (error) {
                console.error("Error exiting fullscreen:", error);
            }
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if((window as any).document.activeElement && ['INPUT', 'TEXTAREA'].includes((window as any).document.activeElement.tagName)) return;
            switch((e as any).code) {
                case 'Space': e.preventDefault(); togglePlay(); break;
                case 'ArrowRight': playerRef.current?.seekTo(playerRef.current.getCurrentTime() + 5, true); break;
                case 'ArrowLeft': playerRef.current?.seekTo(playerRef.current.getCurrentTime() - 5, true); break;
                case 'ArrowUp': 
                    e.preventDefault();
                    setVolume(v => {
                        const newVol = Math.min(1, v + 0.1);
                        playerRef.current?.setVolume(newVol * 100);
                        return newVol;
                    });
                    break;
                case 'ArrowDown':
                     e.preventDefault();
                     setVolume(v => {
                        const newVol = Math.max(0, v - 0.1);
                        playerRef.current?.setVolume(newVol * 100);
                        return newVol;
                    });
                    break;
                case 'KeyF': toggleFullscreen(); break;
                case 'KeyM': toggleMute(); break;
            }
        };
        const onFullscreenChange = () => setIsFullscreen(!!(window as any).document.fullscreenElement);
        
        (window as any).addEventListener('keydown', handleKeyDown);
        (window as any).document.addEventListener('fullscreenchange', onFullscreenChange);
        
        return () => {
            (window as any).removeEventListener('keydown', handleKeyDown);
            (window as any).document.removeEventListener('fullscreenchange', onFullscreenChange);
        };
    }, [isPlaying, isMuted, volume, videoEnded, playerError]);
    
    const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume > 0.5 ? Volume2 : Volume1;
    const showHours = duration >= 3600;
    const availableQualitiesWithAuto = ['auto', ...availableQualities.filter(q => q !== 'auto')];
    
    return (
        <div 
            ref={playerContainerRef}
            className="relative w-full h-full bg-black overflow-hidden cursor-pointer"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={togglePlay}
        >
            <YouTube videoId={videoId} opts={opts} onReady={handlePlayerReady} onStateChange={handlePlayerStateChange} onError={handlePlayerError} className="w-full h-full" />
            
             {playerError && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 text-white text-center p-4" onClick={stopPropagation}>
                    <AlertTriangle size={48} className="text-rose-400 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Video Unavailable</h3>
                    <p className="text-sm text-slate-300 mb-6 max-w-sm">{playerError}</p>
                    <a 
                        href={`https://www.youtube.com/watch?v=${videoId}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-rose-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-rose-600 transition-colors"
                    >
                       <ExternalLink size={18} /> Watch on YouTube
                    </a>
                </div>
            )}
            
             {videoEnded && !playerError && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20" onClick={stopPropagation}>
                    <button onClick={handleReplay} className="flex flex-col items-center gap-2 text-white font-bold py-4 px-6 rounded-lg transition-transform hover:scale-110">
                        <RefreshCw size={48} />
                        <span>Replay</span>
                    </button>
                </div>
            )}
            
            <div 
                className={`absolute inset-0 transition-opacity duration-300 z-10 ${showControls || !isPlaying || isSeeking ? 'opacity-100' : 'opacity-0'} ${(videoEnded || playerError) ? 'hidden' : ''}`}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none"></div>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <button onClick={(e) => { stopPropagation(e); togglePlay(); }} className="p-3 bg-black/40 rounded-full text-white hover:bg-black/60 transition-all pointer-events-auto transform hover:scale-110">
                        {isPlaying ? <Pause size={40} /> : <Play size={40} />}
                    </button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 text-white cursor-default" onClick={stopPropagation}>
                    <div ref={seekbarRef} className="w-full group" onMouseDown={handleMouseDownOnSeekbar}>
                        <div className="relative w-full h-1 bg-white/30 rounded-full group-hover:h-1.5 transition-all cursor-pointer">
                            <div className="absolute h-full bg-white/50 rounded-full" style={{ width: `${(buffered / duration) * 100}%` }}></div>
                            <div className="absolute h-full bg-blue-500 rounded-full" style={{ width: `${(progress / duration) * 100}%` }}></div>
                            <div className="absolute h-3 w-3 -mt-1 bg-blue-500 rounded-full" style={{ left: `calc(${(progress / duration) * 100}% - 6px)` }}></div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 text-xs sm:text-sm">
                        <div className="flex items-center gap-2 sm:gap-4">
                            <button onClick={(e) => { stopPropagation(e); togglePlay(); }}>{isPlaying ? <Pause /> : <Play />}</button>
                            <div className="flex items-center gap-2 group">
                                <button onClick={(e) => { stopPropagation(e); toggleMute(); }}><VolumeIcon /></button>
                                <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} 
                                    onChange={handleVolumeChange} 
                                    className="w-0 group-hover:w-16 sm:group-hover:w-20 transition-all duration-300 h-1 accent-blue-500 cursor-pointer"
                                />
                            </div>
                            <span>{formatTime(progress, showHours)} / {formatTime(duration, showHours)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 sm:gap-4">
                            <div className="relative">
                                <button onClick={() => { setShowSettingsMenu(s => !s); setActiveSettingsTab('main'); }}><Settings /></button>
                                {showSettingsMenu && (
                                <div className="absolute bottom-full right-0 mb-2 bg-black/80 backdrop-blur-sm rounded-lg p-1.5 min-w-[160px]">
                                    {activeSettingsTab === 'main' && ( <>
                                        <button onClick={() => setActiveSettingsTab('speed')} className="w-full text-left px-3 py-1.5 hover:bg-white/20 rounded">Speed</button>
                                        <button onClick={() => setActiveSettingsTab('quality')} className="w-full text-left px-3 py-1.5 hover:bg-white/20 rounded">Quality</button>
                                    </> )}
                                    {activeSettingsTab === 'speed' && ( <>
                                        <button onClick={() => setActiveSettingsTab('main')} className="w-full text-left px-3 py-1.5 hover:bg-white/20 rounded font-bold mb-1">Speed</button>
                                        {playbackRates.map(rate => (
                                            <button key={rate} onClick={() => { playerRef.current?.setPlaybackRate(rate); setPlaybackRate(rate); setShowSettingsMenu(false); }}
                                                className="w-full text-left px-3 py-1.5 hover:bg-white/20 rounded flex justify-between items-center">
                                                <span>{rate === 1 ? 'Normal' : `${rate}x`}</span>
                                                {playbackRate === rate && <Check size={16} />}
                                            </button>
                                        ))}
                                    </> )}
                                     {activeSettingsTab === 'quality' && ( <>
                                        <button onClick={() => setActiveSettingsTab('main')} className="w-full text-left px-3 py-1.5 hover:bg-white/20 rounded font-bold mb-1">Quality</button>
                                        {availableQualitiesWithAuto.map(q => (
                                            <button key={q} onClick={() => { playerRef.current?.setPlaybackQuality(q); setQuality(q); setShowSettingsMenu(false); }}
                                                className="w-full text-left px-3 py-1.5 hover:bg-white/20 rounded flex justify-between items-center">
                                                <span>{formatQualityLabel(q)}</span>
                                                 {quality === q && <Check size={16} />}
                                            </button>
                                        ))}
                                    </> )}
                                </div>
                                )}
                            </div>
                            <button onClick={(e) => { stopPropagation(e); toggleFullscreen(); }}>{isFullscreen ? <Minimize /> : <Maximize />}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomYouTubePlayer;
