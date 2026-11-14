import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StepCard } from './StepCard';
import type { LessonDataWithSteps, MergedStep } from '../types';

interface LessonSidebarProps {
  lessonData: LessonDataWithSteps;
  currentStepIndex: number;
  onStepClick: (index: number) => void;
}

export function LessonSidebar({ lessonData, currentStepIndex, onStepClick }: LessonSidebarProps) {
  return (
    <Card className="max-h-[calc(100vh-120px)] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle>Conteúdo da Aula</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="space-y-2">
          {lessonData.steps.map((step: MergedStep, index: number) => (
            <StepCard
              key={step.id}
              step={step}
              index={index}
              isActive={currentStepIndex === index}
              onClick={() => onStepClick(index)}
            />
          ))}
        </div>

        {/* Progress Summary */}
        <div className="mt-6 pt-6 border-t sticky bottom-0 bg-background">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">
                {lessonData.lessonProgress.completedSteps} / {lessonData.lessonProgress.totalSteps}
              </span>
            </div>
            <Progress
              value={lessonData.lessonProgress.totalSteps > 0
                ? (lessonData.lessonProgress.completedSteps / lessonData.lessonProgress.totalSteps) * 100
                : 0}
              className="h-2"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}