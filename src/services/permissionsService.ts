import api from './api';

// URL base da API
const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";
const accessToken = localStorage.getItem('accessToken');

// Função para listar permissões
const listPermissions = async () => {
  const response = await api.get(`${BASE_URL}/permissions/list`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
};

// Grants User Permission
const grantsPermission = async (permissionId: number | undefined, userId: number | undefined) => {
  const response = await api.patch(`${BASE_URL}/permissions/active/${userId}/${permissionId}`, {}, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
};

// Revokes User Permission
const revokesPermission = async (permissionId: number | undefined, userId: number | undefined) => {
  const response = await api.patch(`${BASE_URL}/permissions/inactive/${userId}/${permissionId}`, {}, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
};

export {
  listPermissions,
  grantsPermission,
  revokesPermission,
};
