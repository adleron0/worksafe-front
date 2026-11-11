import api from './api';

/**
 * Interface para resposta da geração seletiva de certificados
 */
export interface SelectiveCertificateResponse {
  success: boolean;
  message: string;
  data: {
    classId: number;
    className: string;
    courseName: string;
    totalStudents: number;
    newCertificates: number;
    updatedCertificates: number;
    updatedStudents: Array<{
      traineeId: number;
      traineeName: string;
      certificateId: number;
    }>;
    skippedStudents: Array<{
      traineeId: number;
      traineeName: string;
      reason: string;
    }>;
  };
}

/**
 * Gera certificados de forma seletiva para inscrições específicas
 *
 * @param classId - ID da turma
 * @param subscriptionIds - Array de IDs das inscrições que terão certificados gerados
 * @returns Resposta com resumo do processamento
 *
 * @example
 * ```tsx
 * const result = await generateSelectiveCertificates(123, [1, 2, 3]);
 * console.log(result.data.newCertificates); // Quantidade de certificados criados
 * ```
 */
export async function generateSelectiveCertificates(
  classId: number,
  subscriptionIds: number[]
): Promise<SelectiveCertificateResponse> {
  if (!classId) {
    throw new Error('ID da turma não fornecido');
  }

  if (!subscriptionIds || subscriptionIds.length === 0) {
    throw new Error('Deve informar pelo menos um subscriptionId');
  }

  try {
    const response = await api.post<SelectiveCertificateResponse>(
      `/classes/generate-certificates-selective/${classId}`,
      { subscriptionIds },
      {
        timeout: 120000, // 2 minutos
      }
    );

    return response.data;
  } catch (error: any) {
    // Tratamento de erros específicos
    if (error.code === 'ECONNABORTED') {
      throw new Error('Tempo limite excedido. A geração pode estar demorando mais do que o esperado.');
    }

    if (error.response) {
      // Erro retornado pela API
      const message = error.response.data?.message || 'Erro ao gerar certificados';
      throw new Error(message);
    }

    if (error.request) {
      // Erro de rede
      throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
    }

    // Erro desconhecido
    throw new Error(error.message || 'Erro desconhecido ao gerar certificados');
  }
}
