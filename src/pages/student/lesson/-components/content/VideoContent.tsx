import { memo, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import VideoPlayer from '@/components/general-components/VideoPlayer';
import YouTubePlayerClean from '@/components/general-components/YouTubePlayerClean';
import RichTextViewer from '@/components/general-components/RichTextViewer';
import { VideoCompletedBanner } from '../shared/VideoCompletedBanner';
import type { VideoContentProps } from '../../types';

export const VideoContent = memo(({ step, onProgress, onCompleteStep, progressConfig, isCompletingStep }: VideoContentProps) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [hasReachedThreshold, setHasReachedThreshold] = useState(false);

  // Parse do conteúdo do vídeo uma única vez
  const videoData = useMemo(() => {
    if (!step.content) return {};
    
    let data: any = {};
    try {
      // O conteúdo já vem estruturado da nova API
      data = step.content;
    } catch (e) {
      console.error('Erro ao processar conteúdo do vídeo:', e);
      data = {};
    }
    return data;
  }, [step.content]);

  const { videoUrl, videoId, description } = videoData;
  const url = videoUrl || '';

  // Handler para progresso do vídeo
  const handleVideoProgress = (progress: number, currentTime?: number, duration?: number) => {
    // Sempre enviar o progresso para o componente pai (para tracking)
    if (onProgress) {
      onProgress(progress, currentTime, duration);
    }

    // Marcar quando atingiu o threshold (para feedback visual)
    const threshold = progressConfig?.videoCompletePercent || 85;
    if (progress >= threshold && !hasReachedThreshold) {
      setHasReachedThreshold(true);
    }
  };

  // Handler para conclusão manual
  const handleManualComplete = async () => {
    if (!onCompleteStep || isCompleting || step.status === 'completed') return;

    setIsCompleting(true);
    try {
      const completePromise = onCompleteStep({
        stepId: step.id,
        contentType: 'VIDEO',
        progressData: {
          watchedPercent: hasReachedThreshold ? 100 : 0,
          completedManually: true,
          allowSkipUsed: true,
          timestamp: new Date().toISOString()
        }
      });

      if (completePromise && typeof completePromise.finally === 'function') {
        await completePromise;
      }
    } finally {
      setIsCompleting(false);
    }
  };

  // Extrair ID do YouTube de forma simples
  const youtubeId = useMemo(() => {
    if (!url) return videoId || '';
    
    // Detectar se é YouTube
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    if (!isYouTube) return '';

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return videoId || '';
  }, [url, videoId]);

  // Se tem YouTube ID, usar o YouTubePlayerClean
  if (youtubeId) {
    return (
      <div className="space-y-4">
        <VideoCompletedBanner
          isCompleted={step.status === 'completed' || step.status === 'COMPLETED'}
          isCompletingStep={isCompletingStep}
        />
        <YouTubePlayerClean
          videoId={youtubeId}
          onProgress={handleVideoProgress}
          progressThreshold={progressConfig?.videoCompletePercent || 85}
          autoplay={false}
          muted={false}
          controls={true}
        />

        {/* Botão Concluir Etapa quando allowSkip = true */}
        {progressConfig?.allowSkip && step.status !== 'completed' && step.status !== 'COMPLETED' && onCompleteStep && (
          <div className="mt-4">
            <Button
              onClick={handleManualComplete}
              disabled={isCompleting || isCompletingStep}
              className="w-full"
              variant={hasReachedThreshold ? "default" : "outline"}
            >
              {(isCompleting || isCompletingStep) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Concluir Etapa
                </>
              )}
            </Button>
            {!hasReachedThreshold && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Você pode concluir a etapa a qualquer momento
              </p>
            )}
          </div>
        )}

        {description && (
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">Informações Complementares</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <RichTextViewer
                content={description}
                className="max-w-none"
              />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
  
  // Para outros vídeos, usar VideoPlayer normal
  return (
    <div className="space-y-4">
      <VideoCompletedBanner
        isCompleted={step.status === 'completed' || step.status === 'COMPLETED'}
        isCompletingStep={isCompletingStep}
      />
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        {url ? (
          <VideoPlayer
            src={url}
            onProgress={handleVideoProgress}
            progressThreshold={progressConfig?.videoCompletePercent || 85}
            playbackRates={[0.5, 0.75, 1, 1.25, 1.5, 2]}
            customControls={false}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-900">
            <p className="text-white">URL do vídeo não encontrada</p>
          </div>
        )}
      </div>

      {/* Botão Concluir Etapa quando allowSkip = true */}
      {progressConfig?.allowSkip && step.status !== 'completed' && step.status !== 'COMPLETED' && onCompleteStep && (
        <div className="mt-4">
          <Button
            onClick={handleManualComplete}
            disabled={isCompleting || isCompletingStep}
            className="w-full"
            variant={hasReachedThreshold ? "default" : "outline"}
          >
            {(isCompleting || isCompletingStep) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Concluir Etapa
              </>
            )}
          </Button>
          {!hasReachedThreshold && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Você pode concluir a etapa a qualquer momento
            </p>
          )}
        </div>
      )}

      {description && (
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">Informações Complementares</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <RichTextViewer 
              content={description}
              className="max-w-none"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparação customizada: rerender quando:
  // 1. ID do step mudar
  // 2. Conteúdo mudar
  // 3. Status mudar (importante para mostrar/ocultar botão e banner)
  // 4. isCompletingStep mudar (importante para feedback de loading)
  const shouldNotRerender =
    prevProps.step.id === nextProps.step.id &&
    prevProps.step.status === nextProps.step.status &&
    prevProps.isCompletingStep === nextProps.isCompletingStep &&
    JSON.stringify(prevProps.step.content) === JSON.stringify(nextProps.step.content);

  return shouldNotRerender;
});