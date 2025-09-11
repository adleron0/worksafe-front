import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, ArrowRight, Home } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonTitle: string;
  classId?: number;
  nextLessonId?: number;
  nextLessonTitle?: string;
}

export function CompletionModal({
  isOpen,
  onClose,
  lessonTitle,
  classId,
  nextLessonId,
  nextLessonTitle
}: CompletionModalProps) {
  const navigate = useNavigate();

  // Efeito de confetti quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      // Dispara confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isOpen]);

  const handleNavigateToLessons = () => {
    onClose();
    if (classId) {
      navigate({ to: `/student/course/${classId}/lessons` });
    } else {
      navigate({ to: '/student/courses' });
    }
  };

  const handleNavigateToNextLesson = () => {
    onClose();
    if (nextLessonId) {
      navigate({ to: `/student/lesson/${nextLessonId}` });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-green-500">
            <CheckCircle className="h-full w-full" />
          </div>
          <DialogTitle className="text-2xl w-full text-center">Parabéns! 🎉</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Você concluiu a aula
            <span className="block font-semibold text-foreground mt-1">
              "{lessonTitle}"
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {nextLessonTitle ? (
            <div className="text-center text-sm text-muted-foreground">
              Próxima aula disponível:
              <span className="block font-medium text-foreground mt-1">
                {nextLessonTitle}
              </span>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              Você concluiu todas as aulas disponíveis!
            </div>
          )}
        </div>

        <DialogFooter className="flex-col space-y-2 sm:space-y-0 sm:flex-row w-full !justify-center">
          <Button
            variant="outline"
            onClick={handleNavigateToLessons}
            className="w-full sm:w-auto"
          >
            <Home className="mr-2 h-4 w-4" />
            Ver todas as aulas
          </Button>
          {nextLessonId && (
            <Button
              onClick={handleNavigateToNextLesson}
              className="w-full sm:w-auto"
            >
              Próxima aula
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}