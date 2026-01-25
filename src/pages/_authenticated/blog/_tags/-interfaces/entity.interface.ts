export interface ITag {
  id?: number;
  name: string;
  slug: string;
  active: boolean;
  inactiveAt?: Date | string | null;
  createdAt?: string;
  updatedAt?: string | null;
}
