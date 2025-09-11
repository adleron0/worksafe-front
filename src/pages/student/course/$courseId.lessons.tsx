import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  PlayCircle, 
  CheckCircle, 
  Lock, 
  Clock, 
  ArrowLeft,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { get } from '@/services/api-s';
import Loader from '@/components/general-components/Loader';

export const Route = createFileRoute('/student/course/$courseId/lessons')({
  component: CourseLessons,
});

// Interfaces
interface StepProgress {
  id: number;
  progressPercent: number;
  progressData: Record<string, any> | null;
  firstAccessAt?: string;
  lastAccessAt?: string;
  completedAt?: string | null;
}

interface LessonStep {
  id: number;
  title: string;
  order: number;
  duration?: number;
  contentType: string;
  stepProgress?: StepProgress[];
}

interface StudentLessonProgress {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  currentStepOrder: number;
  maxStepReached: number;
}

interface Lesson {
  id: number;
  title: string;
  description: string;
  steps: LessonStep[];
  studentLessonProgress?: StudentLessonProgress[];
}

interface ModelLesson {
  id: number;
  order: number;
  lesson: Lesson;
}

interface Course {
  name: string;
  description: string;
}

interface CourseClass {
  id: number;
  hoursDuration: number;
  onlineCourseModel: {
    lessons: ModelLesson[];
    course: Course;
  };
}

function CourseLessons() {
  const { courseId } = Route.useParams(); // Na verdade é o classId
  const navigate = useNavigate();
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);

  // Buscar dados do curso e aulas (usando classId)
  const { data: courseData, isLoading, error } = useQuery({
    queryKey: ['student-course-lessons', courseId],
    queryFn: async () => {
      console.log('Buscando aulas para a turma (classId):', courseId);
      const response = await get<CourseClass>(`student-courses/${courseId}/lessons`);
      console.log('Resposta da API:', response);
      return response;
    },
  });

  if (isLoading) {
    return <Loader title="Carregando aulas..." />;
  }

  if (error) {
    console.error('Erro ao carregar aulas:', error);
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-muted-foreground">Erro ao carregar as aulas</p>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Erro desconhecido'}
        </p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => navigate({ to: '/student/courses' })}
        >
          Voltar para cursos
        </Button>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-muted-foreground">Nenhuma aula encontrada para esta turma</p>
        <p className="text-sm text-muted-foreground">ID da turma: {courseId}</p>
        <p className="text-xs text-muted-foreground">
          Verifique se você está inscrito nesta turma e se ela possui aulas cadastradas.
        </p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => navigate({ to: '/student/courses' })}
        >
          Voltar para cursos
        </Button>
      </div>
    );
  }

  // Verificar se a estrutura está completa
  if (!courseData.onlineCourseModel || !courseData.onlineCourseModel.course) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-muted-foreground">Estrutura de dados do curso incompleta</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => navigate({ to: '/student/courses' })}
        >
          Voltar para cursos
        </Button>
      </div>
    );
  }

  const course = courseData.onlineCourseModel.course;
  const lessons = courseData.onlineCourseModel.lessons || [];

  // Calcular progresso total do curso
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter(ml => 
    ml.lesson.studentLessonProgress?.[0]?.status === 'COMPLETED'
  ).length;
  const courseProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  // Verificar se a aula está bloqueada (aulas devem ser feitas em ordem)
  const isLessonLocked = (index: number) => {
    if (index === 0) return false; // Primeira aula sempre desbloqueada
    
    // Verifica se a aula anterior foi concluída
    const previousLesson = lessons[index - 1];
    return previousLesson?.lesson.studentLessonProgress?.[0]?.status !== 'COMPLETED';
  };

  // Calcular progresso de uma aula baseado nos steps
  const calculateLessonProgress = (lesson: Lesson): number => {
    const steps = lesson.steps || [];
    if (steps.length === 0) return 0;
    
    const completedSteps = steps.filter(step => 
      step.stepProgress?.[0]?.completedAt !== null && 
      step.stepProgress?.[0]?.completedAt !== undefined
    ).length;
    
    return (completedSteps / steps.length) * 100;
  };



  const LessonCard = ({ modelLesson, index }: { modelLesson: ModelLesson; index: number }) => {
    const lesson = modelLesson.lesson;
    const lessonStatus = lesson.studentLessonProgress?.[0];
    const isCompleted = lessonStatus?.status === 'COMPLETED';
    const isLocked = isLessonLocked(index);
    const isInProgress = lessonStatus?.status === 'IN_PROGRESS';
    const progressPercent = calculateLessonProgress(lesson);

    return (
      <Card 
        className={`transition-all ${
          isLocked ? 'opacity-60' : 'hover:shadow-md cursor-pointer'
        } ${selectedLesson === lesson.id ? 'ring-2 ring-primary' : ''}`}
        onClick={() => !isLocked && setSelectedLesson(lesson.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Status Icon */}
            <div className="mt-1">
              {isLocked ? (
                <Lock className="h-5 w-5 text-muted-foreground" />
              ) : isCompleted ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : isInProgress ? (
                <div className="relative">
                  <PlayCircle className="h-5 w-5 text-blue-500" />
                  <div className="absolute -bottom-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                </div>
              ) : (
                <PlayCircle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium line-clamp-1">
                    Aula {index + 1}: {lesson.title}
                  </h4>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {lesson.description}
                  </p>
                </div>
                {lesson.steps && lesson.steps.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    <Clock className="h-3 w-3 mr-1" />
                    {lesson.steps.length} etapa{lesson.steps.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {/* Contador de steps */}
              {lesson.steps && lesson.steps.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {lesson.steps.filter(step => 
                    step.stepProgress?.[0]?.completedAt !== null && 
                    step.stepProgress?.[0]?.completedAt !== undefined
                  ).length}/{lesson.steps.length} etapas concluídas
                </div>
              )}

              {/* Progress Bar */}
              {isInProgress && !isCompleted && (
                <div className="space-y-1">
                  <Progress value={progressPercent} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">{progressPercent.toFixed(0)}% concluído</p>
                </div>
              )}

              {/* Action Button */}
              {!isLocked && (
                <Button 
                  size="sm" 
                  variant={isCompleted ? "outline" : "default"}
                  className="w-full mt-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ 
                      to: `/student/lesson/${lesson.id}`
                    });
                  }}
                >
                  {isCompleted ? (
                    <>Revisar aula</>
                  ) : isInProgress ? (
                    <>Continuar <ChevronRight className="h-3 w-3 ml-1" /></>
                  ) : (
                    <>Iniciar aula</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/student/courses' })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{course.name}</h1>
          <p className="text-muted-foreground">{course.description}</p>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso do Curso</CardTitle>
          <CardDescription>
            {completedLessons} de {totalLessons} aulas concluídas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={courseProgress} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>{courseProgress.toFixed(0)}% completo</span>
            <span>{courseData.hoursDuration || 0} horas totais</span>
          </div>
        </CardContent>
      </Card>

      {/* Course Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalLessons}</p>
                <p className="text-sm text-muted-foreground">Aulas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{courseData.hoursDuration || 0}h</p>
                <p className="text-sm text-muted-foreground">Duração</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedLessons}</p>
                <p className="text-sm text-muted-foreground">Concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lessons List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Conteúdo do Curso</h2>
        {lessons.length > 0 ? (
          <div className="space-y-3">
            {lessons.map((modelLesson, index) => (
              <LessonCard 
                key={modelLesson.lesson.id} 
                modelLesson={modelLesson} 
                index={index}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhuma aula disponível</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}