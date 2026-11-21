import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";

export interface Supplier {
  id: number;
  name: string;
  legalName?: string | null;
  document?: string | null;
  supplies?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  pixKey?: string | null;
  bankName?: string | null;
  agency?: string | null;
  account?: string | null;
  notes?: string | null;
  zipcode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  inactiveAt?: string | null;
  _count?: { payables: number };
}

export type PayableStatus = "aberta" | "paga";
export interface Payable {
  id: number;
  description: string;
  value: number | string;
  dueDate: string;
  accrualDate: string;
  status: PayableStatus;
  documentNumber?: string | null;
  paymentMethod?: string | null;
  taxKind?: string | null;
  installmentNumber?: number | null;
  installmentTotal?: number | null;
  origin: string;
  supplierId?: number | null;
  supplier?: { id: number; name: string; document?: string | null; pixKey?: string | null } | null;
  serviceOrderId?: number | null;
  serviceOrder?: { id: number; number: string } | null;
  chartAccountId?: number | null;
  chartAccount?: { id: number; code: string; name: string } | null;
  costCenterId?: number | null;
  costCenter?: { id: number; name: string } | null;
  bankAccount?: { id: number; name: string } | null;
  paidAt?: string | null;
  paidValue?: number | string | null;
  billUrl?: string | null;
  invoiceUrl?: string | null;
  receiptUrl?: string | null;
  observations?: string | null;
  inactiveAt?: string | null;
  groupKey?: string | null;
  barcode?: string | null;
  pixCode?: string | null;
  interestValue?: number | string | null;
  fineValue?: number | string | null;
  discountValue?: number | string | null;
  recurrenceId?: number | null;
  recurrence?: { id: number; inactiveAt?: string | null; endDate?: string | null } | null;
  statementRef?: string | null;
}

interface Bucket { count: number; total: number }
export interface PayableSummary { today: string; overdue: Bucket; dueToday: Bucket; dueWeek: Bucket; later: Bucket; paid: Bucket; open?: Bucket; paidPeriod?: string }
export interface PayableList { today: string; view: string; rows: Payable[]; total: number; summary: PayableSummary }

export const PAYABLES_KEY = "listContas a Pagar";
export const PAYABLES_SUMMARY_KEY = "financialPayablesSummary";
export const SUPPLIER_OPTIONS_KEY = "optionsSuppliers";

/** Quando vence, olhando só o dia: a API não grava "atrasada", é conta aberta com vencimento passado. */
export type DueState = "atrasada" | "hoje" | "aberta" | "paga";
export function dueState(item: Pick<Payable, "status" | "dueDate">, today: string): DueState {
  if (item.status === "paga") return "paga";
  const due = item.dueDate.slice(0, 10);
  return due < today ? "atrasada" : due === today ? "hoje" : "aberta";
}

export const DUE_LABEL: Record<DueState, { text: string; className: string }> = {
  atrasada: { text: "Atrasada", className: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300" },
  hoje: { text: "Vence hoje", className: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" },
  aberta: { text: "A vencer", className: "bg-muted text-foreground" },
  paga: { text: "Paga", className: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300" },
};

/** Soma dias a uma data AAAA-MM-DD. */
export function plusDays(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const formatDocument = (value?: string | null) => {
  const d = (value ?? "").replace(/\D/g, "");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return value ?? "";
};

export function useSuppliers(enabled = true) {
  return useQuery<{ rows: Supplier[]; total: number } | undefined>({
    queryKey: [SUPPLIER_OPTIONS_KEY],
    queryFn: () => get("financial-suppliers", "", [
      { key: "limit", value: 500 }, { key: "order-name", value: "asc" }, { key: "active", value: "true" },
    ]),
    enabled,
  });
}
