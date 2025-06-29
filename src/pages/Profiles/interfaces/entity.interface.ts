export interface IEntity {
  id?: number;
  name: string;
  companyId?: number;
  createdAt?: string;
  updatedAt?: string | null;
  inactiveAt?: string | null;
  permissions?: any;
}