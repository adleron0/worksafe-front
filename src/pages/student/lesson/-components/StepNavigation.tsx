import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface StepNavigationProps {
  currentStepIndex: number;
  totalSteps: number;
  canGoNext: boolean;
  canGoPrevious: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function StepNavigation({ 
  currentStepIndex, 
  totalSteps,
  canGoNext,
  canGoPrevious,
  onPrevious, 
  onNext 
}: StepNavigationProps) {
  return (
    <div className="flex items-center justify-between mt-6">
      <Button
        variant="outline"
        disabled={!canGoPrevious}
        onClick={onPrevious}
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Anterior
      </Button>
      
      <span className="text-sm text-muted-foreground">
        {currentStepIndex + 1} de {totalSteps}
      </span>
      
      <Button
        disabled={!canGoNext}
        onClick={onNext}
      >
        Próximo
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}