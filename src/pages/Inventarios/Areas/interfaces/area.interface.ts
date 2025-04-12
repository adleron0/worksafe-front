export interface Area {
  id?: number;
  name: string;
  companyId?: number;
  description?: string | null;
  subArea?: string[];
  imageUrl: string | null;
  image?: File | null;
  createdAt?: string;
  updatedAt?: string;
  inactiveAt?: string | null;
}