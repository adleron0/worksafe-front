import { memo } from 'react';
import { CheckCircle } from 'lucide-react';

interface VideoCompletedBannerProps {
  stepId: number;
  isCompleted: boolean;
}

export const VideoCompletedBanner = memo(({ stepId, isCompleted }: VideoCompletedBannerProps) => {
  console.log('🎭 VideoCompletedBanner renderizado - Step:', stepId, 'Completed:', isCompleted);
  
  if (!isCompleted) return null;
  
  return (
    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
      <p className="text-sm text-green-700 dark:text-green-400 flex items-center">
        <CheckCircle className="h-4 w-4 mr-2" />
        Este vídeo já foi concluído
      </p>
    </div>
  );
});