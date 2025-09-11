import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ContentComponentProps } from '../../types';

interface QuizQuestion {
  id: string;
  question: string;
  type: string;
  options: string[];
  // Removidos: correctAnswer e explanation (virão apenas no resultado)
}

interface QuizData {
  description?: string;
  questions: QuizQuestion[];
  passingScore?: number;
  maxAttempts?: number;
}

interface QuizResultQuestion {
  question: string;
  options: string[];
  selectedOption: number;
  correctAnswer: number;
  isCorrect: boolean;
  explanation?: string;
}

interface QuizResult {
  passed: boolean;
  score: number;
  maxScore: number;
  percentage: number;
  questions: QuizResultQuestion[];
}

export function QuizContent({ step, onCompleteStep }: ContentComponentProps) {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [submitted, setSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  
  // Parse quiz data primeiro para ter acesso às questões
  const quizData = useMemo(() => {
    try {
      // Se o conteúdo é uma string, fazer parse
      if (typeof step.content === 'string') {
        return JSON.parse(step.content) as QuizData;
      }
      // Se já é um objeto, verificar se tem a estrutura correta
      if (step.content && typeof step.content === 'object') {
        // Verificar se já tem questions diretamente
        if ('questions' in step.content && Array.isArray(step.content.questions)) {
          return step.content as unknown as QuizData;
        }
        // Se tem uma propriedade content que é string
        if ('content' in step.content && typeof step.content.content === 'string') {
          return JSON.parse(step.content.content) as QuizData;
        }
        // Se é um objeto mas não tem questions, tentar converter
        return { 
          questions: [], 
          passingScore: 70,
          description: undefined,
          maxAttempts: undefined,
          ...step.content 
        } as unknown as QuizData;
      }
      return { questions: [], passingScore: 70 };
    } catch (error) {
      console.error('Erro ao fazer parse do quiz:', error);
      return { questions: [], passingScore: 70 };
    }
  }, [step.content]);

  // Reiniciar tempo quando o componente monta e verificar se já foi respondido
  useEffect(() => {
    startTimeRef.current = Date.now();
    
    // Verificar se já existe resultado no stepProgress
    if (step.stepProgress?.progressData) {
      try {
        const progressData = typeof step.stepProgress.progressData === 'string' 
          ? JSON.parse(step.stepProgress.progressData) 
          : step.stepProgress.progressData;
          
        if (progressData.formattedResult) {
          setQuizResult(progressData.formattedResult);
          setShowResults(true);
          setSubmitted(true);
          setAttempts(progressData.attempts || 1);
          
          // Restaurar respostas selecionadas
          const restoredAnswers: { [key: string]: number } = {};
          progressData.formattedResult.questions.forEach((q: any, index: number) => {
            const questionId = quizData.questions?.[index]?.id;
            if (questionId && q.selectedOption !== undefined) {
              restoredAnswers[questionId] = q.selectedOption;
            }
          });
          setAnswers(restoredAnswers);
        }
      } catch (error) {
        console.error('Erro ao processar progressData existente:', error);
      }
    }
  }, [step.id, step.stepProgress, quizData.questions]);
  
  const { questions = [], passingScore = 70, maxAttempts = 3, description } = quizData;
  
  const handleSubmit = async () => {
    if (isSubmitting || submitted) return; // Não permitir reenvio se já foi submetido
    
    setIsSubmitting(true);
    setIsLoadingResults(true);
    
    try {
      // Calcular tempo gasto em segundos
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      // Formatar respostas para o backend
      const responses = questions.map((q) => ({
        questionId: q.id, // Manter como string conforme interface
        selectedOptions: answers[q.id] !== undefined ? [answers[q.id]] : []
      }));
      
      console.log('📝 Enviando quiz para validação:', {
        stepId: step.id,
        responses,
        timeSpent
      });
      
      // Enviar para o backend e aguardar resultado
      if (onCompleteStep) {
        const result = await onCompleteStep({
          stepId: step.id,
          contentType: 'QUIZ',
          progressData: JSON.stringify({
            responses,
            timeSpent
          })
        });
        
        console.log('📊 Resultado recebido:', result);
        
        // Buscar o resultado do step atualizado
        const updatedStep = result?.stepsContent?.find((s: any) => s.id === step.id);
        const progressData = updatedStep?.stepProgress?.progressData || result?.progressData;
        
        // Processar o resultado formatado do backend
        if (progressData?.formattedResult) {
          const formattedResult = progressData.formattedResult;
          setQuizResult(formattedResult);
          setShowResults(true);
          setAttempts(progressData.attempts || attempts + 1);
          
          if (formattedResult.passed) {
            setSubmitted(true);
            toast({
              title: '🎉 Quiz aprovado!',
              description: `Você acertou ${formattedResult.score} de ${formattedResult.maxScore} questões (${formattedResult.percentage.toFixed(0)}%).`,
              variant: 'success',
            });
          } else {
            const remainingAttempts = maxAttempts - (progressData.attempts || attempts + 1);
            
            if (remainingAttempts <= 0) {
              setSubmitted(true);
              toast({
                title: 'Tentativas esgotadas',
                description: `Você não atingiu a pontuação mínima de ${passingScore}%.`,
                variant: 'destructive',
              });
            } else {
              toast({
                title: 'Tente novamente',
                description: `Você fez ${formattedResult.percentage.toFixed(0)}% e precisa de ${passingScore}%. Restam ${remainingAttempts} tentativa(s).`,
                variant: 'destructive',
              });
            }
          }
        } else {
          // Fallback se não receber formattedResult
          console.error('formattedResult não encontrado na resposta');
          toast({
            title: 'Quiz enviado',
            description: 'Suas respostas foram registradas.',
            variant: 'default',
          });
          setSubmitted(true);
        }
      }
    } catch (error) {
      console.error('Erro ao enviar quiz:', error);
      toast({
        title: 'Erro ao enviar',
        description: 'Ocorreu um erro ao enviar suas respostas. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      setIsLoadingResults(false);
    }
  };
  
  const handleRetry = () => {
    setAnswers({});
    setShowResults(false);
    setQuizResult(null);
    // Reiniciar cronômetro para nova tentativa
    startTimeRef.current = Date.now();
  };
  
  return (
    <div className="space-y-4">
      {/* Banner de conclusão */}
      {submitted && quizResult && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-400 flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Este quiz já foi concluído
          </p>
        </div>
      )}
      
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">{step.title}</CardTitle>
          {description && (
            <p className="text-xs md:text-sm text-muted-foreground mt-2">{description}</p>
          )}
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 space-y-4 md:space-y-6">
        {isLoadingResults ? (
          <div className="text-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <p className="text-lg font-medium">Validando suas respostas...</p>
            <p className="text-sm text-muted-foreground">Aguarde enquanto processamos o resultado</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p>Nenhuma questão disponível</p>
          </div>
        ) : (
          <>
            {questions.map((question, index) => (
              <div key={question.id} className="space-y-4 pb-6 border-b last:border-0">
                <div className="flex items-start gap-2 md:gap-3">
                  <span className="flex h-5 w-5 md:h-6 md:w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] md:text-xs text-primary-foreground">
                    {index + 1}
                  </span>
                  <p className="font-medium flex-1 text-sm md:text-base">{question.question}</p>
                </div>
                
                <RadioGroup
                  value={answers[question.id]?.toString() || ''}
                  onValueChange={(value) => {
                    setAnswers(prev => ({
                      ...prev,
                      [question.id]: parseInt(value)
                    }));
                  }}
                  disabled={showResults}
                  className="ml-7 md:ml-9"
                >
                  {question.options.map((option, optionIndex) => {
                    // Buscar informações do resultado se disponível
                    const resultQuestion = quizResult?.questions?.[index];
                    const isCorrect = showResults && resultQuestion && optionIndex === resultQuestion.correctAnswer;
                    const isWrong = showResults && resultQuestion && 
                                   optionIndex === resultQuestion.selectedOption && 
                                   optionIndex !== resultQuestion.correctAnswer;
                    
                    return (
                      <div key={optionIndex} className="flex items-start space-x-2">
                        <RadioGroupItem 
                          value={optionIndex.toString()} 
                          id={`${question.id}-${optionIndex}`}
                          className="mt-1"
                        />
                        <Label 
                          htmlFor={`${question.id}-${optionIndex}`}
                          className={`cursor-pointer flex-1 text-sm md:text-base ${
                            isCorrect ? 'text-green-600 font-medium' : 
                            isWrong ? 'text-red-600' : ''
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {option}
                            {isCorrect && <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />}
                            {isWrong && <XCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />}
                          </span>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
                
                {showResults && quizResult?.questions?.[index]?.explanation && (
                  <div className="ml-7 md:ml-9 p-2 md:p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-xs md:text-sm">
                      <span className="font-medium">Explicação:</span> {quizResult.questions[index].explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
            
            <div className="flex gap-3">
              {!submitted && !showResults && (
                <Button 
                  onClick={handleSubmit}
                  disabled={Object.keys(answers).length < questions.length || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Respostas'}
                </Button>
              )}
              
              {showResults && !submitted && attempts < maxAttempts && (
                <Button 
                  onClick={handleRetry}
                  variant="outline"
                  className="flex-1"
                >
                  Tentar Novamente
                </Button>
              )}
              
              {submitted && (
                <div className="flex-1 text-center py-2">
                  <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-xs md:text-sm font-medium text-green-600">
                    {quizResult?.passed ? 'Quiz aprovado!' : 'Quiz concluído'}
                  </p>
                  {quizResult && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Pontuação: {quizResult.score}/{quizResult.maxScore} ({quizResult.percentage.toFixed(0)}%)
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Comentado por enquanto - será usado quando houver múltiplas tentativas
            {attempts > 0 && (
              <div className="text-center text-xs md:text-sm text-muted-foreground">
                Tentativa {attempts} de {maxAttempts}
              </div>
            )}
            */}
          </>
        )}
      </CardContent>
    </Card>
    </div>
  );
}