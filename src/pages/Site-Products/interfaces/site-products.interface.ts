export interface SiteServices {
  id?: number;
  name: string;
  companyId?: number;
  imageUrl: string | null;
  image?: File | null;
  featured?: boolean;
  features?: string;
  description?: string;
  price?: number;
  oldPrice?: number;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string | null;
  inactiveAt?: string | null;
}