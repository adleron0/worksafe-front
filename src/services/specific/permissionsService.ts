import api from '../api';

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
  const response = await api.patch(`${BASE_URL}/permissions/user/active/${userId}/${permissionId}`, {}, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
};

// Revokes User Permission
const revokesPermission = async (permissionId: number | undefined, userId: number | undefined) => {
  const response = await api.patch(`${BASE_URL}/permissions/user/inactive/${userId}/${permissionId}`, {}, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
};

// Grants Profile Permission
const grantsProfilePermission = async (permissionId: number | undefined, profileId: number | undefined) => {
  const response = await api.patch(`${BASE_URL}/permissions/profile/active/${profileId}/${permissionId}`, {}, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
};

// Revokes Profile Permission
const revokesProfilePermission = async (permissionId: number | undefined, profileId: number | undefined) => {
  const response = await api.patch(`${BASE_URL}/permissions/profile/inactive/${profileId}/${permissionId}`, {}, {
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
  grantsProfilePermission,
  revokesProfilePermission,
};
