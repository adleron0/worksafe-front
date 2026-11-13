import { useQuery } from "@tanstack/react-query";
import api, { get } from "@/services/api";

/** Permissão única do financeiro: quem cuida das contas cuida dos cadastros. */
export const FINANCIAL_ABILITY = "financeiro";

export interface ChartAccount {
  id: number;
  parentId: number | null;
  code: string;
  name: string;
  nature: "receita" | "despesa";
  level: number;
  acceptsEntries: boolean;
  isSystem: boolean;
  dreGroup: string | null;
  inactiveAt: string | null;
  /** filhas visíveis na listagem pedida */
  children: number;
  /** lançamentos e valor, já somando as contas filhas */
  entries: number;
  total: number;
}

export interface CostCenter {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  inactiveAt?: string | null;
  _count?: { financialRecords: number };
}

export type BankAccountType = "corrente" | "poupanca" | "caixa" | "gateway";
export interface BankAccount {
  id: number;
  name: string;
  type: BankAccountType;
  bankCode?: string | null;
  bankName?: string | null;
  agency?: string | null;
  agencyDigit?: string | null;
  account?: string | null;
  accountDigit?: string | null;
  pixKey?: string | null;
  holderName?: string | null;
  holderDocument?: string | null;
  openingBalance: number | string;
  openingBalanceDate?: string | null;
  gateway?: string | null;
  isDefault: boolean;
  inactiveAt?: string | null;
  _count?: { financialRecords: number };
}

export const bankTypeOptions: Array<{ id: BankAccountType; name: string }> = [
  { id: "corrente", name: "Conta corrente" },
  { id: "poupanca", name: "Poupança" },
  { id: "caixa", name: "Caixa (dinheiro)" },
  { id: "gateway", name: "Gateway de pagamento" },
];
export const bankTypeLabel = (type?: string) => bankTypeOptions.find((o) => o.id === type)?.name ?? "-";

export const gatewayOptions = [
  { id: "asaas", name: "Asaas" },
  { id: "infinitePay", name: "InfinitePay" },
];

export const formatMoney = (value?: number | string | null) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));

/** Rotas do financeiro que recebem JSON (o helper padrão envia multipart). */
export const financialApi = {
  post: async <T>(path: string, body?: unknown) => (await api.post<T>(`financial/${path}`, body ?? {})).data,
  put: async <T>(path: string, body?: unknown) => (await api.put<T>(`financial/${path}`, body ?? {})).data,
  patch: async <T>(path: string, body?: unknown) => (await api.patch<T>(`financial/${path}`, body ?? {})).data,
};

export const CHART_KEY = "financialChartAccounts";
export const COST_CENTERS_KEY = "listCentros de Custo";
export const BANK_ACCOUNTS_KEY = "listContas Bancárias";

/** Plano de contas (lista plana ordenada pelo código). */
export function useChartAccounts(options: { month?: string | null; inactive?: boolean; enabled?: boolean } = {}) {
  return useQuery<ChartAccount[] | undefined>({
    queryKey: [CHART_KEY, options.month ?? null, Boolean(options.inactive)],
    queryFn: () => get<ChartAccount[]>("financial", "chart-accounts", [
      ...(options.month ? [{ key: "month", value: options.month }] : []),
      ...(options.inactive ? [{ key: "inactive", value: "true" }] : []),
    ]),
    enabled: options.enabled ?? true,
  });
}

export function useCostCenters(enabled = true) {
  return useQuery<{ rows: CostCenter[]; total: number } | undefined>({
    queryKey: ["optionsCostCenters"],
    queryFn: () => get("financial-cost-centers", "", [
      { key: "limit", value: 100 }, { key: "order-name", value: "asc" }, { key: "active", value: "true" },
    ]),
    enabled,
  });
}

export function useBankAccounts(enabled = true) {
  return useQuery<{ rows: BankAccount[]; total: number } | undefined>({
    queryKey: ["optionsBankAccounts"],
    queryFn: () => get("financial-bank-accounts", "", [
      { key: "limit", value: 100 }, { key: "order-name", value: "asc" }, { key: "active", value: "true" },
    ]),
    enabled,
  });
}

/** Caminho legível: "Receitas › Treinamentos › Turmas fechadas". */
export function accountPath(accounts: ChartAccount[], account: ChartAccount): string {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const names: string[] = [];
  let current: ChartAccount | undefined = account;
  while (current) {
    names.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return names.join(" › ");
}

/** A conta e todas as descendentes (para filtrar lançamentos por conta mãe). */
export function descendantIds(accounts: ChartAccount[], id: number): number[] {
  const root = accounts.find((a) => a.id === id);
  if (!root) return [id];
  return accounts.filter((a) => a.id === id || a.code.startsWith(`${root.code}.`)).map((a) => a.id);
}
