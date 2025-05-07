export interface IEntity {
  id?: number;
  customerId?: number;
  roleId?: number;
  name?: string;
  email?: string;
  phone?: string;
  createdAt?: string;
  inactiveAt?: string;
  role?: {
    id?: number;
    name?: string;
  };
}
