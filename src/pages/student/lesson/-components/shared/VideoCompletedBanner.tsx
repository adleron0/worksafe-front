import { memo } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';

interface VideoCompletedBannerProps {
  isCompleted: boolean;
  isCompletingStep?: boolean;
}

export const VideoCompletedBanner = memo(({ isCompleted, isCompletingStep }: VideoCompletedBannerProps) => {
  // Se está completando, mostrar loading
  if (isCompletingStep) {
    return (
      <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
        <p className="text-sm text-primary flex items-center">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Salvando progresso...
        </p>
      </div>
    );
  }

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