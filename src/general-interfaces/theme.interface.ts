/**
 * Interfaces relacionadas ao sistema de temas
 */

export interface ThemeCache {
  domain: string;
  primaryColor: string;
  secondaryColor: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  companyData: CompanyThemeData | null;
  timestamp: number;
  expiresIn: number;
}

export interface CompanyThemeData {
  id: number;
  comercial_name: string;
  primary_color: string | null;
  secondary_color: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  description: string | null;
  address: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  neighborhood: string | null;
  zipCode: string | null;
  representative_email: string | null;
  representative_contact: string | null;
  operational_email: string | null;
  operational_contact: string | null;
  lp_domain: string | null;
  websiteUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
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

export interface CompanyThemeResponse {
  total: number;
  rows: CompanyThemeData[];
}

export interface ThemeContextValue {
  theme: {
    primaryColor: string;
    secondaryColor: string | null;
    logoUrl: string | null;
    faviconUrl: string | null;
    companyData: CompanyThemeData | null;
    isLoading: boolean;
    error: string | null;
  };
  refreshTheme: () => Promise<void>;
  clearCache: () => void;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultPrimaryColor?: string;
  defaultSecondaryColor?: string;
}