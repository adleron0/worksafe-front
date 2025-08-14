import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { post } from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
 
  Lock, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Award,
  FileText,
  User,
  Loader2,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import Input from "@/components/general-components/Input";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Loader from "@/components/general-components/Loader";
import NavBar from "./-components/NavBar";
import Footer from "./-components/Footer";

export const Route = createFileRoute("/_index/prova/$classId")({
  component: ExamPage,
});

interface ExamQuestion {
  question: string;
  options: {
    text: string;
  }[];
}

interface ExamData {
  traineeId: number;
  classId: number;
  courseId: number;
  exam: ExamQuestion[];
  courseName?: string;
  traineeName?: string;
  className?: string;
}

interface ValidationResponse {
  traineeId: number;
  classId: number;
  courseId: number;
  exam: ExamQuestion[] | string;
  courseName?: string;
  traineeName?: string;
  className?: string;
}

interface ExamSubmitResponse {
  success: boolean;
  message: string;
  data: any;
  approved: boolean;
  nota: number;
  media: number;
  correctAnswers: number;
  totalQuestions: number;
  subscription: {
    classId: number;
    className: string;
    courseName: string;
  };
}

interface ExamAnswer {
  questionIndex: number;
  selectedOption: number;
  question?: string;
  selectedText?: string;
}

function ExamPage() {
  const { classId } = Route.useParams();
  const STORAGE_KEY = `exam_session_${classId}`;
  const STORAGE_EXPIRY_KEY = `exam_session_expiry_${classId}`;
  
  // Função para verificar se a sessão expirou
  const isSessionExpired = () => {
    const expiry = localStorage.getItem(STORAGE_EXPIRY_KEY);
    if (!expiry) return true;
    return new Date().getTime() > parseInt(expiry);
  };
  
  // Função para limpar sessão
  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_EXPIRY_KEY);
  };
  
  // Função para salvar sessão
  const saveSession = (data: any) => {
    const expiryTime = new Date().getTime() + (24 * 60 * 60 * 1000); // 24 horas
    // Garantir que os nomes sejam salvos
    const sessionData = {
      ...data,
      examData: {
        ...data.examData,
        courseName: data.examData?.courseName || "",
        traineeName: data.examData?.traineeName || "",
        className: data.examData?.className || ""
      }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    localStorage.setItem(STORAGE_EXPIRY_KEY, expiryTime.toString());
  };
  
  // Função para recuperar sessão
  const getSession = () => {
    if (isSessionExpired()) {
      clearSession();
      return null;
    }
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  };
  
  // Inicializar estados com dados salvos ou valores padrão
  const savedSession = getSession();
  
  // Estados para controle do fluxo
  const [stage, setStage] = useState<"auth" | "exam" | "result">(
    savedSession?.stage || "auth"
  );
  const [examData, setExamData] = useState<ExamData | null>(
    savedSession?.examData || null
  );
  
  // Estados para autenticação
  const [credentials, setCredentials] = useState({
    cpf: savedSession?.credentials?.cpf || "",
    classCode: savedSession?.credentials?.classCode || ""
  });
  
  // Estados para o exame
  const [currentQuestion, setCurrentQuestion] = useState(
    savedSession?.currentQuestion || 0
  );
  const [answers, setAnswers] = useState<ExamAnswer[]>(
    savedSession?.answers || []
  );
  const [selectedOption, setSelectedOption] = useState<string>(
    savedSession?.selectedOption || ""
  );
  const [timeStarted, setTimeStarted] = useState<Date | null>(
    savedSession?.timeStarted ? new Date(savedSession.timeStarted) : null
  );
  const [timeEnded, setTimeEnded] = useState<Date | null>(null);
  
  // Estados para resultado
  const [examResult, setExamResult] = useState<{
    passed: boolean;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    media: number;
  } | null>(null);

  // Mutation para validar credenciais
  const validateCredentials = useMutation({
    mutationFn: async (data: { cpf: string; classCode: string }) => {
      // Garantir que os valores sejam strings
      const cpfClean = String(data.cpf).replace(/\D/g, '');
      const classCodeClean = String(data.classCode).trim();
      
      const payload = {
        cpf: cpfClean,
        classCode: classCodeClean,
        classId: Number(classId)
      };
      
      return post<any>("classes", "validate-student", payload) as Promise<ValidationResponse>;
    },
    onSuccess: (data) => {
      console.log("Dados recebidos da API:", data); // Debug para verificar os dados
      
      if (data && data.exam) {
        // Parse do JSON do exam se vier como string
        const examQuestions = typeof data.exam === 'string' 
          ? JSON.parse(data.exam) 
          : data.exam;
        
        const newExamData = {
          traineeId: data.traineeId,
          classId: data.classId,
          courseId: data.courseId,
          exam: examQuestions,
          courseName: data.courseName || "",
          traineeName: data.traineeName || "",
          className: data.className || ""
        };
        
        console.log("Dados do exame preparados:", newExamData); // Debug
        
        setExamData(newExamData);
        
        // Inicializa array de respostas sem validação de corretas
        const newAnswers = examQuestions.map((question: ExamQuestion, index: number) => ({
          questionIndex: index,
          selectedOption: -1,
          question: question.question,
          selectedText: ""
        }));
        setAnswers(newAnswers);
        
        const startTime = new Date();
        setStage("exam");
        setTimeStarted(startTime);
        
        // Salvar sessão inicial
        saveSession({
          stage: "exam",
          examData: newExamData,
          credentials,
          answers: newAnswers,
          currentQuestion: 0,
          selectedOption: "",
          timeStarted: startTime.toISOString()
        });
        
        toast({
          title: "Credenciais validadas!",
          description: `Bem-vindo(a), ${data.traineeName || "Aluno"}!`,
          variant: "default",
        });
      }
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast({
        title: "Erro na validação",
        description: error?.response?.data?.message || "CPF ou código da turma inválidos.",
        variant: "destructive",
      });
    }
  });

  // Mutation para enviar resultado
  const submitExam = useMutation({
    mutationFn: async (data: {
      traineeId: number;
      courseId: number;
      classId: number;
      examResponses: string;
      companyId: number;
    }): Promise<ExamSubmitResponse> => {
      const response = await post<ExamSubmitResponse>("exames", "register", data);
      if (!response) {
        throw new Error("Resposta inválida do servidor");
      }
      return response;
    },
    onSuccess: (response: ExamSubmitResponse) => {
      // Salva o resultado com os dados do backend
      const result = {
        passed: response.approved,
        score: response.nota,
        correctAnswers: response.correctAnswers,
        totalQuestions: response.totalQuestions,
        media: response.media
      };
      
      setExamResult(result);
      
      toast({
        title: "Prova enviada com sucesso!",
        description: response.approved 
          ? "Parabéns! Você foi aprovado." 
          : "Você não atingiu a nota mínima, mas não desista!",
        variant: response.approved ? "default" : "destructive",
      });
      
      // Limpar sessão ao finalizar com sucesso
      clearSession();
      // Só vai para a tela de resultado após sucesso
      setStage("result");
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast({
        title: "Erro ao enviar prova",
        description: error?.response?.data?.message || "Erro ao enviar as respostas. Tente novamente.",
        variant: "destructive",
      });
      // Mantém na tela do exame para tentar novamente
    }
  });

  // Função para validar credenciais
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.cpf || !credentials.classCode) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }
    
    // Validar formato do CPF (11 dígitos)
    const cpfNumbers = credentials.cpf.replace(/\D/g, '');
    if (cpfNumbers.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "O CPF deve conter 11 dígitos.",
        variant: "destructive",
      });
      return;
    }
    
    // Validar código da turma (4 caracteres)
    if (credentials.classCode.length !== 4) {
      toast({
        title: "Código da turma inválido",
        description: "O código da turma deve conter 4 caracteres.",
        variant: "destructive",
      });
      return;
    }
    
    validateCredentials.mutate({
      cpf: credentials.cpf,
      classCode: credentials.classCode
    });
  };

  // Função para selecionar resposta
  const handleSelectOption = (value: string) => {
    setSelectedOption(value);
    const optionIndex = parseInt(value);
    
    const updatedAnswers = [...answers];
    const currentQuestionData = examData?.exam[currentQuestion];
    updatedAnswers[currentQuestion] = {
      questionIndex: currentQuestion,
      selectedOption: optionIndex,
      question: currentQuestionData?.question,
      selectedText: currentQuestionData?.options[optionIndex]?.text || ""
    };
    setAnswers(updatedAnswers);
    
    // Salvar progresso
    if (stage === "exam" && examData) {
      saveSession({
        stage,
        examData: {
          ...examData,
          courseName: examData.courseName,
          traineeName: examData.traineeName,
          className: examData.className
        },
        credentials,
        answers: updatedAnswers,
        currentQuestion,
        selectedOption: value,
        timeStarted: timeStarted?.toISOString()
      });
    }
  };

  // Função para navegar entre questões
  const handleNextQuestion = () => {
    // Verificar se a questão atual foi respondida
    if (!selectedOption || selectedOption === "") {
      toast({
        title: "Questão não respondida",
        description: "Por favor, selecione uma resposta antes de continuar.",
        variant: "destructive",
      });
      return;
    }
    
    if (currentQuestion < (examData?.exam.length || 0) - 1) {
      const nextQuestion = currentQuestion + 1;
      const nextOption = answers[nextQuestion]?.selectedOption?.toString() || "";
      
      setCurrentQuestion(nextQuestion);
      setSelectedOption(nextOption === "-1" ? "" : nextOption);
      
      // Salvar progresso
      if (examData) {
        saveSession({
          stage,
          examData: {
            ...examData,
            courseName: examData.courseName,
            traineeName: examData.traineeName,
            className: examData.className
          },
          credentials,
          answers,
          currentQuestion: nextQuestion,
          selectedOption: nextOption === "-1" ? "" : nextOption,
          timeStarted: timeStarted?.toISOString()
        });
      }
    }
  };

  // Função para sair da prova
  const handleLogout = () => {
    clearSession();
    setStage("auth");
    setExamData(null);
    setAnswers([]);
    setCurrentQuestion(0);
    setSelectedOption("");
    setTimeStarted(null);
    setCredentials({ cpf: "", classCode: "" });
    
    toast({
      title: "Sessão encerrada",
      description: "Você saiu da prova. Faça login novamente para continuar.",
      variant: "default",
    });
  };
  
  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      // Verifica se a questão atual foi respondida antes de voltar
      if (!selectedOption || selectedOption === "") {
        toast({
          title: "Questão não respondida",
          description: "Por favor, responda a questão atual antes de navegar.",
          variant: "destructive",
        });
        return;
      }
      
      const prevQuestion = currentQuestion - 1;
      const prevOption = answers[prevQuestion]?.selectedOption?.toString() || "";
      
      setCurrentQuestion(prevQuestion);
      setSelectedOption(prevOption === "-1" ? "" : prevOption);
      
      // Salvar progresso
      if (examData) {
        saveSession({
          stage,
          examData: {
            ...examData,
            courseName: examData.courseName,
            traineeName: examData.traineeName,
            className: examData.className
          },
          credentials,
          answers,
          currentQuestion: prevQuestion,
          selectedOption: prevOption === "-1" ? "" : prevOption,
          timeStarted: timeStarted?.toISOString()
        });
      }
    }
  };

  // Função para confirmar finalização da prova
  const handleConfirmFinish = () => {
    if (!examData) return;
    
    // Verificar se a questão atual foi respondida
    if (!selectedOption || selectedOption === "") {
      toast({
        title: "Questão não respondida",
        description: "Por favor, responda a questão atual antes de finalizar.",
        variant: "destructive",
      });
      return;
    }
    
    // Verifica se todas as questões foram respondidas
    const unansweredQuestions = answers.filter(a => a.selectedOption === -1);
    if (unansweredQuestions.length > 0) {
      toast({
        title: "Questões não respondidas",
        description: `Você precisa responder todas as ${unansweredQuestions.length} questões pendentes antes de finalizar.`,
        variant: "destructive",
      });
      return;
    }
    
    // Se tudo está ok, retorna true para abrir o diálogo
    return true;
  };
  
  // Função para finalizar prova
  const handleFinishExam = () => {
    if (!examData) return;
    
    const endTime = new Date();
    setTimeEnded(endTime);
    
    // Prepara dados para envio (sem calcular resultado localmente)
    const examResponses = {
      answers: answers.map(a => ({
        questionIndex: a.questionIndex,
        selectedOption: a.selectedOption,
        selectedText: a.selectedText
      })),
      timeSpent: (endTime.getTime() - (timeStarted?.getTime() || 0)) / 1000
    };
    
    // Envia respostas para API (sem resultado pré-calculado)
    submitExam.mutate({
      traineeId: examData.traineeId,
      courseId: examData.courseId,
      classId: examData.classId,
      examResponses: JSON.stringify(examResponses),
      companyId: 1
    });
  };

  // Calcula progresso
  const progress = examData 
    ? ((answers.filter(a => a.selectedOption !== -1).length / examData.exam.length) * 100)
    : 0;

  // Efeito para verificar sessão expirada ao montar
  useEffect(() => {
    if (isSessionExpired() && stage !== "auth") {
      clearSession();
      setStage("auth");
      toast({
        title: "Sessão expirada",
        description: "Sua sessão expirou. Por favor, faça login novamente.",
        variant: "destructive",
      });
    }
  }, []);
  
  return (
    <div className="[color-scheme:light] min-h-screen bg-white" style={{ colorScheme: 'light' }}>
        <NavBar cart={[]} setCart={() => {}} handleWhatsApp={() => {}} />
        
        {/* Loader ao enviar prova */}
        {submitExam.isPending && (
          <Loader title="Enviando sua prova..." />
        )}
        
        <div className="container mx-auto px-4 py-24" style={{ backgroundColor: 'white' }}>
        <AnimatePresence mode="wait">
          {/* Estágio de Autenticação */}
          {stage === "auth" && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto"
            >
              <Card className="p-8 shadow-xl bg-white border-gray-200">
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ color: '#111827' }}>
                    Acesso à Prova
                  </h1>
                  <p className="text-gray-600" style={{ color: '#4B5563' }}>
                    Digite suas credenciais para acessar a prova
                  </p>
                </div>
                
                <form onSubmit={handleAuth} className="space-y-6">
                  <div>
                    <Label htmlFor="cpf" className="text-gray-700 font-medium" style={{ color: '#374151' }}>
                      CPF
                    </Label>
                    <div className="relative mt-2">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="cpf"
                        name="cpf"
                        format="cpf"
                        placeholder="000.000.000-00"
                        value={credentials.cpf}
                        onValueChange={(name, value) => 
                          setCredentials(prev => ({ ...prev, [name]: value }))
                        }
                        className="pl-10 bg-white text-gray-900 border-gray-300"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="classCode" className="text-gray-700 font-medium" style={{ color: '#374151' }}>
                      Código da Turma
                    </Label>
                    <div className="relative mt-2">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="classCode"
                        name="classCode"
                        placeholder="Ex: A3B9"
                        value={credentials.classCode}
                        onValueChange={(name, value) => 
                          setCredentials(prev => ({ ...prev, [name]: typeof value === 'string' ? value.toUpperCase() : value.toString() }))
                        }
                        className="pl-10 uppercase bg-white text-gray-900 border-gray-300"
                        maxLength={4}
                        required
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-primary-light hover:bg-primary-light/90"
                    disabled={validateCredentials.isPending}
                  >
                    {validateCredentials.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      <>
                        Acessar Prova
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
                
                <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm" style={{ color: '#92400E' }}>
                      <p className="font-semibold mb-1">Importante:</p>
                      <ul className="space-y-1">
                        <li>• Use o mesmo CPF cadastrado na inscrição</li>
                        <li>• O código da turma foi fornecido pelo instrutor</li>
                        <li>• Você terá apenas uma tentativa</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
          
          {/* Estágio do Exame */}
          {stage === "exam" && examData && (
            <motion.div
              key="exam"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              {/* Header da Prova */}
              <div className="mb-6 md:mb-8">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="order-2 md:order-1">
                    {examData.traineeName && (
                      <p className="text-base md:text-lg font-semibold mb-1" style={{ color: '#1F2937' }}>
                        {examData.traineeName}
                      </p>
                    )}
                    <h1 className="text-lg md:text-2xl font-bold" style={{ color: '#111827' }}>
                      Prova de Avaliação
                      {examData.courseName && (
                        <span className="block md:inline text-base md:text-2xl font-normal md:font-bold">
                          {examData.courseName}
                        </span>
                      )}
                    </h1>
                    {examData.className && (
                      <p className="text-xs md:text-sm mt-1" style={{ color: '#6B7280' }}>
                        Turma: {examData.className}
                      </p>
                    )}
                  </div>
                  <div className="order-1 md:order-2 flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-3">
                    <Badge variant="outline" className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm" style={{ backgroundColor: 'white', color: '#374151', borderColor: '#E5E7EB' }}>
                      <Clock className="mr-1.5 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                      Questão {currentQuestion + 1} de {examData.exam.length}
                    </Badge>
                    <ConfirmDialog
                      title="Sair da Prova"
                      description="Tem certeza que deseja sair? Seu progresso será salvo por 24 horas e você poderá continuar de onde parou."
                      onConfirm={handleLogout}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs md:text-sm h-8 md:h-9"
                        style={{ 
                          backgroundColor: 'white', 
                          borderColor: '#E5E7EB',
                          color: '#DC2626'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FEF2F2';
                          e.currentTarget.style.color = '#B91C1C';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.color = '#DC2626';
                        }}
                      >
                        <LogOut className="mr-1.5 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                        Sair
                      </Button>
                    </ConfirmDialog>
                  </div>
                </div>
                
                {/* Barra de Progresso */}
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-xs md:text-sm" style={{ color: '#4B5563' }}>
                    <span>Progresso da Prova</span>
                    <span>{Math.round(progress)}% completo</span>
                  </div>
                  <Progress 
                    value={progress} 
                    className="h-1.5 md:h-2" 
                    style={{ backgroundColor: '#E5E7EB' }}
                  />
                </div>
              </div>
              
              {/* Questão */}
              <Card className="p-4 md:p-8 shadow-xl bg-white border-gray-200">
                <div className="mb-6 md:mb-8">
                  <div className="flex items-start gap-3 md:gap-4 mb-4 md:mb-6">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-light/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 md:w-5 md:h-5 text-primary-light" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-base md:text-lg font-semibold mb-2" style={{ color: '#111827' }}>
                        Questão {currentQuestion + 1}
                      </h2>
                      <p className="text-sm md:text-base leading-relaxed" style={{ color: '#374151' }}>
                        {examData.exam[currentQuestion].question}
                      </p>
                    </div>
                  </div>
                  
                  {/* Opções */}
                  <RadioGroup 
                    value={selectedOption} 
                    onValueChange={handleSelectOption}
                    className="space-y-2 md:space-y-3"
                  >
                    {examData.exam[currentQuestion].options.map((option, index) => (
                      <div 
                        key={index}
                        className={`relative flex items-center space-x-2 md:space-x-3 p-3 md:p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          selectedOption === index.toString()
                            ? 'border-primary-light'
                            : 'border-gray-200'
                        }`}
                        style={{
                          backgroundColor: selectedOption === index.toString() ? 'rgba(34, 197, 94, 0.05)' : 'white',
                          borderColor: selectedOption === index.toString() ? '#22C55E' : '#E5E7EB'
                        }}
                      >
                        <RadioGroupItem 
                          value={index.toString()} 
                          id={`option-${index}`}
                          className="text-primary-light h-4 w-4 md:h-5 md:w-5"
                        />
                        <Label 
                          htmlFor={`option-${index}`}
                          className="flex-1 cursor-pointer text-sm md:text-base" style={{ color: '#374151' }}
                        >
                          {option.text}
                        </Label>
                        {selectedOption === index.toString() && (
                          <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-primary-light" />
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                
                {/* Navegação */}
                <div className="flex flex-col gap-4 pt-4 md:pt-6 border-t">
                  {/* Botões numerados - scroll horizontal no mobile */}
                  <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="flex gap-1.5 md:gap-2 justify-center min-w-max py-2">
                      {examData.exam.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          // Se mudando de questão e a atual não foi respondida, não permite navegar
                          if (index !== currentQuestion) {
                            // Verifica se a questão atual tem resposta selecionada
                            if (!selectedOption || selectedOption === "") {
                              toast({
                                title: "Questão não respondida",
                                description: "Responda a questão atual antes de navegar para outra.",
                                variant: "destructive",
                              });
                              return;
                            }
                            
                            // Se navegando para frente, verifica se todas as questões anteriores foram respondidas
                            if (index > currentQuestion) {
                              for (let i = 0; i <= currentQuestion; i++) {
                                if (!answers[i] || answers[i].selectedOption === -1) {
                                  toast({
                                    title: "Questão não respondida",
                                    description: `A questão ${i + 1} precisa ser respondida antes de continuar.`,
                                    variant: "destructive",
                                  });
                                  return;
                                }
                              }
                            }
                          }
                          
                          const nextOption = answers[index]?.selectedOption?.toString() || "";
                          setCurrentQuestion(index);
                          setSelectedOption(nextOption === "-1" ? "" : nextOption);
                          
                          // Salvar progresso
                          if (examData) {
                            saveSession({
                              stage,
                              examData: {
                                ...examData,
                                courseName: examData.courseName,
                                traineeName: examData.traineeName,
                                className: examData.className
                              },
                              credentials,
                              answers,
                              currentQuestion: index,
                              selectedOption: nextOption,
                              timeStarted: timeStarted?.toISOString()
                            });
                          }
                        }}
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-lg text-xs md:text-sm font-medium transition-all flex-shrink-0`}
                        style={{
                          backgroundColor: index === currentQuestion 
                            ? '#22C55E' 
                            : answers[index]?.selectedOption !== -1
                            ? '#DCFCE7'
                            : '#F3F4F6',
                          color: index === currentQuestion
                            ? 'white'
                            : answers[index]?.selectedOption !== -1
                            ? '#15803D'
                            : '#4B5563',
                          boxShadow: index === currentQuestion ? '0 0 0 2px white, 0 0 0 4px #22C55E' : 'none'
                        }}
                        title={
                          answers[index]?.selectedOption !== -1
                            ? `Quest\u00e3o ${index + 1} - Respondida`
                            : `Quest\u00e3o ${index + 1} - N\u00e3o respondida`
                        }
                      >
                        {index + 1}
                      </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Botões de navegação */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={handlePreviousQuestion}
                      disabled={currentQuestion === 0}
                      className="text-xs md:text-sm h-9 md:h-10"
                    >
                      <ChevronLeft className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">Anterior</span>
                      <span className="sm:hidden">Voltar</span>
                    </Button>
                    
                    {currentQuestion === examData.exam.length - 1 ? (
                    <ConfirmDialog
                      title="Finalizar Prova"
                      description="Tem certeza que deseja finalizar a prova? Após confirmar, não será possível alterar suas respostas."
                      onConfirm={handleFinishExam}
                    >
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-xs md:text-sm h-9 md:h-10"
                        disabled={submitExam.isPending || !selectedOption}
                        onClick={(e) => {
                          if (!handleConfirmFinish()) {
                            e.stopPropagation();
                            e.preventDefault();
                          }
                        }}
                      >
                        <>
                          Finalizar
                          <CheckCircle className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4" />
                        </>
                      </Button>
                    </ConfirmDialog>
                  ) : (
                    <Button
                      onClick={handleNextQuestion}
                      className="bg-primary-light hover:bg-primary-light/90 text-xs md:text-sm h-9 md:h-10"
                      disabled={!selectedOption || selectedOption === ""}
                    >
                      Próxima
                      <ChevronRight className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                    )}
                  </div>
                </div>
              </Card>
              
              {/* Indicador de questões respondidas */}
              <div className="mt-4 md:mt-6 p-3 md:p-4 rounded-lg" style={{ backgroundColor: '#DBEAFE' }}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs md:text-sm">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full"></div>
                      <span style={{ color: '#374151' }}>Respondidas</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-gray-300 rounded-full"></div>
                      <span style={{ color: '#374151' }}>Pendentes</span>
                    </div>
                  </div>
                  <div className="sm:ml-auto font-medium" style={{ color: '#374151' }}>
                    {answers.filter(a => a.selectedOption !== -1).length} de {examData.exam.length} respondidas
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Estágio de Resultado */}
          {stage === "result" && examResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-2xl mx-auto"
            >
              <Card className="p-6 md:p-8 shadow-xl bg-white border-gray-200">
                <div className="text-center">
                  {/* Ícone de Resultado */}
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6"
                    style={{ backgroundColor: examResult.passed ? '#DCFCE7' : '#FEE2E2' }}>
                    {examResult.passed ? (
                      <Award className="w-12 h-12 md:w-16 md:h-16 text-green-600" />
                    ) : (
                      <XCircle className="w-12 h-12 md:w-16 md:h-16 text-red-600" />
                    )}
                  </div>
                  
                  {/* Título do Resultado */}
                  <h1 className="text-xl md:text-3xl font-bold mb-4"
                    style={{ color: examResult.passed ? '#15803D' : '#B91C1C' }}>
                    {examResult.passed ? 'Parabéns! Você foi Aprovado!' : 'Que pena! Você não foi aprovado'}
                  </h1>
                  
                  {/* Estatísticas - Responsivo */}
                  <div className="flex flex-col gap-3 my-6 md:my-8">
                    {/* Card principal de nota */}
                    <div className="p-6 bg-gradient-to-br from-primary-light/10 to-primary-light/5 rounded-lg border border-primary-light/20">
                      <p className="text-3xl md:text-4xl font-bold" style={{ color: '#111827' }}>
                        {examResult.score.toFixed(1)}
                      </p>
                      <p className="text-sm md:text-base font-medium mt-1" style={{ color: '#4B5563' }}>Nota Final</p>
                      <p className="text-xs md:text-sm mt-1" style={{ color: '#6B7280' }}>
                        Média para aprovação: {examResult.media.toFixed(1)}
                      </p>
                    </div>
                    
                    {/* Cards secundários lado a lado */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                        <p className="text-xl md:text-2xl font-bold" style={{ color: '#111827' }}>
                          {examResult.correctAnswers}/{examResult.totalQuestions}
                        </p>
                        <p className="text-xs md:text-sm" style={{ color: '#4B5563' }}>Acertos</p>
                      </div>
                      <div className="p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                        <p className="text-xl md:text-2xl font-bold" style={{ color: '#111827' }}>
                          {((examResult.correctAnswers / examResult.totalQuestions) * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs md:text-sm" style={{ color: '#4B5563' }}>Aproveitamento</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mensagem */}
                  {!examResult.passed && (
                    <p className="text-sm md:text-base mb-6 md:mb-8 px-4" style={{ color: '#4B5563' }}>
                      Entre em contato com o instrutor para mais informações sobre nova tentativa.
                    </p>
                  )}
                  
                  {/* Tempo de prova */}
                  {timeStarted && timeEnded && (
                    <div className="flex items-center justify-center gap-2 text-sm mb-6" style={{ color: '#6B7280' }}>
                      <Clock className="h-4 w-4" />
                      <span>
                        Tempo de prova: {Math.floor((timeEnded.getTime() - timeStarted.getTime()) / 60000)} minutos
                      </span>
                    </div>
                  )}
                  
                  {/* Botão de Ação */}
                  <Button
                    onClick={() => window.location.href = '/'}
                    className="bg-primary-light hover:bg-primary-light/90"
                  >
                    Voltar ao Início
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <Footer />
    </div>
  );
}

export default ExamPage;