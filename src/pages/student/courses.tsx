import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Select from '@/components/general-components/Select';
import { 
  Search, 
  Clock, 
  BookOpen, 
  Users, 
  Star, 
  Filter,
  ChevronRight,
  Calendar,
  Trophy,
  PlayCircle
} from 'lucide-react';

export const Route = createFileRoute('/student/courses')({
  component: StudentCourses,
});

// Tipos mockados
interface Course {
  id: number;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  totalLessons: number;
  completedLessons: number;
  progress: number;
  thumbnail: string;
  category: string;
  level: string;
  rating: number;
  studentsCount: number;
  status: 'not-started' | 'in-progress' | 'completed';
  certificateAvailable: boolean;
  startDate?: string;
  endDate?: string;
}

// Dados mockados
const mockCourses: Course[] = [
  {
    id: 1,
    title: "NR-35 - Trabalho em Altura",
    description: "Curso completo sobre segurança no trabalho em altura, conforme norma regulamentadora NR-35.",
    instructor: "João Silva",
    duration: "8 horas",
    totalLessons: 12,
    completedLessons: 8,
    progress: 67,
    thumbnail: "https://via.placeholder.com/300x200",
    category: "Segurança do Trabalho",
    level: "Intermediário",
    rating: 4.8,
    studentsCount: 1250,
    status: 'in-progress',
    certificateAvailable: false,
    startDate: "2024-01-15",
    endDate: "2024-02-15"
  },
  {
    id: 2,
    title: "NR-10 - Segurança em Instalações Elétricas",
    description: "Capacitação para trabalhos com eletricidade, seguindo as diretrizes da NR-10.",
    instructor: "Maria Santos",
    duration: "40 horas",
    totalLessons: 24,
    completedLessons: 24,
    progress: 100,
    thumbnail: "https://via.placeholder.com/300x200",
    category: "Segurança do Trabalho",
    level: "Avançado",
    rating: 4.9,
    studentsCount: 850,
    status: 'completed',
    certificateAvailable: true,
    startDate: "2023-11-01",
    endDate: "2023-12-15"
  },
  {
    id: 3,
    title: "Primeiros Socorros",
    description: "Técnicas básicas de primeiros socorros para situações de emergência no ambiente de trabalho.",
    instructor: "Carlos Oliveira",
    duration: "4 horas",
    totalLessons: 8,
    completedLessons: 0,
    progress: 0,
    thumbnail: "https://via.placeholder.com/300x200",
    category: "Saúde",
    level: "Básico",
    rating: 4.7,
    studentsCount: 2100,
    status: 'not-started',
    certificateAvailable: false
  },
  {
    id: 4,
    title: "EPI - Equipamentos de Proteção Individual",
    description: "Uso correto, conservação e importância dos EPIs no ambiente de trabalho.",
    instructor: "Ana Costa",
    duration: "3 horas",
    totalLessons: 6,
    completedLessons: 3,
    progress: 50,
    thumbnail: "https://via.placeholder.com/300x200",
    category: "Segurança do Trabalho",
    level: "Básico",
    rating: 4.6,
    studentsCount: 3200,
    status: 'in-progress',
    certificateAvailable: false,
    startDate: "2024-01-20"
  },
  {
    id: 5,
    title: "NR-33 - Espaços Confinados",
    description: "Segurança e saúde nos trabalhos em espaços confinados.",
    instructor: "Pedro Almeida",
    duration: "16 horas",
    totalLessons: 20,
    completedLessons: 0,
    progress: 0,
    thumbnail: "https://via.placeholder.com/300x200",
    category: "Segurança do Trabalho",
    level: "Avançado",
    rating: 4.8,
    studentsCount: 450,
    status: 'not-started',
    certificateAvailable: false
  },
  {
    id: 6,
    title: "Prevenção de Incêndios",
    description: "Técnicas de prevenção e combate a incêndios no ambiente de trabalho.",
    instructor: "Luiza Ferreira",
    duration: "6 horas",
    totalLessons: 10,
    completedLessons: 10,
    progress: 100,
    thumbnail: "https://via.placeholder.com/300x200",
    category: "Segurança do Trabalho",
    level: "Intermediário",
    rating: 4.7,
    studentsCount: 1800,
    status: 'completed',
    certificateAvailable: true,
    startDate: "2023-10-01",
    endDate: "2023-10-15"
  }
];

const categories = [
  { id: '1', name: 'Segurança do Trabalho' },
  { id: '2', name: 'Saúde' },
  { id: '3', name: 'Meio Ambiente' },
  { id: '4', name: 'Qualidade' }
];

const levels = [
  { id: '1', name: 'Básico' },
  { id: '2', name: 'Intermediário' },
  { id: '3', name: 'Avançado' }
];

function StudentCourses() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  // Filtrar cursos baseado na aba ativa
  const filterCoursesByTab = (courses: Course[]) => {
    switch (activeTab) {
      case 'in-progress':
        return courses.filter(c => c.status === 'in-progress');
      case 'completed':
        return courses.filter(c => c.status === 'completed');
      case 'not-started':
        return courses.filter(c => c.status === 'not-started');
      default:
        return courses;
    }
  };

  // Aplicar filtros
  const filteredCourses = filterCoursesByTab(mockCourses).filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || course.category === categories.find(c => c.id === selectedCategory)?.name;
    const matchesLevel = !selectedLevel || course.level === levels.find(l => l.id === selectedLevel)?.name;
    
    return matchesSearch && matchesCategory && matchesLevel;
  });

  const getStatusBadge = (status: Course['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Concluído</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-500">Em Andamento</Badge>;
      case 'not-started':
        return <Badge variant="outline">Não Iniciado</Badge>;
    }
  };

  const CourseCard = ({ course }: { course: Course }) => (
    <Card className="h-full hover:shadow-lg transition-shadow">
      <div className="aspect-video relative overflow-hidden bg-muted">
        <img 
          src={course.thumbnail} 
          alt={course.title}
          className="object-cover w-full h-full"
        />
        {course.status === 'in-progress' && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-blue-500">{course.progress}%</Badge>
          </div>
        )}
        {course.certificateAvailable && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-green-500">
              <Trophy className="h-3 w-3 mr-1" />
              Certificado
            </Badge>
          </div>
        )}
      </div>
      
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <Badge variant="secondary" className="text-xs">
            {course.category}
          </Badge>
          {getStatusBadge(course.status)}
        </div>
        <CardTitle className="line-clamp-2">{course.title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {course.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {course.status === 'in-progress' && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Progresso</span>
                <span>{course.completedLessons}/{course.totalLessons} aulas</span>
              </div>
              <Progress value={course.progress} className="h-2" />
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{course.duration}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              <span>{course.totalLessons} aulas</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{course.studentsCount}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{course.rating}</span>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <span>Instrutor: {course.instructor}</span>
          </div>

          {course.startDate && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                Início: {new Date(course.startDate).toLocaleDateString('pt-BR')}
                {course.endDate && ` • Fim: ${new Date(course.endDate).toLocaleDateString('pt-BR')}`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        <Button className="w-full" variant={course.status === 'not-started' ? 'default' : 'outline'}>
          {course.status === 'not-started' && (
            <>
              <PlayCircle className="h-4 w-4 mr-2" />
              Iniciar Curso
            </>
          )}
          {course.status === 'in-progress' && (
            <>
              <ChevronRight className="h-4 w-4 mr-2" />
              Continuar
            </>
          )}
          {course.status === 'completed' && (
            <>
              <Trophy className="h-4 w-4 mr-2" />
              Ver Certificado
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Meus Cursos</h1>
        <p className="text-muted-foreground">
          Gerencie seus cursos e acompanhe seu progresso
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Cursos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockCourses.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {mockCourses.filter(c => c.status === 'in-progress').length}
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
              {mockCourses.filter(c => c.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Certificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              {mockCourses.filter(c => c.certificateAvailable).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
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
            
            <div className="flex gap-2">
              <Select
                name="category"
                options={categories}
                state={selectedCategory}
                onChange={(_, value) => setSelectedCategory(value as string)}
                placeholder="Categoria"
                value="id"
                label="name"
              />
              
              <Select
                name="level"
                options={levels}
                state={selectedLevel}
                onChange={(_, value) => setSelectedLevel(value as string)}
                placeholder="Nível"
                value="id"
                label="name"
              />
              
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs and Course Grid */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            Todos ({mockCourses.length})
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            Em Andamento ({mockCourses.filter(c => c.status === 'in-progress').length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Concluídos ({mockCourses.filter(c => c.status === 'completed').length})
          </TabsTrigger>
          <TabsTrigger value="not-started">
            Não Iniciados ({mockCourses.filter(c => c.status === 'not-started').length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6">
          {filteredCourses.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map(course => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <Card className="p-12">
              <div className="text-center space-y-3">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">Nenhum curso encontrado</h3>
                <p className="text-muted-foreground">
                  Tente ajustar os filtros ou fazer uma nova busca
                </p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}