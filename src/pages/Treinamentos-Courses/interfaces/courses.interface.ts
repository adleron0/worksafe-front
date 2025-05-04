export interface Courses {
  id?: number;
  name: string;
  hoursDuration?: number;
  flag?: string;
  companyId?: number;
  imageUrl: string | null;
  image?: File | null;
  description?: string;
  gradeTheory?: string;
  gradePracticle?: string;
  active?: boolean;
  weekly?: boolean;
  weekDays?: string;
  faq?: any;
  exam?: any;

  certificates?: any;
  traineesCertificates?: any;
  reviews?: any;
  exams?: any;
  classes?: any;

  createdAt?: string;
  updatedAt?: string | null;
  inactiveAt?: string | null;
}
