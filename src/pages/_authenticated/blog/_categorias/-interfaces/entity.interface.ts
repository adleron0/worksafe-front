export interface ICategoria {
  id?: number;
  name: string;
  slug: string;
  description?: string;
  order: number;
  active: boolean;
  inactiveAt?: Date | string | null;
  createdAt?: string;
  updatedAt?: string | null;
  _count?: { posts: number };
}
