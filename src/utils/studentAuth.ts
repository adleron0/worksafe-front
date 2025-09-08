import { jwtDecode } from 'jwt-decode';

interface StudentTokenPayload {
  sub: string;
  email: string;
  name: string;
  exp: number;
  iat: number;
}

const STUDENT_TOKEN_KEY = 's-token';

export const getStudentToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STUDENT_TOKEN_KEY);
};

export const setStudentToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STUDENT_TOKEN_KEY, token);
};

export const clearStudentAuth = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STUDENT_TOKEN_KEY);
  // Limpar outros dados do aluno se houver
  localStorage.removeItem('student-data');
};

export const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;
  
  try {
    const decoded = jwtDecode<StudentTokenPayload>(token);
    const currentTime = Date.now() / 1000;
    
    // Verifica se o token ainda não expirou
    return decoded.exp > currentTime;
  } catch (error) {
    console.error('Erro ao decodificar token:', error);
    return false;
  }
};

export const getTokenPayload = (token: string | null): StudentTokenPayload | null => {
  if (!token) return null;
  
  try {
    return jwtDecode<StudentTokenPayload>(token);
  } catch (error) {
    console.error('Erro ao decodificar token:', error);
    return null;
  }
};

export const getTokenExpirationTime = (token: string | null): Date | null => {
  const payload = getTokenPayload(token);
  if (!payload) return null;
  
  return new Date(payload.exp * 1000);
};