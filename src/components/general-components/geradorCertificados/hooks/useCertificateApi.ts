import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from '@/services/api';
import { toast } from 'sonner';

export interface CourseCertificate {
  id?: number;
  name: string;
  courseId: number;
  companyId?: number; // Opcional pois o backend pega do token
  active?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  fabricJsonFront?: any | string; // Pode ser objeto ou string JSON
  fabricJsonBack?: any | string | null; // Pode ser objeto, string JSON ou null
}

export interface CertificateResponse {
  id: number;
  name: string;
  courseId: number;
  companyId: number;
  active: boolean;
  canvasWidth: number;
  canvasHeight: number;
  fabricJsonFront: string; // Backend sempre retorna como string JSON
  fabricJsonBack: string | null; // Backend sempre retorna como string JSON ou null
  createdAt: string;
  updatedAt: string;
}

/**
 * Modelo de certificado de um curso (o mais recente). A API não tem
 * `certificate/course/:id` — essa rota nunca existiu e a busca sempre caía
 * no catch (sem certificado); usa a listagem filtrada por curso.
 */
export async function fetchCertificateByCourse(courseId: number): Promise<CertificateResponse | null> {
  const response = await get<{ rows?: CertificateResponse[] }>('certificate', '', [
    { key: 'courseId', value: courseId },
    { key: 'order-id', value: 'desc' },
    { key: 'limit', value: 1 },
  ]);
  return response?.rows?.[0] ?? null;
}

export const useCertificateApi = () => {
  const queryClient = useQueryClient();

  // Query para buscar certificado por courseId
  const useCertificateByCourse = (courseId: number, enabled = true) => {
    return useQuery({
      queryKey: ['certificate', 'course', courseId],
      queryFn: async () => {
        try {
          return await fetchCertificateByCourse(courseId);
        } catch (error) {
          // Se não encontrar certificado, retornar null
          return null;
        }
      },
      enabled: enabled && courseId > 0,
      staleTime: 5 * 60 * 1000, // 5 minutos
    });
  };

  // Query para buscar certificado por id
  const useCertificateById = (id: number, enabled = true) => {
    return useQuery({
      queryKey: ['certificate', id],
      queryFn: async () => {
        const response = await get<CertificateResponse>('certificate', `${id}`);
        return response;
      },
      enabled: enabled && id > 0,
      staleTime: 5 * 60 * 1000, // 5 minutos
    });
  };

  // Mutation para criar certificado
  const createCertificate = useMutation({
    mutationFn: async (data: CourseCertificate) => {
      const response = await post<CertificateResponse>('certificate', '', data as any);
      return response;
    },
    onSuccess: (data) => {
      toast.success('Modelo de certificado salvo com sucesso!');
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['certificate'] });
      queryClient.invalidateQueries({ queryKey: ['list_Certificados'] });
      if (data?.courseId) {
        queryClient.invalidateQueries({ queryKey: ['certificate', 'course', data.courseId] });
      }
    },
    onError: (error: any) => {
      console.error('Erro ao salvar certificado:', error);
      toast.error('Erro ao salvar modelo de certificado');
    }
  });

  // Mutation para atualizar certificado
  const updateCertificate = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CourseCertificate }) => {
      const response = await put<CertificateResponse>('certificate', `${id}`, data as any);
      return response;
    },
    onSuccess: (data) => {
      toast.success('Modelo de certificado atualizado com sucesso!');
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['certificate'] });
      queryClient.invalidateQueries({ queryKey: ['list_Certificados'] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ['certificate', data.id] });
      }
      if (data?.courseId) {
        queryClient.invalidateQueries({ queryKey: ['certificate', 'course', data.courseId] });
      }
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar certificado:', error);
      toast.error('Erro ao atualizar modelo de certificado');
    }
  });

  // Função auxiliar para preparar dados para salvamento
  const prepareDataForSave = (
    name: string,
    courseId: number,
    fabricJsonFront: any,
    fabricJsonBack: any | null,
    canvasWidth: number = 800,
    canvasHeight: number = 600
  ): CourseCertificate => {
    return {
      name,
      courseId,
      canvasWidth,
      canvasHeight,
      // Converter para string JSON se não for null
      fabricJsonFront: typeof fabricJsonFront === 'string' 
        ? fabricJsonFront 
        : JSON.stringify(fabricJsonFront),
      fabricJsonBack: fabricJsonBack 
        ? (typeof fabricJsonBack === 'string' 
          ? fabricJsonBack 
          : JSON.stringify(fabricJsonBack))
        : null,
      active: true
      // companyId não é enviado, será preenchido pelo backend via token
    };
  };

  return {
    useCertificateByCourse,
    useCertificateById,
    createCertificate,
    updateCertificate,
    prepareDataForSave
  };
};