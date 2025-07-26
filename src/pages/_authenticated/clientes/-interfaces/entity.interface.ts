export interface IEntity {
  id?: number;
  name: string;
  corporateName: string;
  email: string;
  active?: boolean;
  imageUrl: string | null;
  image?: File | null;
  phone: string;
  cnpj: string;
  companyId?: number;
  stateId?: number;
  cityId?: number;
  neighborhood?: string;
  street?: string;
  number?: number;
  rankId?: number;
  createdAt?: string;
  updatedAt?: string;
  inactiveAt?: string | null;
  description?: string;
  complement?: string;
  zipcode?: string;
  contacts?: any[];
  state?: {
    id?: number;
    name: string;
  };
  city?: {
    id?: number;
    name: string;
  };
}