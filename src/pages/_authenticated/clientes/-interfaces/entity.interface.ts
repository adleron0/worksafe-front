export interface IEntity {
  id?: number;
  name: string;
  corporateName: string;
  email: string | null;
  active?: boolean;
  imageUrl: string | null;
  image?: File | null;
  phone: string | null;
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
  stateRegistration?: string | null;
  municipalRegistration?: string | null;
  icmsContributor?: boolean;
  activityType?: string | null;
  cnae?: string | null;
  simplesNacional?: boolean;
  phone2?: string | null;
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