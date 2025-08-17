export interface IEntity {
  id?: number;
  name: string;
  cpf: string;
  email?: string;
  phone?: string;
  occupation?: string;
  birthDate?: Date | string;
  zipCode?: string;
  address?: string;
  addressNumber?: number;
  complement?: string;
  cityId?: number;
  stateId?: number;
  companyId: number;
  password?: string;
  customerId?: number;
  imageUrl?: string;
  active: boolean;
  inactiveAt?: Date | string | null;
  image?: File | null;
  
  // Relationships
  city?: {
    id: number;
    name: string;
  };
  state?: {
    id: number;
    name: string;
    abbreviation: string;
  };
  customer?: {
    id: number;
    name: string;
  };
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string | null;
}