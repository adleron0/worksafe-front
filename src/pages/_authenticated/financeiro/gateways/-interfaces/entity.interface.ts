export interface ICompanyGateway {
  id: number;
  companyId: number;
  gateway: 'stripe' | 'mercadopago' | 'pagarme' | 'asaas' | 'other';
  payload?: {
    token?: string;
    [key: string]: any;
  };
  active: boolean;
  createdAt: string;
  updatedAt: string;
  inactiveAt?: string | null;
  
  // Relações
  company?: {
    id: number;
    name: string;
    document: string;
  };
}

export interface ICompanyGatewayForm {
  gateway: 'stripe' | 'mercadopago' | 'pagarme' | 'asaas' | 'other';
  token: string;
  active?: boolean;
}