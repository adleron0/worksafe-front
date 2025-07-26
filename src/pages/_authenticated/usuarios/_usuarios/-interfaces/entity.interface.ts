export interface IEntity {
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
  profileId?: number;
  createdAt?: string;
  updatedAt?: string;
  inactiveAt?: string | null;
  profile?: {
    name: string;
  };
  permissions?: any;
}