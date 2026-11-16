import { cn } from "@/lib/utils";
import { stockApi } from "./stock";

/** Locação de equipamento próprio a clientes: tipos (espelham a API), etapas e cliente da API. */

export type RentalStatus = "reservada" | "ativa" | "devolvida" | "encerrada" | "cancelada";
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
  id: number; number: string; status: RentalStatus; statusLabel: string; customer: string; customerId: number;
  startDate: string; expectedEnd: string | null; returnedAt: string | null; period: RentPeriod; late: boolean; fromContract: boolean;
  summary: string; ratePerPeriod: number; billed: number; toBill: boolean;
}
export interface RentalList { summary: Partial<Record<RentalStatus, number>>; rows: RentalRow[] }
export interface RentalLine {
  id: number; itemId: number; item: string; code: string; unit: string; tracking: "quantidade" | "lote" | "unidade";
  unitId: number | null; tag: string | null; where: string | null; lotId: number | null; quantity: number; rate: number;
  deliveredQuantity: number; returnedQuantity: number; condition: string | null; damageValue: number | null; replacementValue: number | null;
}
export interface RentalCharge { id: number; kind: string; periodStart: string; periodEnd: string; value: number; description: string | null; financialRecordId: number | null; recordStatus: string | null }
export interface Rental {
  id: number; number: string; status: RentalStatus; statusLabel: string; nextStatuses: RentalStatus[];
  customer: { id: number; name: string } | null; contract: { id: number; number: string } | null; serviceOrder: { id: number; number: string } | null; proposalId: number | null;
  startDate: string; expectedEnd: string | null; deliveredAt: string | null; returnedAt: string | null;
  billing: "periodo" | "unico"; period: RentPeriod; periodLabel: string; billedUntil: string | null;
  deliveryAddress: string | null; responsibleName: string | null; terms: string | null; deposit: number | null; notes: string | null; statusNote: string | null; late: boolean;
  lines: RentalLine[]; ratePerPeriod: number; charges: RentalCharge[]; nextPeriod: { start: string; end: string } | null; fromContract: boolean;
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

/** As etapas na ordem do quadro; cancelada fica fora. */
export const RENTAL_STAGES: Array<{ id: RentalStatus; name: string; color: string; hint: string }> = [
  { id: "reservada", name: "Reservada", color: "#f59e0b", hint: "Combinada com o cliente; o equipamento ainda está no estoque" },
  { id: "ativa", name: "Ativa", color: "#3b82f6", hint: "Com o cliente; os períodos vão sendo faturados" },
  { id: "devolvida", name: "Devolvida", color: "#8b5cf6", hint: "Voltou; falta faturar o que sobrou e encerrar" },
  { id: "encerrada", name: "Encerrada", color: "#22c55e", hint: "Tudo devolvido e cobrado" },
];
export const RENTAL_STATUS_LABEL: Record<RentalStatus, string> = { reservada: "Reservada", ativa: "Ativa", devolvida: "Devolvida", encerrada: "Encerrada", cancelada: "Cancelada" };
export const PERIOD_LABEL: Record<RentPeriod, string> = { dia: "dia", semana: "semana", mes: "mês" };
export const CHARGE_LABEL: Record<string, string> = { aluguel: "Aluguel", avaria: "Avaria", falta: "Falta" };

export function RentalStageBadge({ status, late }: { status: RentalStatus; late?: boolean }) {
  const color = RENTAL_STAGES.find((stage) => stage.id === status)?.color ?? "#6b7280";
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("inline-flex items-center gap-1.5 rounded bg-muted px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", status === "cancelada" && "line-through text-muted-foreground")}>
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /> {RENTAL_STATUS_LABEL[status]}
      </span>
      {late && <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300 whitespace-nowrap">Atrasada</span>}
    </span>
  );
}
