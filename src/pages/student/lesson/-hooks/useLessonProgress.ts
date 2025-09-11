import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { post, patch } from '@/services/api-s';
import { useToast } from '@/hooks/use-toast';
import type { LessonDataWithSteps } from '../types';

export function useLessonProgress(lessonId: string, onLessonComplete?: () => void) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isCompletingLessonRef = useRef(false);

  // Mutation para iniciar aula
  const startLesson = useMutation({
    mutationFn: async () => {
      return post(`student-lessons/${lessonId}`, 'start', {});
    },
  });

  // Mutation para iniciar step
  const startStep = useMutation({
    mutationFn: async (stepId: number) => {
      console.log('🚀 Iniciando step:', stepId);
      const result = await post(`student-progress/step/${stepId}`, 'start', {});
      return result;
    },
    onSuccess: async (_, stepId) => {
      console.log('✅ Step iniciado com sucesso:', stepId);
      
      // Invalidar e refetch imediatamente para atualizar o status
      await queryClient.invalidateQueries({ 
        queryKey: ['student-lesson', lessonId],
        refetchType: 'all' 
      });
      
      // Aguardar o refetch completar para garantir dados atualizados
      await queryClient.refetchQueries({
        queryKey: ['student-lesson', lessonId],
        type: 'active'
      });
      
      console.log('🔄 Dados da lição atualizados após iniciar step');
    },
    onError: (error, stepId) => {
      console.error('❌ Erro ao iniciar step:', stepId, error);
    }
  });

  // Mutation para atualizar progresso do step
  const updateStepProgress = useMutation({
    mutationFn: async ({ stepId, progress, data }: { stepId: number; progress: number; data?: any }) => {
      return patch(`student-progress/step/${stepId}`, 'update', {
        progressPercent: progress,
        progressData: data ? JSON.stringify(data) : null
      });
    },
    onError: (error: any, variables) => {
      // Tratar erro 429 (Too Many Requests)
      if (error?.response?.status === 429) {
        console.warn('⚠️ Muitas requisições - aguardando antes de tentar novamente');
        return;
      }
      
      // Tratar erros CORS
      if (error?.code === 'ERR_NETWORK') {
        console.warn('⚠️ Erro de rede ao atualizar progresso - ignorando');
        return;
      }
      
      // Só logar outros erros que não sejam esperados
      if (error?.response?.status !== 400) {
        console.error('❌ Erro ao atualizar progresso:', variables.stepId, error?.message || error);
      }
    }
  });

  // Mutation para marcar aula como concluída
  const completeLesson = useMutation({
    mutationFn: async () => {
      // Verificar se já está completando
      if (isCompletingLessonRef.current) {
        return Promise.reject('Already completing lesson');
      }
      isCompletingLessonRef.current = true;
      
      try {
        return await post(`student-lessons/${lessonId}`, 'complete', {});
      } finally {
        // Limpar flag após alguns segundos
        setTimeout(() => {
          isCompletingLessonRef.current = false;
        }, 5000);
      }
    },
    onSuccess: async () => {
      console.log('✅ Lição marcada como completa no backend!');
      
      toast({
        title: 'Aula concluída!',
        description: 'Parabéns! Você concluiu esta aula.',
        variant: 'success',
      });
      
      // Buscar dados atualizados da lição
      const lessonData = queryClient.getQueryData<LessonDataWithSteps>(['student-lesson', lessonId]);
      
      // Invalidar e refetch imediatamente as queries relacionadas
      // Isso vai atualizar a lista de aulas liberadas
      if (lessonData?.classId) {
        // Primeiro invalidar para forçar novo fetch
        await queryClient.invalidateQueries({ 
          queryKey: ['student-course-lessons', lessonData.classId.toString()],
          refetchType: 'all' 
        });
        
        // Refetch imediato para garantir dados atualizados
        await queryClient.refetchQueries({ 
          queryKey: ['student-course-lessons', lessonData.classId.toString()],
          type: 'active'
        });
      }
      
      // Invalidar também as queries de lição
      await queryClient.invalidateQueries({ 
        queryKey: ['student-lesson'],
        refetchType: 'all'
      });
      
      // Chamar callback de conclusão se fornecido
      if (onLessonComplete) {
        console.log('🎊 Chamando callback onLessonComplete para mostrar modal!');
        onLessonComplete();
      }
    },
    onError: (error: any) => {
      // Ignorar erro de duplicação
      if (error === 'Already completing lesson') {
        return;
      }
      
      // Tratar erro 429
      if (error?.response?.status === 429) {
        console.warn('⚠️ Muitas requisições ao completar lição');
        return;
      }
      
      console.error('Erro ao completar lição:', error);
    }
  });

  // Verificar se a aula está completa
  const checkLessonCompletion = () => {
    // Se já está completando, não verificar novamente
    if (isCompletingLessonRef.current || completeLesson.isPending) {
      return;
    }
    
    const lessonData = queryClient.getQueryData<LessonDataWithSteps>(['student-lesson', lessonId]);
    
    if (!lessonData) return;
    
    // Se já está marcada como completa, não fazer nada
    if (lessonData.lessonProgress.completed) {
      return;
    }
    
    // Verificar se todos os steps foram concluídos
    // Normalizar status para minúsculas para comparação
    const completedByStatus = lessonData.stepsOverview.filter(
      step => step.status?.toLowerCase() === 'completed'
    ).length;
    
    const allStepsCompleted = lessonData.stepsOverview.every(
      step => step.status?.toLowerCase() === 'completed'
    );
    
    // Verificação alternativa usando o contador do backend
    const allStepsCompletedByCount = lessonData.lessonProgress.completedSteps >= lessonData.lessonProgress.totalSteps;
    
    console.log('🔍 Verificando conclusão da lição:', {
      totalSteps: lessonData.lessonProgress.totalSteps,
      completedSteps: lessonData.lessonProgress.completedSteps,
      completedByStatus,
      allCompletedByStatus: allStepsCompleted,
      allCompletedByCount: allStepsCompletedByCount,
      stepStatuses: lessonData.stepsOverview.map(s => ({ id: s.id, status: s.status }))
    });
    
    // Usar ambas as verificações para garantir
    if (allStepsCompleted || allStepsCompletedByCount) {
      console.log('🎯 Todos os steps concluídos! Marcando lição como completa...');
      completeLesson.mutate();
    }
  };

  return {
    startLesson: startLesson.mutate,
    startStep: startStep.mutate,
    updateStepProgress: updateStepProgress.mutate,
    completeLesson: completeLesson.mutate,
    checkLessonCompletion,
    isStartingLesson: startLesson.isPending,
    isStartingStep: startStep.isPending,
    isUpdatingProgress: updateStepProgress.isPending,
    isCompletingLesson: completeLesson.isPending
  };
}