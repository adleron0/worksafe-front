import React, { useEffect, useRef, useState, useCallback } from 'react';
import videojs from 'video.js';
import Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';
import 'videojs-youtube';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface YouTubePlayerProps {
  videoId: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  progressThreshold?: number;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  width?: string | number;
  height?: string | number;
}

/**
 * Componente especializado para reproduzir vídeos do YouTube
 * com máxima privacidade e controle sobre a aparência
 */
const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  onProgress,
  onComplete,
  progressThreshold = 90,
  autoplay = false,
  muted = false,
  controls = true,
  width = '100%',
  height = 'auto',
}) => {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const progressTrackedRef = useRef(false);
  const completedRef = useRef(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!videoContainerRef.current || !videoId) return;

    // Limpar player anterior
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }

    // Criar elemento de vídeo
    if (!videoRef.current) {
      const videoElement = document.createElement('video');
      videoElement.className = 'video-js vjs-big-play-centered vjs-default-skin vjs-fluid youtube-player';
      videoElement.setAttribute('playsinline', 'true');
      videoContainerRef.current.appendChild(videoElement);
      videoRef.current = videoElement;
    }

    // Configurações otimizadas para YouTube
    const options: any = {
      autoplay,
      muted: muted || autoplay,
      controls,
      fluid: true,
      responsive: true,
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      preload: 'auto',
      techOrder: ['youtube'],
      sources: [{
        type: 'video/youtube',
        src: `https://www.youtube.com/watch?v=${videoId}`
      }],
      youtube: {
        // Configurações para máxima privacidade
        ytControls: 0, // Desabilita controles do YouTube completamente
        modestbranding: 1, // Minimiza branding
        rel: 0, // Sem vídeos relacionados
        showinfo: 0, // Sem informações
        fs: 0, // Sem fullscreen do YouTube
        disablekb: 1, // Desabilita teclado do YouTube
        playsinline: 1,
        enablejsapi: 1,
        origin: window.location.origin,
        widget_referrer: window.location.href,
        iv_load_policy: 3, // Remove anotações
        cc_load_policy: 0, // Sem legendas por padrão
        color: 'white',
        controls: 0, // Força uso dos controles do Video.js
        // Parâmetros não documentados mas funcionais
        wmode: 'transparent',
        showsearch: 0,
        showrelated: 0,
        hd: 1,
        vq: 'hd720', // Qualidade padrão
        autohide: 1,
        // Customização adicional
        customVars: {
          controls: 0,
          showinfo: 0,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          iv_load_policy: 3,
          disablekb: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          autoplay: autoplay ? 1 : 0,
          mute: muted ? 1 : 0,
          loop: 0,
          showsearch: 0,
          showrelated: 0,
          hd: 1
        }
      },
      // Personalização da UI
      controlBar: {
        pictureInPictureToggle: false,
        volumePanel: {
          inline: false
        },
        currentTimeDisplay: true,
        timeDivider: true,
        durationDisplay: true,
        remainingTimeDisplay: false,
        customControlSpacer: true,
        playbackRateMenuButton: {
          playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2]
        },
        fullscreenToggle: true
      }
    };

    // Timeout para garantir DOM
    const initTimeout = setTimeout(() => {
      if (!videoRef.current) return;

      try {
        const player = videojs(videoRef.current, options);
        playerRef.current = player;

        // Quando o player estiver pronto
        player.ready(() => {
          console.log('YouTube Player pronto');
          setIsReady(true);
          setHasError(false);
          
          // Aplicar classes CSS customizadas
          const playerEl = player.el();
          if (playerEl) {
            playerEl.classList.add('youtube-custom-player');
            
            // Criar overlay de proteção
            if (!overlayRef.current) {
              const overlay = document.createElement('div');
              overlay.className = 'youtube-protection-overlay';
              overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 30px;
                z-index: 1;
                pointer-events: none;
              `;
              playerEl.appendChild(overlay);
              overlayRef.current = overlay;
            }
          }
          
          // Interceptar eventos de clique
          player.on('click', (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            player.paused() ? player.play() : player.pause();
          });
        });

        // Rastrear progresso
        player.on('timeupdate', () => {
          const currentTime = player.currentTime() || 0;
          const duration = player.duration() || 0;

          if (duration > 0) {
            const progress = (currentTime / duration) * 100;

            if (onProgress && !progressTrackedRef.current && progress >= progressThreshold) {
              progressTrackedRef.current = true;
              onProgress(progress);
            }

            if (onComplete && !completedRef.current && progress >= 95) {
              completedRef.current = true;
              onComplete();
            }
          }
        });

        // Lidar com erros
        player.on('error', () => {
          const error = player.error();
          console.error('Erro no YouTube player:', error);
          
          let message = 'Erro ao carregar o vídeo';
          if (error?.code === 150 || error?.code === 101) {
            message = 'Este vídeo tem restrições de incorporação';
          }
          
          setHasError(true);
          setErrorMessage(message);
        });

        // Fim do vídeo
        player.on('ended', () => {
          if (onComplete && !completedRef.current) {
            completedRef.current = true;
            onComplete();
          }
        });

        // Interceptar teclas
        player.on('keydown', (e: KeyboardEvent) => {
          // Bloquear teclas que abrem YouTube
          if (e.key === 'w' || e.key === 'W') {
            e.preventDefault();
            e.stopPropagation();
          }
        });

      } catch (error) {
        console.error('Erro ao inicializar YouTube player:', error);
        setHasError(true);
        setErrorMessage('Erro ao inicializar o player de vídeo');
      }
    }, 100);

    // Cleanup
    return () => {
      clearTimeout(initTimeout);
      
      if (overlayRef.current && overlayRef.current.parentNode) {
        overlayRef.current.parentNode.removeChild(overlayRef.current);
        overlayRef.current = null;
      }
      
      if (playerRef.current) {
        try {
          playerRef.current.dispose();
        } catch (e) {
          console.error('Erro ao destruir player:', e);
        }
        playerRef.current = null;
      }

      if (videoRef.current && videoRef.current.parentNode) {
        videoRef.current.parentNode.removeChild(videoRef.current);
        videoRef.current = null;
      }

      progressTrackedRef.current = false;
      completedRef.current = false;
      setIsReady(false);
    };
  }, [videoId, autoplay, muted, controls, onProgress, onComplete, progressThreshold]);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div className="youtube-player-wrapper relative w-full" style={{ width, height }}>
      {/* Container principal com overflow hidden para cropping */}
      <div 
        className="youtube-crop-container relative bg-black rounded-lg"
        style={{ 
          aspectRatio: '16/9',
          width: '100%',
          height: height === 'auto' ? 'auto' : height,
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Overlay superior para cobrir título e botões do topo */}
        <div 
          className="absolute top-0 left-0 right-0 bg-black z-20 pointer-events-none"
          style={{ height: '60px' }}
        />
        
        {/* Overlay inferior direito para cobrir logo do YouTube */}
        <div 
          className="absolute bottom-0 right-0 bg-black z-20 pointer-events-none"
          style={{ 
            width: '120px',
            height: '40px',
            clipPath: 'polygon(30% 0%, 100% 0%, 100% 100%, 0% 100%)'
          }}
        />
        
        {/* Container do vídeo com zoom para cortar bordas */}
        <div 
          ref={videoContainerRef}
          className="video-container absolute"
          style={{ 
            // Zoom no vídeo para cortar elementos das bordas
            top: '50%',
            left: '50%',
            width: '100%',
            height: '100%',
            transform: 'translate(-50%, -50%) scale(1.15)',
            position: 'absolute'
          }}
        >
          {!isReady && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 text-white animate-spin" />
                <span className="text-white text-sm">Carregando vídeo...</span>
              </div>
            </div>
          )}

          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
              <div className="flex flex-col items-center gap-4 p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <div className="space-y-2">
                  <h3 className="text-white font-semibold text-lg">Erro ao carregar vídeo</h3>
                  <p className="text-gray-300 text-sm max-w-md">{errorMessage}</p>
                </div>
                <Button 
                  onClick={handleReload}
                  variant="outline"
                  className="mt-2"
                >
                  Tentar novamente
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Estilos customizados para esconder elementos do YouTube */}
      <style>{`
        /* Base styles para o player */
        .youtube-custom-player {
          width: 100%;
          height: 100%;
        }
        
        /* Esconder elementos do YouTube via CSS */
        .youtube-custom-player .vjs-youtube {
          pointer-events: auto !important;
        }
        
        .youtube-custom-player .vjs-youtube iframe {
          pointer-events: none !important;
          transform: scale(1.2);
          transform-origin: center center;
        }
        
        /* Reativar controles do Video.js */
        .youtube-custom-player .vjs-control-bar {
          pointer-events: auto !important;
          z-index: 10;
          background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
        }
        
        .youtube-custom-player .vjs-big-play-button {
          z-index: 10;
          pointer-events: auto !important;
        }
        
        /* Esconder watermark e elementos do YouTube */
        .youtube-custom-player .ytp-watermark,
        .youtube-custom-player .ytp-chrome-top,
        .youtube-custom-player .ytp-chrome-bottom,
        .youtube-custom-player .ytp-gradient-top,
        .youtube-custom-player .ytp-gradient-bottom,
        .youtube-custom-player .ytp-show-cards-title,
        .youtube-custom-player .ytp-pause-overlay,
        .youtube-custom-player .ytp-related-videos,
        .youtube-custom-player .ytp-endscreen-content {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
        
        /* Overlay de proteção contra cliques */
        .youtube-protection-overlay {
          background: transparent;
          cursor: pointer;
          pointer-events: auto !important;
        }
        
        /* Mascarar elementos específicos do YouTube */
        .youtube-crop-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 48px;
          background: black;
          z-index: 15;
          pointer-events: none;
        }
        
        .youtube-crop-container::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          width: 100px;
          height: 35px;
          background: black;
          z-index: 15;
          pointer-events: none;
        }
        
        /* Customizar aparência dos controles */
        .youtube-custom-player .vjs-control-bar {
          font-size: 14px;
          height: 40px;
        }
        
        .youtube-custom-player .vjs-button {
          width: 3em;
        }
        
        .youtube-custom-player .vjs-time-control {
          padding: 0 0.5em;
          min-width: 2em;
        }
        
        /* Esconder título no hover */
        .youtube-custom-player:hover .vjs-title-bar,
        .youtube-custom-player .vjs-title-bar {
          display: none !important;
        }
        
        /* Garantir que o player YouTube não vaze elementos */
        .youtube-player-wrapper {
          isolation: isolate;
        }
        
        /* Remover qualquer indicação visual do YouTube */
        .youtube-custom-player [class*="ytp-"],
        .youtube-custom-player [id*="ytp-"] {
          display: none !important;
        }
        
        /* Estilo para o erro */
        .vjs-error-display {
          display: none !important;
        }
        
        /* Melhorar transições */
        .youtube-custom-player .vjs-control-bar {
          transition: opacity 0.3s ease;
        }
        
        .youtube-custom-player.vjs-user-inactive .vjs-control-bar {
          opacity: 0;
        }
        
        .youtube-custom-player.vjs-user-active .vjs-control-bar {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default YouTubePlayer;