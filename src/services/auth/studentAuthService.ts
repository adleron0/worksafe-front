import api from '../api-s';
import { StudentData } from '@/context/StudentAuthContext';

interface LoginResponse {
  accessToken: string;
  trainee: StudentData;
}

export const studentAuthService = {
  // Login do aluno
  async loginStudent(credential: string, password: string): Promise<LoginResponse> {
    try {
      const { data } = await api.post<LoginResponse>('/auth/student/login', {
        credential,
        password,
      });
      return data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Erro ao realizar login. Verifique suas credenciais.');
    }
  },

  // Solicitar código (primeiro acesso ou recuperação)
  async requestCode(credential: string, type: 'first_access' | 'reset'): Promise<{ message: string }> {
    try {
      const { data } = await api.post('/auth/student/request-code', {
        credential,
        type,
      });
      return data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Erro ao solicitar código de verificação.');
    }
  },

  // Verificar código
  async verifyCode(credential: string, code: string): Promise<{ valid: boolean; message?: string }> {
    try {
      const { data } = await api.post('/auth/student/verify-code', {
        credential,
        code,
      });
      return data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Código inválido ou expirado.');
    }
  },

  // Definir/Redefinir senha
  async setPassword(credential: string, code: string, newPassword: string): Promise<{ message: string }> {
    try {
      const { data } = await api.post('/auth/student/set-password', {
        credential,
        code,
        newPassword,
      });
      return data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Erro ao definir senha.');
    }
  },

  // Reenviar código
  async resendCode(credential: string): Promise<{ message: string }> {
    try {
      const { data } = await api.post('/auth/student/resend-code', {
        credential,
      });
      return data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Erro ao reenviar código. Aguarde 2 minutos entre tentativas.');
    }
  }
};