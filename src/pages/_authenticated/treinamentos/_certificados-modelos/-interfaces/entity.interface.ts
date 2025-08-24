export interface ICertificate {
  id: number;
  name: string;
  courseId: number;
  companyId: number;
  active: boolean;
  canvasWidth: number;
  canvasHeight: number;
  fabricJsonFront: string; // String JSON
  fabricJsonBack: string | null; // String JSON ou null
  createdAt: string;
  updatedAt: string;
  // Relacionamentos opcionais
  course?: {
    id: number;
    name: string;
  };
  company?: {
    id: number;
    name: string;
  };
}