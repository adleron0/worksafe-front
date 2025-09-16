import { createFileRoute } from '@tanstack/react-router';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useState, useEffect } from 'react';
import Dialog from '@/components/general-components/Dialog';
import RichTextEditor from '@/components/general-components/RichTextEditor';
import { Button } from '@/components/ui/button';
import { checkFirstSteps, FirstStepsResponse } from '@/services/firstSteps.service';
import Icon from '@/components/general-components/Icon';
import { useNavigate } from '@tanstack/react-router';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip as TooltipUI,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const dataUsuarios = [
  { name: "Seg", usuários: 3 },
  { name: "Ter", usuários: 5 },
  { name: "Qua", usuários: 7 },
  { name: "Qui", usuários: 6 },
  { name: "Sex", usuários: 4 },
];

const dataFinanceiro = [
  { name: "Jan", receita: 4000, despesas: 2400 },
  { name: "Fev", receita: 3000, despesas: 1398 },
  { name: "Mar", receita: 2000, despesas: 9800 },
  { name: "Abr", receita: 2780, despesas: 3908 },
  { name: "Mai", receita: 1890, despesas: 4800 },
];

const dataModulos = [
  { name: "Estoque", value: 300 },
  { name: "Financeiro", value: 400 },
  { name: "CRM", value: 200 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28"];

export const Route = createFileRoute('/_authenticated/home')({
  component: Home,
})

function Home() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editorContent, setEditorContent] = useState<string>('');
  const [steps, setSteps] = useState<FirstStepsResponse | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadFirstSteps = async () => {
      const stepsData = await checkFirstSteps();
      setSteps(stepsData);
    };
    loadFirstSteps();
  }, []);

  const handleEditorChange = (content: string) => {
    setEditorContent(content);
    console.log('Conteúdo do editor:', content);
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
      route: '/cadastros/instrutores',
      help: 'Vá em Cadastros > Instrutores e adicione pelo menos um instrutor com nome, CPF e dados de contato.'
    },
    {
      key: 'hasInstructorSignature' as keyof FirstStepsResponse,
      label: 'Adicionar assinatura digital de pelo menos 1 instrutor',
      icon: 'pen-tool',
      route: '/cadastros/instrutores',
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
      route: '/comercial/gateway',
      help: 'Acesse Comercial > Gateway e configure sua conta Asaas inserindo o token de API para processar pagamentos.'
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
      <div className="p-8 bg-background/5 min-h-screen">
        {/* Título da Dashboard */}
        <h1 className="text-3xl font-bold mb-6">Dashboard - Hub do Sistema</h1>

        {/* Timeline de Primeiros Passos - com Skeleton */}
        {/* TEMPORÁRIO: Removido !steps.allCompleted para sempre exibir durante testes */}
        {steps === null ? (
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
        
        {/* Botão para abrir o editor */}
        <div className="mb-6">
          <Button onClick={() => setDialogOpen(true)} className="mb-4">
            Abrir Editor de Texto Rico
          </Button>
          
          <Dialog
            title="Editor de Texto Rico"
            description="Crie e edite conteúdo para blogs, aulas e artigos"
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            showBttn={false}
            className="max-w-5xl"
          >
            <div className="space-y-4">
              <RichTextEditor 
                value={editorContent}
                onChange={handleEditorChange}
                placeholder="Comece a escrever seu conteúdo aqui..."
                height="50vh"
                // onImageUpload customizado é opcional - por padrão usa S3
              />
            </div>
          </Dialog>
        </div>
  
        {/* Cards principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Avisos</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Sistema em manutenção programada para o próximo sábado, das 02:00 às 04:00.</p>
              <p>Novos módulos disponíveis para compra!</p>
            </CardContent>
          </Card>
  
          <Card>
            <CardHeader>
              <CardTitle>Usuários Online</CardTitle>
            </CardHeader>
            <CardContent>
              <p>5 usuários conectados.</p>
              <p>Último acesso: 21/10/2024 às 10:00.</p>
            </CardContent>
          </Card>
  
          <Card>
            <CardHeader>
              <CardTitle>Mensagens Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <p>1. João: "Consegui acessar o módulo financeiro!"</p>
              <p>2. Maria: "O suporte está muito rápido, parabéns!"</p>
            </CardContent>
          </Card>
        </div>
  
        {/* Gráficos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Gráfico de Barras - Usuários */}
          <Card>
            <CardHeader>
              <CardTitle>Usuários por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dataUsuarios}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="usuários" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
  
          {/* Gráfico de Linhas - Financeiro */}
          <Card>
            <CardHeader>
              <CardTitle>Receita vs Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dataFinanceiro}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="receita" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="despesas" stroke="#ff7300" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
  
          {/* Gráfico de Pizza - Módulos */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Módulos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={dataModulos} dataKey="value" nameKey="name" outerRadius={80} fill="#8884d8">
                    {dataModulos.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };