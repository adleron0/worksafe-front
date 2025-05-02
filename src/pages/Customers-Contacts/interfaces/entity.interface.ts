export interface IEntity {
  id?: number;
  customerId?: number;
  profileId?: number;
  name?: string;
  email?: string;
  phone?: string;
  createdAt?: string;
  inactivedAt?: string;
  role?: {
    id?: number;
    name?: string;
  };
}
