import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import Loader from '@/components/general-components/Loader';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';
import { ArrowUpRight, Sparkles } from 'lucide-react';

// Hooks
import { useLessonData } from './-hooks/useLessonData';
import { useLessonProgress } from './-hooks/useLessonProgress';
import { useStepNavigation } from './-hooks/useStepNavigation';
import { useStepCompletion } from './-hooks/useStepCompletion';

// Components
import { LessonHeader } from './-components/LessonHeader';
import { LessonSidebar } from './-components/LessonSidebar';
import { StepNavigation } from './-components/StepNavigation';
import { VideoContent } from './-components/content/VideoContent';
import { TextContent } from './-components/content/TextContent';
import { QuizContent } from './-components/content/QuizContent';
import { DownloadContent } from './-components/content/DownloadContent';
import { CompletionModal } from './-components/CompletionModal';
import { NextLessonModal } from './-components/NextLessonModal';
import { ContentSkeleton } from './-components/ContentSkeleton';

// Types  (MergedStep é usado indiretamente pelos componentes)

export const Route = createFileRoute('/student/lesson/$lessonId')({
  component: LessonPlayer,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      modelId: search.modelId ? Number(search.modelId) : undefined,
      classId: search.classId ? Number(search.classId) : undefined,
    };
  },
});

function LessonPlayer() {
  const { lessonId } = Route.useParams();
  const { modelId, classId } = Route.useSearch();
  const navigate = useNavigate();
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showNextLessonModal, setShowNextLessonModal] = useState(false);
  const [nextLessonId, setNextLessonId] = useState<number | null>(null);
  const [hasShownCompletionModal, setHasShownCompletionModal] = useState(false);
  const [isChangingLesson, setIsChangingLesson] = useState(false);
  const previousLessonIdRef = useRef(lessonId);
  
  // Hooks - passa modelId para o hook useLessonData
  const { data: lessonData, isLoading, refetch } = useLessonData(lessonId, modelId);
  
  const {
    startStep,
    updateStepProgress,
    checkLessonCompletion
  } = useLessonProgress(lessonId, () => {
    // Callback quando a lição for concluída pela primeira vez
    // Verificar nextLesson imediatamente se disponível
    if (lessonData?.nextLesson !== undefined) {
      if (lessonData.nextLesson) {
        setNextLessonId(lessonData.nextLesson);
        setShowNextLessonModal(true);
        setHasShownCompletionModal(true);
      } else {
        setShowCompletionModal(true);
        setHasShownCompletionModal(true);
      }
    } else {
      // Refetch para garantir dados atualizados com nextLesson
      refetch();
    }
  });
  
  const {
    currentStep,
    currentStepIndex,
    navigateToStep,
    goToNextStep,
    goToPreviousStep,
    canGoNext,
    canGoPrevious,
    setCurrentStep,
    setCurrentStepIndex
  } = useStepNavigation({ lessonData, startStep });
  
  const { completeStep, isCompletingStep } = useStepCompletion(lessonId, currentStep, checkLessonCompletion);

  // Reset imediato do step quando mudar de lição
  useEffect(() => {
    if (previousLessonIdRef.current !== lessonId) {
      setIsChangingLesson(true);
      setCurrentStep(null);
      setCurrentStepIndex(0);
      previousLessonIdRef.current = lessonId;
    }
  }, [lessonId, setCurrentStep, setCurrentStepIndex]);

  // Resetar flag quando dados carregarem
  useEffect(() => {
    if (!isLoading && lessonData && isChangingLesson) {
      setIsChangingLesson(false);
    }
  }, [isLoading, lessonData, isChangingLesson]);

  // Ref para controlar se já está completando o vídeo
  const isCompletingVideoRef = useRef<Set<number>>(new Set());
  // Ref para debounce do progresso
  const progressDebounceRef = useRef<NodeJS.Timeout>();

  // Não precisa mais iniciar lesson manualmente
  // O backend inicia automaticamente quando iniciar o primeiro step
  // useEffect removido - startLesson não é mais necessário

  // Monitorar quando refetch traz nextLesson após conclusão
  useEffect(() => {
    // Só processa se a lição está completa e ainda não mostrou modal
    if (lessonData?.lessonProgress?.completed && !hasShownCompletionModal && lessonData?.nextLesson !== undefined) {
      if (lessonData.nextLesson) {
        setNextLessonId(lessonData.nextLesson);
        setShowNextLessonModal(true);
        setHasShownCompletionModal(true);
      } else {
        setShowCompletionModal(true);
        setHasShownCompletionModal(true);
      }
    }
  }, [lessonData, hasShownCompletionModal]);

  // Resetar flag quando mudar de lição
  useEffect(() => {
    setHasShownCompletionModal(false);
    setShowCompletionModal(false);
    setShowNextLessonModal(false);
  }, [lessonId]);

  // Limpar refs quando mudar de step
  useEffect(() => {
    const stepId = currentStep?.id;
    return () => {
      // Limpar debounce timer ao desmontar ou mudar de step
      clearTimeout(progressDebounceRef.current);
      // Limpar flag de conclusão do vídeo atual
      if (stepId) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        isCompletingVideoRef.current.delete(stepId);
      }
    };
  }, [currentStep]);

  // Não precisamos mais desse useEffect pois o checkLessonCompletion
  // já é chamado dentro do hook useStepCompletion após completar um step

  // Manipular progresso do vídeo
  const handleVideoProgress = useCallback((progress: number, currentTime?: number, duration?: number) => {
    if (!currentStep) return;
    
    // Se o step já está completo, não fazer nada para evitar reset do vídeo
    if (currentStep.status === ('completed' as any) || currentStep.status === ('COMPLETED' as any)) {
      return;
    }
    
    // Atualizar progresso do step com debounce
    if (progress > (currentStep.progress || 0)) {
      clearTimeout(progressDebounceRef.current);
      progressDebounceRef.current = setTimeout(() => {
        updateStepProgress({
          stepId: currentStep.id,
          progress: Math.round(progress),
          data: { videoTime: currentTime || progress }
        });
      }, 1000); // Aguarda 1 segundo antes de enviar
    }
    
    // Marcar step como concluído se assistiu o percentual mínimo configurado
    const videoCompletePercent = lessonData?.lesson?.progressConfig?.videoCompletePercent || 85;
    
    // Verificar se atingiu o percentual e ainda não está marcado como completo
    // e também não está processando a conclusão
    if (progress >= videoCompletePercent) {
      // Verificar se já está processando a conclusão deste vídeo
      if (isCompletingVideoRef.current.has(currentStep.id)) {
        return;
      }
      
      // Se já está completo, não fazer nada
      if (currentStep.status === ('completed' as any) || currentStep.status === ('COMPLETED' as any)) {
        return;
      }
      
      
      // Marcar que está processando
      isCompletingVideoRef.current.add(currentStep.id);
      
      // Enviar dados conforme nova estrutura do backend
      completeStep({
        stepId: currentStep.id,
        contentType: 'VIDEO' as const,
        progressData: {
          watchedSeconds: currentTime || (duration ? (progress / 100) * duration : 0),
          totalDuration: duration || 0,
          lastPosition: currentTime || 0,
          completedPercent: progress
        }
      });
      
      // Limpar após alguns segundos para permitir retry se necessário
      setTimeout(() => {
        isCompletingVideoRef.current.delete(currentStep.id);
      }, 5000);
    }
  }, [currentStep, updateStepProgress, completeStep, lessonData]);

  // Set para rastrear steps completados (evita rerenders desnecessários)
  const completedStepIds = useMemo(() => {
    if (!lessonData) return new Set<string>();
    return new Set(
      lessonData.steps
        .filter(step => step.status === 'completed')
        .map(step => step.id.toString())
    );
  }, [lessonData]);

  // Renderizar conteúdo baseado no tipo do step
  const renderStepContent = () => {
    // Só mostrar skeleton no carregamento inicial ou quando estiver mudando de lição
    if (isLoading || isChangingLesson) {
      const stepType = currentStep?.type?.toLowerCase() || 'unknown';
      return <ContentSkeleton type={stepType as any} />;
    }
    
    if (!currentStep) {
      // Mostrar skeleton genérico quando não há step atual
      return <ContentSkeleton type="unknown" />;
    }
    
    // Se o step não tem conteúdo ainda, mostrar skeleton do tipo apropriado
    if (!currentStep.hasContent || !currentStep.content) {
      const stepType = currentStep.type?.toLowerCase();
      return <ContentSkeleton type={stepType as any} />;
    }
    
    const stepType = currentStep.type?.toLowerCase();
    
    switch (stepType) {
      case 'video':
        return (
          <VideoContent
            step={currentStep}
            onProgress={handleVideoProgress}
            progressConfig={lessonData?.lesson?.progressConfig}
            isCompletingStep={isCompletingStep}
          />
        );
      case 'text':
        return (
          <TextContent
            step={currentStep}
            onUpdateProgress={updateStepProgress}
            onCompleteStep={(data) => {
              return completeStep({
                stepId: data.stepId,
                contentType: 'TEXT' as const,
                progressData: data.progressData || data.data
              });
            }}
            progressConfig={lessonData?.lesson?.progressConfig}
            completedStepIds={completedStepIds}
            isCompletingStep={isCompletingStep}
          />
        );
      case 'quiz':
        return (
          <QuizContent 
            step={currentStep}
            onCompleteStep={(data) => completeStep({
              stepId: data.stepId,
              contentType: 'QUIZ' as const,
              progressData: data.progressData || data.data
            })}
          />
        );
      case 'download':
        return (
          <DownloadContent 
            step={currentStep}
            onCompleteStep={(data) => completeStep({
              stepId: data.stepId,
              contentType: 'DOWNLOAD' as const,
              progressData: data.progressData || data.data
            })}
          />
        );
      default:
        return <ContentSkeleton type="unknown" />;
    }
  };

  if (isLoading) {
    return <Loader title="Carregando aula..." />;
  }

  if (!lessonData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aula não encontrada</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => navigate({ to: '/student/courses' })}
        >
          Voltar para cursos
        </Button>
      </div>
    );
  }

  const isCompleted = lessonData.lessonProgress.completed;
  const isLastStep = currentStepIndex === lessonData.lesson.totalSteps - 1;
  const hasNextLesson = lessonData.nextLesson !== null && lessonData.nextLesson !== undefined;

  // Função para navegar para próxima aula
  const handleGoToNextLesson = () => {
    if (lessonData.nextLesson) {
      navigate({ 
        to: `/student/lesson/${lessonData.nextLesson}`,
        search: {
          modelId: modelId,
          classId: classId
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <LessonHeader 
        lessonData={lessonData}
        isCompleted={isCompleted}
        classId={classId}
      />

      <div className="container mx-auto px-0 md:px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main Content */}
          <div className="lg:col-span-8">
            {/* Botão de Próxima Aula - aparece no último step se há próxima aula */}
            {isLastStep && hasNextLesson && isCompleted && (
              <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-full">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Aula concluída com sucesso!</p>
                      <p className="text-xs text-muted-foreground">Pronto para continuar sua jornada?</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleGoToNextLesson}
                    className="group"
                    size="sm"
                  >
                    Próxima Aula
                    <ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Button>
                </div>
              </div>
            )}
            
            {renderStepContent()}
            
            <StepNavigation
              currentStepIndex={currentStepIndex}
              totalSteps={lessonData.lesson.totalSteps}
              canGoNext={canGoNext}
              canGoPrevious={canGoPrevious}
              onPrevious={goToPreviousStep}
              onNext={goToNextStep}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <LessonSidebar
              lessonData={lessonData}
              currentStepIndex={currentStepIndex}
              onStepClick={navigateToStep}
            />
          </div>
        </div>
      </div>
      
      {/* Modal de próxima aula */}
      {nextLessonId && (
        <NextLessonModal
          isOpen={showNextLessonModal}
          onClose={() => setShowNextLessonModal(false)}
          currentLessonTitle={lessonData.lesson.title}
          nextLessonId={nextLessonId}
          modelId={modelId}
          classId={classId}
        />
      )}
      
      {/* Modal de conclusão do curso */}
      <CompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        lessonTitle={lessonData.lesson.title}
        classId={classId || lessonData.classId}
      />
    </div>
  );
}