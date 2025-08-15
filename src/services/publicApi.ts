import axios from "axios";

// URL base da API
const BASE_URL = import.meta.env.VITE_BASE_URL;

const publicApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: false, // Sem credenciais para rotas públicas
  // Sem header de Authorization
});

export default publicApi;

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
      query.append(param.key, param.value);
    }
  }
  return query;
};

// Serviço genérico para requisições GET públicas
export const getPublic = async <T>(controllerName: string, action = "", extraParams?: queryParams[]): Promise<T | undefined> => {
  let endpoint = `${controllerName}/${action}`;

  if (extraParams) {
    endpoint += `?${paramsCompose(extraParams)}`;
  }

  const response = await publicApi.get<T>(endpoint);

  return response.data;
};