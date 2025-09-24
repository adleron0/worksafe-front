import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/services/api'
import useVerify from '@/hooks/use-verify'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  Rectangle,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { ApiError } from "@/general-interfaces/api.interface"

export const Route = createFileRoute('/_authenticated/treinamentos/')({
  component: Dashboard
})

interface CourseData {
  id: number
  name: string
  _count?: {
    subscriptions?: number
  }
}

interface ClassData {
  id: number
  name: string
  maxSubscriptions: number
  courseId: number
  initialDate: string
  finalDate: string
  _count?: {
    subscriptions?: number
  }
}

interface StudentData {
  id: number
  name: string
  createdAt: string
}

interface CertificateData {
  id: number
  createdAt: string
  subscription?: {
    trainee?: {
      name: string
    }
    class?: {
      courseId: number
    }
  }
}

interface ApiResponse<T> {
  rows: T[]
  total: number
}

interface SubscriptionData {
  id: number
  name?: string
  cpf?: string
  email?: string
  phone?: string
  workedAt?: string
  occupation?: string
  companyId?: number
  classId?: number
  traineeId?: number | null
  subscribeStatus?: 'pending' | 'confirmed' | 'declined'
  confirmedAt?: string | null
  declinedReason?: string | null
  createdAt?: string
  updatedAt?: string
  inactiveAt?: string | null
  class?: {
    id?: number
    name?: string
  }
}

interface InstructorData {
  id: number
  name: string
  specialty?: string
  createdAt?: string
}

function Dashboard() {
  const { can } = useVerify()
  const [dateFilter, setDateFilter] = useState('30')
  
  // Buscar dados dos cursos
  const { data: coursesData } = useQuery<ApiResponse<CourseData>, ApiError>({
    queryKey: ['dashboard-courses', dateFilter],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 100 },
        { key: 'order-name', value: 'asc' }
      ]
      const result = await get('courses', '', params)
      return result as ApiResponse<CourseData>
    },
    enabled: can('view_treinamentos')
  })

  // Buscar dados das turmas
  const { data: classesData } = useQuery<ApiResponse<ClassData>, ApiError>({
    queryKey: ['dashboard-classes', dateFilter],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 200 },
        { key: 'order-initialDate', value: 'desc' }
      ]
      const result = await get('classes', '', params)
      return result as ApiResponse<ClassData>
    },
    enabled: can('view_treinamentos')
  })

  // Buscar dados dos alunos
  const { data: studentsData } = useQuery<ApiResponse<StudentData>, ApiError>({
    queryKey: ['dashboard-students', dateFilter],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 100 },
        { key: 'order-createdAt', value: 'desc' }
      ]
      const result = await get('trainee', '', params)
      return result as ApiResponse<StudentData>
    },
    enabled: can('view_treinamentos')
  })

  // Buscar dados dos certificados emitidos
  const { data: certificatesData } = useQuery<ApiResponse<CertificateData>, ApiError>({
    queryKey: ['dashboard-certificates-issued', dateFilter],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 100 },
        { key: 'order-createdAt', value: 'desc' },
        { key: 'active', value: 'true' }
      ]
      const result = await get('trainee-certificate', '', params)
      return result as ApiResponse<CertificateData>
    },
    enabled: can('view_treinamentos')
  })

  // Buscar dados das inscrições (subscriptions)
  const { data: subscriptionsData } = useQuery<ApiResponse<SubscriptionData>, ApiError>({
    queryKey: ['dashboard-subscriptions', dateFilter],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 500 },
        { key: 'order-createdAt', value: 'desc' }
      ]
      const result = await get('subscription', '', params)
      return result as ApiResponse<SubscriptionData>
    },
    enabled: can('view_treinamentos')
  })

  // Buscar dados dos instrutores
  const { data: instructorsData } = useQuery<ApiResponse<InstructorData>, ApiError>({
    queryKey: ['dashboard-instructors', dateFilter],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 100 },
        { key: 'order-name', value: 'asc' }
      ]
      const result = await get('instructors', '', params)
      return result as ApiResponse<InstructorData>
    },
    enabled: can('view_treinamentos')
  })

  // Processar dados para os gráficos
  const processedData = useMemo(() => {
    if (!classesData || !studentsData || !certificatesData || !coursesData || !subscriptionsData) {
      return {
        turmasPorMes: [],
        turmasRecentes: [],
        taxaConclusao: [],
        ocupacaoTurmas: [],
        certificadosPorMes: [],
        alunosPorMes: []
      }
    }

    // Turmas por mês (últimos 7 meses)
    const turmasPorMes: { date: string; turmas: number }[] = []
    const monthsData: Record<string, number> = {}
    
    classesData?.rows?.forEach((turma: ClassData) => {
      const date = new Date(turma.initialDate)
      const monthKey = date.toISOString().slice(0, 7) // YYYY-MM
      monthsData[monthKey] = (monthsData[monthKey] || 0) + 1
    })

    // Pegar últimos 7 meses
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toISOString().slice(0, 7)
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' })
      turmasPorMes.push({
        date: monthName,
        turmas: monthsData[monthKey] || 0
      })
    }

    // Turmas recentes (últimas 7)
    const turmasRecentes = classesData?.rows?.slice(0, 7).map((turma: ClassData) => {
      // Contar inscrições confirmadas para esta turma
      const inscricoesConfirmadas = subscriptionsData?.rows?.filter((sub: SubscriptionData) => 
        sub.classId === turma.id && 
        sub.subscribeStatus === 'confirmed' &&
        !sub.inactiveAt
      ).length || 0
      
      return {
        date: new Date(turma.initialDate).toLocaleDateString('pt-BR', { 
          day: '2-digit',
          month: 'short' 
        }),
        alunos: inscricoesConfirmadas,
        capacidade: turma.maxSubscriptions || 0
      }
    }) || []

    // Taxa de conclusão por curso (top 5)
    const taxaConclusao = coursesData?.rows?.slice(0, 5).map((curso: CourseData) => {
      const turmasDoCurso = classesData?.rows?.filter((turma: ClassData) => 
        turma.courseId === curso.id
      ) || []
      
      // Contar inscrições confirmadas para as turmas deste curso
      const turmasIds = turmasDoCurso.map(t => t.id)
      const inscricoesConfirmadas = subscriptionsData?.rows?.filter((sub: SubscriptionData) => 
        sub.classId && 
        turmasIds.includes(sub.classId) && 
        sub.subscribeStatus === 'confirmed' &&
        !sub.inactiveAt
      ).length || 0
      
      const certificadosDoCurso = certificatesData?.rows?.filter((cert: CertificateData) => 
        cert.subscription?.class?.courseId === curso.id
      ).length || 0
      
      const taxa = inscricoesConfirmadas > 0 ? (certificadosDoCurso / inscricoesConfirmadas) * 100 : 0
      
      return {
        curso: curso.name.length > 15 ? curso.name.substring(0, 15) + '...' : curso.name,
        taxa: Math.round(taxa)
      }
    }).filter((item: { taxa: number }) => item.taxa > 0) || []

    // Ocupação das turmas ativas
    const now2 = new Date()
    const ocupacaoTurmas = classesData?.rows
      ?.filter((t: ClassData) => 
        new Date(t.initialDate) <= now2 && new Date(t.finalDate) >= now2
      )
      .slice(0, 3)
      .map((turma: ClassData) => {
        // Contar inscrições confirmadas para esta turma
        const inscricoesConfirmadas = subscriptionsData?.rows?.filter((sub: SubscriptionData) => 
          sub.classId === turma.id && 
          sub.subscribeStatus === 'confirmed' &&
          !sub.inactiveAt
        ).length || 0
        
        const ocupacao = turma.maxSubscriptions > 0 
          ? Math.round((inscricoesConfirmadas / turma.maxSubscriptions) * 100)
          : 0
        return {
          turma: turma.name.length > 20 ? turma.name.substring(0, 20) + '...' : turma.name,
          value: ocupacao,
          label: `${inscricoesConfirmadas}/${turma.maxSubscriptions}`,
          fill: ocupacao >= 80 ? 'var(--color-high)' : ocupacao >= 50 ? 'var(--color-medium)' : 'var(--color-low)'
        }
      }) || []

    // Certificados por mês
    const certificadosPorMes: { date: string; certificados: number }[] = []
    const certMonthsData: Record<string, number> = {}
    
    certificatesData?.rows?.forEach((cert: CertificateData) => {
      const date = new Date(cert.createdAt)
      const monthKey = date.toISOString().slice(0, 7)
      certMonthsData[monthKey] = (certMonthsData[monthKey] || 0) + 1
    })

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toISOString().slice(0, 7)
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' })
      certificadosPorMes.push({
        date: monthName,
        certificados: certMonthsData[monthKey] || 0
      })
    }

    // Novos alunos por mês
    const alunosPorMes: { date: string; alunos: number }[] = []
    const alunosMonthsData: Record<string, number> = {}
    
    studentsData?.rows?.forEach((aluno: StudentData) => {
      const date = new Date(aluno.createdAt)
      const monthKey = date.toISOString().slice(0, 7)
      alunosMonthsData[monthKey] = (alunosMonthsData[monthKey] || 0) + 1
    })

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toISOString().slice(0, 7)
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' })
      alunosPorMes.push({
        date: monthName,
        alunos: alunosMonthsData[monthKey] || 0
      })
    }

    return {
      turmasPorMes,
      turmasRecentes,
      taxaConclusao,
      ocupacaoTurmas,
      certificadosPorMes,
      alunosPorMes
    }
  }, [classesData, studentsData, certificatesData, coursesData, subscriptionsData])

  // Estatísticas gerais
  const stats = useMemo(() => {
    const totalCursos = coursesData?.total || 0
    const totalTurmas = classesData?.total || 0
    const totalAlunos = studentsData?.total || 0
    const totalCertificados = certificatesData?.total || 0
    const totalInstrutores = instructorsData?.total || 0

    // Calcular turmas ativas (turmas onde a data atual está entre a data inicial e final)
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)
    
    const turmasAtivasData = classesData?.rows?.filter((t: ClassData) => {
      const inicio = new Date(t.initialDate)
      const fim = new Date(t.finalDate)
      
      // Normalizar as datas para comparação correta
      inicio.setHours(0, 0, 0, 0)
      fim.setHours(23, 59, 59, 999)
      
      // Turma é ativa se hoje está entre início e fim (inclusive)
      return inicio <= todayEnd && fim >= todayStart
    }) || []
    
    const turmasAtivas = turmasAtivasData.length
    
    // Calcular total de alunos ativos (alunos confirmados em turmas ativas)
    const turmasAtivasIds = turmasAtivasData.map(t => t.id)
    const alunosAtivos = subscriptionsData?.rows?.filter((sub: SubscriptionData) => 
      sub.subscribeStatus === 'confirmed' && 
      sub.classId && 
      turmasAtivasIds.includes(sub.classId) &&
      !sub.inactiveAt
    ).length || 0
    
    // Calcular taxa média de ocupação apenas das turmas ativas
    const taxaOcupacao = turmasAtivasData.length > 0
      ? turmasAtivasData.reduce((acc: number, turma: ClassData) => {
          // Contar inscrições confirmadas para esta turma
          const inscricoesConfirmadas = subscriptionsData?.rows?.filter((sub: SubscriptionData) => 
            sub.classId === turma.id && 
            sub.subscribeStatus === 'confirmed' &&
            !sub.inactiveAt
          ).length || 0
          
          const ocupacao = turma.maxSubscriptions > 0 
            ? (inscricoesConfirmadas / turma.maxSubscriptions) * 100 
            : 0
          return acc + ocupacao
        }, 0) / turmasAtivasData.length
      : 0

    // Alunos este mês
    const currentMonth = new Date().toISOString().slice(0, 7)
    const alunosEsteMes = studentsData?.rows?.filter((aluno: StudentData) => 
      aluno.createdAt.slice(0, 7) === currentMonth
    ).length || 0

    // Certificados este mês
    const certificadosEsteMes = certificatesData?.rows?.filter((cert: CertificateData) => 
      cert.createdAt.slice(0, 7) === currentMonth
    ).length || 0

    return {
      totalCursos,
      totalTurmas,
      totalAlunos,
      totalCertificados,
      turmasAtivas,
      taxaOcupacao: Math.round(taxaOcupacao),
      alunosEsteMes,
      certificadosEsteMes,
      alunosAtivos,
      totalInstrutores
    }
  }, [coursesData, classesData, studentsData, certificatesData, subscriptionsData, instructorsData])

  if (!can('view_treinamentos')) return null

  return (
    <div className="p-6 w-full max-w-7xl mx-auto">
      {/* Header com filtros */}
      <div className="w-full flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Treinamentos</h1>
          <p className="text-muted-foreground text-sm">
            Acompanhe as métricas e indicadores dos treinamentos
          </p>
        </div>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
            <SelectItem value="365">1 ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Card de Turmas Ativas */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-2">
          <CardHeader className="space-y-0 pb-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-t-lg">
            <CardDescription className="text-blue-700 dark:text-blue-300 font-medium">Período Atual</CardDescription>
            <CardTitle className="text-4xl tabular-nums text-blue-900 dark:text-blue-100">
              {classesData ? (
                <>
                  {stats.turmasAtivas}{" "}
                  <span className="font-sans text-sm font-normal tracking-normal text-muted-foreground">
                    turmas ativas
                  </span>
                </>
              ) : (
                <Skeleton className="h-10 w-48" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {classesData ? (
              <ChartContainer
              config={{
                turmas: {
                  label: "Turmas",
                  color: "hsl(var(--chart-1))",
                },
              }}
            >
              <BarChart
                accessibilityLayer
                margin={{
                  left: -4,
                  right: -4,
                }}
                data={processedData.turmasPorMes}
              >
                <Bar
                  dataKey="turmas"
                  fill="var(--color-turmas)"
                  radius={5}
                  fillOpacity={0.6}
                  activeBar={<Rectangle fillOpacity={0.8} />}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                />
                <ChartTooltip
                  defaultIndex={2}
                  content={
                    <ChartTooltipContent
                      hideIndicator
                      labelFormatter={(value) => `Mês: ${value}`}
                    />
                  }
                  cursor={false}
                />
                <ReferenceLine
                  y={stats.turmasAtivas}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                >
                  <Label
                    position="insideBottomLeft"
                    value="Média de Turmas"
                    offset={10}
                    fill="hsl(var(--foreground))"
                  />
                  <Label
                    position="insideTopLeft"
                    value={stats.turmasAtivas}
                    className="text-lg"
                    fill="hsl(var(--foreground))"
                    offset={10}
                    startOffset={100}
                  />
                </ReferenceLine>
              </BarChart>
            </ChartContainer>
            ) : (
              <div className="h-[200px] w-full">
                <Skeleton className="h-full w-full" />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col items-start gap-1">
            {classesData ? (
              <>
                <CardDescription>
                  Total de <span className="font-medium text-foreground">{stats.totalTurmas}</span> turmas
                  nos últimos {dateFilter} dias
                </CardDescription>
                <CardDescription>
                  Taxa de ocupação média: <span className="font-medium text-foreground">{stats.taxaOcupacao}%</span>
                </CardDescription>
              </>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-36" />
              </div>
            )}
          </CardFooter>
        </Card>

        {/* Card de Certificados */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2 [&>div]:flex-1 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-t-lg">
            <div>
              <CardDescription className="text-emerald-700 dark:text-emerald-300 font-medium">Total</CardDescription>
              <CardTitle className="flex items-baseline gap-1 text-4xl tabular-nums text-emerald-900 dark:text-emerald-100">
                {certificatesData ? (
                  <>
                    {stats.totalCertificados}
                    <span className="text-sm font-normal tracking-normal text-muted-foreground">
                      certificados
                    </span>
                  </>
                ) : (
                  <Skeleton className="h-10 w-32" />
                )}
              </CardTitle>
            </div>
            <div>
              <CardDescription className="text-teal-700 dark:text-teal-300 font-medium">Este mês</CardDescription>
              <CardTitle className="flex items-baseline gap-1 text-4xl tabular-nums text-teal-900 dark:text-teal-100">
                {certificatesData ? (
                  <>
                    {stats.certificadosEsteMes}
                    <span className="text-sm font-normal tracking-normal text-muted-foreground">
                      novos
                    </span>
                  </>
                ) : (
                  <Skeleton className="h-10 w-24" />
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 items-center">
            {certificatesData ? (
              <ChartContainer
              config={{
                certificados: {
                  label: "Certificados",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="w-full"
            >
              <LineChart
                accessibilityLayer
                margin={{
                  left: 14,
                  right: 14,
                  top: 10,
                }}
                data={processedData.certificadosPorMes}
              >
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="hsl(var(--muted-foreground))"
                  strokeOpacity={0.5}
                />
                <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <Line
                  dataKey="certificados"
                  type="natural"
                  fill="var(--color-certificados)"
                  stroke="var(--color-certificados)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    fill: "var(--color-certificados)",
                    stroke: "var(--color-certificados)",
                    r: 4,
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      labelFormatter={(value) => `Mês: ${value}`}
                    />
                  }
                  cursor={false}
                />
              </LineChart>
            </ChartContainer>
            ) : (
              <div className="h-[150px] w-full">
                <Skeleton className="h-full w-full" />
              </div>
            )}
          </CardContent>
        </Card>
        {/* Card de Taxa de Ocupação com Gráfico de Rosca */}
        <Card className="col-span-1 border-0 shadow-lg bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-rose-900 dark:text-rose-100">Taxa de Ocupação</CardTitle>
            <CardDescription>Ocupação média das turmas ativas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              {classesData && subscriptionsData ? (
                <ChartContainer
                  config={{
                    ocupado: {
                      label: "Ocupado",
                      color: "hsl(var(--chart-1))",
                    },
                    disponivel: {
                      label: "Disponível",
                      color: "hsl(var(--muted))",
                    },
                  }}
                  className="h-[180px] w-[180px]"
                >
                  <PieChart>
                  <Pie
                    data={[
                      { name: "Ocupado", value: stats.taxaOcupacao, fill: "url(#gradientOcupado)" },
                      { name: "Disponível", value: 100 - stats.taxaOcupacao, fill: "#e5e7eb" }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                  >
                    <Label
                      value={`${stats.taxaOcupacao}%`}
                      position="center"
                      className="text-3xl font-bold fill-foreground"
                    />
                  </Pie>
                  <defs>
                    <linearGradient id="gradientOcupado" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg bg-white p-2 shadow-lg">
                            <p className="text-sm font-medium">{payload[0].name}</p>
                            <p className="text-sm text-muted-foreground">{payload[0].value}%</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-[180px] w-[180px]">
                  <Skeleton className="h-full w-full rounded-full" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card Principal com Cards Internos */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-1 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-blue-900 dark:text-blue-100">Visão Geral</CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              Métricas principais do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {classesData && studentsData && certificatesData ? (
              <>
                {/* Mini Card Turmas */}
                <div className="rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 p-4 text-white shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium opacity-90">Turmas</p>
                      <p className="text-2xl font-bold">
                        {stats.turmasAtivas}/{stats.totalTurmas}
                      </p>
                      <p className="text-xs opacity-75">ativas</p>
                    </div>
                <div className="rounded-full bg-white/20 p-3">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Mini Card Alunos */}
            <div className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium opacity-90">Alunos</p>
                  <p className="text-2xl font-bold">{stats.alunosEsteMes}</p>
                  <p className="text-xs opacity-75">novos este mês</p>
                </div>
                <div className="rounded-full bg-white/20 p-3">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Mini Card Certificados */}
            <div className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium opacity-90">Certificados</p>
                  <p className="text-2xl font-bold">{stats.certificadosEsteMes}</p>
                  <p className="text-xs opacity-75">emitidos este mês</p>
                </div>
                <div className="rounded-full bg-white/20 p-3">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
              </div>
            </div>
              </>
            ) : (
              <>
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </>
            )}
          </CardContent>
        </Card>

        {/* Card de Performance dos Cursos */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-1 border-0 shadow-lg bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-950/20 dark:to-teal-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-teal-900 dark:text-teal-100">Performance dos Cursos</CardTitle>
            <CardDescription>Taxa de conclusão por curso</CardDescription>
          </CardHeader>
          <CardContent>
            {coursesData && certificatesData && subscriptionsData ? (
              processedData.taxaConclusao.length > 0 ? (
              <ChartContainer
                config={{
                  conclusao: {
                    label: "Taxa de Conclusão",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[250px] w-full"
              >
                <BarChart
                  data={processedData.taxaConclusao.slice(0, 5)}
                  layout="horizontal"
                  margin={{
                    left: 80,
                    right: 20,
                    top: 10,
                    bottom: 10,
                  }}
                >
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <YAxis dataKey="curso" type="category" width={75} />
                  <Bar dataKey="taxa" radius={[0, 8, 8, 0]}>
                    {processedData.taxaConclusao.slice(0, 5).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          entry.taxa >= 80 ? '#10b981' : 
                          entry.taxa >= 60 ? '#f59e0b' : 
                          entry.taxa >= 40 ? '#fb923c' : '#ef4444'
                        } 
                      />
                    ))}
                    <LabelList dataKey="taxa" position="right" formatter={(value: number) => `${value}%`} />
                  </Bar>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg bg-white p-2 shadow-lg">
                            <p className="text-sm font-medium">{payload[0].payload.curso}</p>
                            <p className="text-sm text-muted-foreground">Conclusão: {payload[0].value}%</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </BarChart>
              </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  <p>Sem dados de conclusão disponíveis</p>
                </div>
              )
            ) : (
              <div className="h-[250px] w-full">
                <Skeleton className="h-full w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Timeline de Certificações */}
        <Card className="col-span-1 border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-amber-900 dark:text-amber-100">Evolução de Certificações</CardTitle>
            <CardDescription>Comparativo mensal de certificados</CardDescription>
          </CardHeader>
          <CardContent>
            {certificatesData && studentsData ? (
              processedData.certificadosPorMes.length > 0 && processedData.alunosPorMes.length > 0 ? (
              <ChartContainer
                config={{
                  certificados: {
                    label: "Certificados",
                    color: "hsl(var(--chart-3))",
                  },
                  alunos: {
                    label: "Novos Alunos",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="h-[200px] w-full"
              >
                <LineChart
                  data={processedData.certificadosPorMes.map((cert, index) => ({
                    date: cert.date || '',
                    certificados: cert.certificados || 0,
                    alunos: processedData.alunosPorMes[index]?.alunos || 0
                  }))}
                  margin={{
                    left: 10,
                    right: 10,
                    top: 10,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 'auto']}
                  />
                  <Line
                    type="monotone"
                    dataKey="certificados"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#f59e0b' }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="alunos"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#3b82f6' }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg bg-white p-2 shadow-lg">
                            <p className="text-sm font-medium">{label}</p>
                            {payload.map((entry, index) => (
                              <p key={index} className="text-sm" style={{ color: entry.color }}>
                                {entry.name}: {entry.value || 0}
                              </p>
                            ))}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </LineChart>
              </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  <p>Sem dados disponíveis</p>
                </div>
              )
            ) : (
              <div className="h-[200px] w-full">
                <Skeleton className="h-full w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Alunos por Turma */}
        <Card className="col-span-1">
          <CardHeader className="p-4 pb-0">
            <CardTitle>Inscrições Recentes</CardTitle>
            <CardDescription>
              Alunos inscritos nas últimas turmas
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-row items-baseline gap-4 p-4 pt-2">
            {classesData && subscriptionsData ? (
              <>
                <div className="flex items-baseline gap-2 text-3xl font-bold tabular-nums leading-none">
                  {processedData.turmasRecentes.reduce((acc, t) => acc + t.alunos, 0)}
                  <span className="text-sm font-normal text-muted-foreground">
                    alunos
                  </span>
                </div>
                <ChartContainer
              config={{
                alunos: {
                  label: "Alunos",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="ml-auto w-[64px]"
            >
              <BarChart
                accessibilityLayer
                margin={{
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                }}
                data={processedData.turmasRecentes}
              >
                <Bar
                  dataKey="alunos"
                  fill="var(--color-alunos)"
                  radius={2}
                  fillOpacity={0.2}
                  activeIndex={6}
                  activeBar={<Rectangle fillOpacity={0.8} />}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  hide
                />
              </BarChart>
            </ChartContainer>
              </>
            ) : (
              <Skeleton className="h-16 w-full" />
            )}
          </CardContent>
        </Card>

        {/* Card de Crescimento de Alunos */}
        <Card className="col-span-1">
          <CardHeader className="space-y-0 pb-0">
            <CardDescription>Novos Alunos</CardDescription>
            <CardTitle className="flex items-baseline gap-1 text-4xl tabular-nums">
              {studentsData ? (
                <>
                  {stats.alunosEsteMes}
                  <span className="font-sans text-sm font-normal tracking-normal text-muted-foreground">
                    este mês
                  </span>
                </>
              ) : (
                <Skeleton className="h-10 w-24" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {studentsData ? (
              <ChartContainer
              config={{
                alunos: {
                  label: "Alunos",
                  color: "hsl(var(--chart-4))",
                },
              }}
            >
              <AreaChart
                accessibilityLayer
                data={processedData.alunosPorMes}
                margin={{
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                }}
              >
                <XAxis dataKey="date" hide />
                <YAxis domain={["dataMin - 2", "dataMax + 2"]} hide />
                <defs>
                  <linearGradient id="fillAlunos" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-alunos)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-alunos)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <Area
                  dataKey="alunos"
                  type="natural"
                  fill="url(#fillAlunos)"
                  fillOpacity={0.4}
                  stroke="var(--color-alunos)"
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                  formatter={(value) => (
                    <div className="flex min-w-[120px] items-center text-xs text-muted-foreground">
                      Novos alunos
                      <div className="ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums text-foreground">
                        {value}
                        <span className="font-normal text-muted-foreground">
                          alunos
                        </span>
                      </div>
                    </div>
                  )}
                />
              </AreaChart>
            </ChartContainer>
            ) : (
              <div className="h-[120px] w-full">
                <Skeleton className="h-full w-full" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}