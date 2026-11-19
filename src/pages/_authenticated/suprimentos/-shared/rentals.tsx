import { cn } from "@/lib/utils";
import { stockApi } from "./stock";

/** Ordem de Locação (OL): tipos (espelham a API), esteira e cliente da API. */

export type RentalStatus = "reservada" | "ativa" | "devolvida" | "encerrada" | "cancelada";
/** Etapa da esteira: a situação gravada mais as datas (a devolver = devolução prevista em até 7 dias). */
export type RentalStage = "a_entregar" | "ativa" | "a_devolver" | "atrasada" | "devolvida" | "encerrada" | "cancelada";
export type RentPeriod = "dia" | "semana" | "mes";

export const RENTALS_ABILITY = "locacoes";
export const RENTAL_KEYS = { list: "stockRentals", one: "stockRental", options: "stockRentalOptions", availability: "stockRentalAvailability" } as const;

/** Rotas da locação (JSON), por baixo de `stock/rentals`. */
export const rentalsApi = {
  get: <T,>(path = "", params?: Record<string, unknown>) => stockApi.get<T>(`rentals${path ? `/${path}` : ""}`, params),
  post: <T,>(path: string, body?: unknown) => stockApi.post<T>(`rentals${path ? `/${path}` : ""}`, body),
  put: <T,>(path: string, body?: unknown) => stockApi.put<T>(`rentals/${path}`, body),
  patch: <T,>(path: string, body?: unknown) => stockApi.patch<T>(`rentals/${path}`, body),
};

export interface RentalRow {
  id: number; number: string; status: RentalStatus; statusLabel: string; stage: RentalStage; stageLabel: string; customer: string; customerId: number;
  contract: { id: number; number: string } | null;
  startDate: string; expectedEnd: string | null; returnedAt: string | null; period: RentPeriod; billing: "periodo" | "unico"; late: boolean; fromContract: boolean;
  summary: string; ratePerPeriod: number; billed: number; toBill: boolean; pendingValue: number; deposit: number | null;
}
export interface RentalList { summary: Partial<Record<RentalStage, number>>; rows: RentalRow[] }
/** O que a próxima medição de uma OL de venda leva (períodos vencidos, avarias, frete). */
export interface PendingLine { kind: string; description: string; periodStart: string; periodEnd: string; value: number; chargeId: number | null }
export interface RentalLine {
  id: number; itemId: number; item: string; code: string; unit: string; tracking: "quantidade" | "lote" | "unidade";
  unitId: number | null; tag: string | null; where: string | null; lotId: number | null; quantity: number; rate: number;
  deliveredQuantity: number; returnedQuantity: number; condition: string | null; damageValue: number | null; replacementValue: number | null;
}
export interface RentalCharge { id: number; kind: string; kindLabel?: string; periodStart: string; periodEnd: string; value: number; description: string | null; financialRecordId: number | null; measurementId?: number | null; recordStatus: string | null }
export interface Rental {
  id: number; number: string; status: RentalStatus; statusLabel: string; nextStatuses: RentalStatus[]; stage: RentalStage; stageLabel: string;
  customer: { id: number; name: string } | null; contract: { id: number; number: string; title?: string; billingMode?: string; status?: string } | null; serviceOrder: { id: number; number: string } | null; proposalId: number | null;
  startDate: string; expectedEnd: string | null; deliveredAt: string | null; returnedAt: string | null;
  billing: "periodo" | "unico"; period: RentPeriod; periodLabel: string; billedUntil: string | null;
  deliveryAddress: string | null; responsibleName: string | null; terms: string | null; deposit: number | null; notes: string | null; statusNote: string | null; late: boolean;
  lines: RentalLine[]; ratePerPeriod: number; charges: RentalCharge[]; nextPeriod: { start: string; end: string } | null; fromContract: boolean; periods: number | null;
  pending: PendingLine[]; pendingValue: number; openPeriod: { start: string; end: string } | null;
  measurements: Array<{ id: number; number: number; label: string; periodStart: string | null; periodEnd: string | null; value: number; invoiceNumber: string | null; financialRecordId: number | null; recordStatus: string | null; dueDate: string | null }>;
  depositState: { chargeId: number; value: number; financialRecordId: number | null; received: boolean; abated: number; returned: number; payableId: number | null; settled: boolean; left: number } | null;
  reminders: Array<{ id: number; subject: string; dueDate: string | null }>;
  movements: Array<{ id: number; number: string; type: string; typeLabel: string; date: string; reversed: boolean; signed: boolean; signedBy: string | null }>;
  events: Array<{ id: number; type: string; from: RentalStatus | null; to: RentalStatus | null; note: string | null; at: string; user: string | null }>;
}
export interface RentalOptions {
  customers: Array<{ id: number; name: string }>; locations: Array<{ id: number; name: string }>;
  items: Array<{ id: number; name: string; tracking: "quantidade" | "lote" | "unidade"; unit: string; rent: Record<RentPeriod, number | null> }>;
  units: Array<{ id: number; name: string; itemId: number; available: boolean }>;
  periods: Array<{ id: RentPeriod; name: string }>;
}
export interface Availability {
  from: string; to: string;
  rows: Array<{ unitId: number; tag: string; item: string; itemId: number; status: string; where: string; bars: Array<{ kind: "locacao" | "reserva" | "obra" | "servico" | "vencimento"; label: string; start: string; end: string; rentalId: number | null }> }>;
}

/** A esteira da OL, na ordem do quadro; cancelada fica fora. */
export const RENTAL_STAGES: Array<{ id: RentalStage; name: string; color: string; hint: string }> = [
  { id: "a_entregar", name: "A entregar", color: "#f59e0b", hint: "Venda fechada; o equipamento ainda está no estoque" },
  { id: "ativa", name: "Ativa", color: "#3b82f6", hint: "Com o cliente; os períodos vencidos vão para o A Faturar" },
  { id: "a_devolver", name: "A devolver", color: "#8b5cf6", hint: "Devolução prevista nos próximos 7 dias: combinar a retirada ou a prorrogação" },
  { id: "atrasada", name: "Atrasada", color: "#ef4444", hint: "Passou da devolução prevista e ainda está com o cliente" },
  { id: "devolvida", name: "Devolvida", color: "#14b8a6", hint: "Voltou; falta faturar o que sobrou, acertar a caução e encerrar" },
  { id: "encerrada", name: "Encerrada", color: "#22c55e", hint: "Tudo devolvido, cobrado e acertado" },
];
/** Etapas da ficha (a linha do tempo não mostra "a devolver"/"atrasada", que são avisos da etapa ativa). */
export const RENTAL_STEPS: Array<{ id: RentalStatus; name: string; hint: string }> = [
  { id: "reservada", name: "A entregar", hint: "Venda fechada; o equipamento ainda está no estoque" },
  { id: "ativa", name: "Ativa", hint: "Com o cliente" },
  { id: "devolvida", name: "Devolvida", hint: "Voltou; falta faturar o que sobrou e acertar a caução" },
  { id: "encerrada", name: "Encerrada", hint: "Tudo devolvido, cobrado e acertado" },
];
export const RENTAL_STATUS_LABEL: Record<RentalStatus, string> = { reservada: "A entregar", ativa: "Ativa", devolvida: "Devolvida", encerrada: "Encerrada", cancelada: "Cancelada" };
export const RENTAL_STAGE_LABEL: Record<RentalStage, string> = { a_entregar: "A entregar", ativa: "Ativa", a_devolver: "A devolver", atrasada: "Atrasada", devolvida: "Devolvida", encerrada: "Encerrada", cancelada: "Cancelada" };
export const PERIOD_LABEL: Record<RentPeriod, string> = { dia: "dia", semana: "semana", mes: "mês" };
export const CHARGE_LABEL: Record<string, string> = { aluguel: "Aluguel", avaria: "Avaria", falta: "Falta", frete: "Frete", avulso: "Avulso", caucao: "Caução", abatimento: "Caução abatida" };

export function RentalStageBadge({ stage }: { stage: RentalStage }) {
  const color = RENTAL_STAGES.find((item) => item.id === stage)?.color ?? "#6b7280";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded bg-muted px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", stage === "cancelada" && "line-through text-muted-foreground", stage === "atrasada" && "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300")}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /> {RENTAL_STAGE_LABEL[stage]}
    </span>
  );
}
