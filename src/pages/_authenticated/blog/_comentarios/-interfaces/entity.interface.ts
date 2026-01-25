import { IVisitante } from "../../_visitantes/-interfaces/entity.interface";

export interface IComentario {
  id?: number;
  postId: number;
  parentId?: number;
  depth: number;
  visitorId: number;
  content: string;
  rating?: number;
  status: 'pending' | 'published' | 'rejected';
  active: boolean;
  inactiveAt?: Date | string | null;
  createdAt?: string;
  updatedAt?: string | null;

  // Relationships
  visitor?: IVisitante;
  post?: {
    id: number;
    title: string;
    slug: string;
  };
  replies?: IComentario[];
}
