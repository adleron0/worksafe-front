import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  PlayCircle,
  CheckCircle,
  Lock,
  Clock,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  FileCheck,
  Award,
  XCircle,
  Eye
} from 'lucide-react';
import { get } from '@/services/api-s';
import Loader from '@/components/general-components/Loader';
import { useStudentAuth } from '@/context/StudentAuthContext';
import { ExamResultCard } from './-components/ExamResultCard';
import { ExamDetailsModal } from './-components/ExamDetailsModal';

export const Route = createFileRoute('/student/course/$courseId/lessons')({
  component: CourseLessons,
});

// Interfaces
interface StepProgress {
  id: number;
  progressPercent: number;
  progressData: Record<string, unknown> | null;
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

interface ExamOption {
  text: string;
  isCorrect: boolean;
  isSelected: boolean;
  isUserCorrect: boolean;
}

interface ExamResponse {
  options: ExamOption[];
  question: string;
}

interface Exam {
  id: number;
  result: boolean;
  createdAt: string;
  certificates?: Array<{
    key: string;
  }>;
  examResponses: ExamResponse[];
}

interface CourseClass {
  id: number;
  hoursDuration: number;
  allowExam?: boolean;
  classCode?: string;
  exams?: Exam[];
  certificates?: Array<{
    key: string;
  }>;
  onlineCourseModel: {
    id: number;
    lessons: ModelLesson[];
    course: Course;
  };
}

function CourseLessons() {
  const { courseId } = Route.useParams(); // Na verdade é o classId
  const navigate = useNavigate();
  const { studentData } = useStudentAuth();
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [showExamDetails, setShowExamDetails] = useState(false);

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
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Status Icon */}
            <div className="mt-0.5 sm:mt-1">
              {isLocked ? (
                <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              ) : isCompleted ? (
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              ) : isInProgress ? (
                <div className="relative">
                  <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                  <div className="absolute -bottom-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                </div>
              ) : (
                <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium line-clamp-2 text-sm sm:text-base">
                    Aula {index + 1}: {lesson.title}
                  </h4>
                  {lesson.steps && lesson.steps.length > 0 && (
                    <Badge variant="outline" className="shrink-0 text-xs sm:text-sm">
                      <Clock className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">{lesson.steps.length} etapa{lesson.steps.length !== 1 ? 's' : ''}</span>
                      <span className="sm:hidden">{lesson.steps.length}</span>
                    </Badge>
                  )}
                </div>
                {lesson.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {lesson.description}
                  </p>
                )}
              </div>

              {/* Contador de steps */}
              {lesson.steps && lesson.steps.length > 0 && (
                <div className="text-xs sm:text-sm text-muted-foreground">
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
                      to: `/student/lesson/${lesson.id}`,
                      search: {
                        modelId: courseData.onlineCourseModel.id,
                        classId: courseData.id
                      }
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

      {/* Exam Button/Card */}
      {courseData.allowExam && courseData.classCode && (
        <>
          {courseData.exams && courseData.exams.length > 0 ? (
            // Mostrar resultado da prova se já foi feita
            <>
              <ExamResultCard
                exam={{
                  ...courseData.exams[0],
                  certificates: courseData.certificates // Passar certificados do courseData
                }}
                onViewDetails={() => setShowExamDetails(true)}
              />
              <ExamDetailsModal
                isOpen={showExamDetails}
                onClose={() => setShowExamDetails(false)}
                examResponses={courseData.exams[0].examResponses}
                result={courseData.exams[0].result}
              />
            </>
          ) : (
            // Mostrar botão para fazer prova se ainda não foi feita
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <FileCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Prova de Avaliação
                </CardTitle>
                <CardDescription className="text-sm">
                  Teste seus conhecimentos e obtenha seu certificado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Status: {completedLessons === totalLessons ? 'Disponível' : 'Complete todas as aulas primeiro'}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Código da turma: {courseData.classCode}
                      </p>
                    </div>
                    <Button
                      size="default"
                      disabled={completedLessons < totalLessons}
                      className="w-full sm:w-auto"
                      onClick={() => {
                        // Navegar para a prova com auto-login
                        const cpf = studentData?.cpf;
                        if (cpf) {
                          navigate({
                            to: '/prova/$classId',
                            params: { classId: courseId },
                            search: {
                              cpf: cpf,
                              classCode: courseData.classCode,
                              autoLogin: true
                            }
                          });
                        } else {
                          // Se não tiver CPF, vai sem auto-login
                          navigate({
                            to: '/prova/$classId',
                            params: { classId: courseId },
                            search: {
                              cpf: undefined,
                              classCode: undefined,
                              autoLogin: false
                            }
                          });
                        }
                      }}
                    >
                      <FileCheck className="mr-2 h-4 w-4" />
                      <span className="text-sm sm:text-base">
                        {completedLessons === totalLessons ? 'Fazer Prova' : 'Prova Bloqueada'}
                      </span>
                    </Button>
                  </div>
                  {completedLessons < totalLessons && (
                    <div className="p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
                        ⚠️ Você precisa concluir todas as {totalLessons - completedLessons} aulas restantes antes de fazer a prova.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}