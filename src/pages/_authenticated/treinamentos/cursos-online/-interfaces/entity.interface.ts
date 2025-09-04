export interface IEntity {
  id: number;
  courseId: number;
  companyId?: number;
  title: string;
  description?: string;
  version?: string;
  isActive: boolean;
  progressConfig: any;
  inactiveAt?: Date | string | null;
  createdAt?: string;
  updatedAt?: string;
  
  // Relações
  course?: {
    id: number;
    name: string;
    description?: string;
    hoursDuration?: number;
  };
}