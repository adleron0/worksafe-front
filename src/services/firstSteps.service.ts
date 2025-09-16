import { get } from "./api";

export interface FirstStepsResponse {
  hasCourse: boolean;           // Tem ao menos 1 curso cadastrado
  hasInstructor: boolean;        // Tem instrutores cadastrados
  hasInstructorSignature: boolean; // Tem assinatura digital de instrutor
  hasCertificate: boolean;       // Tem modelo de certificado
  hasAsaasToken: boolean;        // Tem gateway Asaas configurado
  hasClass: boolean;             // Tem turma criada
  allCompleted: boolean;         // Todos os passos concluídos
}

export const checkFirstSteps = async (): Promise<FirstStepsResponse | null> => {
  try {
    const result = await get<FirstStepsResponse>("companies", "first-steps");
    return result || null;
  } catch (error) {
    console.error("Erro ao verificar primeiros passos:", error);
    return null;
  }
};