/**
 * Contrato de `GET /dashboard`. A API só manda as seções que a pessoa pode ver:
 * uma seção ausente (undefined) some da tela; uma seção presente e vazia mostra o
 * estado vazio dela.
 */

/** Link interno no formato "/rota?filtro=valor". */
export type AppLink = string;

export interface Trend {
  /** Série curta (6 pontos, do mais antigo ao atual) para a linha de tendência. */
  points: number[];
}

export interface FinanceSection {
  profit: { value: number; revenue: number; margin: number | null; marginDelta: number | null; trend: number[]; link: AppLink };
  cash: { today: number; projected30: number; in30: number; out30: number; trend: number[]; link: AppLink };
  cashFlow: {
    points: { key: string; label: string; real: number | null; projected: number | null }[];
    lowest: { key: string; label: string; value: number } | null;
    link: AppLink;
  };
  overdue: {
    total: number;
    count: number;
    buckets: { upTo15: number; upTo30: number; over30: number };
    items: { id: number; customer: string; days: number; value: number; link: AppLink }[];
    link: AppLink;
  };
  goal: { target: number | null; achieved: number; daysLeft: number; link: AppLink };
  revenueByArea: { key: string; label: string; value: number; margin: number | null }[];
}

export interface CommercialSection {
  weighted: number;
  open: number;
  openCount: number;
  trend: number[];
  funnel: { key: string; label: string; count: number; value: number }[];
  conversion: number | null;
  avgDaysToAccept: number | null;
  stalled: { id: number; title: string; customer: string; days: number; value: number; link: AppLink }[];
  link: AppLink;
}

export interface OperationsSection {
  backlog: { value: number; count: number; trend: number[] };
  orders: {
    id: number;
    title: string;
    customer: string;
    progress: number | null;
    margin: number | null;
    lateDays: number;
    link: AppLink;
  }[];
  link: AppLink;
}

export interface TeamSection {
  total: number;
  inField: number;
  inClass: number;
  atBase: number;
  /** férias, afastamento ou suspensão */
  away: number;
  free: number;
  /** nulos para quem não vê documentos de funcionários */
  docsExpired: number | null;
  docsExpiring: number | null;
  link: AppLink;
  docsLink: AppLink;
}

export interface TrainingSection {
  classes: { id: number; name: string; date: string; enrolled: number; seats: number | null; link: AppLink }[];
  link: AppLink;
}

export interface WeekItem {
  date: string;
  title: string;
  kind: "os" | "turma" | "retorno" | "pagar" | "receber" | "documento";
  link: AppLink;
}

export interface Dashboard {
  today: string;
  monthDay: number;
  monthDays: number;
  finance?: FinanceSection;
  commercial?: CommercialSection;
  operations?: OperationsSection;
  team?: TeamSection;
  training?: TrainingSection;
  week?: WeekItem[];
}
