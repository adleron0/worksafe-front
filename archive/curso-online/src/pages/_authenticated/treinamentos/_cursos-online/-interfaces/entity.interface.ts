export interface IEntity {
  id: number;
  courseId: number;
  companyId?: number;
  name: string;
  description?: string;
  isActive: boolean;
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

  // Lições associadas ao modelo
  lessons?: {
    id: number;
    lessonId: number;
    order: number;
    isActive: boolean;
    lesson?: {
      id: number;
      title: string;
      description?: string;
      version?: string;
      isActive: boolean;
    };
  }[];
}
