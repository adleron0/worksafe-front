# Guia Completo de Implementação - Sistema de Cursos Online para Alunos

## 📚 Visão Geral do Sistema

O sistema de cursos online para alunos é uma plataforma educacional completa que permite:
- Autenticação separada para alunos (diferente do sistema empresarial)
- Visualização e inscrição em turmas disponíveis
- Acompanhamento de aulas online com conteúdo multimídia
- Tracking de progresso individual por aula e curso
- Sistema de avaliações e certificados

## 🔐 1. Autenticação de Alunos

### 1.1 Login
**Endpoint:** `POST /auth/student/login`

**Payload:**
```json
{
  "credential": "email@exemplo.com", // ou CPF
  "password": "senha123"
}
```

**Resposta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "student": {
    "id": 1,
    "traineeId": 123,
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "cpf": "123.456.789-00",
    "customerId": 45
  }
}
```

**Implementação no Frontend:**
```typescript
// services/studentAuth.service.ts
async loginStudent(credential: string, password: string) {
  const response = await api.post('/auth/student/login', {
    credential,
    password
  });
  
  // Armazenar token
  localStorage.setItem('student_token', response.data.token);
  localStorage.setItem('student_data', JSON.stringify(response.data.student));
  
  // Configurar header padrão para próximas requisições
  api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
  
  return response.data;
}
```

**Página:** `/student/login`
- Formulário com campo único para email/CPF
- Campo de senha
- Link para "Esqueci minha senha"
- Link para "Primeiro acesso"

### 1.2 Primeiro Acesso / Recuperação de Senha

#### Solicitar Código
**Endpoint:** `POST /auth/student/request-code`

**Payload:**
```json
{
  "email": "joao@exemplo.com",
  "type": "first_access" // ou "reset_password"
}
```

**Resposta:**
```json
{
  "message": "Código enviado para o email",
  "expiresIn": 900 // segundos (15 minutos)
}
```

#### Validar Código e Definir Senha
**Endpoint:** `POST /auth/student/validate-code`

**Payload:**
```json
{
  "email": "joao@exemplo.com",
  "code": "123456",
  "newPassword": "novaSenha123",
  "type": "first_access"
}
```

**Implementação no Frontend:**
```typescript
// pages/student/first-access.tsx
const FirstAccessPage = () => {
  const [step, setStep] = useState<'email' | 'code' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [timer, setTimer] = useState(900);

  const requestCode = async () => {
    await api.post('/auth/student/request-code', {
      email,
      type: 'first_access'
    });
    setStep('code');
    startTimer();
  };

  const validateCode = async () => {
    await api.post('/auth/student/validate-code', {
      email,
      code,
      newPassword: password,
      type: 'first_access'
    });
    setStep('success');
    // Redirecionar para login após 3 segundos
    setTimeout(() => navigate('/student/login'), 3000);
  };

  return (
    <div>
      {step === 'email' && <EmailForm onSubmit={requestCode} />}
      {step === 'code' && (
        <CodeForm 
          onSubmit={validateCode}
          timer={timer}
          onResend={requestCode}
        />
      )}
      {step === 'success' && <SuccessMessage />}
    </div>
  );
};
```

**Página:** `/student/first-access` ou `/student/reset-password`
- Step 1: Inserir email
- Step 2: Inserir código de 6 dígitos + nova senha
- Timer de 15 minutos com opção de reenviar código
- Mensagem de sucesso e redirecionamento

## 📖 2. Dashboard do Aluno

**Página:** `/student/dashboard`

### 2.1 Informações do Perfil
**Endpoint:** `GET /student/profile`

**Headers:**
```javascript
{
  "Authorization": "Bearer {student_token}"
}
```

**Resposta:**
```json
{
  "id": 123,
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "cpf": "123.456.789-00",
  "phone": "(11) 98765-4321",
  "birthDate": "1995-05-15",
  "address": "Rua Exemplo, 123",
  "city": "São Paulo",
  "state": "SP",
  "zipCode": "01234-567",
  "active": true,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### 2.2 Resumo de Cursos
**Implementação do Dashboard:**
```typescript
// pages/student/dashboard.tsx
const StudentDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    inProgress: 0,
    completed: 0,
    certificates: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // Carregar perfil
    const profileRes = await api.get('/student/profile');
    setProfile(profileRes.data);

    // Carregar cursos inscritos
    const coursesRes = await api.get('/student-courses/my-courses');
    setCourses(coursesRes.data);

    // Calcular estatísticas
    calculateStats(coursesRes.data);
  };

  return (
    <div className="dashboard">
      <Header student={profile} />
      
      <div className="stats-cards">
        <Card title="Cursos Ativos" value={stats.inProgress} />
        <Card title="Cursos Concluídos" value={stats.completed} />
        <Card title="Certificados" value={stats.certificates} />
      </div>

      <div className="recent-courses">
        <h2>Cursos em Andamento</h2>
        {courses
          .filter(c => c.status === 'in_progress')
          .slice(0, 3)
          .map(course => (
            <CourseCard 
              key={course.id}
              course={course}
              onContinue={() => navigate(`/student/course/${course.id}/lessons`)}
            />
          ))}
      </div>

      <QuickActions />
    </div>
  );
};
```

## 📚 3. Sistema de Cursos

### 3.1 Listar Turmas Disponíveis
**Endpoint:** `GET /student-courses`

**Query Parameters:**
```javascript
{
  page: 1,
  limit: 10,
  search: "nome do curso",
  category: "seguranca",
  active: true
}
```

**Resposta:**
```json
{
  "total": 25,
  "rows": [
    {
      "id": 1,
      "class": {
        "id": 101,
        "name": "Turma 2024.1 - NR35",
        "startDate": "2024-02-01",
        "endDate": "2024-03-01",
        "maxSubscriptions": 30,
        "currentSubscriptions": 15,
        "onlineCourseModel": {
          "id": 201,
          "course": {
            "id": 301,
            "name": "NR35 - Trabalho em Altura",
            "description": "Curso completo sobre segurança em trabalhos em altura",
            "hoursDuration": 8
          },
          "modelLessons": [
            {
              "lesson": {
                "id": 401,
                "title": "Introdução à NR35"
              }
            }
          ]
        },
        "company": {
          "id": 501,
          "name": "Empresa ABC"
        }
      }
    }
  ]
}
```

**Página:** `/student/courses`

**Implementação:**
```typescript
// pages/student/courses/index.tsx
const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: 'available'
  });
  const [loading, setLoading] = useState(false);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const response = await api.get('/student-courses', {
        params: filters
      });
      setCourses(response.data.rows);
    } finally {
      setLoading(false);
    }
  };

  const enrollInCourse = async (courseClassId: number) => {
    try {
      await api.post('/student-courses', {
        courseClassId
      });
      
      toast.success('Inscrição realizada com sucesso!');
      navigate('/student/dashboard');
    } catch (error) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
        // Possíveis erros:
        // - "Turma sem vagas disponíveis"
        // - "Período de inscrição encerrado"
        // - "Você já está inscrito nesta turma"
      }
    }
  };

  return (
    <div className="courses-page">
      <FilterBar 
        filters={filters}
        onChange={setFilters}
        onSearch={loadCourses}
      />

      <div className="courses-grid">
        {courses.map(course => (
          <CourseCard
            key={course.id}
            course={course.class}
            enrolled={course.traineeId !== null}
            onEnroll={() => enrollInCourse(course.class.id)}
            availableSlots={
              course.class.maxSubscriptions - course.class.currentSubscriptions
            }
          />
        ))}
      </div>
    </div>
  );
};
```

### 3.2 Meus Cursos Inscritos
**Endpoint:** `GET /student-courses/my-courses`

**Resposta:**
```json
[
  {
    "id": 1,
    "traineeId": 123,
    "classId": 101,
    "subscribedAt": "2024-01-20T10:00:00Z",
    "subscribeStatus": "confirmed",
    "confirmedAt": "2024-01-20T10:00:00Z",
    "class": {
      "id": 101,
      "name": "Turma 2024.1 - NR35",
      "onlineCourseModel": {
        "course": {
          "name": "NR35 - Trabalho em Altura"
        },
        "modelLessons": [...]
      }
    }
  }
]
```

**Página:** `/student/my-courses`

### 3.3 Inscrição em Turma
**Endpoint:** `POST /student-courses`

**Payload:**
```json
{
  "courseClassId": 101
}
```

**Validações do Backend:**
- Turma deve estar ativa
- Período de inscrição deve estar vigente
- Deve haver vagas disponíveis
- Aluno não pode estar já inscrito

## 📖 4. Sistema de Aulas

### 4.1 Visualizar Aulas de uma Turma
**Endpoint:** `GET /student-courses/:classId/lessons`

**Resposta:**
```json
{
  "courseClass": {
    "id": 101,
    "name": "Turma 2024.1",
    "onlineCourseModel": {
      "modelLessons": [
        {
          "order": 1,
          "lesson": {
            "id": 401,
            "title": "Introdução à NR35",
            "description": "Conceitos básicos",
            "steps": [
              {
                "id": 501,
                "title": "Vídeo Introdutório",
                "order": 1,
                "contentType": "video"
              }
            ],
            "studentLessonProgress": [
              {
                "id": 601,
                "completed": false,
                "progress": 45
              }
            ]
          }
        }
      ]
    }
  }
}
```

**Página:** `/student/course/:courseId/lessons`

**Implementação:**
```typescript
// pages/student/course/lessons.tsx
const CourseLessonsPage = () => {
  const { courseId } = useParams();
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);

  const loadLessons = async () => {
    const response = await api.get(`/student-courses/${courseId}/lessons`);
    setLessons(response.data.courseClass.onlineCourseModel.modelLessons);
  };

  const startLesson = async (lessonId: number) => {
    // Iniciar aula
    await api.post(`/student-lessons/${lessonId}/start`);
    
    // Navegar para player da aula
    navigate(`/student/lesson/${lessonId}`);
  };

  return (
    <div className="lessons-page">
      <CourseHeader course={course} />
      
      <div className="lessons-list">
        {lessons.map((modelLesson, index) => (
          <LessonItem
            key={modelLesson.lesson.id}
            number={index + 1}
            lesson={modelLesson.lesson}
            progress={modelLesson.lesson.studentLessonProgress?.[0]}
            onStart={() => startLesson(modelLesson.lesson.id)}
            locked={index > 0 && !lessons[index-1].lesson.studentLessonProgress?.[0]?.completed}
          />
        ))}
      </div>

      <ProgressSummary 
        total={lessons.length}
        completed={lessons.filter(l => l.lesson.studentLessonProgress?.[0]?.completed).length}
      />
    </div>
  );
};
```

### 4.2 Player de Aula
**Endpoint:** `GET /student-lessons/:lessonId/content`

**Resposta:**
```json
{
  "id": 401,
  "title": "Introdução à NR35",
  "description": "Conceitos básicos de segurança",
  "steps": [
    {
      "id": 501,
      "title": "Vídeo Introdutório",
      "order": 1,
      "duration": 600,
      "contentType": "video",
      "content": {
        "url": "https://vimeo.com/123456",
        "provider": "vimeo"
      }
    },
    {
      "id": 502,
      "title": "Material de Leitura",
      "order": 2,
      "contentType": "text",
      "content": {
        "html": "<h1>Conceitos Importantes...</h1>"
      }
    }
  ],
  "studentLessonProgress": [
    {
      "completed": false,
      "progress": 45,
      "startedAt": "2024-01-20T14:00:00Z"
    }
  ]
}
```

**Página:** `/student/lesson/:lessonId`

**Implementação Completa do Player:**
```typescript
// pages/student/lesson/player.tsx
const LessonPlayer = () => {
  const { lessonId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepProgress, setStepProgress] = useState({});
  const [lessonCompleted, setLessonCompleted] = useState(false);

  useEffect(() => {
    loadLesson();
  }, [lessonId]);

  const loadLesson = async () => {
    // Carregar conteúdo da aula
    const response = await api.get(`/student-lessons/${lessonId}/content`);
    setLesson(response.data);
    
    // Carregar steps
    const stepsResponse = await api.get(`/student-lessons/${lessonId}/steps`);
    
    // Iniciar tracking se ainda não iniciou
    if (!response.data.studentLessonProgress?.length) {
      await api.post(`/student-lessons/${lessonId}/start`);
    }
  };

  const handleStepComplete = async (stepId: number) => {
    // Marcar step como concluído
    await api.post(`/student-progress/step/${stepId}/complete`);
    
    setStepProgress({
      ...stepProgress,
      [stepId]: { completed: true, completedAt: new Date() }
    });

    // Verificar se todos os steps foram concluídos
    const allCompleted = lesson.steps.every(
      step => stepProgress[step.id]?.completed || step.id === stepId
    );

    if (allCompleted && !lessonCompleted) {
      completeLesson();
    }
  };

  const completeLesson = async () => {
    await api.post(`/student-lessons/${lessonId}/complete`);
    setLessonCompleted(true);
    
    toast.success('Aula concluída com sucesso!');
    
    // Navegar para próxima aula ou voltar para lista
    setTimeout(() => {
      navigate(`/student/course/${lesson.courseId}/lessons`);
    }, 2000);
  };

  const renderStepContent = (step) => {
    switch (step.contentType) {
      case 'video':
        return (
          <VideoPlayer
            url={step.content.url}
            provider={step.content.provider}
            onProgress={(progress) => {
              if (progress >= 85) {
                handleStepComplete(step.id);
              }
            }}
          />
        );
      
      case 'text':
        return (
          <TextContent
            html={step.content.html}
            onScrollEnd={() => handleStepComplete(step.id)}
          />
        );
      
      case 'quiz':
        return (
          <QuizComponent
            questions={step.content.questions}
            onComplete={(score) => {
              if (score >= 70) {
                handleStepComplete(step.id);
              }
            }}
          />
        );
      
      case 'download':
        return (
          <DownloadMaterial
            files={step.content.files}
            onDownload={() => handleStepComplete(step.id)}
          />
        );
      
      default:
        return <div>Tipo de conteúdo não suportado</div>;
    }
  };

  return (
    <div className="lesson-player">
      <div className="player-header">
        <button onClick={() => navigate(-1)}>← Voltar</button>
        <h1>{lesson?.title}</h1>
        <ProgressBar 
          current={currentStep + 1} 
          total={lesson?.steps.length || 0}
        />
      </div>

      <div className="player-content">
        <div className="main-content">
          {lesson?.steps[currentStep] && renderStepContent(lesson.steps[currentStep])}
        </div>

        <div className="sidebar">
          <h3>Conteúdo da Aula</h3>
          <StepsList
            steps={lesson?.steps || []}
            currentStep={currentStep}
            stepProgress={stepProgress}
            onSelectStep={setCurrentStep}
          />
        </div>
      </div>

      <div className="player-footer">
        <button 
          onClick={() => setCurrentStep(currentStep - 1)}
          disabled={currentStep === 0}
        >
          Anterior
        </button>

        <span>{currentStep + 1} de {lesson?.steps.length || 0}</span>

        <button 
          onClick={() => setCurrentStep(currentStep + 1)}
          disabled={currentStep === (lesson?.steps.length - 1)}
        >
          Próximo
        </button>
      </div>

      {lessonCompleted && <CompletionModal />}
    </div>
  );
};
```

## 📊 5. Sistema de Progresso

### 5.1 Progresso por Step
**Endpoint:** `POST /student-progress/step/:stepId/complete`

**Resposta:**
```json
{
  "id": 701,
  "traineeId": 123,
  "onlineLessonStepId": 501,
  "completed": true,
  "completedAt": "2024-01-20T15:30:00Z",
  "progress": 100
}
```

### 5.2 Progresso da Aula
**Endpoint:** `GET /student-progress/lesson/:lessonId`

**Resposta:**
```json
{
  "lessonId": 401,
  "totalSteps": 5,
  "completedSteps": 3,
  "progressPercent": 60,
  "startedAt": "2024-01-20T14:00:00Z",
  "lastAccessAt": "2024-01-20T15:30:00Z"
}
```

### 5.3 Progresso do Curso
**Endpoint:** `GET /student-progress/course/:courseId`

**Resposta:**
```json
{
  "courseId": 301,
  "totalLessons": 10,
  "completedLessons": 6,
  "progressPercent": 60,
  "estimatedCompletion": "2024-02-15",
  "certificateAvailable": false
}
```

## 🏆 6. Sistema de Certificados

### 6.1 Listar Certificados
**Endpoint:** `GET /student-certificates`

**Resposta:**
```json
{
  "total": 3,
  "rows": [
    {
      "id": 801,
      "traineeId": 123,
      "courseId": 301,
      "certificateNumber": "CERT-2024-001",
      "issuedAt": "2024-01-25T10:00:00Z",
      "validUntil": "2026-01-25T10:00:00Z",
      "course": {
        "name": "NR35 - Trabalho em Altura"
      }
    }
  ]
}
```

**Página:** `/student/certificates`

### 6.2 Download de Certificado
**Endpoint:** `GET /student-certificates/:id/download`

**Resposta:** PDF do certificado

**Implementação:**
```typescript
const downloadCertificate = async (certificateId: number) => {
  const response = await api.get(
    `/student-certificates/${certificateId}/download`,
    { responseType: 'blob' }
  );
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `certificado-${certificateId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};
```

## 🎯 7. Sistema de Avaliações

### 7.1 Listar Avaliações
**Endpoint:** `GET /student-evaluations`

**Query Parameters:**
```javascript
{
  courseId: 301,
  status: "pending" // pending, completed, failed
}
```

### 7.2 Iniciar Avaliação
**Endpoint:** `GET /student-evaluations/:id/questions`

**Resposta:**
```json
{
  "id": 901,
  "title": "Avaliação Final - NR35",
  "duration": 3600, // segundos
  "passingScore": 70,
  "questions": [
    {
      "id": 1,
      "text": "Qual a altura mínima para ser considerado trabalho em altura?",
      "type": "multiple_choice",
      "options": [
        { "id": "a", "text": "1,5 metros" },
        { "id": "b", "text": "2,0 metros" },
        { "id": "c", "text": "2,5 metros" },
        { "id": "d", "text": "3,0 metros" }
      ]
    }
  ]
}
```

### 7.3 Submeter Respostas
**Endpoint:** `POST /student-evaluations/:id/submit`

**Payload:**
```json
{
  "answers": [
    {
      "questionId": 1,
      "answer": "b"
    }
  ],
  "timeSpent": 1800
}
```

**Resposta:**
```json
{
  "score": 85,
  "passed": true,
  "correctAnswers": 17,
  "totalQuestions": 20,
  "certificateGenerated": true
}
```

## 🔧 Configuração do Axios/Fetch

```typescript
// services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  timeout: 30000,
});

// Interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('student_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('student_token');
      localStorage.removeItem('student_data');
      window.location.href = '/student/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

## 📱 Estrutura de Páginas Recomendada

```
/student
  /login                    - Página de login
  /first-access            - Primeiro acesso
  /reset-password          - Recuperar senha
  /dashboard               - Dashboard principal
  /profile                 - Perfil do aluno
  /courses                 - Catálogo de cursos disponíveis
  /my-courses              - Meus cursos inscritos
  /course/:id
    /details               - Detalhes do curso
    /lessons               - Lista de aulas
  /lesson/:id              - Player de aula
  /certificates            - Meus certificados
  /evaluations             - Avaliações disponíveis
  /evaluation/:id          - Realizar avaliação
```

## 🎨 Componentes Reutilizáveis Sugeridos

```typescript
// components/student/CourseCard.tsx
interface CourseCardProps {
  course: Course;
  enrolled?: boolean;
  progress?: number;
  onEnroll?: () => void;
  onContinue?: () => void;
}

// components/student/LessonItem.tsx
interface LessonItemProps {
  lesson: Lesson;
  number: number;
  progress?: LessonProgress;
  locked?: boolean;
  onStart: () => void;
}

// components/student/VideoPlayer.tsx
interface VideoPlayerProps {
  url: string;
  provider: 'youtube' | 'vimeo' | 'custom';
  onProgress: (percent: number) => void;
  onComplete: () => void;
}

// components/student/ProgressBar.tsx
interface ProgressBarProps {
  current: number;
  total: number;
  showPercentage?: boolean;
  color?: 'primary' | 'success' | 'warning';
}

// components/student/CertificateCard.tsx
interface CertificateCardProps {
  certificate: Certificate;
  onDownload: () => void;
  onShare?: () => void;
}
```

## 🔐 Considerações de Segurança

1. **Tokens JWT**: Expiram em 7 dias, sem refresh token
2. **Validação de Acesso**: Backend valida se aluno tem acesso à turma/aula
3. **Rate Limiting**: Implementar limite de requisições no frontend
4. **Dados Sensíveis**: Nunca armazenar senhas ou códigos no localStorage
5. **HTTPS**: Sempre usar conexão segura em produção

## 📊 Fluxo de Negócio

### Jornada do Aluno:
1. **Primeiro Acesso** → Recebe email com código → Define senha
2. **Login** → Acesso ao dashboard
3. **Explorar Cursos** → Ver catálogo de turmas disponíveis
4. **Inscrição** → Selecionar turma → Confirmar inscrição
5. **Assistir Aulas** → Acessar conteúdo → Completar steps → Progresso automático
6. **Avaliação** → Realizar prova online → Obter nota mínima
7. **Certificado** → Gerado automaticamente → Download PDF

### Regras de Negócio Importantes:
- Aluno só pode se inscrever se houver vagas
- Período de inscrição deve estar vigente
- Aulas podem ter ordem obrigatória (sequential)
- Progresso é calculado por steps completados
- Certificado só é gerado após completar 100% + avaliação
- Códigos de verificação expiram em 15 minutos

## 🚀 Próximos Passos para Implementação

1. **Fase 1 - Autenticação**
   - Implementar telas de login e primeiro acesso
   - Configurar gerenciamento de tokens
   - Criar guards de rota

2. **Fase 2 - Dashboard e Navegação**
   - Criar layout base para área do aluno
   - Implementar dashboard com cards de resumo
   - Menu lateral com navegação

3. **Fase 3 - Sistema de Cursos**
   - Catálogo de cursos com filtros
   - Sistema de inscrição
   - Lista de cursos inscritos

4. **Fase 4 - Player de Aulas**
   - Player de vídeo com tracking
   - Visualizador de conteúdo texto/HTML
   - Sistema de steps com progresso

5. **Fase 5 - Certificados e Avaliações**
   - Lista e download de certificados
   - Sistema de avaliações online
   - Relatórios de progresso

## 📞 Suporte ao Desenvolvimento

Para dúvidas sobre a API ou comportamentos específicos:
- Todos os endpoints retornam mensagens de erro descritivas
- Use o campo `message` para exibir erros ao usuário
- Códigos HTTP seguem padrão REST (200, 201, 400, 401, 404, 500)
- Paginação usa padrão `{ total, rows }`