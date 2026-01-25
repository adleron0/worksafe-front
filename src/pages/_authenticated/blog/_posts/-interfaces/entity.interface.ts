import { ITag } from "../../_tags/-interfaces/entity.interface";
import { ICategoria } from "../../_categorias/-interfaces/entity.interface";

export interface IPost {
  id?: number;
  authorId?: number;
  categoryId?: number;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  image?: File | null;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  publishedAt?: string | null;
  viewCount?: number;
  active: boolean;
  inactiveAt?: Date | string | null;
  createdAt?: string;
  updatedAt?: string | null;

  // Relationships
  author?: {
    id: number;
    name: string;
    imageUrl?: string;
  };
  category?: ICategoria;
  tags?: Array<{ tag: ITag }>;
  _count?: { comments: number };
}

export interface IPostTag {
  postId: number;
  tagId: number;
}
