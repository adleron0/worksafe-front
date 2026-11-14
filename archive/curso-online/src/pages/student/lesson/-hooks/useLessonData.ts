import { useQuery } from '@tanstack/react-query';
import { get } from '@/services/api-s';
import type { LessonResponse, LessonDataWithSteps, MergedStep } from '../types';

export function useLessonData(lessonId: string, modelId?: number) {
  return useQuery({
    queryKey: ['student-lesson', lessonId, modelId],
    queryFn: async () => {
      console.log('🔄 Buscando dados da lição:', lessonId, modelId ? `com modelId: ${modelId}` : 'sem modelId');
      const params = []
      if (modelId) params.push({ key: 'modelId', value: modelId });
      const response = await get<LessonResponse>(`student-lessons/${lessonId}`,'content', params);
      
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
    // Configurações de cache e refetch
    staleTime: 0, // Considerar dados sempre stale para forçar refetch
    gcTime: 5 * 60 * 1000, // Cache por 5 minutos (anteriormente cacheTime)
    refetchInterval: false,
    refetchOnWindowFocus: true,
    // Importante: refetch quando os parâmetros mudam
    enabled: !!lessonId,
  });
}