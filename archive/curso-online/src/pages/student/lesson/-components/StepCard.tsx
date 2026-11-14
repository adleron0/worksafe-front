import { cn } from '@/lib/utils';
import { 
  CheckCircle, 
  PlayCircle, 
  Circle, 
  Lock,
  Video as VideoIcon,
  FileText,
  HelpCircle,
  Download
} from 'lucide-react';
import type { MergedStep, StepType, StepStatus } from '../types';

interface StepCardProps {
  step: MergedStep;
  index: number;
  isActive: boolean;
  onClick: () => void;
}

// Obter ícone do tipo de conteúdo
const getStepIcon = (type: StepType) => {
  const stepType = type?.toLowerCase();
  switch (stepType) {
    case 'video':
      return <VideoIcon className="h-4 w-4" />;
    case 'text':
      return <FileText className="h-4 w-4" />;
    case 'quiz':
      return <HelpCircle className="h-4 w-4" />;
    case 'download':
      return <Download className="h-4 w-4" />;
    default:
      return null;
  }
};

export function StepCard({ step, index, isActive, onClick }: StepCardProps) {
  // Normalizar status para minúsculas para compatibilidade
  const normalizedStatus = (step.status?.toLowerCase() || 'available') as StepStatus;
  
  const statusIcons: Record<string, JSX.Element> = {
    completed: <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />,
    in_progress: <PlayCircle className="h-4 w-4 text-blue-500 dark:text-blue-400" />,
    available: <Circle className="h-4 w-4 text-gray-400 dark:text-gray-500" />,
    locked: <Lock className="h-4 w-4 text-gray-300 dark:text-gray-600" />,
    not_started: <Circle className="h-4 w-4 text-gray-400 dark:text-gray-500" />
  };

  const statusColors: Record<string, string> = {
    completed: 'hover:bg-green-50 dark:hover:bg-green-950/30',
    in_progress: 'hover:bg-blue-50 dark:hover:bg-blue-950/30',
    available: 'hover:bg-muted',
    locked: 'opacity-60 cursor-not-allowed',
    not_started: 'hover:bg-muted'
  };

  return (
    <button
      onClick={onClick}
      disabled={normalizedStatus === 'locked'}
      className={cn(
        "w-full text-left p-3 rounded-lg transition-colors",
        isActive ? 'bg-primary text-primary-foreground' : statusColors[normalizedStatus],
        normalizedStatus !== 'locked' && 'hover:shadow-sm cursor-pointer',
        normalizedStatus === 'locked' && 'cursor-not-allowed'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {statusIcons[normalizedStatus] || getStepIcon(step.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium truncate",
            isActive ? '' : 'text-foreground'
          )}>
            {step.title}
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span className={cn(
              "truncate",
              isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
            )}>
              Etapa {index + 1}
            </span>
            {step.progress > 0 && step.progress < 100 && (
              <span className="text-blue-500 dark:text-blue-400">
                {step.progress}%
              </span>
            )}
            {step.duration && (
              <span className={cn(
                isActive ? 'text-primary-foreground/60' : 'text-muted-foreground'
              )}>
                • {step.duration} min
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}