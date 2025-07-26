export interface IProductImage {
  id: number;
  imageUrl: string;
  name: string;
}

export interface IEntity {
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
  images?: IProductImage[];
}
