import api from './api';
import { LoginData } from '@/interfaces/auth.interface';

// URL base da API
const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";

const removeMaskCnpj = (cnpj: string): string => {
  return cnpj.replace(/\./g, '').replace(/\//g, '').replace(/-/g, '');
};

// Função para realizar a requisição de login
const postLogin = async (loginData: LoginData) => {
  // Remove pontos e traços da CNPJ
  loginData.cnpj = removeMaskCnpj(loginData.cnpj);
  const response = await api.post(`${BASE_URL}/auth/login`, loginData);
  return response.data;
};

// Refresh token
const refreshToken = async () => {
  const secretWord = localStorage.getItem('secretWord');
  const requestBody = secretWord ? { secretWord } : {};
  const response = await api.post(`${BASE_URL}/auth/refresh-token`, requestBody);
  return response.data;
};

// Logout
const logout = async () => {
  localStorage.setItem('secretWord', 'banana');
  const response = await api.post(`${BASE_URL}/auth/logout`);
  return response.data;
};

export { postLogin, refreshToken, logout };
