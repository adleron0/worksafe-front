export interface Courses {
  id?: number;
  name: string;
  hoursDuration?: number;
  flags?: string;
  companyId?: number;
  imageUrl: string | null;
  image?: File | null;
  description?: string;
  gradeTheory?: string;
  gradePracticle?: string;
  active?: boolean;
  weekly?: boolean;
  weekDays?: string;
  faq?: string;
  exam?: {
    question: string;
    options: {
      text: string;
      isCorrect: boolean;
    }[];
  }[] | string;
  formType?: 'exam' | 'default'; // Used for UI form selection

  certificates?: unknown[];
  traineesCertificates?: unknown[];
  reviews?: unknown[];
  exams?: unknown[];
  classes?: unknown[];

  createdAt?: string;
  updatedAt?: string | null;
  inactiveAt?: string | null;
}
