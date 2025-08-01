import { FaqItem } from "../../_cursos/-interfaces/entity.interface";

export interface IEntity {
  id?: number;
  name: string;
  imageUrl: string | null;
  image: File | null;
  companyId?: number;
  customerId?: number | null;
  courseId?: number;
  price?: number | 0;
  oldPrice?: number;
  hoursDuration?: number | null;
  openClass?: boolean;
  gifts?: string | null;
  description?: string | null;
  gradeTheory?: string;
  gradePracticle?: string;
  videoUrl?: string | null;
  videoTitle?: string | null;
  videoSubtitle?: string | null;
  videoDescription?: string | null;
  active?: boolean | null;
  faq?: string | FaqItem[] | null;
  initialDate?: string | null;
  finalDate?: string | null;
  landingPagesDates?: string | null;
  allowExam?: boolean | null;
  allowReview?: boolean | null;
  instructors?: any[] | null;
  certificates?: any[] | null;
  exams?: any[] | null;
  reviews?: any[] | null;
  createdAt?: string;
  updatedAt?: string | null;
  inactiveAt?: string | null;
  minimumQuorum?: number | null;
  maxSubscriptions?: number | null;
}
