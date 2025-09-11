import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  BookOpen, 
  Users, 
  ChevronRight,
  Calendar,
  Trophy,
  PlayCircle,
  GraduationCap
} from 'lucide-react';
import { get, post } from '@/services/api-s';
import { useToast } from '@/hooks/use-toast';
import Loader from '@/components/general-components/Loader';

export const Route = createFileRoute('/student/courses')({
  component: StudentCourses,
});

// Interfaces
interface OnlineStudentLessonProgress {
  id: number | null;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  startedAt: string | null;
  completedAt: string | null;
  currentStepOrder: number;
  maxStepReached: number;
  lastAccessAt: string | null;
}

interface Course {
  id: number;
  name: string;
  description: string;
  hoursDuration: number;
}

interface OnlineCourseModel {
  id: number;
  course: Course;
  lessonsCount?: number;
  modelLessons?: any[]; // Para compatibilidade
}

interface CourseClass {
  id: number;
  name?: string;
  startDate: string;
  endDate: string;
  maxSubscriptions: number;
  currentSubscriptions: number;
  onlineCourseModel: OnlineCourseModel;
  company?: {
    id?: number;
    name: string;
  };
}

interface StudentCourse {
  id: number;
  traineeId?: number;
  classId: number;
  subscribedAt?: string;
  subscribeStatus?: 'pending' | 'confirmed' | 'cancelled';
  class: CourseClass;
  onlineStudentLessonProgress?: OnlineStudentLessonProgress;
  progress?: number; // Manter para compatibilidade
}

function StudentCourses() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('available');

  // Buscar cursos disponíveis
  const { data: availableCourses, isLoading: isLoadingAvailable } = useQuery({
    queryKey: ['student-courses', 'available', searchTerm],
    queryFn: async () => {
      const params: Array<{ key: string; value: string | number | boolean }> = [
        { key: 'page', value: 1 },
        { key: 'limit', value: 20 },
        { key: 'active', value: true }
      ];
      
      if (searchTerm) {
        params.push({ key: 'search', value: searchTerm });
      }
      
      const response = await get<{ total: number; rows: StudentCourse[] }>('student-courses', '', params);
      
      // Filtrar apenas cursos válidos com estrutura completa
      const validCourses = response?.rows?.filter(course => 
        course && 
        course.class && 
        course.class.onlineCourseModel && 
        course.class.onlineCourseModel.course
      ) || [];
      
      return validCourses;
    },
  });

  // Buscar meus cursos
  const { data: myCourses, isLoading: isLoadingMyCourses } = useQuery({
    queryKey: ['student-courses', 'my-courses'],
    queryFn: async () => {
      const response = await get<StudentCourse[]>('student-courses', 'my-courses');
      
      // Filtrar apenas cursos válidos com estrutura completa
      const validCourses = response?.filter(course => 
        course && 
        course.class && 
        course.class.onlineCourseModel && 
        course.class.onlineCourseModel.course
      ) || [];
      
      return validCourses;
    },
  });

  // Mutation para inscrição em curso
  const { mutate: enrollInCourse, isPending: isEnrolling } = useMutation({
    mutationFn: async (courseClassId: number) => {
      return post('student-courses', '', { courseClassId });
    },
    onSuccess: () => {
      toast({
        title: 'Inscrição realizada!',
        description: 'Você foi inscrito no curso com sucesso.',
        variant: 'success',
      });
      
      // Invalidar queries para atualizar as listas
      queryClient.invalidateQueries({ queryKey: ['student-courses'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao realizar inscrição';
      toast({
        title: 'Erro na inscrição',
        description: message,
        variant: 'destructive',
      });
    },
  });

  // Filtrar cursos baseado na aba ativa
  const getFilteredCourses = () => {
    if (activeTab === 'available') {
      // Disponíveis: cursos não inscritos + cursos inscritos mas NOT_STARTED
      const notEnrolled = availableCourses || [];
      const notStarted = myCourses?.filter(c => 
        c.onlineStudentLessonProgress?.status === 'NOT_STARTED' || 
        !c.onlineStudentLessonProgress
      ) || [];
      return [...notEnrolled, ...notStarted];
    } else if (activeTab === 'enrolled') {
      // Em andamento: apenas IN_PROGRESS
      return myCourses?.filter(c => 
        c.onlineStudentLessonProgress?.status === 'IN_PROGRESS'
      ) || [];
    } else if (activeTab === 'completed') {
      // Concluídos: status COMPLETED
      return myCourses?.filter(c => 
        c.onlineStudentLessonProgress?.status === 'COMPLETED'
      ) || [];
    }
    return [];
  };

  const filteredCourses = getFilteredCourses();

  // Verificar se o aluno já está inscrito
  const isEnrolled = (classId: number) => {
    return myCourses?.some(c => c.classId === classId);
  };

  // Calcular vagas disponíveis
  const getAvailableSlots = (courseClass: CourseClass) => {
    const available = courseClass.maxSubscriptions - courseClass.currentSubscriptions;
    return available > 0 ? available : 0;
  };

  const CourseCard = ({ course }: { course: StudentCourse }) => {
    // Verificar se course e class existem
    if (!course || !course.class) {
      return null;
    }
    
    const courseClass = course.class;
    
    // Verificar se onlineCourseModel existe
    if (!courseClass.onlineCourseModel || !courseClass.onlineCourseModel.course) {
      return null;
    }
    
    const enrolled = isEnrolled(courseClass.id);
    const availableSlots = getAvailableSlots(courseClass);
    const hasSlots = availableSlots > 0;
    
    return (
      <Card className="h-full hover:shadow-lg transition-shadow">
        {/* Header com badges */}
        <CardHeader>
          <div className="flex justify-between items-start mb-2">
            <Badge variant="secondary" className="text-xs">
              {courseClass.onlineCourseModel.course.hoursDuration}h
            </Badge>
            {enrolled && (
              <Badge className="bg-green-500">
                Inscrito
              </Badge>
            )}
            {!enrolled && !hasSlots && (
              <Badge variant="destructive">
                Sem vagas
              </Badge>
            )}
          </div>
          
          <CardTitle className="line-clamp-2">
            {courseClass.onlineCourseModel.course.name}
          </CardTitle>
          
          <CardDescription className="line-clamp-3">
            {courseClass.onlineCourseModel.course.description || 'Sem descrição disponível'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            {/* Progresso para cursos inscritos */}
            {enrolled && course.onlineStudentLessonProgress && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium">
                    {course.onlineStudentLessonProgress.status === 'COMPLETED' ? '✅ Concluído' :
                     course.onlineStudentLessonProgress.status === 'IN_PROGRESS' ? '📚 Em andamento' :
                     '🆕 Não iniciado'}
                  </span>
                </div>
                {course.onlineStudentLessonProgress.lastAccessAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Último acesso: {new Date(course.onlineStudentLessonProgress.lastAccessAt).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            )}
            
            {/* Informações do curso */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  Início: {new Date(courseClass.startDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
              
              {courseClass.endDate && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Término: {new Date(courseClass.endDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="h-3 w-3" />
                <span>
                  {courseClass.onlineCourseModel.lessonsCount || courseClass.onlineCourseModel.modelLessons?.length || 0} aulas
                </span>
              </div>
              
              {!enrolled && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>
                    {availableSlots} vagas disponíveis
                  </span>
                </div>
              )}
              
              {courseClass.company && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GraduationCap className="h-3 w-3" />
                  <span>{courseClass.company.name}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        
        <CardFooter>
          {enrolled ? (
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => navigate({ to: `/student/course/${courseClass.id}/lessons` })}
            >
              {course.onlineStudentLessonProgress?.status === 'COMPLETED' ? (
                <>
                  <Trophy className="h-4 w-4 mr-2" />
                  Ver Certificado
                </>
              ) : course.onlineStudentLessonProgress?.status === 'IN_PROGRESS' ? (
                <>
                  <ChevronRight className="h-4 w-4 mr-2" />
                  Continuar
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Iniciar
                </>
              )}
            </Button>
          ) : (
            <Button 
              className="w-full"
              disabled={!hasSlots || isEnrolling}
              onClick={() => enrollInCourse(courseClass.id)}
            >
              {hasSlots ? (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  {isEnrolling ? 'Inscrevendo...' : 'Inscrever-se'}
                </>
              ) : (
                'Sem vagas'
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  if (isLoadingAvailable || isLoadingMyCourses) {
    return <Loader title="Carregando cursos..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Cursos</h1>
        <p className="text-muted-foreground">
          Explore cursos disponíveis e gerencie suas inscrições
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cursos Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(availableCourses?.length || 0) + 
               (myCourses?.filter(c => 
                 c.onlineStudentLessonProgress?.status === 'NOT_STARTED' || 
                 !c.onlineStudentLessonProgress
               ).length || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Meus Cursos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {myCourses?.length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {myCourses?.filter(c => 
                c.onlineStudentLessonProgress?.status === 'IN_PROGRESS'
              ).length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {myCourses?.filter(c => c.onlineStudentLessonProgress?.status === 'COMPLETED').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="search"
                  placeholder="Buscar cursos..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs and Course Grid */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available">
            Disponíveis ({(availableCourses?.length || 0) + 
              (myCourses?.filter(c => 
                c.onlineStudentLessonProgress?.status === 'NOT_STARTED' || 
                !c.onlineStudentLessonProgress
              ).length || 0)})
          </TabsTrigger>
          <TabsTrigger value="enrolled">
            Em Andamento ({myCourses?.filter(c => 
              c.onlineStudentLessonProgress?.status === 'IN_PROGRESS'
            ).length || 0})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Concluídos ({myCourses?.filter(c => c.onlineStudentLessonProgress?.status === 'COMPLETED').length || 0})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6">
          {filteredCourses.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map(course => (
                <CourseCard key={course.id || course.class.id} course={course} />
              ))}
            </div>
          ) : (
            <Card className="p-12">
              <div className="text-center space-y-3">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">Nenhum curso encontrado</h3>
                <p className="text-muted-foreground">
                  {activeTab === 'available' 
                    ? 'Não há cursos disponíveis no momento'
                    : activeTab === 'enrolled'
                    ? 'Você não está inscrito em nenhum curso'
                    : 'Você ainda não concluiu nenhum curso'}
                </p>
                {activeTab !== 'available' && (
                  <Button 
                    variant="outline"
                    onClick={() => setActiveTab('available')}
                  >
                    Ver cursos disponíveis
                  </Button>
                )}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}