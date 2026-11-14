import { cn } from "@/lib/utils";

/** Números da carteira de um vendedor (sempre calculados dos lançamentos). */
export interface WalletTotals {
  /** saldo a pagar: comissões liberadas + ajustes − pagamentos (negativo = adiantado) */
  balance: number;
  /** comissões previstas: venda feita, cliente ainda não pagou */
  pending: number;
  paid: number;
  /** comissões liberadas, de toda a história */
  generated: number;
  adjustments: number;
  sales: number;
  lastMovementAt: string | null;
  byOrigin: Record<WalletOrigin, { generated: number; pending: number; sales: number }>;
}
export type WalletOrigin = "treinamento" | "servico" | "manual";
export type EntryType = "comissao" | "pagamento" | "ajuste";
export type EntryStatus = "prevista" | "liberada" | "cancelada" | "efetivado" | "estornado";

export interface SellerRow {
  id: number; name: string; email: string; phone: string | null; imageUrl: string | null; inactiveAt: string | null;
  wallet: WalletTotals;
}
export interface SellersResponse { rows: SellerRow[]; summary: { sellers: number; balance: number; pending: number; paid: number; generated: number } }
export interface SellerCandidate { id: number; name: string; email: string; imageUrl: string | null }

export interface WalletDetail extends WalletTotals {
  seller: { id: number; name: string; email: string; phone: string | null; imageUrl: string | null; isSeller: boolean; inactiveAt: string | null };
  walletId: number; createdAt: string; averageCommission: number;
  lastPayment: { at: string; amount: number } | null;
  months: Array<{ month: string; generated: number; paid: number }>;
}
export interface WalletEntry {
  id: number; type: EntryType; origin: WalletOrigin; status: EntryStatus; amount: number; baseValue: number | null; rate: number | null;
  description: string; occurredAt: string; releasedAt: string | null; financialRecordId: number | null;
  contract: { id: number; number: string } | null; courseClass: { id: number; name: string } | null;
  paymentMethod: string | null; bankAccount: { id: number; name: string } | null; note: string | null; createdBy: string | null;
  reversedAt: string | null; reverseReason: string | null;
}
export interface EntriesResponse { rows: WalletEntry[]; total: number; page: number; limit: number }

export const SELLERS_KEY = "commercialSellers";
export const WALLET_KEY = "commercialSellerWallet";
export const WALLET_ENTRIES_KEY = "commercialSellerWalletEntries";

export const ORIGIN_LABEL: Record<WalletOrigin, string> = { treinamento: "Treinamento", servico: "Serviço", manual: "Manual" };
export const TYPE_LABEL: Record<EntryType, string> = { comissao: "Comissão", pagamento: "Pagamento", ajuste: "Ajuste" };
export const PAYMENT_METHODS: Array<{ id: string; name: string }> = [
  { id: "pix", name: "PIX" }, { id: "transferencia", name: "Transferência" }, { id: "dinheiro", name: "Dinheiro" }, { id: "outro", name: "Outro" },
];
export const paymentLabel = (id: string | null) => PAYMENT_METHODS.find((method) => method.id === id)?.name ?? (id === "asaas" ? "Asaas" : id ?? "");

const STATUS: Record<EntryStatus, { label: string; className: string }> = {
  prevista: { label: "Prevista", className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  liberada: { label: "Liberada", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" },
  cancelada: { label: "Cancelada", className: "bg-muted text-muted-foreground line-through" },
  efetivado: { label: "Efetivado", className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200" },
  estornado: { label: "Estornado", className: "bg-muted text-muted-foreground line-through" },
};
export function EntryStatusBadge({ status }: { status: EntryStatus }) {
  const item = STATUS[status] ?? STATUS.prevista;
  return <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", item.className)}>{item.label}</span>;
}

/** Iniciais para o avatar quando o usuário não tem foto. */
export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
