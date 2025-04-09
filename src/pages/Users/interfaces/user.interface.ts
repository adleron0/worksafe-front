export interface User {
  id?: number;
  name: string;
  active?: boolean;
  password?: string;
  email: string;
  imageUrl: string | null;
  image?: File | null;
  phone: string;
  cpf: string;
  companyId?: number;
  roleId?: number;
  createdAt?: string;
  updatedAt?: string;
  inactiveAt?: string | null;
  role?: {
    name: string;
  };
  permissions?: any;
}