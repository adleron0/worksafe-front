import type { ContractPlan, MeasurementPlanDraft } from "./measurement";
import UiStatusBadge, { type StatusTone } from "@/components/general-components/StatusBadge";
import TagBadge from "@/components/general-components/TagBadge";

export type ProposalKind = "servico" | "treinamento" | "locacao";
export type ProposalStatus = "rascunho" | "enviada" | "visualizada" | "aceita" | "recusada" | "expirada" | "cancelada" | "substituida";
export type ItemType = "mao_de_obra" | "locacao" | "material" | "treinamento" | "avulso" | "locacao_cliente";
/** Período da locação a cliente (item do estoque). */
export type RentPeriod = "dia" | "semana" | "mes";
/** Marcação sobre a imagem, em percentual da largura e da altura. */
export type Annotation =
  | { type: "circulo"; x: number; y: number; w: number; h: number; label: string }
  | { type: "seta"; x1: number; y1: number; x2: number; y2: number; label: string };
export interface ProposalImage { url: string; title: string; description: string; annotations: Annotation[] }

/** Cronograma simples: etapas com início e duração, na unidade escolhida. */
export interface ScheduleStep { title: string; start: number; duration: number }
export interface Schedule { unit: "dia" | "semana" | "mes"; steps: ScheduleStep[] }

export type ItemsMode = "detalhado" | "por_secao" | "global";
export type DueRule = "data_fixa" | "dias_apos_aceite" | "dias_apos_nf" | "dias_apos_conclusao" | "percentual_obra";

export interface DraftItem {
  /** só na tela */
  uid: string;
  id?: number; type: ItemType; description: string; unit: string | null; quantity: number;
  professionalId: number | null; night: boolean; travel: boolean; weekend: boolean;
  workDays: number | null; weekendDays: number | null; hoursPerDay: number | null; overtimeHours: number;
  courseId: number | null;
  /** locação a cliente: o item alugável do estoque */
  stockItemId?: number | null;
  extra: { students?: number | null; workload?: number | null; dates?: string; location?: string; period?: RentPeriod; periods?: number | null; rate?: number | null; closed?: boolean } | null;
  unitCost: number; extraCost: number; margin?: number | null; finalValue: number | null; showInDocument: boolean;
}
/** Linha recém-adicionada e ainda sem nada: não entra no cálculo nem é salva. */
export const isBlankItem = (item: Pick<DraftItem, "type" | "professionalId" | "courseId" | "description" | "unitCost" | "extraCost" | "finalValue"> & { stockItemId?: number | null }) =>
  item.type === "mao_de_obra" ? !item.professionalId
    : item.type === "locacao_cliente" ? !item.stockItemId && !item.description.trim() && (item.finalValue === null || item.finalValue === undefined)
    : !item.description.trim() && !item.courseId && !item.unitCost && !item.extraCost && (item.finalValue === null || item.finalValue === undefined);
export interface DraftSection { uid: string; id?: number; title: string; kind: ItemType; margin?: number; showInDocument: boolean; items: DraftItem[] }
export interface DraftInstallment { uid: string; percent: number | null; amount: number | null; dueRule: DueRule; dueDate: string | null; dueDays: number | null; workPercent?: number | null; description: string | null }

export interface ProposalDraft {
  kind: ProposalKind; customerId: number;
  /** CNPJ do grupo que vende; nulo = o do tipo da proposta (a API decide) */
  entityId?: number | null; contactName: string | null; contactEmail: string | null; contactPhone: string | null;
  requester: string | null; department: string | null; title: string; description: string | null; sellerId: number | null;
  validUntil: string | null; referenceDate: string; workDays: number; weekendDays: number;
  contingencyRate: number; commissionRate?: number; commissionBase?: "faturado" | "lucro"; commissionInPrice?: boolean;
  taxRegime: "tradicional" | "hibrido" | null; discount: number; internalNotes: string | null;
  /** base de cálculo escolhida à mão; nulo = a vigente na data prevista */
  costBaseId?: number | null;
  templateId: number | null; documentBody: string | null; itemsMode: ItemsMode; termIds: number[];
  images: ProposalImage[];
  schedule: Schedule;
  /** proposta de locação: período, nº de períodos ou "até devolver", cobrança, caução e entrega */
  rental?: RentalTerms | null;
  /** serviço faturado por medição de obra (frentes, mobilização, caução); nulo = parcelas */
  measurement?: MeasurementPlanDraft | null;
  /** caução contratual das parcelas (serviço): fração retida de cada nota e dias após a conclusão para liberar */
  depositRate?: number; depositReleaseDays?: number;
  sections: DraftSection[]; installments: DraftInstallment[];
}
export interface RentalTerms { period: RentPeriod; periods: number; untilReturn: boolean; billing: "periodo" | "unico"; deposit: number | null; deliveryAddress: string | null }
/** Disponibilidade dos equipamentos da proposta de locação no período. */
export interface RentalAvailability {
  start: string; end: string | null; estimatedEnd: string; ok: boolean;
  items: Array<{ itemId: number; name: string; requested: number; available: number; ok: boolean; detail: string | null }>;
}

export interface CalcLine {
  suggested: number; value: number; hours: number | null; listPrice: number | null; cost?: number; margin?: number | null; hourCost?: number | null;
  /** locação pela base (plano 09); custo, piso e mercado só para quem vê custos */
  rental?: RentalLineCalc | { error: string } | null;
}
export interface RentalLineCalc {
  months: number; discountRate: number; periodValue: number;
  perRentedMonth?: number; handling?: number; value?: number; floorCost?: number; monthPrice?: number; valueShare?: number; market?: "abaixo" | "dentro" | "acima";
}
export interface ProposalCalc {
  sections: Array<{ suggested: number; value: number; cost?: number; margin?: number; lines: CalcLine[] }>;
  totals: {
    suggested: number; subtotal: number; contingency: number; discount: number; dealDiscount?: number; net: number; taxOutside: number; total: number;
    cost?: number; taxInside?: number; tax?: number; profit?: number; profitRate?: number; commission?: number; customerCredit?: number; customerCost?: number;
  };
  installments: Array<{ value: number }>;
  installmentsTotal: number; installmentsDiff: number; installmentsProblem?: string | null;
  /** medição de obra: valor de cada frente e da mobilização com o total de agora */
  measurementPlan?: ContractPlan | null;
  /** só no cálculo ao vivo (preview) da proposta de locação */
  availability?: RentalAvailability | null;
  margin?: { realTax: number; unused: number; unusedRate: number; used: number; usedRate: number; minTotal: number; minTotalOperational: number; maxDiscountRate: number };
  tax: { regime: "tradicional" | "hibrido"; outside: number; name?: string; inside?: number };
  costBase?: string;
}

export interface CustomerOption {
  id: number; name: string; corporateName: string; cnpj: string; email: string; phone: string;
  // vem com o comercial padrão primeiro (é o que a proposta nova usa)
  contacts?: Array<{ id: number; name: string; email: string; phone: string; isCommercial?: boolean; defaultCommercial?: boolean }>;
}

export interface Proposal {
  id: number; number: string; revision: number; rootId: number | null; status: ProposalStatus; inactiveAt: string | null;
  expired: boolean; editable: boolean; canSeeCosts: boolean; customer: CustomerOption;
  sentAt: string | null; decidedAt: string | null; statusNote: string | null; createdAt: string; updatedAt: string;
  baseOutdated: boolean; baseCapturedAt: string;
  /** serviço × locação do mesmo cliente perto da mesma data (confirmar que o cliente opera o equipamento) */
  overlap?: Array<{ id: number; number: string; title: string; status: ProposalStatus; kind: string }>;
  availability?: RentalAvailability | null;
  publicKey: string | null; publicUrl: string | null; documentFrozen: boolean; documentHash: string | null; viewedAt: string | null;
  emailConfigured: boolean; events: ProposalEvent[];
  /** negociação em que a proposta está (agrupa propostas do mesmo cliente) */
  deal?: { id: number; number: string; title: string } | null;
  contract: { id: number; number: string; status: string; customerOrder?: { number: string | null; date: string | null; fileUrl: string | null; fileName: string | null }; serviceOrder?: { id: number; number: string; status: string } | null } | null;
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
  id: number; number: string; revision: number; kind: ProposalKind; entityId?: number | null; status: ProposalStatus; title: string; total: number;
  validUntil: string | null; createdAt: string; sentAt: string | null; inactiveAt: string | null; seller: string | null; expired: boolean;
  /** nome de quem criou a proposta */
  createdBy?: string | null;
  customer: { id: number; name: string };
  /** acompanhamento: próximo retorno marcado e último contato */
  followUp?: { next: { id: number; type: "ligacao" | "whatsapp" | "email" | "reuniao" | "visita" | "tarefa" | "nota"; subject: string; dueDate: string; dueTime: string | null; overdue: boolean; today: boolean } | null; pending: number; lastAt: string | null };
}

/** Comissão inicial: a do vendedor, o padrão da base (se ligado) ou zero. */
export interface ProposalCommission { rate: number; base: "faturado" | "lucro"; inPrice: boolean; source: "vendedor" | "padrao" | "zero" }

export interface ProposalOptions {
  date: string; canSeeCosts: boolean; hoursPerDay: number;
  defaults: { contingencyLevels: Array<{ label: string; rate: number }>; contingencyRate: number; margins?: Record<string, number>; commission?: ProposalCommission };
  presets: Record<ProposalKind, Array<{ title: string; kind: ItemType; margin?: number }>>;
  tax: { regime: "tradicional" | "hibrido"; name?: string };
  professionals: Array<{ id: number; name: string; hourCost?: number }>;
  courses: Array<{ id: number; name: string; hoursDuration: number | null; classPrice: number | null; includedStudents: number | null; studentPrice: number | null }>;
  /** `commission` só vem para quem vê custos; nula = o vendedor segue o padrão */
  sellers: Array<{ id: number; name: string; commission?: ProposalCommission | null }>;
  templates: TemplateOption[]; terms: TermOption[]; variables: VariableOption[];
  brandReady?: boolean;
  costBases?: Array<{ id: number; name: string; effectiveFrom: string; current: boolean }>;
}

export const PROPOSALS_KEY = "commercialProposals";
export const PROPOSAL_KEY = "commercialProposal";

export const KIND_LABEL: Record<ProposalKind, string> = { servico: "Serviço", treinamento: "Treinamento", locacao: "Locação" };
/** O que nasce do aceite de cada tipo (texto de ajuda na escolha do tipo). */
export const KIND_HINT: Record<ProposalKind, string> = {
  servico: "O aceite abre a ordem de serviço.",
  treinamento: "O aceite libera criar a turma fechada do cliente.",
  locacao: "O aceite reserva os equipamentos e abre a ordem de locação.",
};
export const ITEM_LABEL: Record<ItemType, string> = {
  mao_de_obra: "Mão de obra", locacao: "Locação de terceiros (custo)", material: "Material", treinamento: "Treinamento", avulso: "Item avulso", locacao_cliente: "Aluguel de equipamento nosso",
};
/**
 * Itens que cada tipo aceita (igual à API). Serviço e locação juntos são duas
 * propostas, uma de cada tipo, e duas notas.
 */
export const KIND_ITEMS: Record<ProposalKind, ItemType[]> = {
  servico: ["mao_de_obra", "locacao", "material", "avulso"],
  treinamento: ["treinamento", "material", "avulso"],
  locacao: ["locacao_cliente", "material", "avulso"],
};
export const STATUS_LABEL: Record<ProposalStatus, string> = {
  rascunho: "Rascunho", enviada: "Enviada", visualizada: "Visualizada", aceita: "Aceita", recusada: "Recusada",
  expirada: "Expirada", cancelada: "Cancelada", substituida: "Substituída",
};
/** Tom do status (padrão Unyo) de cada situação da proposta. */
export const STATUS_TONE: Record<ProposalStatus, StatusTone> = {
  rascunho: "neutral", enviada: "info", visualizada: "primary", aceita: "success", recusada: "danger",
  expirada: "warning", cancelada: "neutral", substituida: "neutral",
};
const ENDED: ProposalStatus[] = ["aceita", "recusada", "cancelada", "substituida"];

export function StatusBadge({ status, expired }: { status: ProposalStatus; expired?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <UiStatusBadge tone={STATUS_TONE[status] ?? "neutral"} pulse={!ENDED.includes(status)}>{STATUS_LABEL[status] ?? status}</UiStatusBadge>
      {expired && <UiStatusBadge tone="warning">Validade vencida</UiStatusBadge>}
    </span>
  );
}

/** Cor e ícone de cada tipo de proposta: para bater o olho e saber se é serviço ou treinamento. */
const KIND_STYLE: Record<ProposalKind, { icon: string; color: string }> = {
  servico: { icon: "wrench", color: "#0284c7" },
  treinamento: { icon: "graduation-cap", color: "#7c3aed" },
  locacao: { icon: "handshake", color: "#0d9488" },
};
/** Etiqueta do tipo da proposta (serviço, treinamento ou locação), com ícone e cor próprios. */
export function KindBadge({ kind, className }: { kind: ProposalKind; className?: string }) {
  const style = KIND_STYLE[kind] ?? KIND_STYLE.servico;
  return <TagBadge icon={style.icon} color={style.color} className={className}>{KIND_LABEL[kind] ?? kind}</TagBadge>;
}

export const DUE_RULE_OPTIONS: Array<{ id: DueRule; name: string }> = [
  { id: "dias_apos_nf", name: "Dias após a nota fiscal" },
  { id: "dias_apos_aceite", name: "Dias após o aceite" },
  { id: "dias_apos_conclusao", name: "Dias após a conclusão" },
  { id: "data_fixa", name: "Data fixa" },
  { id: "percentual_obra", name: "Ao atingir % da obra" },
];

/** CNPJ (empresa) ou CPF (cliente pessoa física), formatado. */
export const formatCnpj = (cnpj?: string) =>
  cnpj && cnpj.length === 14 ? cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
    : cnpj && cnpj.length === 11 ? cnpj.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")
    : cnpj ?? "";
