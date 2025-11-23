




import React, { useRef, useEffect, useState, useCallback } from 'react';
import { getTelegramFileUrl } from '../utils/telegram';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, ArrowLeft, SkipBack, SkipForward, Radio, Loader2 } from 'lucide-react';
import { formatTime } from '../utils/formatTime';
import { useNavigate } from 'react-router-dom';

interface CustomVideoPlayerProps {
    videoUrl: string;
    thumbnail?: string | null;
    onPlayerReady?: (player: any) => void;
    onProgress?: () => void;
}

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ videoUrl, thumbnail, onPlayerReady, onProgress }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    
    // Double Buffering Players
    const playerARef = useRef<HTMLVideoElement>(null);
    const playerBRef = useRef<HTMLVideoElement>(null);
    
    // Logic State
    const [playlist, setPlaylist] = useState<string[]>([]);
    const playlistRef = useRef<string[]>([]);
    
    const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A');
    const [currentIndex, setCurrentIndex] = useState(0);
    const currentIndexRef = useRef(0);

    // NOTE: segmentDuration is the "Step" duration. 
    // The actual file is segmentDuration + OVERLAP.
    const [segmentDuration, setSegmentDuration] = useState(5); 
    const OVERLAP_DURATION = 2; 

    const [isLive, setIsLive] = useState(false);
    const [waitingForLive, setWaitingForLive] = useState(false);
    
    // UI State
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [needsUnmute, setNeedsUnmute] = useState(false); 
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [loading, setLoading] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverPos, setHoverPos] = useState<number | null>(null);

    // Timeline State
    const [currentTime, setCurrentTime] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [resolvedThumbnail, setResolvedThumbnail] = useState<string | undefined>(undefined);
    
    const urlCache = useRef<Map<string, string>>(new Map());
    const isMountedRef = useRef(true);
    const controlsTimeoutRef = useRef<any>(null);
    const animationFrameRef = useRef<number | null>(null);
    const switchingRef = useRef(false); 

    // Calculate Total Duration (Approximate for live)
    const totalDuration = Math.max(playlist.length * segmentDuration, 1);

    // 1. Thumbnail Resolution
    useEffect(() => {
        const resolveThumbnail = async () => {
            if (!thumbnail) {
                setResolvedThumbnail(undefined);
                return;
            }
            try {
                if (thumbnail.startsWith('telegram:')) {
                    const fileId = thumbnail.replace('telegram:', '');
                    const url = await getTelegramFileUrl(fileId);
                    if (isMountedRef.current && url) setResolvedThumbnail(url);
                } else {
                    setResolvedThumbnail(thumbnail);
                }
            } catch (e) {
                console.error("Error resolving thumbnail", e);
            }
        };
        resolveThumbnail();
    }, [thumbnail]);

    // 2. Initialize / Update Playlist
    useEffect(() => {
        isMountedRef.current = true;
        const updatePlaylist = async () => {
            let currentSegmentDuration = 5.5; // Default for live chunks
            let ids: string[] = [];
            let isLiveStream = false;

            if (!videoUrl) {
                if (isMountedRef.current) {
                    setWaitingForLive(true);
                    setLoading(false);
                }
                return;
            }

            // Parse Protocol
            if (videoUrl.startsWith('telegram-live:')) {
                isLiveStream = true;
                const payload = videoUrl.replace('telegram-live:', '');
                if (payload.includes('|')) {
                    const [durationStr, idsStr] = payload.split('|');
                    currentSegmentDuration = parseFloat(durationStr) || 5.5;
                    ids = idsStr ? idsStr.split(',') : [];
                } else {
                    ids = payload ? payload.split(',') : [];
                }
            } else if (videoUrl.startsWith('telegram-playlist:')) {
                isLiveStream = false; 
                const payload = videoUrl.replace('telegram-playlist:', '');
                if (payload.includes('|')) {
                    const [durationStr, idsStr] = payload.split('|');
                    currentSegmentDuration = parseFloat(durationStr) || 5.5;
                    ids = idsStr.split(',');
                } else {
                    ids = payload.split(',');
                }
            } else {
                // Fallback
                isLiveStream = false;
                ids = [videoUrl]; 
                currentSegmentDuration = 10000; // Treat as one giant segment
            }

            ids = ids.filter(id => id.trim() !== '');

            if (isMountedRef.current) {
                setSegmentDuration(currentSegmentDuration);
                setIsLive(isLiveStream);
            }

            if (ids.length === 0) {
                if (isLiveStream) {
                    setWaitingForLive(true);
                    setLoading(false);
                }
                return;
            }

            const currentPlaylist = playlistRef.current;
            const isAppending = isLiveStream && currentPlaylist.length > 0 && ids.length > currentPlaylist.length && ids[0] === currentPlaylist[0];

            if (isAppending) {
                const newIds = ids.slice(currentPlaylist.length);
                if (newIds.length > 0) {
                    const updatedList = [...currentPlaylist, ...newIds];
                    setPlaylist(updatedList);
                    playlistRef.current = updatedList;
                    setWaitingForLive(false);
                }
            } else {
                // Full Reset
                if (currentPlaylist.length === 0 || ids[0] !== currentPlaylist[0] || (!isLiveStream && ids.length !== currentPlaylist.length)) {
                    urlCache.current.forEach((url) => URL.revokeObjectURL(url));
                    urlCache.current.clear();

                    setPlaylist(ids);
                    playlistRef.current = ids;
                    setLoading(true);
                    setIsPlaying(false);
                    setCurrentIndex(0);
                    currentIndexRef.current = 0;
                    setActivePlayer('A');
                    switchingRef.current = false;
                    setWaitingForLive(false);

                    const urlA = await getOrFetchUrl(ids[0]);
                    if (isMountedRef.current && urlA && playerARef.current) {
                        playerARef.current.src = urlA;
                        playerARef.current.load();
                        
                        if (isLiveStream) {
                            playerARef.current.play().then(() => {
                                setIsPlaying(true);
                            }).catch(() => {
                                playerARef.current!.muted = true;
                                playerARef.current!.play().then(() => {
                                    setIsPlaying(true);
                                    setNeedsUnmute(true);
                                }).catch(() => {});
                            });
                        }
                    }
                    
                    if (ids.length > 1) {
                        const urlB = await getOrFetchUrl(ids[1]);
                        if (isMountedRef.current && urlB && playerBRef.current) {
                            playerBRef.current.src = urlB;
                            playerBRef.current.load();
                        }
                    }
                    if (isMountedRef.current) setLoading(false);
                }
            }
        };
        updatePlaylist();
        return () => {
            isMountedRef.current = false;
            urlCache.current.forEach((url) => URL.revokeObjectURL(url));
        }
    }, [videoUrl]);

    const getOrFetchUrl = async (rawId: string): Promise<string | null> => {
        if (!rawId) return null;
        if (urlCache.current.has(rawId)) return urlCache.current.get(rawId)!;
        if (rawId.startsWith('http') || rawId.startsWith('blob:')) return rawId;

        const fileId = rawId.replace('telegram:', '');
        try {
            const directUrl = await getTelegramFileUrl(fileId);
            if (!directUrl) return null;
            const proxyUrl = `/api/proxy?url=${encodeURIComponent(directUrl)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            if (isMountedRef.current) {
                urlCache.current.set(rawId, objectUrl);
            }
            return objectUrl;
        } catch (error) {
            console.error("Segment load error:", error);
            return null;
        }
    };

    useEffect(() => {
        // PRELOAD NEXT LOGIC (with delay to allow tail playback)
        const timeout = setTimeout(() => {
            const prepareNextPlayer = async () => {
                const nextIndex = currentIndex + 1;
                if (nextIndex >= playlist.length) return;
                const nextPlayerRef = activePlayer === 'A' ? playerBRef.current : playerARef.current;
                const nextUrl = await getOrFetchUrl(playlist[nextIndex]);
                
                if (nextPlayerRef && nextUrl && nextPlayerRef.src !== nextUrl) {
                    // Check if src already matches object URL to prevent reload
                    if (!nextPlayerRef.src.endsWith(nextUrl.split('/').pop() || '')) {
                        nextPlayerRef.src = nextUrl;
                        nextPlayerRef.load();
                        nextPlayerRef.currentTime = 0;
                    }
                }
            };
            prepareNextPlayer();
        }, currentIndex === 0 ? 0 : 2500); // Delay 2.5s if mid-stream to let previous tail finish

        // Preload upcoming URLS into cache
        const preloadUpcoming = async () => {
            for (let i = 1; i <= 3; i++) {
                const nextIndex = currentIndex + i;
                if (nextIndex < playlist.length) await getOrFetchUrl(playlist[nextIndex]);
            }
        };
        preloadUpcoming();

        return () => clearTimeout(timeout);
    }, [currentIndex, playlist, activePlayer]);

    // MAIN GAME LOOP
    useEffect(() => {
        const loop = () => {
            if (!isPlaying || isDragging || waitingForLive) {
                animationFrameRef.current = requestAnimationFrame(loop);
                return;
            }

            const activeRef = activePlayer === 'A' ? playerARef.current : playerBRef.current;
            // nextRef is the "Pre-roll" player (will become active) OR the "Fade-out" player (was active)
            // Actually, let's name them explicitly
            const otherRef = activePlayer === 'A' ? playerBRef.current : playerARef.current;
            
            const desiredVolume = (isMuted || needsUnmute) ? 0 : volume;
            const currentList = playlistRef.current;

            if (activeRef) {
                const calculatedTime = (currentIndex * segmentDuration) + activeRef.currentTime;
                setCurrentTime(calculatedTime);
                if (activeRef.buffered.length > 0) setBuffered(activeRef.buffered.end(activeRef.buffered.length - 1));

                const playhead = activeRef.currentTime;
                
                // 1. Playback Switch Logic (Gapless)
                if (currentIndex < currentList.length - 1 && otherRef) {
                    
                    // Pre-roll Next
                    // If we are approaching the switch point, make sure next player is ready
                    const timeToSwitch = segmentDuration - playhead;
                    
                    if (timeToSwitch < 2 && otherRef.paused && otherRef.readyState >= 2) {
                        otherRef.volume = 0; // Start muted
                        otherRef.play().catch(() => {});
                    }

                    // Trigger Switch at exact Segment boundary
                    if (playhead >= segmentDuration && !switchingRef.current) {
                        switchingRef.current = true;
                        
                        // SWAP PLAYERS VISUALLY
                        setActivePlayer(prev => prev === 'A' ? 'B' : 'A');
                        
                        const nextIdx = currentIndex + 1;
                        setCurrentIndex(nextIdx);
                        currentIndexRef.current = nextIdx;
                        
                        switchingRef.current = false;
                        
                        // Note: At this exact moment, the New Active Player (was otherRef) 
                        // should be at t=0 roughly (or closely synced)
                        // The Old Active Player (now otherRef) continues playing into overlap area
                    }
                }
                
                // 2. Audio Crossfade Logic
                // If we just switched, we have an 'otherRef' (old player) that is in overlap zone (> segmentDuration)
                // And 'activeRef' (new player) is in start zone (< overlap)
                
                // Case A: Overlap Crossfade
                if (otherRef && !otherRef.paused && otherRef.currentTime > segmentDuration) {
                     // We are in the overlap tail of the OLD player
                     // otherRef is OLD. activeRef is NEW.
                     
                     const timeIntoOverlap = otherRef.currentTime - segmentDuration;
                     const overlapProgress = timeIntoOverlap / OVERLAP_DURATION;
                     const clampedProgress = Math.max(0, Math.min(1, overlapProgress));
                     
                     // New player fades IN (0 -> 1)
                     activeRef.volume = desiredVolume * clampedProgress;
                     
                     // Old player fades OUT (1 -> 0)
                     otherRef.volume = desiredVolume * (1 - clampedProgress);
                     
                     // Stop old player when overlap done
                     if (timeIntoOverlap >= OVERLAP_DURATION) {
                         otherRef.pause();
                         otherRef.currentTime = 0;
                     }
                } 
                // Case B: Normal Playback
                else {
                    if (Math.abs(activeRef.volume - desiredVolume) > 0.05) activeRef.volume = desiredVolume;
                }

                // End of Playlist Logic
                if (currentIndex === currentList.length - 1) {
                    if (activeRef.ended) {
                         if (isLive) {
                             if (!waitingForLive) setWaitingForLive(true);
                         } else {
                             setIsPlaying(false);
                         }
                    }
                }
            }
            animationFrameRef.current = requestAnimationFrame(loop);
        };
        animationFrameRef.current = requestAnimationFrame(loop);
        return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
    }, [isPlaying, isDragging, activePlayer, currentIndex, segmentDuration, volume, isMuted, isLive, waitingForLive, needsUnmute]);

    const seekTo = async (time: number) => {
        const clampedTime = Math.max(0, Math.min(time, totalDuration - 0.1));
        const targetIndex = Math.floor(clampedTime / segmentDuration);
        const localSeekTime = clampedTime % segmentDuration;
        const playerRef = activePlayer === 'A' ? playerARef.current : playerBRef.current;
        const otherRef = activePlayer === 'A' ? playerBRef.current : playerARef.current;

        setCurrentTime(clampedTime);

        if (targetIndex !== currentIndex) {
            setLoading(true); setIsPlaying(false);
            const url = await getOrFetchUrl(playlist[targetIndex]);
            if (url && playerRef) {
                playerRef.src = url;
                await new Promise(r => { const h = () => { playerRef.removeEventListener('loadeddata', h); r(true); }; playerRef.addEventListener('loadeddata', h); playerRef.load(); }); 
                playerRef.currentTime = localSeekTime;
                setCurrentIndex(targetIndex);
                currentIndexRef.current = targetIndex;
                
                // Preload next
                if (otherRef && targetIndex + 1 < playlist.length) {
                    const nUrl = await getOrFetchUrl(playlist[targetIndex + 1]);
                    if (nUrl) { otherRef.src = nUrl; otherRef.load(); }
                }
                setLoading(false); setIsPlaying(true); setWaitingForLive(false);
                playerRef.play().catch(console.error);
            }
        } else {
            if (playerRef) playerRef.currentTime = localSeekTime;
        }
    };

    const handleSeekStart = (e: React.MouseEvent | React.TouchEvent) => { setIsDragging(true); handleSeekMove(e); };
    const handleSeekMove = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
        if (!progressBarRef.current) return;
        const rect = progressBarRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        let pos = (clientX - rect.left) / rect.width;
        pos = Math.max(0, Math.min(1, pos));
        const time = pos * totalDuration;
        if (isDragging) setCurrentTime(time); else { setHoverPos(pos * 100); setHoverTime(time); }
    }, [isDragging, totalDuration]);
    
    const handleSeekEnd = (e: MouseEvent | TouchEvent) => {
        if (isDragging && progressBarRef.current) {
            const rect = progressBarRef.current.getBoundingClientRect();
            const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
            let pos = (clientX - rect.left) / rect.width; pos = Math.max(0, Math.min(1, pos));
            seekTo(pos * totalDuration);
        }
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleSeekMove); window.addEventListener('touchmove', handleSeekMove);
            window.addEventListener('mouseup', handleSeekEnd); window.addEventListener('touchend', handleSeekEnd);
        } else {
            window.removeEventListener('mousemove', handleSeekMove); window.removeEventListener('touchmove', handleSeekMove);
            window.removeEventListener('mouseup', handleSeekEnd); window.removeEventListener('touchend', handleSeekEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleSeekMove); window.removeEventListener('touchmove', handleSeekMove);
            window.removeEventListener('mouseup', handleSeekEnd); window.removeEventListener('touchend', handleSeekEnd);
        };
    }, [isDragging, handleSeekMove]);

    const togglePlay = () => {
        const ref = activePlayer === 'A' ? playerARef.current : playerBRef.current;
        if (isPlaying) { ref?.pause(); setIsPlaying(false); } else { ref?.play().then(() => setIsPlaying(true)).catch(console.error); }
    };

    const unmute = () => {
        const ref = activePlayer === 'A' ? playerARef.current : playerBRef.current;
        if (ref) {
            ref.muted = false;
            setNeedsUnmute(false);
            setVolume(1);
        }
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => { if (isPlaying && !isDragging) setShowControls(false); }, 2500);
    };

    return (
        <div 
            ref={containerRef}
            className="relative w-full h-full bg-black group overflow-hidden select-none outline-none font-sans"
            onMouseMove={(e) => { handleMouseMove(); handleSeekMove(e); }}
            onMouseLeave={() => { isPlaying && !isDragging && setShowControls(false); setHoverTime(null); }}
            onClick={() => !isDragging && togglePlay()}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.code === 'Space') togglePlay();
                if (e.code === 'ArrowRight') seekTo(currentTime + 5);
                if (e.code === 'ArrowLeft') seekTo(currentTime - 5);
            }}
        >
            <button onClick={(e) => { e.stopPropagation(); navigate(-1); }} className={`absolute top-4 left-4 z-50 p-2 bg-black/50 rounded-full text-white hover:bg-black/80 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <ArrowLeft size={24} />
            </button>

            {(isLive || waitingForLive) && (
                <div className={`absolute top-4 right-4 z-30 flex items-center gap-2 ${showControls ? 'opacity-100' : 'opacity-60'} transition-opacity`}>
                    <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1.5 shadow-lg animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full"></div> LIVE
                    </div>
                    <div className="bg-black/50 text-white text-xs font-medium px-2 py-1 rounded backdrop-blur-sm">{waitingForLive ? 'Initializing...' : 'On Air'}</div>
                </div>
            )}

            {needsUnmute && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
                    <button onClick={(e) => { e.stopPropagation(); unmute(); }} className="bg-white/90 text-black font-bold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 text-sm">
                        <VolumeX size={16} className="text-red-500"/> Tap to Unmute
                    </button>
                </div>
            )}

            {(loading || waitingForLive) && (
                <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/60 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 size={48} className="text-primary animate-spin" />
                        <span className="text-white/80 text-sm font-medium animate-pulse">{waitingForLive ? 'Stream Starting...' : 'Loading Video...'}</span>
                    </div>
                </div>
            )}

            {/* Video Layers - z-index flips based on active player */}
            <video ref={playerARef} className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${activePlayer === 'A' ? 'opacity-100 z-10' : 'opacity-100 z-0'}`} poster={currentIndex === 0 ? resolvedThumbnail : undefined} playsInline preload="auto" />
            <video ref={playerBRef} className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${activePlayer === 'B' ? 'opacity-100 z-10' : 'opacity-100 z-0'}`} playsInline preload="auto" />

            {!isPlaying && !loading && !isDragging && !waitingForLive && (
                <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/10 pointer-events-none">
                    <div className="bg-white/10 p-6 rounded-full backdrop-blur-md border border-white/20 shadow-2xl">
                        <Play size={48} fill="white" className="text-white translate-x-1" />
                    </div>
                </div>
            )}

            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-4 pt-16 transition-opacity duration-300 z-40 ${showControls ? 'opacity-100' : 'opacity-0'}`} onClick={(e) => e.stopPropagation()}>
                <div ref={progressBarRef} className="relative w-full h-1.5 hover:h-2.5 bg-white/20 rounded-full cursor-pointer group/progress mb-4 transition-all duration-150" onMouseDown={handleSeekStart} onTouchStart={handleSeekStart}>
                    {hoverTime !== null && (
                        <div className="absolute bottom-4 bg-black/80 text-white text-xs px-2 py-1 rounded border border-white/10 transform -translate-x-1/2 pointer-events-none" style={{ left: `${hoverPos}%` }}>{formatTime(hoverTime)}</div>
                    )}
                    <div className={`absolute top-0 left-0 h-full rounded-full relative pointer-events-none ${isLive ? 'bg-red-600' : 'bg-primary'}`} style={{ width: `${(currentTime / totalDuration) * 100}%` }}>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-lg"></div>
                    </div>
                </div>

                <div className="flex items-center justify-between text-white select-none">
                    <div className="flex items-center gap-4">
                        <button onClick={togglePlay} className={`transition-colors hover:scale-110 active:scale-95`}>
                            {isPlaying ? <Pause size={28} fill="white"/> : <Play size={28} fill="white"/>}
                        </button>
                        
                        {isLive && (
                            <button onClick={() => { seekTo(totalDuration - 0.5); setIsPlaying(true); setWaitingForLive(false); }} className="flex items-center gap-1 hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-wide">
                                <Radio size={16} /> Sync Live
                            </button>
                        )}

                        {!isLive && (
                            <>
                                <button onClick={() => seekTo(currentTime - 10)} className="hover:text-primary transition-colors hidden sm:block"><SkipBack size={20}/></button>
                                <button onClick={() => seekTo(currentTime + 10)} className="hover:text-primary transition-colors hidden sm:block"><SkipForward size={20}/></button>
                            </>
                        )}

                        <div className="flex items-center gap-2 text-xs sm:text-sm font-mono font-medium opacity-90 ml-2">
                            <span>{formatTime(currentTime)}</span>
                            <span className="opacity-40">/</span>
                            <span className="opacity-70">{formatTime(totalDuration)}</span>
                        </div>

                        <div className="flex items-center gap-2 group/vol hidden sm:flex ml-2">
                            <button onClick={() => setIsMuted(!isMuted)} className="hover:text-primary transition-colors">
                                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-20 h-1 accent-primary cursor-pointer opacity-0 group-hover/vol:opacity-100 transition-opacity" />
                        </div>
                    </div>

                    <button onClick={() => document.fullscreenElement ? document.exitFullscreen() : containerRef.current?.requestFullscreen()} className="hover:text-primary transition-colors">
                        {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomVideoPlayer;
