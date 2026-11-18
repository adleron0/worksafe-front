/** Contrato de `GET /dashboard/training`. */
export type ActionTone = "danger" | "warning" | "info";

export interface TrainingAction {
  key: string;
  tone: ActionTone;
  title: string;
  detail: string;
  count: number;
  link: string;
}

export interface UpcomingClass {
  id: number;
  name: string;
  date: string;
  endDate: string | null;
  ongoing: boolean;
  enrolled: number;
  /** vagas de empresas ainda sem nome (já vendidas) */
  reserved?: number;
  /** vagas reservadas para empresas, com ou sem nome */
  companySeats?: number;
  pending: number;
  seats: number | null;
  quorum: number | null;
  instructors: number;
  link: string;
}

export interface RenewalItem {
  id: number;
  trainee: string;
  phone: string | null;
  email: string | null;
  courseId: number;
  course: string;
  expiresAt: string;
  certificateKey: string;
}

export interface TrainingPanel {
  today: string;
  actions: TrainingAction[];
  actionsTotal: number;
  kpis: {
    trained: { value: number; previous: number; trend: number[] };
    occupancy: { ratio: number | null; taken: number; seats: number; classes: number };
    /** vagas vendidas para empresas nas próximas turmas (valor ausente sem a permissão do financeiro) */
    companySeats?: { seats: number; customers: number; value?: number };
    /** ausente sem a permissão de ver o financeiro */
    revenue?: { month: number; previous: number; trend: number[]; open: number; openCount: number; link: string };
    quality: { rating: number | null; reviews: number; approval: number | null; exams: number; days: number };
  };
  upcoming: UpcomingClass[];
  renewals: { total: number; days: number; byCourse: { courseId: number; name: string; count: number }[]; items: RenewalItem[] };
  trend: { month: string; trained: number; enrolled: number }[];
  links: { classes: string; certificates: string; reviews: string; newClass: string };
  generatedAt: string;
}
