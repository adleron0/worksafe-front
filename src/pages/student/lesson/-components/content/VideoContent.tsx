import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VideoPlayer from '@/components/general-components/VideoPlayer';
import YouTubePlayerClean from '@/components/general-components/YouTubePlayerClean';
import RichTextViewer from '@/components/general-components/RichTextViewer';
import { VideoCompletedBanner } from '../shared/VideoCompletedBanner';
import type { VideoContentProps } from '../../types';

export const VideoContent = memo(({ step, onProgress, progressConfig, isCompletingStep }: VideoContentProps) => {
  console.log('🎬 VideoContent renderizado para step:', step.id, 'Status:', step.status);
  
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
          stepId={step.id}
          isCompleted={step.status === 'completed'}
          isCompletingStep={isCompletingStep}
        />
        <YouTubePlayerClean
          videoId={youtubeId}
          onProgress={onProgress}
          progressThreshold={progressConfig?.videoCompletePercent || 85}
          autoplay={false}
          muted={false}
          controls={true}
        />
        
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
        stepId={step.id}
        isCompleted={step.status === 'completed'}
        isCompletingStep={isCompletingStep}
      />
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        {url ? (
          <VideoPlayer
            src={url}
            onProgress={onProgress}
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
  // Comparação customizada: só rerender se o ID do step mudar ou conteúdo mudar
  // Ignorar mudanças de status para evitar rerender quando completa
  const shouldNotRerender = 
    prevProps.step.id === nextProps.step.id && 
    JSON.stringify(prevProps.step.content) === JSON.stringify(nextProps.step.content);
  
  if (!shouldNotRerender) {
    console.log('🔄 VideoContent vai rerender porque:', {
      idChanged: prevProps.step.id !== nextProps.step.id,
      contentChanged: JSON.stringify(prevProps.step.content) !== JSON.stringify(nextProps.step.content)
    });
  }
  
  return shouldNotRerender;
});