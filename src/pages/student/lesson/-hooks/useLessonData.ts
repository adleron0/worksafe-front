import { useQuery } from '@tanstack/react-query';
import { get } from '@/services/api-s';
import type { LessonResponse, LessonDataWithSteps, MergedStep } from '../types';

export function useLessonData(lessonId: string) {
  return useQuery({
    queryKey: ['student-lesson', lessonId],
    queryFn: async () => {
      console.log('🔄 Buscando dados da lição:', lessonId);
      const response = await get<LessonResponse>(`student-lessons/${lessonId}/content`);
      
      if (!response) {
        throw new Error('Dados da lição não encontrados');
      }
      
      console.log('📦 Dados recebidos - Status dos steps:', response.stepsOverview?.map(s => ({ id: s.id, status: s.status })) || []);
      
      // Fazer merge dos dados para facilitar uso
      const mergedSteps: MergedStep[] = (response.stepsOverview || []).map(overview => {
        const stepContent = (response.stepsContent || []).find(c => c.id === overview.id);
        
        // Parse do content se for string JSON
        let parsedContent = null;
        if (stepContent?.content) {
          try {
            parsedContent = typeof stepContent.content === 'string' 
              ? JSON.parse(stepContent.content)
              : stepContent.content;
          } catch (e) {
            console.error('Erro ao fazer parse do content:', e);
            parsedContent = stepContent.content;
          }
        }
        
        return {
          ...overview,
          content: parsedContent,
          hasContent: !!stepContent,
          stepProgress: stepContent?.stepProgress || null
        };
      });
      
      const result: LessonDataWithSteps = {
        ...response,
        steps: mergedSteps
      };
      
      return result;
    },
    // Desabilitado: Refetch automático não é necessário
    // O conteúdo é carregado uma vez e atualizado apenas após completar steps
    refetchInterval: false,
    // Manter dados frescos quando a janela volta ao foco
    refetchOnWindowFocus: true,
  });
}