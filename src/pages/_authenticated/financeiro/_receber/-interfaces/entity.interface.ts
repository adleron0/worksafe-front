export interface IFinancialRecord {
  id: number;
  accrualDate: string;
  companyId: number;
  company?: {
    id: number;
    name: string;
  };
  gateway: string;
  status: string;
  subscriptionId?: number;
  subscription?: {
    id: number;
    name: string;
    email: string;
  };
  traineeId?: number;
  trainee?: {
    id: number;
    name: string;
    email: string;
  };
  customerId?: number;
  customer?: {
    id: number;
    name: string;
    email?: string;
    cnpj?: string;
  };
  paymentMethod: string;
  value?: number;
  dueDate?: string;
  paidAt?: string;
  billUrl?: string;
  billNumber?: string;
  pixUrl?: string;
  pixNumber?: string;
  requestData?: any;
  responseData?: any;
  errorData?: any;
  observations?: string;
  description?: string;
  externalId?: string;
  key: string;
  couponId?: number;
  coupon?: {
    id: number;
    code: string;
    name: string;
  };
  originalValue?: number;
  discount?: number;
  discountApplied?: number;
  commissionPercentage?: number;
  commissionValue?: number;
  // Nota fiscal emitida fora do sistema
  invoiceNumber?: string | null;
  invoiceIssuedAt?: string | null;
  invoiceUrl?: string | null;
  installmentNumber?: number | null;
  /** contrato comercial que originou o recebível */
  contractId?: number | null;
  installmentTotal?: number | null;
  netValue?: number | null;
  receivedValue?: number | null;
  settledByUserId?: number | null;
  // Classificação gerencial
  chartAccountId?: number | null;
  chartAccount?: { id: number; code: string; name: string } | null;
  costCenterId?: number | null;
  costCenter?: { id: number; name: string } | null;
  bankAccountId?: number | null;
  bankAccount?: { id: number; name: string; type: string } | null;
  sellerId?: number;
  seller?: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  inactiveAt?: string;
}