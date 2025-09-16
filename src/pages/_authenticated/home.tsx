import { createFileRoute } from '@tanstack/react-router';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Icon from '@/components/general-components/Icon';
import { useNavigate } from '@tanstack/react-router';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip as TooltipUI,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/services/api';
import { ApiError } from '@/general-interfaces/api.interface';
import { GraduationCap, Users, UserCheck, Clock, Award, UserPlus } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/home')({
  component: Home,
})

interface FirstStepsResponse {
  hasCourse: boolean;
  hasInstructor: boolean;
  hasInstructorSignature: boolean;
  hasCertificate: boolean;
  hasAsaasToken: boolean;
  hasClass: boolean;
  allCompleted: boolean;
}

interface Turma {
  id: number;
  name: string;
  finalDate: string;
  initialDate: string;
  status: string;
}

interface TurmasResponse {
  rows: Turma[];
  total: number;
}

interface Subscription {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  subscribeStatus: string;
  class: {
    name: string;
    courseId: number;
  };
}

interface SubscriptionsResponse {
  rows: Subscription[];
  total: number;
}

function Home() {
  const navigate = useNavigate();

  // Query para buscar primeiros passos
  const { data: steps, isLoading: stepsLoading } = useQuery<FirstStepsResponse | undefined, ApiError>({
    queryKey: ['firstSteps'],
    queryFn: async () => {
      return get('companies', 'first-steps');
    },
  });

  // Query para buscar todas as turmas
  const { data: turmasData, isLoading: turmasLoading, isError: turmasError } = useQuery<TurmasResponse | undefined, ApiError>({
    queryKey: ['dashboardTurmas'],
    queryFn: async () => {
      return get('classes', '', [{ key: 'limit', value: 'all' }]);
    },
  });

  // Query para buscar últimas inscrições confirmadas
  const { data: subscriptionsData, isLoading: subscriptionsLoading, isError: subscriptionsError } = useQuery<SubscriptionsResponse | undefined, ApiError>({
    queryKey: ['dashboardSubscriptions'],
    queryFn: async () => {
      return get('subscription', '', [
        { key: 'limit', value: 10 },
        { key: 'order-createdAt', value: 'desc' },
        { key: 'subscribeStatus', value: 'confirmed' },
        { key: 'show', value: ['class'] }
      ]);
    },
  });

  // Query para buscar total de certificados
  const { data: certificatesData, isLoading: certificatesLoading, isError: certificatesError } = useQuery<{ total: number } | undefined, ApiError>({
    queryKey: ['dashboardCertificates'],
    queryFn: async () => {
      return get('trainee-certificate', '', [
        { key: 'limit', value: 1 },
        { key: 'page', value: 0 },
        { key: 'active', value: true }
      ]);
    },
  });

  // Query para buscar total de alunos
  const { data: traineesData, isLoading: traineesLoading, isError: traineesError } = useQuery<{ total: number } | undefined, ApiError>({
    queryKey: ['dashboardTrainees'],
    queryFn: async () => {
      return get('trainee', '', [
        { key: 'limit', value: 1 },
        { key: 'page', value: 0 }
      ]);
    },
  });

  // Separar turmas realizadas e em andamento
  const today = new Date();
  const turmasRealizadas = turmasData?.rows.filter(turma =>
    new Date(turma.finalDate) < today
  ).length || 0;

  const turmasEmAndamento = turmasData?.rows.filter(turma =>
    new Date(turma.finalDate) >= today
  ).length || 0;

  // Formatar data
  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;

    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };


  const checklistItems = [
    {
      key: 'hasCourse' as keyof FirstStepsResponse,
      label: 'Cadastrar ao menos 1 curso',
      icon: 'book-open',
      route: '/treinamentos/cursos',
      help: 'Acesse Treinamentos > Cursos e clique em "Novo Curso". Preencha as informações básicas como nome, descrição e carga horária.'
    },
    {
      key: 'hasInstructor' as keyof FirstStepsResponse,
      label: 'Cadastrar instrutores',
      icon: 'users',
      route: '/treinamentos/instrutores',
      help: 'Vá em Treinamentos > Instrutores e adicione pelo menos um instrutor com nome, CPF e dados de contato.'
    },
    {
      key: 'hasInstructorSignature' as keyof FirstStepsResponse,
      label: 'Adicionar assinatura digital de pelo menos 1 instrutor',
      icon: 'pen-tool',
      route: '/treinamentos/instrutores',
      help: 'Na lista de instrutores, clique em "Editar" e faça upload da assinatura digital (imagem PNG com fundo transparente).'
    },
    {
      key: 'hasCertificate' as keyof FirstStepsResponse,
      label: 'Criar um modelo de certificado',
      icon: 'file-badge',
      route: '/treinamentos/certificados',
      help: 'Em Treinamentos > Certificados, crie um modelo personalizado ou use um template padrão para seus certificados.'
    },
    {
      key: 'hasAsaasToken' as keyof FirstStepsResponse,
      label: 'Configurar conta do Asaas (gateway de pagamento)',
      icon: 'credit-card',
      route: '/integracoes',
      help: 'Acesse Integrações e configure sua conta Asaas inserindo o token de API para processar pagamentos.'
    },
    {
      key: 'hasClass' as keyof FirstStepsResponse,
      label: 'Criar uma turma',
      icon: 'users-round',
      route: '/treinamentos/turmas',
      help: 'Em Treinamentos > Turmas, crie sua primeira turma vinculando a um curso, definindo datas e configurando inscrições.'
    },
  ];

  return (
      <div className="py-8 bg-background/5 min-h-screen">
        {/* Título da Dashboard */}
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        {/* Timeline de Primeiros Passos - com Skeleton */}
        {stepsLoading ? (
          // Skeleton Loader
          <Card className="mb-4 border-0 shadow-sm">
            <CardHeader className="pb-2 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <Skeleton className="h-1.5 w-full mb-3" />
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-md" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : steps && (
          <Card className="mb-4 border-0 shadow-sm bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950/20">
            <CardHeader className="pb-2 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30">
                    <Icon name="zap" className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Configuração Inicial</CardTitle>
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {Object.values(steps).filter((v, i) => i < 6 && v === true).length}/6
                </span>
              </div>
            </CardHeader>
            <CardContent className="pb-3 pt-1">
              {/* Barra de progresso menor */}
              <div className="mb-3">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-emerald-500 h-1.5 rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${(Object.values(steps).filter((v, i) => i < 6 && v === true).length / 6) * 100}%`
                    }}
                  />
                </div>
              </div>

              {/* Grid mais compacto */}
              <TooltipProvider delayDuration={200}>
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5">
                  {checklistItems.map((item, index) => {
                    const isCompleted = steps && item.key !== 'allCompleted' && steps[item.key];
                    return (
                      <div key={index} className="relative group">
                        <button
                          onClick={() => navigate({ to: item.route })}
                          className={`w-full p-2 rounded-md border transition-all hover:scale-[1.02] cursor-pointer ${
                            isCompleted
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <div className={`flex items-center justify-center w-7 h-7 rounded-full transition-all ${
                              isCompleted
                                ? 'bg-emerald-500 text-white scale-100'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                            }`}>
                              <Icon name={isCompleted ? 'check' : item.icon} className="h-3.5 w-3.5" />
                            </div>
                            <span className={`text-[10px] leading-3 text-center font-medium ${
                              isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                            }`}>
                              {item.label.replace('Cadastrar ao menos 1 curso', 'Curso')
                                .replace('Cadastrar instrutores', 'Instrutores')
                                .replace('Adicionar assinatura digital de pelo menos 1 instrutor', 'Assinatura')
                                .replace('Criar um modelo de certificado', 'Certificado')
                                .replace('Configurar conta do Asaas (gateway de pagamento)', 'Gateway')
                                .replace('Criar uma turma', 'Turma')}
                            </span>
                          </div>
                        </button>

                        {/* Botão de ajuda com tooltip */}
                        {!isCompleted && (
                          <TooltipUI>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-500 dark:bg-slate-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-500 dark:hover:bg-blue-600 hover:scale-110"
                              >
                                <Icon name="help-circle" className="h-2.5 w-2.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              align="center"
                              className="max-w-[200px] bg-slate-900 dark:bg-slate-800 text-white text-xs p-2 rounded-md"
                            >
                              <p className="text-xs leading-relaxed">{item.help}</p>
                              <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45" />
                            </TooltipContent>
                          </TooltipUI>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        )}

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Card Turmas Realizadas */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                  Turmas Realizadas
                </CardTitle>
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <GraduationCap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {turmasLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : turmasError ? (
                <div className="opacity-50">
                  <p className="text-2xl font-bold text-slate-400">-</p>
                  <p className="text-xs text-muted-foreground mt-1">Sem permissão</p>
                </div>
              ) : (
                <div>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                    {turmasRealizadas}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Concluídas com sucesso
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card Turmas em Andamento */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Turmas em Andamento
                </CardTitle>
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {turmasLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : turmasError ? (
                <div className="opacity-50">
                  <p className="text-2xl font-bold text-slate-400">-</p>
                  <p className="text-xs text-muted-foreground mt-1">Sem permissão</p>
                </div>
              ) : (
                <div>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                    {turmasEmAndamento}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Atualmente ativas
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card Certificados Emitidos */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Certificados Emitidos
                </CardTitle>
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {certificatesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : certificatesError ? (
                <div className="opacity-50">
                  <p className="text-2xl font-bold text-slate-400">-</p>
                  <p className="text-xs text-muted-foreground mt-1">Sem permissão</p>
                </div>
              ) : (
                <div>
                  <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                    {certificatesData?.total || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total de certificados
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card Total de Alunos */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">
                  Total de Alunos
                </CardTitle>
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <UserPlus className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {traineesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : traineesError ? (
                <div className="opacity-50">
                  <p className="text-2xl font-bold text-slate-400">-</p>
                  <p className="text-xs text-muted-foreground mt-1">Sem permissão</p>
                </div>
              ) : (
                <div>
                  <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                    {traineesData?.total || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Alunos cadastrados
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Card de Últimos Inscritos */}
        <Card className="border-0 shadow-sm mt-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                  <UserCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <CardTitle className="text-base font-semibold">Últimas Inscrições Confirmadas</CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">10 mais recentes</span>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            {subscriptionsLoading ? (
              <div className="space-y-1">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 px-2">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2.5 w-32" />
                    </div>
                    <Skeleton className="h-2.5 w-12" />
                  </div>
                ))}
              </div>
            ) : subscriptionsError ? (
              <div className="text-center py-8 opacity-50">
                <UserCheck className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-sm text-muted-foreground">Sem permissão para visualizar inscrições</p>
              </div>
            ) : subscriptionsData?.rows && subscriptionsData.rows.length > 0 ? (
              <div className="space-y-1">
                {subscriptionsData.rows.map((subscription) => (
                  <div key={subscription.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-medium text-xs shadow-sm flex-shrink-0">
                      {subscription.name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                        {subscription.name || 'Aluno'}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {subscription.class?.name || 'Turma'}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{formatDate(subscription.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserCheck className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma inscrição confirmada recente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };