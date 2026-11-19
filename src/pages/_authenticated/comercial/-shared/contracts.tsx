import { cn } from "@/lib/utils";
import { CustomerOption, DueRule, ProposalKind } from "./proposals";
import type { RetentionRates } from "./retentions";

/** Pedido de compra que o cliente manda para confirmar o aceite. */
export interface CustomerOrder { number: string | null; date: string | null; fileUrl: string | null; fileName: string | null }

export type ContractStatus = "vigente" | "concluido" | "cancelado";

export interface ContractRow {
  id: number; number: string; kind: ProposalKind; status: ContractStatus; title: string; value: number; acceptedAt: string; proposalId: number;
  customer: { id: number; name: string }; installments: number; billed: number; received: number; toBill: number;
}

export interface ContractInstallment {
  id: number; number: number; total: number; description: string | null; value: number;
  dueRule: DueRule; dueDate: string | null; dueDays: number | null; suggestedDue: string;
  record: { id: number; status: string; dueDate: string | null; paidAt: string | null; invoiceNumber: string | null; invoiceIssuedAt: string | null; hasInvoiceFile: boolean; paid: boolean; netValue?: number | null } | null;
}

export interface ContractClassSlot {
  index: number; courseId: number | null; description: string; quantity: number; students: number | null; workload: number | null; dates: string; location: string;
  classIds: number[]; classes: Array<{ id: number; name: string; initialDate: string | null; inactiveAt: string | null }>;
}

export interface Contract {
  id: number; number: string; kind: ProposalKind; status: ContractStatus; title: string; value: number; acceptedAt: string;
  startDate: string | null; endDate: string | null; notes: string | null; statusNote: string | null; customerOrder: CustomerOrder; serviceOrder?: { id: number; number: string; status: string } | null;
  customer: CustomerOption; proposal: { id: number; number: string } | null; documentHash: string | null; hasDocument: boolean;
  signer: { name?: string; cpf?: string; role?: string; email?: string; ip?: string; userAgent?: string; at?: string; codeVerified?: boolean; manual?: boolean; note?: string } | null;
  billed: number; received: number; toBill: number;
  /** parcelas (parcelas fixas da proposta) | periodo (locação: cobrada por medição) */
  billingMode?: "parcelas" | "periodo" | "medicao";
  /** alíquotas que o cliente costuma reter na nota, em % (sugestão ao faturar) */
  retentionRates?: RetentionRates;
  /** locação: as ordens de locação e o que cada uma tem para faturar agora */
  rentals?: ContractRental[];
  measurements?: ContractMeasurement[];
  installments: ContractInstallment[]; classes: ContractClassSlot[];
  /** turmas ligadas pela própria turma, fora dos itens de treinamento */
  otherClasses?: ContractClassSlot["classes"];
}

export interface ContractRental {
  id: number; number: string; status: string; startDate: string | null; expectedEnd: string | null; returnedAt: string | null; billing: "periodo" | "unico"; period: "dia" | "semana" | "mes";
  billedUntil: string | null; ratePerPeriod: number; pendingValue: number; openPeriod: { start: string; end: string } | null;
  pending: Array<{ kind: string; description: string; periodStart: string; periodEnd: string; value: number; chargeId: number | null }>;
}
export interface ContractMeasurement {
  id: number; number: number; label: string; source: string; rentalId: number | null; rentalNumber: string | null; periodStart: string | null; periodEnd: string | null; value: number;
  lines: Array<{ kind: string; description: string; periodStart: string | null; periodEnd: string | null; value: number }>; summary: string;
  record: ContractInstallment["record"];
}

/** Uma parcela (ou medição de locação) na fila "A faturar" do Financeiro. */
export type BillingStage = "aguardando" | "liberada" | "faturada" | "recebida";
export interface BillingRow extends Omit<ContractInstallment, "id"> {
  /** parcela: o id dela; medição: "ol-<OL>" (a faturar), "op-<OL>" (período em curso) ou "bm-<medição>" */
  id: number | string;
  source?: "parcela" | "medicao";
  rental?: { id: number; number: string | null } | null; measurementId?: number;
  lines?: Array<{ kind: string; description: string; periodStart: string | null; periodEnd: string | null; value: number }>;
  stage: BillingStage; contractId: number; contractNumber: string; contractStatus: ContractStatus; kind: ProposalKind; title: string;
  proposal: { id: number; number: string } | null; customer: { id: number; name: string }; waitingFor: string | null; customerOrder: CustomerOrder;
  retentionRates?: RetentionRates;
}
export interface BillingQueue { rows: BillingRow[]; summary: Record<BillingStage, { count: number; total: number }>; recentDays: number }
export const BILLING_KEY = "commercialBilling";

export const CONTRACTS_KEY = "commercialContracts";
export const CONTRACT_KEY = "commercialContract";

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = { vigente: "Vigente", concluido: "Concluído", cancelado: "Cancelado" };
const CLASSES: Record<ContractStatus, string> = {
  vigente: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  concluido: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  cancelado: "bg-muted text-muted-foreground line-through",
};
export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", CLASSES[status])}>{CONTRACT_STATUS_LABEL[status]}</span>;
}

/** Regra de vencimento combinada na proposta, em texto. */
export function dueRuleText(installment: Pick<ContractInstallment, "dueRule" | "dueDate" | "dueDays">): string {
  if (installment.dueRule === "data_fixa") return `em ${installment.dueDate?.split("-").reverse().join("/") ?? "data a definir"}`;
  const days = installment.dueDays ?? 0;
  const event = installment.dueRule === "dias_apos_aceite" ? "o aceite" : installment.dueRule === "dias_apos_conclusao" ? "a conclusão" : "a nota fiscal";
  return days === 0 ? `n${event}` : `${days} dia${days === 1 ? "" : "s"} após ${event}`;
}

export const PAYMENT_METHOD_OPTIONS = [
  { id: "boleto", name: "Boleto" }, { id: "pix", name: "Pix" }, { id: "transferencia", name: "Transferência" },
  { id: "cartaoCredito", name: "Cartão de crédito" }, { id: "dinheiro", name: "Dinheiro" }, { id: "outro", name: "Outro / a definir" },
];

export const RECORD_STATUS_LABEL: Record<string, string> = {
  waiting: "Em aberto", processing: "Processando", received: "Recebido", overdue: "Vencido", cancelled: "Cancelado", declined: "Recusado", chargeback: "Estornado",
};
