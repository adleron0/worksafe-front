import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import Loader from '@/components/general-components/Loader';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';

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

// Types  (MergedStep é usado indiretamente pelos componentes)

export const Route = createFileRoute('/student/lesson/$lessonId')({
  component: LessonPlayer,
});

function LessonPlayer() {
  const { lessonId } = Route.useParams();
  const navigate = useNavigate();
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  // Hooks
  const { data: lessonData, isLoading, refetch } = useLessonData(lessonId);
  const {
    startStep,
    updateStepProgress,
    checkLessonCompletion
  } = useLessonProgress(lessonId, () => {
    // Callback quando a lição for concluída
    setShowCompletionModal(true);
    // Refetch para garantir dados atualizados
    refetch();
  });
  
  const {
    currentStep,
    currentStepIndex,
    navigateToStep,
    goToNextStep,
    goToPreviousStep,
    canGoNext,
    canGoPrevious
  } = useStepNavigation({ lessonData, startStep });
  
  const { completeStep } = useStepCompletion(lessonId, currentStep, checkLessonCompletion);

  // Ref para controlar se já está completando o vídeo
  const isCompletingVideoRef = useRef<Set<number>>(new Set());
  // Ref para debounce do progresso
  const progressDebounceRef = useRef<NodeJS.Timeout>();

  // Não precisa mais iniciar lesson manualmente
  // O backend inicia automaticamente quando iniciar o primeiro step
  // useEffect removido - startLesson não é mais necessário

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
    
    console.log('📊 handleVideoProgress - Progress:', progress, 'Step:', currentStep.id, 'Status:', currentStep.status);
    
    // Se o step já está completo, não fazer nada para evitar reset do vídeo
    if (currentStep.status === ('completed' as any) || currentStep.status === ('COMPLETED' as any)) {
      console.log('⏸️ Step já está completo, ignorando progresso');
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
        console.log('⏭️ Já está processando a conclusão do vídeo');
        return;
      }
      
      // Se já está completo, não fazer nada
      if (currentStep.status === ('completed' as any) || currentStep.status === ('COMPLETED' as any)) {
        return;
      }
      
      console.log('🎯 Vídeo atingiu', videoCompletePercent + '% - Marcando como completo');
      
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
    if (!currentStep) return null;
    
    const stepType = currentStep.type?.toLowerCase();
    
    switch (stepType) {
      case 'video':
        return (
          <VideoContent 
            step={currentStep}
            onProgress={handleVideoProgress}
            progressConfig={lessonData?.lesson?.progressConfig}
          />
        );
      case 'text':
        return (
          <TextContent 
            step={currentStep}
            onUpdateProgress={updateStepProgress}
            onCompleteStep={(data) => {
              console.log('📖 Main: TextContent chamou onCompleteStep - Step:', data.stepId);
              completeStep({
                stepId: data.stepId,
                contentType: 'TEXT' as const,
                progressData: data.progressData || data.data
              });
            }}
            progressConfig={lessonData?.lesson?.progressConfig}
            completedStepIds={completedStepIds}
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
        return <div>Tipo de conteúdo não suportado: {currentStep.type}</div>;
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

  return (
    <div className="min-h-screen bg-background">
      <LessonHeader 
        lessonData={lessonData}
        isCompleted={isCompleted}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main Content */}
          <div className="lg:col-span-8">
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
      
      {/* Modal de conclusão */}
      <CompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        lessonTitle={lessonData.lesson.title}
        classId={lessonData.classId}
        // TODO: Implementar lógica para buscar próxima aula disponível
        // nextLessonId={nextLesson?.id}
        // nextLessonTitle={nextLesson?.title}
      />
    </div>
  );
}