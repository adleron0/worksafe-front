export interface FaqItem {
  question: string;
  answer: string;
}

export interface IEntity {
  id?: number;
  name: string;
  hoursDuration?: number;
  yearOfValidation?: number;
  flags?: string;
  companyId?: number;
  imageUrl: string | null;
  image?: File | null;
  icon?: string;
  color?: string;
  description?: string;
  gradeTheory?: string;
  gradePracticle?: string;
  active?: boolean;
  weekly?: boolean;
  weekDays?: string;
  media?: number;
  faq?: string | FaqItem[];
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
