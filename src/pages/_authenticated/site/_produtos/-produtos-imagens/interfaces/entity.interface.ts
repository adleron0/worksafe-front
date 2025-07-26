export interface IEntity {
  id?: number;
  name: string;
  productId: number;
  companyId?: number;
  createdAt?: string;
  inactiveAt?: string;
  product?: any;
  imageUrl: string | null;
  image?: File | null;
}
