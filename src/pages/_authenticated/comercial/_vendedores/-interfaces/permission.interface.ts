export interface Permission {
  id?: number;
  name: string;
  description: string;
  group?: string;
  createdAt?: string;
}

export interface UserPermission {
  id?: number;
  userId: number;
  permissionId: number;
  createdAt?: string;
  updatedAt?: string;
  inactiveAt?: string | null;
}
