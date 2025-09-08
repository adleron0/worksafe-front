import { createFileRoute } from '@tanstack/react-router';
import { useStudentAuth } from '@/context/StudentAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Award, 
  Calendar, 
  Clock, 
  TrendingUp,
  ArrowRight,
  Star
} from 'lucide-react';

export const Route = createFileRoute('/student/')({
  component: StudentDashboard,
});

function StudentDashboard() {
  const { studentData } = useStudentAuth();

  // Dados mockados para demonstração
  const stats = {
    coursesInProgress: 3,
    completedCourses: 7,
    certificates: 5,
    nextClass: {
      name: 'NR-35 - Trabalho em Altura',
      date: '15/01/2025',
      time: '14:00',
      progress: 65,
    },
    recentActivities: [
      { id: 1, type: 'course', title: 'Completou módulo 3 de NR-10', time: '2 horas atrás' },
      { id: 2, type: 'certificate', title: 'Novo certificado disponível: NR-06', time: '1 dia atrás' },
      { id: 3, type: 'payment', title: 'Pagamento confirmado - NR-35', time: '3 dias atrás' },
    ],
    upcomingClasses: [
      { id: 1, name: 'NR-35', date: '15/01', time: '14:00' },
      { id: 2, name: 'NR-10', date: '17/01', time: '09:00' },
      { id: 3, name: 'Primeiros Socorros', date: '20/01', time: '15:00' },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-lg p-6 text-primary-foreground">
        <h1 className="text-2xl font-bold mb-2">
          Bem-vindo de volta, {studentData?.name?.split(' ')[0] || 'Aluno'}! 👋
        </h1>
        <p className="opacity-90">
          Continue sua jornada de aprendizado e conquiste seus objetivos
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cursos em Andamento</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.coursesInProgress}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 dark:text-green-400">+2</span> este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cursos Concluídos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedCourses}</div>
            <p className="text-xs text-muted-foreground">Total acumulado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificados</CardTitle>
            <Award className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.certificates}</div>
            <p className="text-xs text-muted-foreground">Disponíveis para download</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média de Notas</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.5</div>
            <p className="text-xs text-muted-foreground">Desempenho excelente!</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        {/* Próxima Aula */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Próxima Aula</CardTitle>
            <CardDescription>Continue de onde parou</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold">{stats.nextClass.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {stats.nextClass.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {stats.nextClass.time}
                    </span>
                  </div>
                </div>
                <Button size="sm">
                  Continuar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progresso do curso</span>
                  <span className="font-medium">{stats.nextClass.progress}%</span>
                </div>
                <Progress value={stats.nextClass.progress} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Próximas Aulas */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Agenda</CardTitle>
            <CardDescription>Suas próximas aulas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.upcomingClasses.map((class_) => (
                <div key={class_.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{class_.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {class_.date} às {class_.time}
                    </p>
                  </div>
                  <Badge variant="outline">Agendado</Badge>
                </div>
              ))}
              <Button variant="outline" className="w-full" size="sm">
                Ver agenda completa
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Atividades Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
          <CardDescription>Suas últimas ações na plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4">
                <div className="h-2 w-2 bg-primary rounded-full" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
                {activity.type === 'certificate' && (
                  <Badge variant="secondary">Novo</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <h3 className="font-semibold text-lg mb-1">Explore novos cursos</h3>
            <p className="text-sm text-muted-foreground">
              Descubra cursos recomendados baseados no seu perfil
            </p>
          </div>
          <Button>
            Explorar Cursos <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}