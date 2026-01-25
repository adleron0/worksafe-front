export interface IVisitante {
  id?: number;
  name: string;
  email: string;
  avatarUrl?: string;
  googleId?: string;
  userId?: number;
  blocked: boolean;
  blockedReason?: string;
  active: boolean;
  inactiveAt?: Date | string | null;
  createdAt?: string;
  updatedAt?: string | null;
  _count?: { comments: number };
}
