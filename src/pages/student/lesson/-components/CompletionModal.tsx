import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, Home, Award, GraduationCap } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonTitle: string;
  classId?: number;
}

export function CompletionModal({
  isOpen,
  onClose,
  lessonTitle,
  classId
}: CompletionModalProps) {
  const navigate = useNavigate();

  // Efeito de confetti intenso quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      // Dispara confetti mais intenso para conclusão do curso
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        }));
        confetti(Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        }));
      }, 250);
    }
  }, [isOpen]);

  const handleNavigateToCourses = () => {
    onClose();
    navigate({ to: '/student/courses' });
  };

  const handleNavigateToCertificates = () => {
    onClose();
    // TODO: Navegar para página de certificados quando disponível
    if (classId) {
      navigate({ to: `/student/course/${classId}/lessons` });
    } else {
      navigate({ to: '/student/courses' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 relative">
            <GraduationCap className="h-16 w-16 text-primary" />
            <Award className="h-8 w-8 text-yellow-500 absolute -bottom-1 -right-1" />
          </div>
          <DialogTitle className="text-2xl w-full text-center">
            🎆 Parabéns! Curso Concluído! 🎆
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Você completou com sucesso todas as aulas do curso!
            <span className="block text-xs text-muted-foreground mt-2">
              Última aula concluída: "{lessonTitle}"
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-foreground mb-2">
              🏆 Conquista Desbloqueada!
            </p>
            <p className="text-xs text-muted-foreground">
              Seu certificado estará disponível em breve.
              Você receberá uma notificação quando estiver pronto.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
              <p className="text-xs font-medium">100%</p>
              <p className="text-xs text-muted-foreground">Completo</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Award className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
              <p className="text-xs font-medium">Certificado</p>
              <p className="text-xs text-muted-foreground">Em breve</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col space-y-2 sm:space-y-0 sm:flex-row w-full">
          <Button
            variant="outline"
            onClick={handleNavigateToCourses}
            className="w-full sm:w-auto"
          >
            <Home className="mr-2 h-4 w-4" />
            Meus Cursos
          </Button>
          <Button
            onClick={handleNavigateToCertificates}
            className="w-full sm:w-auto"
          >
            <Award className="mr-2 h-4 w-4" />
            Ver Certificados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}