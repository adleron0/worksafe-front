/* eslint-disable react-refresh/only-export-components */
import { useToast } from '@/hooks/use-toast';
import { refreshToken } from '@/services/loginService';
import { useMutation } from '@tanstack/react-query';
import { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import api from '@/services/api';
import { decryptPayload } from '@/utils/crypto';
import { decodeJwtPayload } from '@/utils/decodeJwt';
import { IPayload } from '@/general-interfaces/auth.interface';

interface AuthContextProps {
  accessToken: string | null;
  setAccessTokenState: (token: string | null) => void;
  refreshTokenMutation: unknown;
  isRefreshing: ReturnType<typeof useMutation>['isPending'];
  refreshResponse: unknown;
  isLogged: boolean;
  verifyLocalAccessToken: () => void;
  setIsLogged: (isLogged: boolean) => void;
  user: IPayload | null;
  reloadUser: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode; router: any }> = ({ children, router }) => {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLogged, setIsLogged] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState(0);
  const [user, setUser] = useState<IPayload | null>(null);
  const [tokenVersion, setTokenVersion] = useState(0);
  const MAX_RETRY_COUNT = 5;

  const { toast } = useToast();
  useEffect(() => {
    if (!isLogged) {
      toast({
        title: "Sessão encerrada!",
        description: "Faça login para continuar",
        variant: "default",
        duration: 2500
      })
    }
  },[isLogged, toast])

  const { mutate: refreshTokenMutation, isPending: isRefreshing, data: refreshResponse } = useMutation({
    mutationFn: refreshToken,
    onSuccess: (data) => {
      if (data.accessToken) {
        setAccessTokenState(data.accessToken);
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.removeItem("secretWord");
        setRetryCount(0);
        reloadUser();
      }
    },
  });

  // Configura os interceptores do Axios
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use((config) => {
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    });

    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Se o erro for 401 (não autorizado) e ainda não tentamos renovar o token
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (retryCount >= MAX_RETRY_COUNT) {
            console.warn("Máximo de tentativas alcançado, redirecionando para login.");
            setAccessTokenState(null);
            localStorage.removeItem("accessToken");
            router.navigate({
              to: '/login',
            })
            toast({
              title: "Sessão inválida!",
              description: "Faça login para continuar",
              variant: "destructive",
              duration: 5000
            })
            return Promise.reject(error);
          }

          originalRequest._retry = true;
          setRetryCount((prev) => prev + 1);

          refreshTokenMutation();
        } else if (error.response?.status === 406) {
          console.log("Sessão expirada, faça login novamente.");
          setAccessTokenState(null);
          localStorage.removeItem("accessToken");
          router.navigate({
            to: '/login',
          })
        }

        return Promise.reject(error);
      }
    );

    // Limpa interceptores quando o componente é desmontado
    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [accessToken, refreshTokenMutation, retryCount, setIsLogged, router, toast]);

  // Função que carrega o usuário do token no localStorage
  const loadUserFromToken = () => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      try {
        const parsedToken = decodeJwtPayload(accessToken);
        const decryptedPayload = decryptPayload(parsedToken.data);
        setUser(decryptedPayload);
      } catch (error) {
        console.error('❌ Erro ao desencriptar o payload:', error);
        setUser(null); // Se ocorrer erro, reseta o usuário
      }
    } else {
      setUser(null); // Se não houver token, reseta o usuário
    }
  };

  // useEffect para carregar o usuário quando o token mudar
  useEffect(() => {
    loadUserFromToken();
  }, [tokenVersion]); // Monitora alterações na versão do token

  // Função que força a atualização do usuário
  const reloadUser = () => {
    console.info("reloadUser");
    setTokenVersion((prev) => prev + 1);
  };

  const verifyLocalAccessToken = () => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      router.navigate({
        to: '/login',
      })
    }
  };

  const value = useMemo(() => ({
    accessToken,
    setAccessTokenState,
    refreshTokenMutation,
    verifyLocalAccessToken,
    isRefreshing,
    refreshResponse,
    isLogged,
    setIsLogged,
    user,
    reloadUser,
  }), [accessToken, isLogged, isRefreshing, refreshResponse, refreshTokenMutation, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};