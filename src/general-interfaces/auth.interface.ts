export interface LoginData {
  email: string;
  password: string;
  cnpj: string;
}

export interface IPayload {
  username: string;
  sub: number;
  companyId: number;
  imageUrl?: string;
  role: string;
  products: string[];
  permissions: string[];
  iat?: number;
  exp?: number;
}
