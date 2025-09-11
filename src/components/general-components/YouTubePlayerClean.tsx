import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  RotateCcw,
  Settings,
  SkipForward,
  SkipBack 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface YouTubePlayerCleanProps {
  videoId: string;
  title?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  progressThreshold?: number;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  width?: string | number;
  height?: string | number;
  className?: string;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

/**
 * Componente YouTube Player limpo com controles customizados
 * Usa YouTube IFrame API diretamente para máximo controle
 */
const YouTubePlayerClean: React.FC<YouTubePlayerCleanProps> = ({
  videoId,
  title,
  onProgress,
  onComplete,
  progressThreshold = 90,
  autoplay = false,
  muted = false,
  controls = true,
  width = '100%',
  height = 'auto',
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout>();
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(100);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const progressTrackedRef = useRef(false);
  const completedRef = useRef(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const [showControls, setShowControls] = useState(true);

  // Carregar YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Inicializar player
  useEffect(() => {
    if (!videoId) return;

    const initPlayer = () => {
      if (!containerRef.current) return;

      // Criar div para o player
      const playerDiv = document.createElement('div');
      playerDiv.id = `youtube-player-${videoId}`;
      
      // Limpar container
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(playerDiv);

      // Criar player
      playerRef.current = new window.YT.Player(playerDiv.id, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          mute: muted ? 1 : 0,
          controls: 0, // Sempre desabilitar controles do YouTube
          disablekb: 1,
          enablejsapi: 1,
          fs: 1,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          showinfo: 0,
          origin: window.location.origin,
          widget_referrer: window.location.href,
        },
        events: {
          onReady: (event: any) => {
            setIsReady(true);
            const player = event.target;
            setDuration(player.getDuration());
            
            if (autoplay) {
              player.playVideo();
            }

            // Iniciar tracking de progresso
            progressIntervalRef.current = setInterval(() => {
              if (player && player.getCurrentTime) {
                const time = player.getCurrentTime();
                const dur = player.getDuration();
                setCurrentTime(time);
                setDuration(dur);
                
                if (dur > 0) {
                  const prog = (time / dur) * 100;
                  setProgress(prog);

                  // Callback de progresso
                  if (onProgress && !progressTrackedRef.current && prog >= progressThreshold) {
                    progressTrackedRef.current = true;
                    onProgress(prog);
                  }

                  // Callback de conclusão
                  if (onComplete && !completedRef.current && prog >= 95) {
                    completedRef.current = true;
                    onComplete();
                  }
                }
              }
            }, 100);
          },
          onStateChange: (event: any) => {
            const state = event.data;
            setIsPlaying(state === window.YT.PlayerState.PLAYING);
            
            if (state === window.YT.PlayerState.ENDED) {
              if (onComplete && !completedRef.current) {
                completedRef.current = true;
                onComplete();
              }
            }
          },
          onError: (event: any) => {
            console.error('YouTube Player Error:', event.data);
          }
        }
      });
    };

    // Aguardar API carregar
    if (window.YT && window.YT.Player) {
      console.log('🎥 YouTubePlayerClean - Iniciando player para vídeo:', videoId);
      initPlayer();
    } else {
      console.log('🎥 YouTubePlayerClean - Aguardando API do YouTube carregar...');
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    // Cleanup
    return () => {
      console.log('🎥 YouTubePlayerClean - Limpando player para vídeo:', videoId);
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error('Error destroying player:', e);
        }
      }
      
      progressTrackedRef.current = false;
      completedRef.current = false;
    };
  }, [videoId, autoplay, muted, onProgress, onComplete, progressThreshold]);

  // Controles
  const handlePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPlaying]);

  const handleMuteToggle = useCallback(() => {
    if (!playerRef.current) return;
    
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  }, [isMuted]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const seekTime = pos * duration;
    
    playerRef.current.seekTo(seekTime, true);
  }, [duration]);

  const handleSkip = useCallback((seconds: number) => {
    if (!playerRef.current) return;
    
    const newTime = playerRef.current.getCurrentTime() + seconds;
    playerRef.current.seekTo(Math.max(0, Math.min(newTime, duration)), true);
  }, [duration]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!playerRef.current) return;
    
    const newVolume = parseFloat(e.target.value);
    playerRef.current.setVolume(newVolume);
    setVolume(newVolume);
    
    if (newVolume === 0) {
      playerRef.current.mute();
      setIsMuted(true);
    } else if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    }
  }, [isMuted]);

  const handlePlaybackRateChange = useCallback((rate: number) => {
    if (!playerRef.current) return;
    
    playerRef.current.setPlaybackRate(rate);
    setPlaybackRate(rate);
    setShowSettings(false);
  }, []);

  const handleFullscreen = useCallback(() => {
    const container = containerRef.current?.parentElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  }, []);

  const handleRestart = useCallback(() => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(0, true);
    playerRef.current.playVideo();
  }, []);

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Auto-hide controls
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettings(false);
      }, 3000);
    }
  }, [isPlaying]);

  return (
    <div 
      className={cn(
        "youtube-player-clean relative w-full bg-black rounded-lg overflow-hidden",
        className
      )}
      style={{ width, height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <div 
        className="relative"
        style={{ 
          aspectRatio: '16/9',
          width: '100%',
          height: height === 'auto' ? 'auto' : height
        }}
      >
        {/* Container do iframe */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Container do player */}
          <div 
            ref={containerRef}
            className="absolute"
            style={{
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
            }}
          />
          
          {/* Overlay transparente para bloquear cliques */}
          <div 
            className="absolute inset-0 z-20"
            style={{ 
              pointerEvents: isReady ? 'auto' : 'none',
              cursor: 'pointer'
            }}
            onClick={handlePlayPause}
          />
        </div>

        {/* Controles customizados */}
        {controls && isReady && (
          <div 
            className={cn(
              "absolute inset-0 z-20 pointer-events-none transition-opacity duration-300",
              showControls ? 'opacity-100' : 'opacity-0'
            )}
          >
            {/* Top gradient */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/70 to-transparent" />
            
            {/* Title */}
            {title && showControls && (
              <div className="absolute top-4 left-4 right-4">
                <h3 className="text-white text-lg font-semibold truncate">{title}</h3>
              </div>
            )}

            {/* Center play button */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                <button
                  onClick={handlePlayPause}
                  className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <Play className="w-10 h-10 text-white ml-1" fill="white" />
                </button>
              </div>
            )}

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent pointer-events-auto">
              {/* Progress bar */}
              <div 
                className="relative h-1 bg-white/20 rounded-full mb-4 cursor-pointer group"
                onClick={handleSeek}
              >
                {/* Progress */}
                <div 
                  className="absolute h-full bg-red-600 rounded-full group-hover:bg-red-500 transition-colors"
                  style={{ width: `${progress}%` }}
                />
                
                {/* Scrubber */}
                <div 
                  className="absolute w-3 h-3 bg-red-600 rounded-full -top-1 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `${progress}%` }}
                />
              </div>

              {/* Control buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Play/Pause */}
                  <button
                    onClick={handlePlayPause}
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6" />
                    )}
                  </button>

                  {/* Skip backward */}
                  <button
                    onClick={() => handleSkip(-10)}
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  {/* Skip forward */}
                  <button
                    onClick={() => handleSkip(10)}
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>

                  {/* Volume */}
                  <div className="flex items-center gap-2 group">
                    <button
                      onClick={handleMuteToggle}
                      className="text-white hover:text-white/80 transition-colors"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </button>
                    
                    <div className="w-0 group-hover:w-20 overflow-hidden transition-all duration-200">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, white 0%, white ${volume}%, rgba(255,255,255,0.3) ${volume}%, rgba(255,255,255,0.3) 100%)`
                        }}
                      />
                    </div>
                  </div>

                  {/* Time */}
                  <div className="text-white text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Restart */}
                  <button
                    onClick={handleRestart}
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>

                  {/* Settings */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="text-white hover:text-white/80 transition-colors"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    
                    {showSettings && (
                      <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg p-2 min-w-[120px]">
                        <div className="text-white text-sm mb-1">Velocidade</div>
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                          <button
                            key={rate}
                            onClick={() => handlePlaybackRateChange(rate)}
                            className={cn(
                              "block w-full text-left px-2 py-1 text-sm rounded transition-colors",
                              playbackRate === rate 
                                ? "bg-red-600 text-white" 
                                : "text-white/80 hover:bg-white/10"
                            )}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fullscreen */}
                  <button
                    onClick={handleFullscreen}
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    {isFullscreen ? (
                      <Minimize className="w-5 h-5" />
                    ) : (
                      <Maximize className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <span className="text-white text-sm">Carregando vídeo...</span>
            </div>
          </div>
        )}
      </div>

      {/* Estilos do slider */}
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: #ef4444;
          border-radius: 50%;
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: #ef4444;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }

        .slider:focus {
          outline: none;
        }

        .slider::-webkit-slider-thumb:hover {
          background: #dc2626;
        }

        .slider::-moz-range-thumb:hover {
          background: #dc2626;
        }
      `}</style>
    </div>
  );
};

export default YouTubePlayerClean;