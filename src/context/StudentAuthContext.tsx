/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api-s';
import {
  getStudentToken,
  setStudentToken,
  clearStudentAuth,
  isTokenValid,
  getTokenPayload
} from '@/utils/studentAuth';

export interface StudentData {
  id: string | number;
  traineeId?: number;
  name: string;
  email: string;
  cpf?: string;
  avatar?: string;
  phone?: string;
  birthDate?: string;
  enrolledCourses?: number;
  certificates?: number;
  institutions?: string[];
  customerId?: number;
}

interface StudentAuthContextProps {
  isAuthenticated: boolean;
  studentData: StudentData | null;
  loading: boolean;
  login: (emailOrCpf: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => boolean;
}

const StudentAuthContext = createContext<StudentAuthContextProps | undefined>(undefined);

export const useStudentAuth = () => {
  const context = useContext(StudentAuthContext);
  if (!context) {
    throw new Error('useStudentAuth must be used within a StudentAuthProvider');
  }
  return context;
};

interface StudentAuthProviderProps {
  children: ReactNode;
  router?: any;
}

export const StudentAuthProvider: React.FC<StudentAuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Verifica se o token é válido
  const checkAuth = useCallback((): boolean => {
    const token = getStudentToken();
    
    if (!token || !isTokenValid(token)) {
      setIsAuthenticated(false);
      setStudentData(null);
      return false;
    }
    
    // Token existe e é válido
    const payload = getTokenPayload(token);
    if (payload) {
      // Atualiza dados básicos do payload
      setStudentData({
        id: payload.traineeId || payload.sub || '',
        traineeId: payload.traineeId,
        email: payload.email,
        name: payload.name,
        cpf: payload.cpf,
        customerId: payload.customerId
      } as StudentData);
      setIsAuthenticated(true);
      return true;
    }
    
    return false;
  }, []);

  // Login do aluno
  const login = async (emailOrCpf: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      
      // Usar o studentAuthService existente
      const { studentAuthService } = await import('@/services/auth/studentAuthService');
      const data = await studentAuthService.loginStudent(emailOrCpf, password);
      
      // Salva o token
      setStudentToken(data.accessToken);
      
      // Atualiza estado
      setIsAuthenticated(true);
      setStudentData(data.trainee);
      
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo(a), ${data.trainee.name}!`,
        variant: "default",
      });
      
      // Redireciona para dashboard
      await navigate({ to: '/student' });
      
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message || "Verifique suas credenciais e tente novamente",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout do aluno
  const logout = useCallback(() => {
    clearStudentAuth();
    setIsAuthenticated(false);
    setStudentData(null);
    
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso",
      variant: "default",
    });
    
    // Redireciona para login
    navigate({ to: '/auth/student/login' });
  }, [navigate, toast]);


  // Verifica autenticação ao montar o componente
  useEffect(() => {
    checkAuth();
    setLoading(false);
  }, [checkAuth]);

  // Verifica token periodicamente (a cada 5 minutos)
  useEffect(() => {
    const interval = setInterval(() => {
      const token = getStudentToken();
      if (token && !isTokenValid(token)) {
        toast({
          title: "Sessão expirada",
          description: "Sua sessão expirou. Faça login novamente.",
          variant: "destructive",
        });
        logout();
      }
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [logout, toast]);

  // Configura interceptor do axios para verificar 401
  useEffect(() => {
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Se receber 401 (Unauthorized), remove o token e faz logout
        if (error.response?.status === 401) {
          clearStudentAuth();
          setIsAuthenticated(false);
          setStudentData(null);

          toast({
            title: "Sessão inválida",
            description: "Sua sessão expirou. Faça login novamente.",
            variant: "destructive",
          });

          // Redireciona para login do student
          navigate({ to: '/auth/student/login' });
        }

        return Promise.reject(error);
      }
    );

    // Remove o interceptor quando o componente é desmontado
    return () => {
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [navigate, toast]);

  return (
    <StudentAuthContext.Provider 
      value={{
        isAuthenticated,
        studentData,
        loading,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </StudentAuthContext.Provider>
  );
};