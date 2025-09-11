import { useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post } from '@/services/api-s';
import { useToast } from '@/hooks/use-toast';
import type { StepOverview, MergedStep } from '../types';

interface CompleteStepData {
  stepId: number;
  contentType?: 'VIDEO' | 'TEXT' | 'QUIZ' | 'DOWNLOAD';
  progressData?: any;
  data?: any; // Manter compatibilidade
}

export function useStepCompletion(lessonId: string, _currentStep: MergedStep | null, checkLessonCompletion?: () => void) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const completingStepsRef = useRef<Set<number>>(new Set());

  // Mutation para marcar step como concluído
  const completeStepMutation = useMutation({
    mutationFn: async ({ stepId, contentType, progressData, data }: CompleteStepData) => {
      console.log('🚀 useStepCompletion mutation: Iniciando - Step:', stepId);
      
      // Verificar se já está tentando completar este step
      if (completingStepsRef.current.has(stepId)) {
        console.log('⚠️ useStepCompletion: Já está completando o step', stepId);
        return Promise.reject('Already completing');
      }
      
      completingStepsRef.current.add(stepId);
      
      try {
        // Usar nova estrutura se contentType estiver presente
        const payload = contentType ? {
          contentType,
          progressData: progressData || data
        } : {
          progressData: data ? JSON.stringify(data) : null
        };
        
        const result = await post(`student-progress/step/${stepId}`, 'complete', payload);
        return result;
      } finally {
        // Remover após algum tempo para permitir retry em caso de erro
        setTimeout(() => {
          completingStepsRef.current.delete(stepId);
        }, 5000);
      }
    },
    onSuccess: async (_, variables) => {
      console.log('✅ Step concluído com sucesso:', variables.stepId);
      
      // Atualizar cache do React Query manualmente
      queryClient.setQueryData(['student-lesson', lessonId], (oldData: any) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          stepsOverview: oldData.stepsOverview.map((step: StepOverview) =>
            step.id === variables.stepId 
              ? { ...step, status: 'completed', progress: 100, completedAt: new Date().toISOString() }
              : step
          ),
          steps: oldData.steps?.map((step: MergedStep) =>
            step.id === variables.stepId 
              ? { ...step, status: 'completed', progress: 100, completedAt: new Date().toISOString() }
              : step
          ),
          lessonProgress: {
            ...oldData.lessonProgress,
            completedSteps: oldData.lessonProgress.completedSteps + 1
          }
        };
      });
      
      // IMPORTANTE: Invalidar e refetch imediatamente para atualizar o conteúdo
      // Isso garante que o próximo step seja liberado instantaneamente
      await queryClient.invalidateQueries({ 
        queryKey: ['student-lesson', lessonId],
        refetchType: 'all' // Força refetch imediato
      });
      
      // Aguardar um pouco para garantir que os dados foram atualizados
      await queryClient.refetchQueries({
        queryKey: ['student-lesson', lessonId],
        type: 'active'
      });
      
      console.log('🔄 Dados da lição atualizados após completar step');
      
      // Mostrar notificação de sucesso
      toast({
        title: "Etapa concluída!",
        description: "Você pode prosseguir para a próxima etapa.",
        variant: "success",
        duration: 3000,
      });
      
      // Verificar se a lição está completa após completar o step
      if (checkLessonCompletion) {
        console.log('⏱️ Aguardando 1s antes de verificar conclusão da lição...');
        // Aumentar o tempo de espera para garantir que os dados foram atualizados
        setTimeout(() => {
          console.log('🔄 Chamando checkLessonCompletion após completar step');
          checkLessonCompletion();
        }, 1000); // Aumentado de 500ms para 1000ms
      } else {
        console.warn('⚠️ checkLessonCompletion não foi fornecido ao hook useStepCompletion');
      }
    },
    onError: (error: any) => {
      // Ignorar erro de duplicação
      if (error === 'Already completing') {
        return;
      }
      
      // Tratar erros CORS e outros erros de rede
      if (error?.code === 'ERR_NETWORK' || error?.code === 'ERR_FAILED') {
        console.warn('Erro de rede ao completar step - será tentado novamente');
        toast({
          title: 'Erro de conexão',
          description: 'Verifique sua conexão com a internet',
          variant: 'destructive'
        });
        return;
      }
      
      // Log mais limpo para outros erros
      console.error('Erro ao completar step:', error?.response?.data || error?.message || error);
      
      // Mostrar toast apenas para erros não esperados
      if (error?.response?.status !== 400) {
        toast({
          title: 'Erro ao salvar progresso',
          description: 'Tente novamente mais tarde',
          variant: 'destructive'
        });
      }
    }
  });

  const completeStep = useCallback((data: CompleteStepData) => {
    console.log('🎯 useStepCompletion: completeStep chamado - Step:', data.stepId, 'Type:', data.contentType, 'Data:', data.progressData || data.data);
    completeStepMutation.mutate(data);
  }, [completeStepMutation]);

  return {
    completeStep,
    isCompletingStep: completeStepMutation.isPending
  };
}