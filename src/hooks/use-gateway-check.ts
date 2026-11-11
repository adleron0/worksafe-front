import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import { ApiError } from "@/general-interfaces/api.interface";

interface FirstStepsResponse {
  hasCourse: boolean;
  hasInstructor: boolean;
  hasInstructorSignature: boolean;
  hasCertificate: boolean;
  hasAsaasToken: boolean;
  hasClass: boolean;
  allCompleted: boolean;
}

/**
 * Hook para verificar se o gateway de pagamento está configurado
 *
 * @returns {object} - Objeto com informações sobre o gateway
 * @returns {boolean} hasGateway - Se o gateway está configurado (hasAsaasToken)
 * @returns {boolean} isLoading - Se está carregando os dados
 * @returns {FirstStepsResponse | undefined} data - Dados completos dos primeiros passos
 */
export function useGatewayCheck() {
  const { data, isLoading } = useQuery<FirstStepsResponse | undefined, ApiError>({
    queryKey: ['firstSteps'],
    queryFn: async () => {
      return get('companies', 'first-steps');
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - Gateway configuration doesn't change frequently
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  return {
    hasGateway: data?.hasAsaasToken || false,
    isLoading,
    data,
  };
}
