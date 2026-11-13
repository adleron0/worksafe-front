export interface IEntity {
  id?: number;
  name: string;
  companyId?: number;
  imageUrl: string | null;
  image?: File | null;
  features?: string;
  slug?: string | null;
  description?: string | null;
  content?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  faq?: { question: string; answer: string }[] | string | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string | null;
  inactiveAt?: string | null;
}