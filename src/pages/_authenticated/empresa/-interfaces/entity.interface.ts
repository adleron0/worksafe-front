export interface IEmpresa {
  id?: number;
  active?: boolean;
  cnpj?: string;
  comercial_name?: string;
  corporate_name?: string;
  logoUrl?: string | null;
  logo?: File | null;
  faviconUrl?: string | null;
  favicon?: File | null;
  primary_color?: string;
  secondary_color?: string;
  description?: string;
  stateId?: number;
  cityId?: number;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  zipCode?: string;
  segment?: string;
  representative_email?: string;
  representative_contact?: string;
  financial_email?: string;
  financial_contact?: string;
  operational_email?: string;
  operational_contact?: string;
  email_conection?: {
    EMAIL_FROM?: string;
    EMAIL_HOST?: string;
    EMAIL_PORT?: string;
    EMAIL_AUTH_USER?: string;
    EMAIL_AUTH_PASSWORD?: string;
  };
  lp_domain?: string;
  system_domain?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
  inactiveAt?: Date;
  // Relations
  state?: {
    id: number;
    name: string;
    uf: string;
  };
  city?: {
    id: number;
    name: string;
  };
}