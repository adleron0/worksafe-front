import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, ArrowRight, BookOpen } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface NextLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLessonTitle: string;
  nextLessonId: number;
  modelId?: number;
  classId?: number;
}

export function NextLessonModal({
  isOpen,
  onClose,
  currentLessonTitle,
  nextLessonId,
  modelId,
  classId
}: NextLessonModalProps) {
  const navigate = useNavigate();

  // Efeito de confetti suave quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      // Dispara confetti mais suave
      confetti({
        particleCount: 50,
        spread: 45,
        origin: { y: 0.7 },
        colors: ['#10b981', '#34d399', '#86efac']
      });
    }
  }, [isOpen]);

  const handleNavigateToNext = () => {
    onClose();
    navigate({ 
      to: `/student/lesson/${nextLessonId}`,
      search: {
        modelId: modelId,
        classId: classId
      }
    });
  };

  const handleNavigateToLessons = () => {
    onClose();
    if (classId) {
      navigate({ to: `/student/course/${classId}/lessons` });
    } else {
      navigate({ to: '/student/courses' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-green-500">
            <CheckCircle className="h-full w-full" />
          </div>
          <DialogTitle className="text-2xl w-full text-center">Aula Concluída! ✨</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Você concluiu com sucesso a aula
            <span className="block font-semibold text-foreground mt-1">
              "{currentLessonTitle}"
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Pronto para continuar sua jornada de aprendizado?
            </p>
            <div className="bg-primary/10 rounded-lg p-3 mt-3">
              <p className="text-sm font-medium text-primary">
                Próxima aula disponível! 🎯
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col space-y-2 sm:space-y-0 sm:flex-row w-full">
          <Button
            variant="outline"
            onClick={handleNavigateToLessons}
            className="w-full sm:w-auto"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Ver todas as aulas
          </Button>
          <Button
            onClick={handleNavigateToNext}
            className="w-full sm:w-auto"
          >
            Próxima aula
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}