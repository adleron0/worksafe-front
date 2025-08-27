export interface ICertificate {
  id?: number;
  key?: string;
  courseId: number;
  traineeId: number;
  classId: number;
  expirationDate?: Date | string;
  showOnWebsiteConsent?: boolean;
  fabricJsonFront?: any;
  fabricJsonBack?: any;
  variableToReplace?: any;
  pdfUrl?: string;
  inactiveAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  
  // Relações
  course?: {
    id: number;
    name: string;
  };
  trainee?: {
    id: number;
    name: string;
    cpf?: string;
  };
  class?: {
    id: number;
    name: string;
    classCode?: string;
  };
}

export interface ICertificateFormData {
  courseId: number;
  traineeId: number;
  classId: number;
  expirationDate?: Date | string;
  fabricJsonFront?: any;
  fabricJsonBack?: any;
  variableToReplace?: any;
  pdfUrl?: string;
}

export interface ICertificateSearchParams {
  search?: string;
  courseId?: number;
  classId?: number;
  traineeId?: number;
  startDate?: string;
  endDate?: string;
  status?: 'active' | 'inactive' | 'all';
}