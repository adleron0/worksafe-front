import React, { useEffect, useRef, useState, useCallback } from 'react';
import videojs from 'video.js';
import Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';
import 'videojs-youtube';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  progressThreshold?: number;
  autoplay?: boolean;
  controls?: boolean;
  muted?: boolean;
  fluid?: boolean;
  responsive?: boolean;
  playbackRates?: number[];
  customControls?: boolean;
  width?: string | number;
  height?: string | number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  onProgress,
  onComplete,
  progressThreshold = 90,
  autoplay = false,
  controls = true,
  muted = false,
  fluid = true,
  responsive = true,
  playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2],
  customControls = false,
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

  // Determinar o tipo de vídeo baseado na URL
  const getVideoType = (url: string): string => {
    if (!url) return 'video/mp4';
    
    // URLs do YouTube devem usar o tipo especial
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'video/youtube';
    }
    if (url.includes('vimeo.com')) {
      return 'video/vimeo';
    }
    
    // Determinar tipo baseado na extensão
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'mp4':
        return 'video/mp4';
      case 'webm':
        return 'video/webm';
      case 'ogg':
      case 'ogv':
        return 'video/ogg';
      case 'm3u8':
        return 'application/x-mpegURL';
      default:
        return 'video/mp4';
    }
  };

  useEffect(() => {
    // Aguardar o container estar no DOM
    if (!videoContainerRef.current || !src) return;

    // Limpar player anterior se existir
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }

    // Criar elemento de vídeo se não existir
    if (!videoRef.current) {
      const videoElement = document.createElement('video');
      videoElement.className = 'video-js vjs-big-play-centered vjs-default-skin vjs-fluid';
      videoElement.setAttribute('playsinline', 'true');
      videoContainerRef.current.appendChild(videoElement);
      videoRef.current = videoElement;
    }

    const videoType = getVideoType(src);

    // Configurações do Video.js
    const options: any = {
      autoplay,
      muted: muted || autoplay, // Se autoplay, deve ser muted para funcionar
      controls: !customControls && controls,
      fluid,
      responsive,
      playbackRates,
      poster,
      preload: 'auto',
      html5: {
        vhs: {
          enableLowInitialPlaylist: true,
          smoothQualityChange: true,
          overrideNative: !videojs.browser.IS_SAFARI
        },
        nativeVideoTracks: false,
        nativeAudioTracks: false,
        nativeTextTracks: false
      },
      sources: [{
        src,
        type: videoType
      }],
      // Adicionar suporte para YouTube com máxima privacidade
      techOrder: videoType === 'video/youtube' ? ['youtube', 'html5'] : ['html5'],
      youtube: {
        // Remover TODOS os elementos do YouTube
        iv_load_policy: 3, // Remove completamente anotações
        modestbranding: 1, // Remove logo do YouTube (parcialmente)
        rel: 0, // Não mostra vídeos relacionados
        showinfo: 0, // Remove título e informações
        controls: 0, // Remove controles do YouTube completamente
        disablekb: 1, // Desabilita atalhos de teclado
        playsinline: 1, // Reproduz inline
        fs: 0, // Remove botão de tela cheia do YouTube
        autohide: 1, // Esconde controles automaticamente
        enablejsapi: 1, // Habilita API JavaScript
        origin: window.location.origin,
        widget_referrer: window.location.href,
        // Parâmetros adicionais para máxima privacidade
        cc_load_policy: 0, // Desabilita legendas por padrão
        hl: 'pt-BR', // Define idioma
        color: 'white', // Usa barra de progresso branca
        theme: 'dark', // Tema escuro
        wmode: 'opaque',
        // Customização adicional através de playerVars
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
          // Parâmetros não documentados mas funcionais
          showsearch: 0,
          showrelated: 0,
          hd: 1
        }
      },
      errorDisplay: true,
      notSupportedMessage: 'Este vídeo não pode ser reproduzido no seu navegador.'
    };

    // Timeout para garantir que o elemento está no DOM
    const initTimeout = setTimeout(() => {
      if (!videoRef.current) return;

      try {
        // Criar player
        const player = videojs(videoRef.current, options);
        playerRef.current = player;

        // Aguardar player estar pronto
        player.ready(() => {
          console.log('Player pronto');
          setIsReady(true);
          setHasError(false);
          setErrorMessage('');
        });

        // Rastrear progresso
        player.on('timeupdate', () => {
          const currentTime = player.currentTime() || 0;
          const duration = player.duration() || 0;

          if (duration > 0) {
            const progress = (currentTime / duration) * 100;

            // Chamar callback de progresso
            if (onProgress && !progressTrackedRef.current && progress >= progressThreshold) {
              progressTrackedRef.current = true;
              onProgress(progress);
            }

            // Verificar se completou
            if (onComplete && !completedRef.current && progress >= 95) {
              completedRef.current = true;
              onComplete();
            }
          }
        });

        // Lidar com erros
        player.on('error', () => {
          const error = player.error();
          console.error('Erro no player:', error);
          
          let message = 'Erro ao carregar o vídeo';
          if (error) {
            switch (error.code) {
              case 1:
                message = 'O carregamento do vídeo foi abortado';
                break;
              case 2:
                message = 'Erro de rede ao carregar o vídeo';
                break;
              case 3:
                message = 'Erro ao decodificar o vídeo';
                break;
              case 4:
                message = 'Formato de vídeo não suportado';
                
                // Tentar fallback se for erro de formato
                if (src && !src.includes('http')) {
                  message = 'URL do vídeo inválida ou vídeo não encontrado';
                }
                break;
              default:
                message = error.message || 'Erro desconhecido';
            }
          }
          
          setHasError(true);
          setErrorMessage(message);
        });

        // Evento de fim do vídeo
        player.on('ended', () => {
          if (onComplete && !completedRef.current) {
            completedRef.current = true;
            onComplete();
          }
        });

      } catch (error) {
        console.error('Erro ao inicializar player:', error);
        setHasError(true);
        setErrorMessage('Erro ao inicializar o player de vídeo');
      }
    }, 100);

    // Cleanup
    return () => {
      clearTimeout(initTimeout);
      
      if (playerRef.current) {
        try {
          playerRef.current.dispose();
        } catch (e) {
          console.error('Erro ao destruir player:', e);
        }
        playerRef.current = null;
      }

      // Limpar elemento de vídeo
      if (videoRef.current && videoRef.current.parentNode) {
        videoRef.current.parentNode.removeChild(videoRef.current);
        videoRef.current = null;
      }

      // Reset refs
      progressTrackedRef.current = false;
      completedRef.current = false;
      setIsReady(false);
    };
  }, [src, autoplay, muted, controls, fluid, responsive, playbackRates, poster, onProgress, onComplete, progressThreshold, customControls]);

  // Função para recarregar o vídeo
  const handleReload = useCallback(() => {
    setHasError(false);
    setErrorMessage('');
    
    // Forçar recriação do player
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }
    
    // Pequeno delay antes de recriar
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }, []);

  return (
    <div className="video-player-wrapper relative w-full" style={{ width, height }}>
      {/* Container do vídeo */}
      <div 
        ref={videoContainerRef}
        className="video-container relative bg-black rounded-lg overflow-hidden"
        style={{ 
          aspectRatio: '16/9',
          width: '100%',
          height: height === 'auto' ? 'auto' : height 
        }}
      >
        {/* Loading overlay */}
        {!isReady && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 text-white animate-spin" />
              <span className="text-white text-sm">Carregando vídeo...</span>
            </div>
          </div>
        )}

        {/* Error overlay */}
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

      {/* Estilos do Video.js e YouTube */}
      <style>{`
        .video-js {
          width: 100%;
          height: 100%;
        }
        
        .vjs-big-play-button {
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        }
        
        .vjs-loading-spinner {
          border-color: rgba(255, 255, 255, 0.2);
          border-top-color: white;
        }
        
        .vjs-control-bar {
          background-color: rgba(0, 0, 0, 0.7);
        }
        
        .vjs-poster {
          background-size: cover;
          background-position: center;
        }
        
        .vjs-error-display {
          display: none !important;
        }
        
        .vjs-modal-dialog-content {
          color: white;
          text-align: center;
        }
        
        /* Esconder elementos do YouTube que não podem ser removidos via API */
        .vjs-youtube iframe {
          pointer-events: none !important; /* Desabilita cliques no iframe */
        }
        
        .video-js.vjs-youtube {
          pointer-events: auto !important; /* Reabilita cliques no container */
        }
        
        .video-js.vjs-youtube .vjs-control-bar {
          pointer-events: auto !important; /* Mantém controles clicáveis */
          z-index: 2;
        }
        
        /* Esconder título e elementos do YouTube */
        .vjs-youtube .vjs-poster,
        .vjs-youtube .vjs-loading-spinner {
          z-index: 1;
        }
        
        /* Overlay invisível para bloquear cliques no vídeo do YouTube */
        .vjs-youtube::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 30px; /* Deixa espaço para controles */
          z-index: 1;
          cursor: pointer;
        }
        
        /* Garantir que os controles do Video.js fiquem acima */
        .vjs-youtube .vjs-control-bar,
        .vjs-youtube .vjs-big-play-button {
          z-index: 3 !important;
        }
        
        /* Esconder watermark e branding */
        .vjs-youtube .ytp-watermark,
        .vjs-youtube .ytp-chrome-top,
        .vjs-youtube .ytp-show-cards-title,
        .vjs-youtube .ytp-pause-overlay,
        .vjs-youtube .ytp-related-videos {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default VideoPlayer;