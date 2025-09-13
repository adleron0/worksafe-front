import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useStudentAuth } from '@/context/StudentAuthContext';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BookOpen, 
  Award, 
  Calendar, 
  Clock, 
  TrendingUp,
  ArrowRight,
  Star,
  GraduationCap,
  Download,
  Eye
} from 'lucide-react';
import { get } from '@/services/api-s';
import { CertificateThumbnail } from '@/components/general-components/visualizadorCertificados';
import VisualizadorCertificados from '@/components/general-components/visualizadorCertificados';
import CertificatePDFService from '@/components/general-components/visualizadorCertificados/services/CertificatePDFService';
import Dialog from '@/components/general-components/Dialog';
import { toast } from '@/hooks/use-toast';
import { useLoader } from '@/context/GeneralContext';

export const Route = createFileRoute('/student/')({
  component: StudentDashboard,
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

interface CourseClass {
  id: number;
  name?: string;
  startDate: string;
  endDate: string;
  onlineCourseModel: {
    course: {
      name: string;
      hoursDuration: number;
    };
    lessonsCount?: number;
    modelLessons?: any[]; // Para compatibilidade
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

interface Certificate {
  id: number;
  courseId: number;
  traineeId: number;
  classId: number;
  companyId: number;
  expirationDate?: string | null;
  fabricJsonFront: string;
  fabricJsonBack: string | null;
  variableToReplace: any;
  showOnWebsiteConsent: boolean;
  pdfUrl?: string | null;
  key: string;
  createdAt: string;
  updatedAt: string;
  inactiveAt?: string | null;
  course?: {
    name: string;
  };
  class?: {
    name: string;
  };
}

function StudentDashboard() {
  const { studentData } = useStudentAuth();
  const navigate = useNavigate();
  const { showLoader, hideLoader } = useLoader();
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [showViewerModal, setShowViewerModal] = useState(false);

  // Buscar cursos do aluno
  const { data: myCourses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['student-courses', 'my-courses'],
    queryFn: async () => {
      const response = await get<{ rows: StudentCourse[] } | StudentCourse[]>('student-courses', 'my-courses');
      
      // Verificar se é um array direto ou objeto com rows
      let courses = Array.isArray(response) ? response : response?.rows || [];
      
      // Filtrar apenas cursos válidos com estrutura completa
      const validCourses = courses.filter(course => 
        course && 
        course.class && 
        course.class.onlineCourseModel && 
        course.class.onlineCourseModel.course
      );
      
      return validCourses;
    },
  });

  // Buscar certificados
  const { data: certificatesResponse, isLoading: isLoadingCertificates } = useQuery({
    queryKey: ['student-certificates'],
    queryFn: async () => {
      const response = await get<{ total: number; rows: Certificate[] }>('student-certificates');
      return response;
    },
  });

  const certificates = certificatesResponse?.rows || [];

  // Buscar progresso geral
  const { data: studentProgress, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['student-progress'],
    queryFn: async () => {
      const response = await get<any>('student-progress', 'summary');
      return response || {};
    },
  });

  // Calcular estatísticas
  const coursesInProgress = myCourses?.filter(c => 
    c.onlineStudentLessonProgress?.status === 'IN_PROGRESS'
  ).length || 0;
  const certificatesCount = certificatesResponse?.total || 0;

  // Função para gerar e baixar PDF do certificado
  const handleDownloadPDF = async (certificate: Certificate) => {
    if (!certificate.fabricJsonFront || !certificate.variableToReplace) {
      toast({
        title: "Erro ao gerar PDF",
        description: "Dados incompletos para gerar o certificado",
        variant: "destructive",
      });
      return;
    }

    showLoader("Gerando PDF do certificado...");

    try {
      const certificateData = {
        id: certificate.id,
        name: certificate.variableToReplace?.curso_nome?.value || 'Certificado',
        fabricJsonFront: certificate.fabricJsonFront,
        fabricJsonBack: certificate.fabricJsonBack,
        certificateId: certificate.key || 'CERT-001'
      };

      const result = await CertificatePDFService.generatePDF(
        certificateData,
        certificate.variableToReplace,
        { 
          returnBlob: true,
          quality: 'high'
        }
      );

      if (result.success && result.data instanceof Blob) {
        // Criar URL do blob
        const pdfUrl = URL.createObjectURL(result.data);
        
        // Criar link temporário para download
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = result.fileName || 'certificado.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpar URL após download
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
        }, 1000);
        
        hideLoader();
        toast({
          title: "PDF baixado com sucesso!",
          description: "O certificado foi salvo em sua pasta de downloads",
          variant: "success",
        });
      } else {
        throw new Error(result.error || "Erro ao gerar PDF");
      }
    } catch (error) {
      hideLoader();
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: error instanceof Error ? error.message : "Erro desconhecido ao gerar o certificado",
        variant: "destructive",
      });
    }
  };

  // Função para abrir modal de visualização
  const handleViewCertificate = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setShowViewerModal(true);
  };

  // Próxima aula - buscar o primeiro curso em progresso, ou não iniciado se não houver nenhum em progresso
  const nextClass = myCourses?.find(c => 
    c.onlineStudentLessonProgress?.status === 'IN_PROGRESS'
  ) || myCourses?.find(c => 
    c.onlineStudentLessonProgress?.status === 'NOT_STARTED' || !c.onlineStudentLessonProgress
  );

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-lg p-6 text-primary-foreground">
        <h1 className="text-2xl font-bold mb-2">
          Bem-vindo de volta, {(studentData?.name || '').split(' ')[0] || 'Aluno'}! 👋
        </h1>
        <p className="opacity-90">
          Continue sua jornada de aprendizado e conquiste seus objetivos
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {(isLoadingCourses || isLoadingProgress) ? (
          // Skeleton for stats cards
          [...Array(4)].map((_, index) => (
            <Card key={`skeleton-stat-${index}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[60%]" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[40%] mb-2" />
                <Skeleton className="h-3 w-[80%]" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium break-words">Cursos Matriculados</CardTitle>
            <BookOpen className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentProgress?.summary?.totalCourses || 0}</div>
            <p className="text-xs text-muted-foreground break-words">
              {coursesInProgress > 0 ? `${coursesInProgress} em andamento` : 'Total de cursos'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium break-words">Progresso Geral</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 ml-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentProgress?.summary?.overallProgress || 0}%</div>
            <p className="text-xs text-muted-foreground break-words">
              {studentProgress?.summary?.completedSteps || 0} de {studentProgress?.summary?.totalSteps || 0} etapas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium break-words">Certificados</CardTitle>
            <Award className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 ml-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certificatesCount}</div>
            <p className="text-xs text-muted-foreground break-words">Disponíveis para download</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium break-words">Etapas Concluídas</CardTitle>
            <Star className="h-4 w-4 text-yellow-500 flex-shrink-0 ml-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentProgress?.summary?.completedSteps || 0}</div>
            <p className="text-xs text-muted-foreground break-words">
              {studentProgress?.summary?.inProgressSteps > 0 
                ? `${studentProgress?.summary?.inProgressSteps} em progresso` 
                : 'Total completado'}
            </p>
          </CardContent>
        </Card>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        {/* Próxima Aula */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Próxima Aula</CardTitle>
            <CardDescription>Continue de onde parou</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCourses || isLoadingProgress ? (
              // Skeleton for next class
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-2 min-w-0 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-4 w-[60%]" />
                      <Skeleton className="h-4 w-[40%]" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-full sm:w-auto" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-[70%]" />
                    <Skeleton className="h-4 w-[15%]" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
            ) : nextClass ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="font-semibold break-words">{nextClass.class.onlineCourseModel.course.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(nextClass.class.startDate).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {nextClass.class.onlineCourseModel.course.hoursDuration}h
                      </span>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => navigate({ to: `/student/course/${nextClass.classId}/lessons` })}
                    className="w-full sm:w-auto"
                  >
                    Continuar <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                {nextClass.onlineStudentLessonProgress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Status</span>
                      <span className="font-medium">
                        {nextClass.onlineStudentLessonProgress.status === 'IN_PROGRESS' ? 
                          '📚 Em andamento' : '🆕 Não iniciado'}
                      </span>
                    </div>
                    {nextClass.onlineStudentLessonProgress.lastAccessAt && (
                      <p className="text-xs text-muted-foreground">
                        Último acesso: {new Date(nextClass.onlineStudentLessonProgress.lastAccessAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum curso em andamento</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => navigate({ to: '/student/courses' })}
                >
                  Explorar Cursos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Atividades Recentes */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
            <CardDescription>Suas últimas atividades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingProgress ? (
                // Skeleton for activities
                [...Array(3)].map((_, index) => (
                  <div key={`skeleton-activity-${index}`} className="flex items-center justify-between">
                    <div className="space-y-2 flex-1 min-w-0">
                      <Skeleton className="h-4 w-[75%]" />
                      <Skeleton className="h-3 w-[50%]" />
                    </div>
                    <Skeleton className="h-6 w-12 rounded-full flex-shrink-0" />
                  </div>
                ))
              ) : studentProgress?.recentActivity && studentProgress.recentActivity.length > 0 ? (
                <>
                  {studentProgress.recentActivity.slice(0, 3).map((activity: any, index: number) => (
                    <div key={`activity-${index}`} className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium line-clamp-1">
                          {activity.stepTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.lessonTitle} • {new Date(activity.lastAccessAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Badge variant={activity.progress === 100 ? 'success' : 'outline'}>
                        {activity.progress}%
                      </Badge>
                    </div>
                  ))}
                  {studentProgress?.courses && studentProgress.courses.length > 0 && (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      size="sm"
                      onClick={() => navigate({ to: '/student/courses' })}
                    >
                      Ver todos os cursos
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Nenhuma atividade recente
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Certificados Recentes */}
      {isLoadingCertificates ? (
        // Skeleton for certificates with thumbnail
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[50%] max-w-[160px] mb-2" />
            <Skeleton className="h-4 w-[60%] max-w-[192px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <div key={`skeleton-cert-${index}`} className="flex flex-col min-[480px]:flex-row items-start min-[480px]:items-center gap-4">
                  <Skeleton className="h-20 w-full min-[480px]:w-28 rounded min-[480px]:flex-shrink-0" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-9 rounded" />
                    <Skeleton className="h-9 w-9 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : certificates && certificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Certificados Recentes</CardTitle>
            <CardDescription>Seus certificados disponíveis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {certificates.slice(0, 3).map((cert) => (
                <div key={cert.id} className="flex flex-col min-[480px]:flex-row items-start min-[480px]:items-center gap-4 p-2 hover:bg-muted/50 rounded-lg transition-colors">
                  {/* Thumbnail do certificado */}
                  {cert.fabricJsonFront ? (
                    <div className="w-full min-[480px]:w-28 h-32 min-[480px]:h-20 rounded overflow-hidden border bg-background cursor-pointer min-[480px]:flex-shrink-0"
                         onClick={() => handleViewCertificate(cert)}>
                      <CertificateThumbnail
                        certificateData={{
                          id: cert.id,
                          name: cert.variableToReplace?.curso_nome?.value || 'Certificado',
                          fabricJsonFront: cert.fabricJsonFront,
                          fabricJsonBack: cert.fabricJsonBack,
                          certificateId: cert.key || 'CERT-001'
                        }}
                        variableToReplace={cert.variableToReplace || {}}
                        className="w-full h-full"
                        zoom={15}
                        showLoader={false}
                      />
                    </div>
                  ) : (
                    <div className="w-full min-[480px]:w-28 h-32 min-[480px]:h-20 rounded border bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center min-[480px]:flex-shrink-0">
                      <Award className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium break-words">
                      {cert.variableToReplace?.curso_nome?.value || 'Certificado'}
                    </p>
                    <p className="text-xs text-muted-foreground break-words">
                      Emitido em {new Date(cert.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                    {cert.expirationDate && (
                      <p className="text-xs text-muted-foreground break-words">
                        Válido até {new Date(cert.expirationDate).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-1 flex-shrink-0 w-full min-[480px]:w-auto justify-end">
                    <Button 
                      size="icon" 
                      variant="ghost"
                      className="h-9 w-9"
                      onClick={() => handleViewCertificate(cert)}
                      title="Visualizar certificado"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {cert.pdfUrl ? (
                      <Button 
                        size="icon" 
                        variant="ghost"
                        className="h-9 w-9"
                        onClick={() => cert.pdfUrl && window.open(cert.pdfUrl, '_blank')}
                        title="Baixar PDF salvo"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    ) : cert.fabricJsonFront && (
                      <Button 
                        size="icon" 
                        variant="ghost"
                        className="h-9 w-9"
                        onClick={() => handleDownloadPDF(cert)}
                        title="Gerar e baixar PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {certificates.length > 3 && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="sm"
                  onClick={() => navigate({ to: '/student/courses' })}
                >
                  Ver todos os certificados
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call to Action */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-lg mb-1 break-words">Explore novos cursos</h3>
            <p className="text-sm text-muted-foreground break-words">
              Descubra cursos recomendados baseados no seu perfil
            </p>
          </div>
          <Button onClick={() => navigate({ to: '/student/courses' })} className="w-full sm:w-auto flex-shrink-0">
            Explorar Cursos <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Modal de Visualização do Certificado */}
      {selectedCertificate && (
        <Dialog
          open={showViewerModal}
          onOpenChange={setShowViewerModal}
          title={selectedCertificate.variableToReplace?.curso_nome?.value || 'Certificado'}
          description="Visualização completa do certificado"
          showBttn={false}
          showHeader={false}
        >
          <div className="h-[70vh] w-full">
            <VisualizadorCertificados
              certificateData={{
                id: selectedCertificate.id,
                name: selectedCertificate.variableToReplace?.curso_nome?.value || 'Certificado',
                fabricJsonFront: selectedCertificate.fabricJsonFront,
                fabricJsonBack: selectedCertificate.fabricJsonBack,
                certificateId: selectedCertificate.key || 'CERT-001'
              }}
              variableToReplace={selectedCertificate.variableToReplace || {}}
              zoom={50}
            />
          </div>
        </Dialog>
      )}
    </div>
  );
}