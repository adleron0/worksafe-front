export interface IEntity {
  id?: number;
  name: string;
  companyId?: number;
  imageUrl: string | null;
  image?: File | null;
  signatureUrl?: string | null;
  signature?: File | null;
  email: string;
  cpf: string;
  phone?: string;
  active?: boolean;
  curriculum: string;
  highlight?: string;
  formation: string;
  formationCode?: string;
  classes?: unknown[];
  createdAt?: string;
  updatedAt?: string | null;
  inactiveAt?: string | null;
}
