import api from './api';
import { Area } from '@/pages/Inventarios/Areas/interfaces/area.interface';

// URL base da API
const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";
const accessToken = localStorage.getItem('accessToken');

// Função para criar o FormData a partir do objeto Area
const createFormData = (area: Area): FormData => {
  const formData = new FormData();
  formData.append('companyId', String(area.companyId));
  formData.append('name', area.name);
  formData.append('description', String(area.description));
  // formData.append('subArea', JSON.stringify(area.subArea));

  // Adiciona a imagem, se existir
  if (area.image) {
    formData.append('image', area.image);
  } else {
    if (area.imageUrl) {
      formData.append('imageUrl', area.imageUrl);
    }
  }
  return formData;
};

// Create Area
const createArea = async (area: Area) => {
  const formData = createFormData(area);

  const response = await api.post(`${BASE_URL}/area`, formData, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Update Area
const updateArea = async (area: Area, areaId: number | undefined) => {
  const formData = createFormData(area);

  const response = await api.put(`${BASE_URL}/area/${areaId}`, formData, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Função para buscar Areas da empresa
const listAreasCompany = async (params: {
  name?: string;
  active?: boolean;
  createdAt?: string;
  limit?: number;
  pagination?: number;
}) => {
  const { name, active, createdAt, limit, pagination } = params;

  const formatToISOString = (date: string | Date, isEndOfDay = false) => {
    const parsedDate = date instanceof Date ? date : new Date(date);
    if (isEndOfDay) {
      parsedDate.setHours(23, 59, 59, 999);
    } else {
      parsedDate.setHours(0, 0, 0, 0);
    }
    return parsedDate.toISOString();
  };

  // Montando os query params dinamicamente
  const queryParams = new URLSearchParams();

  if (limit) queryParams.append('limit', limit.toString());
  if (pagination) queryParams.append('pagination', pagination.toString());
  if (name) queryParams.append('name', name);
  if (active !== undefined) queryParams.append('active', active.toString());
  if (createdAt && createdAt?.length > 1) {
    queryParams.append('startedAt', formatToISOString(createdAt[0]));
    queryParams.append('endedAt', formatToISOString(createdAt[1], true));
  };
  if (createdAt?.length === 1) queryParams.append('startedAt', formatToISOString(createdAt[0]));

  const response = await api.get(`${BASE_URL}/area/list?${queryParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
};

// Pega área por ID
const getArea = async (areaId: number) => {
  const response = await api.get(`${BASE_URL}/area/${areaId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
};

// Inactive Area
const inactiveArea = async (areaId: number) => {
  const response = await api.patch(`${BASE_URL}/area/inactive/${areaId}`, {}, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
};

// Active Area
const activeArea = async (areaId: number) => {
  const response = await api.patch(`${BASE_URL}/area/activate/${areaId}`, {}, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
};

export {
  createArea,
  listAreasCompany,
  inactiveArea,
  activeArea,
  updateArea,
  getArea,
};
