export interface IReview {
  id: number;
  traineeId?: number;
  courseId?: number;
  classId?: number;
  courseReview?: any;
  instructorReview?: any;
  generalRating?: number;
  opinionRating?: string;
  authorizationExposeReview?: boolean;
  companyId?: number;
  createdAt?: Date;
  updatedAt?: Date;
  inactiveAt?: Date | null;
  
  // Relações
  trainee?: {
    id: number;
    name: string;
    email?: string;
    imageUrl?: string;
  };
  course?: {
    id: number;
    title: string;
  };
  class?: {
    id: number;
    name: string;
  };
  company?: {
    id: number;
    name: string;
  };
}