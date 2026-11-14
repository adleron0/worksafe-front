import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";

export type ProposalKind = "servico" | "treinamento" | "misto";
export type ProposalStatus = "rascunho" | "enviada" | "visualizada" | "aceita" | "recusada" | "expirada" | "cancelada" | "substituida";
export type ItemType = "mao_de_obra" | "locacao" | "material" | "treinamento" | "avulso";
/** Marcação sobre a imagem, em percentual da largura e da altura. */
export type Annotation =
  | { type: "circulo"; x: number; y: number; w: number; h: number; label: string }
  | { type: "seta"; x1: number; y1: number; x2: number; y2: number; label: string };
export interface ProposalImage { url: string; title: string; description: string; annotations: Annotation[] }

/** Cronograma simples: etapas com início e duração, na unidade escolhida. */
export interface ScheduleStep { title: string; start: number; duration: number }
export interface Schedule { unit: "dia" | "semana" | "mes"; steps: ScheduleStep[] }

export type ItemsMode = "detalhado" | "por_secao" | "global";
export type DueRule = "data_fixa" | "dias_apos_aceite" | "dias_apos_nf" | "dias_apos_conclusao";

export interface DraftItem {
  /** só na tela */
  uid: string;
  id?: number; type: ItemType; description: string; unit: string | null; quantity: number;
  professionalId: number | null; night: boolean; travel: boolean; weekend: boolean;
  workDays: number | null; weekendDays: number | null; hoursPerDay: number | null; overtimeHours: number;
  courseId: number | null; extra: { students?: number | null; workload?: number | null; dates?: string; location?: string } | null;
  unitCost: number; extraCost: number; margin?: number | null; finalValue: number | null; showInDocument: boolean;
}
/** Linha recém-adicionada e ainda sem nada: não entra no cálculo nem é salva. */
export const isBlankItem = (item: Pick<DraftItem, "type" | "professionalId" | "courseId" | "description" | "unitCost" | "extraCost" | "finalValue">) =>
  item.type === "mao_de_obra" ? !item.professionalId
    : !item.description.trim() && !item.courseId && !item.unitCost && !item.extraCost && (item.finalValue === null || item.finalValue === undefined);
export interface DraftSection { uid: string; id?: number; title: string; kind: ItemType; margin?: number; showInDocument: boolean; items: DraftItem[] }
export interface DraftInstallment { uid: string; percent: number | null; amount: number | null; dueRule: DueRule; dueDate: string | null; dueDays: number | null; description: string | null }

export interface ProposalDraft {
  kind: ProposalKind; customerId: number; contactName: string | null; contactEmail: string | null; contactPhone: string | null;
  requester: string | null; department: string | null; title: string; description: string | null; sellerId: number | null;
  validUntil: string | null; referenceDate: string; workDays: number; weekendDays: number;
  contingencyRate: number; commissionRate?: number; commissionBase?: "faturado" | "lucro"; commissionInPrice?: boolean;
  taxRegime: "tradicional" | "hibrido" | null; discount: number; internalNotes: string | null;
  /** base de cálculo escolhida à mão; nulo = a vigente na data prevista */
  costBaseId?: number | null;
  templateId: number | null; documentBody: string | null; itemsMode: ItemsMode; termIds: number[];
  images: ProposalImage[];
  schedule: Schedule;
  sections: DraftSection[]; installments: DraftInstallment[];
}

export interface CalcLine { suggested: number; value: number; hours: number | null; listPrice: number | null; cost?: number; margin?: number | null; hourCost?: number | null }
export interface ProposalCalc {
  sections: Array<{ suggested: number; value: number; cost?: number; margin?: number; lines: CalcLine[] }>;
  totals: {
    suggested: number; subtotal: number; contingency: number; discount: number; net: number; taxOutside: number; total: number;
    cost?: number; taxInside?: number; tax?: number; profit?: number; profitRate?: number; commission?: number; customerCredit?: number; customerCost?: number;
  };
  installments: Array<{ value: number }>;
  installmentsTotal: number; installmentsDiff: number;
  margin?: { realTax: number; unused: number; unusedRate: number; used: number; usedRate: number; minTotal: number; minTotalOperational: number; maxDiscountRate: number };
  tax: { regime: "tradicional" | "hibrido"; outside: number; name?: string; inside?: number };
  costBase?: string;
}

export interface CustomerOption {
  id: number; name: string; corporateName: string; cnpj: string; email: string; phone: string;
  contacts?: Array<{ id: number; name: string; email: string; phone: string }>;
}

export interface Proposal {
  id: number; number: string; revision: number; rootId: number | null; status: ProposalStatus; inactiveAt: string | null;
  expired: boolean; editable: boolean; canSeeCosts: boolean; customer: CustomerOption;
  sentAt: string | null; decidedAt: string | null; statusNote: string | null; createdAt: string; updatedAt: string;
  baseOutdated: boolean; baseCapturedAt: string;
  publicKey: string | null; publicUrl: string | null; documentFrozen: boolean; documentHash: string | null; viewedAt: string | null;
  emailConfigured: boolean; events: ProposalEvent[];
  contract: { id: number; number: string; status: string; customerOrder?: { number: string | null; date: string | null; fileUrl: string | null; fileName: string | null } } | null;
  /** só na resposta do envio: a proposta foi enviada, mas o e-mail com o link falhou */
  emailError?: string;
  versions: Array<{ id: number; number: string; revision: number; status: ProposalStatus; total: number }>;
  draft: Omit<ProposalDraft, "sections" | "installments"> & {
    sections: Array<Omit<DraftSection, "uid" | "items"> & { items: Array<Omit<DraftItem, "uid">> }>;
    installments: Array<Omit<DraftInstallment, "uid">>;
  };
  calc: ProposalCalc;
}

export interface ProposalEvent {
  id: number; type: string; at: string; name: string | null; role: string | null; email: string | null; cpf: string | null;
  ip: string | null; userAgent: string | null; note: string | null; codeVerified: boolean | null; documentHash: string | null;
}

export interface TemplateOption { id: number; name: string; kind: ProposalKind | null; isDefault: boolean; body: string; itemsMode: ItemsMode; termIds: number[] }
export interface TermOption { id: number; title: string; kind: string; body: string }
export interface VariableOption { key: string; label: string; block?: boolean }

export const ITEMS_MODE_OPTIONS: Array<{ id: ItemsMode; name: string }> = [
  { id: "detalhado", name: "Detalhada: cada item com quantidade e valor" },
  { id: "por_secao", name: "Por seção: só o valor de cada seção" },
  { id: "global", name: "Global: lista os itens e mostra só o total" },
];

export const EVENT_LABEL: Record<string, string> = {
  enviada: "Enviada", visualizada: "Aberta pelo cliente", aceita: "Aceita", recusada: "Recusada", cancelada: "Cancelada", expirada: "Validade vencida",
  revisada: "Substituída por revisão", email_enviado: "Link enviado por e-mail", codigo_enviado: "Código de confirmação enviado",
};

export interface ProposalRow {
  id: number; number: string; revision: number; kind: ProposalKind; status: ProposalStatus; title: string; total: number;
  validUntil: string | null; createdAt: string; sentAt: string | null; inactiveAt: string | null; seller: string | null; expired: boolean;
  customer: { id: number; name: string };
  /** acompanhamento: próximo retorno marcado e último contato */
  followUp?: { next: { id: number; type: "ligacao" | "whatsapp" | "email" | "reuniao" | "visita" | "tarefa" | "nota"; subject: string; dueDate: string; dueTime: string | null; overdue: boolean; today: boolean } | null; pending: number; lastAt: string | null };
}

export interface ProposalOptions {
  date: string; canSeeCosts: boolean; hoursPerDay: number;
  defaults: { contingencyLevels: Array<{ label: string; rate: number }>; contingencyRate: number; margins?: Record<string, number>; commission?: { rate: number; base: string; inPrice: boolean } };
  presets: Record<ProposalKind, Array<{ title: string; kind: ItemType; margin?: number }>>;
  tax: { regime: "tradicional" | "hibrido"; name?: string };
  professionals: Array<{ id: number; name: string; hourCost?: number }>;
  courses: Array<{ id: number; name: string; hoursDuration: number | null; classPrice: number | null; includedStudents: number | null; studentPrice: number | null }>;
  sellers: Array<{ id: number; name: string }>;
  templates: TemplateOption[]; terms: TermOption[]; variables: VariableOption[];
  brandReady?: boolean;
  costBases?: Array<{ id: number; name: string; effectiveFrom: string; current: boolean }>;
}

export const PROPOSALS_KEY = "commercialProposals";
export const PROPOSAL_KEY = "commercialProposal";

export const KIND_LABEL: Record<ProposalKind, string> = { servico: "Serviço", treinamento: "Treinamento", misto: "Serviço + treinamento" };
export const ITEM_LABEL: Record<ItemType, string> = {
  mao_de_obra: "Mão de obra", locacao: "Locação", material: "Material", treinamento: "Treinamento", avulso: "Item avulso",
};
export const STATUS_LABEL: Record<ProposalStatus, string> = {
  rascunho: "Rascunho", enviada: "Enviada", visualizada: "Visualizada", aceita: "Aceita", recusada: "Recusada",
  expirada: "Expirada", cancelada: "Cancelada", substituida: "Substituída",
};
const STATUS_CLASS: Record<ProposalStatus, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviada: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  visualizada: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  aceita: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  recusada: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  expirada: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  cancelada: "bg-muted text-muted-foreground line-through",
  substituida: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status, expired }: { status: ProposalStatus; expired?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", STATUS_CLASS[status])}>{STATUS_LABEL[status]}</span>
      {expired && <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", STATUS_CLASS.expirada)}>Validade vencida</span>}
    </span>
  );
}

/** Cor e ícone de cada tipo de proposta: para bater o olho e saber se é serviço ou treinamento. */
const KIND_STYLE: Record<ProposalKind, { icon: string; className: string }> = {
  servico: { icon: "wrench", className: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200" },
  treinamento: { icon: "graduation-cap", className: "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200" },
  misto: { icon: "layers", className: "border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-200" },
};
/** Etiqueta do tipo da proposta (serviço, treinamento ou os dois), com ícone e cor próprios. */
export function KindBadge({ kind, className }: { kind: ProposalKind; className?: string }) {
  const style = KIND_STYLE[kind] ?? KIND_STYLE.servico;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", style.className, className)}>
      <Icon name={style.icon} className="w-3 h-3 shrink-0" /> {KIND_LABEL[kind] ?? kind}
    </span>
  );
}

export const DUE_RULE_OPTIONS: Array<{ id: DueRule; name: string }> = [
  { id: "dias_apos_nf", name: "Dias após a nota fiscal" },
  { id: "dias_apos_aceite", name: "Dias após o aceite" },
  { id: "dias_apos_conclusao", name: "Dias após a conclusão" },
  { id: "data_fixa", name: "Data fixa" },
];

export const formatCnpj = (cnpj?: string) =>
  cnpj && cnpj.length === 14 ? cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : cnpj ?? "";
