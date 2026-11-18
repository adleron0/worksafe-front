export interface IEntity {
  id?: number;
  name?: string;
  cpf?: string;
  email?: string;
  phone?: string;
  workedAt?: string;
  /** empresa contratante: sai no certificado (vaga de empresa ou turma fechada) */
  customerId?: number | null;
  contractId?: number | null;
  reservationId?: number | null;
  origin?: string | null;
  customer?: { id: number; name: string; corporateName?: string; cnpj?: string } | null;
  occupation?: string;
  companyId?: number;
  classId?: number;
  traineeId?: number | null;
  subscribeStatus?: 'pending' | 'confirmed' | 'declined';
  confirmedAt?: string | null;
  declinedReason?: string | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  inactiveAt?: string | null;
  class?: {
    id?: number;
    name?: string;
  };
  company?: {
    id?: number;
    name?: string;
  };
}