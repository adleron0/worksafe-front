import axios from "axios";

// URL base da API
const BASE_URL = import.meta.env.VITE_BASE_URL;

// Adicionar log para debug
console.log('API BASE_URL:', BASE_URL);

// Instância fixa
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Interceptor para token dinâmico
api.interceptors.request.use((config) => {
  // Verifica se está no cliente (browser) antes de acessar localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    const token = localStorage.getItem('s-token') || null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;

// Função para formatar a data para o formato ISO
const formatToISOString = (date: string | Date, isEndOfDay = false) => {
  const parsedDate = date instanceof Date ? date : new Date(date);
  if (isEndOfDay) {
    parsedDate.setHours(23, 59, 59, 999);
  } else {
    parsedDate.setHours(0, 0, 0, 0);
  }
  return parsedDate.toISOString();
};

// Key de datas para interceptação e formatação
const DATE_KEYS = ["createdAt", "inactivedAt", "updatedAt"];

interface queryParams {
  key: string;
  value: any;
}

const paramsCompose = (params: queryParams[]) => {
  if (!params) return;
  const query = new URLSearchParams();
  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    if (param.value !== null && param.value !== undefined && param.value.toString().trim() !== "") {
      if (DATE_KEYS.includes(param.key)) {
        if (param.value.length > 1) {
          query.append('startedAt', formatToISOString(param.value[0]));
          query.append('endedAt', formatToISOString(param.value[1], true));
        } else {
          query.append('startedAt', formatToISOString(param.value[0]));
        }
      } else {
        query.append(param.key, param.value);
      }
    }
  }
  return query;
};

const createFormData = (data: any): FormData => {
  const formData = new FormData();
  Object.keys(data).forEach((key) => {
    if (data[key] === null || data[key] === undefined) return;
    formData.append(key, data[key]);
  });
  return formData;
};


// Serviço genérico para requisições GET
export const get = async <T>(controllerName: string, action = "", extraParams?: queryParams[]): Promise<T | undefined> => {
  let endpoint = `${controllerName}/${action}`;

  if (extraParams) {
    endpoint += `?${paramsCompose(extraParams)}`;
  }

  const response = await api.get<T>(endpoint);

  return response.data;
};

// Serviço genérico para requisições POST
export const post = async <T, D = any>(controllerName: string, action = "", data: D, extraParams?: queryParams[]): Promise<T | undefined> => {
  let endpoint = `${controllerName}/${action}`;

  if (extraParams) {
    endpoint += `?${paramsCompose(extraParams)}`;
  }

  const response = await api.post(endpoint, createFormData(data));
  return response.data;
};

// Serviço genérico para requisições PUT
export const put = async <T>(controllerName: string, action = "", data: T, extraParams?: queryParams[]): Promise<T | undefined> => {
  let endpoint = `${controllerName}/${action}`;

  if (extraParams) {
    endpoint += `?${paramsCompose(extraParams)}`;
  }

  const response = await api.put(endpoint, createFormData(data));
  return response.data;
};

// Serviço genérico para requisições PATCH
export const patch = async <T>(controllerName: string, action = "", extraParams?: queryParams[]): Promise<T | undefined> => {
  let endpoint = `${controllerName}/${action}`;

  if (extraParams) {
    endpoint += `?${paramsCompose(extraParams)}`;
  }

  const response = await api.patch(endpoint);
  return response.data;
};

// Serviço genérico para requisições DELETE
export const del = async <T>(controllerName: string, action = "", extraParams?: queryParams[]): Promise<T | undefined> => {
  let endpoint = `${controllerName}/${action}`;

  if (extraParams) {
    endpoint += `?${paramsCompose(extraParams)}`;
  }

  const response = await api.delete(endpoint);
  return response.data;
};
