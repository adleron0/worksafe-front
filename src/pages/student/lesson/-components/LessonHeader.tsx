import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, Clock, PlayCircle } from 'lucide-react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import type { LessonDataWithSteps, LessonStatus } from '../types';

interface LessonHeaderProps {
  lessonData: LessonDataWithSteps;
  isCompleted: boolean;
  classId?: number;
}

export function LessonHeader({ lessonData, isCompleted, classId }: LessonHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Pegar courseId do state da navegação
  const courseIdFromState = (location.state as any)?.courseId;
  
  
  // Usar o status da lesson ou determinar baseado em isCompleted
  const lessonStatus: LessonStatus = lessonData.lessonProgress.status || 
    (isCompleted ? 'COMPLETED' : lessonData.lessonProgress.startedAt ? 'IN_PROGRESS' : 'NOT_STARTED');
  
  // Função para renderizar o badge de status
  const renderStatusBadge = () => {
    switch (lessonStatus) {
      case 'COMPLETED':
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-xs">
            <CheckCircle className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
            <span className="hidden md:inline">Aula Concluída</span>
            <span className="md:hidden">Concluída</span>
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 text-xs">
            <Clock className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
            <span className="hidden md:inline">Em Progresso - {lessonData.lessonProgress.progress}%</span>
            <span className="md:hidden">Em Progresso</span>
            <span className="md:hidden ml-1">- {lessonData.lessonProgress.progress}%</span>
          </Badge>
        );
      case 'NOT_STARTED':
        return (
          <Badge variant="secondary" className="text-xs">
            <PlayCircle className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
            <span className="hidden md:inline">Não Iniciada</span>
            <span className="md:hidden">Não Iniciada</span>
          </Badge>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="border-b">
      <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start md:items-center gap-3 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:h-9 md:w-9 mt-0.5 md:mt-0"
              onClick={() => {
                // Priorizar classId das props (vem dos search params), depois outras fontes
                const courseIdToUse = classId || courseIdFromState || lessonData.classId || lessonData.courseId;
                if (courseIdToUse) {
                  navigate({ to: `/student/course/${courseIdToUse}/lessons` });
                } else {
                  navigate({ to: '/student/courses' });
                }
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-base md:text-xl font-bold leading-tight">{lessonData.lesson.title}</h1>
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 mt-1">
                <p className="text-xs md:text-sm text-muted-foreground">{lessonData.courseName}</p>
                {lessonData.lessonProgress.lastAccessAt && (
                  <span className="text-xs text-muted-foreground">
                    <span className="hidden md:inline">• </span>
                    <span className="md:hidden">Último acesso: </span>
                    <span className="hidden md:inline">Último acesso: </span>
                    {new Date(lessonData.lessonProgress.lastAccessAt).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <div className="flex items-center gap-2">
              {renderStatusBadge()}
            </div>
            
            {/* Mostrar progresso dos steps */}
            <div className="text-xs md:text-sm text-muted-foreground">
              {lessonData.lessonProgress.completedSteps} de {lessonData.lessonProgress.totalSteps} etapas
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}