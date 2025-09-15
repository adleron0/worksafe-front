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
  isSeller?: boolean;
  sellerStatus?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  // Campos de endereço adicionados
  birthDate?: string | null;
  address?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}