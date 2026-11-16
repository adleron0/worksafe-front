import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import useVerify from "@/hooks/use-verify";
import { cn } from "@/lib/utils";
import { decimal } from "../../comercial/-shared/commercial";

/** Estoque (Suprimentos): cliente da API, tipos (espelham a API) e utilitários comuns às telas. */

export const STOCK_ABILITY = "itens_estoque";
export const PERM_MOVE = "movimentar_estoque";
export const PERM_ADJUST = "ajuste_estoque";

/** Rotas do estoque recebem JSON (o helper padrão envia multipart). */
export const stockApi = {
  get: async <T,>(path: string, params?: Record<string, unknown>) => (await api.get<T>(`stock/${path}`, { params })).data,
  post: async <T,>(path: string, body?: unknown) => (await api.post<T>(`stock/${path}`, body ?? {})).data,
  put: async <T,>(path: string, body?: unknown) => (await api.put<T>(`stock/${path}`, body ?? {})).data,
  patch: async <T,>(path: string, body?: unknown) => (await api.patch<T>(`stock/${path}`, body ?? {})).data,
};

export const STOCK_KEYS = {
  options: "stockOptions",
  itemOptions: "stockItemOptions",
  items: "stockItems",
  item: "stockItem",
  kardex: "stockKardex",
  itemPurchases: "stockItemPurchases",
  balances: "stockBalances",
  movements: "stockMovements",
  movement: "stockMovement",
  overview: "stockOverview",
  reorder: "stockReorder",
  categories: "stockCategories",
  locations: "stockLocations",
  order: "stockServiceOrder",
  unitOptions: "stockUnitOptions",
  lotOptions: "stockLotOptions",
  suppliers: "stockSuppliers",
} as const;

// ---------------------------------------------------------------- tipos

export type Tracking = "quantidade" | "lote" | "unidade";
export type HolderType = "local" | "os" | "funcionario" | "locacao" | "fornecedor" | "externo";
export type IdName = { id: number | string; name: string };
/** Só id e nome, no formato que o Select aceita. */
export const toOptions = (rows?: Array<{ id: number | string; name: string }>): IdName[] => (rows ?? []).map(({ id, name }) => ({ id, name }));

export interface ItemPreset {
  tracking: Tracking; returnable: boolean; requiresInspection: boolean; requiresCalibration: boolean; isPpe: boolean;
  inspectionIntervalDays?: number; calibrationIntervalMonths?: number;
}
export interface StockOptions {
  categories: Array<{ id: number; name: string; parentId: number | null; defaults: unknown; inspectionTemplateId: number | null }>;
  locations: Array<{ id: number; name: string; kind: string }>;
  templates: IdName[]; costCenters: IdName[]; users: IdName[]; places: IdName[];
  locationKinds: IdName[]; unitStatuses: IdName[]; movementTypes: IdName[];
  presets: Record<string, ItemPreset>; canSeeCosts: boolean;
}
export interface ItemOption {
  id: number; code: string; name: string; label: string; unit: string; tracking: Tracking; returnable: boolean; isPpe: boolean; rentable: boolean;
  available: number; lastCost: number | null; averageCost: number | null;
}
export interface StockItem {
  id: number; code: string; name: string; description: string | null; categoryId: number | null; category?: string | null;
  manufacturer: string | null; model: string | null; photoUrl: string | null; unit: string; purchaseUnit: string | null; purchaseFactor: number | null;
  tracking: Tracking; returnable: boolean; minQuantity: number | null; reorderQuantity: number | null;
  requiresInspection: boolean; inspectionIntervalDays: number | null; inspectionBeforeUse: boolean; inspectionTemplateId: number | null;
  lifeMonths: number | null; lifeFrom: string | null; warnDays: number | null;
  requiresCalibration: boolean; calibrationIntervalMonths: number | null;
  isPpe: boolean; caNumber: string | null; caExpiry: string | null; caState: DueState | null; replaceEveryDays: number | null;
  rentable: boolean; rentDaily: number | null; rentWeekly: number | null; rentMonthly: number | null; replacementValue: number | null;
  siteProductId: number | null; notes: string | null; active: boolean;
  averageCost: number | null; lastCost: number | null; lastPurchaseAt: string | null;
  inStock: number; out: number; available: number; low: boolean;
}
export type DueState = "vencido" | "a_vencer" | "em_dia";
export interface ItemList { total: number; lowCount: number; value: number | null; rows: StockItem[] }
export interface ItemDetail extends StockItem {
  product: { id: number; name: string; active: boolean } | null;
  balances: Array<{ holderType: HolderType; holderId: number; holder: string; lotId: number | null; lot: string | null; quantity: number }>;
  lots: Array<{ id: number; number: string; manufacturedAt: string | null; expiresAt: string | null; expiryState: DueState | null; status: string; nextInspectionAt: string | null; inspectionState: DueState | null; quantity: number }>;
}
export interface KardexRow {
  id: number; movementId: number; number: string; type: string; typeLabel: string; date: string; from: string; fromType: string; to: string; toType: string;
  quantity: number; unit: string | null; unitCost: number | null; totalCost: number | null; inStockAfter: number;
}
export interface ItemPurchase { id: number; number: string; status: string; supplier: string | null; date: string | null; quantity: number; unit: string | null; unitPrice: number | null; received: number }
export interface BalanceRow {
  itemId: number; code: string; item: string; unit: string; tracking: Tracking; holderType: HolderType; holderId: number; holder: string;
  lotId: number | null; lot: string | null; expiresAt: string | null; quantity: number; value: number | null;
}
export interface MovementRow {
  id: number; number: string; type: string; typeLabel: string; date: string; user: string | null; note: string | null; reversed: boolean; reverses: boolean;
  from: string | null; to: string | null; summary: string; lines: number; total: number | null;
}
export interface Movement {
  id: number; number: string; type: string; typeLabel: string; date: string; note: string | null; user: string | null;
  serviceOrder: { id: number; number: string; title: string } | null; purchaseOrder: { id: number; number: string } | null; employee: { id: number; name: string } | null;
  reason: string | null; reverses: { id: number; number: string } | null; reversedBy: { id: number; number: string } | null;
  signature: { name: string | null; document: string | null; at: string | null; hasImage: boolean } | null; canReverse: boolean;
  lines: Array<{ id: number; itemId: number; item: string; code: string; unit: string; lot: string | null; tag: string | null; unitId: number | null; quantity: number; from: string; to: string; condition: string | null; note: string | null; unitCost: number | null; totalCost: number | null; chargedToOrder: boolean }>;
  total: number | null;
}
export interface Overview {
  low: number; value: number | null; atOrders: number; inspections: number; calibrations: number; outside: number;
  rentalsActive: number; rentalsLate: number; pendingReceipts: number;
}
export interface ReorderRow { id: number; code: string; name: string; unit: string; available: number; min: number; suggested: number; lastCost: number | null; lastSupplierId: number | null; lastSupplier: string | null }
export interface Category { id: number; name: string; parentId: number | null; parent: string | null; fullName: string; prefix: string | null; order: number; items: number; active: boolean }
export interface Location { id: number; name: string; kind: string; kindLabel: string; placeId: number | null; place: string | null; responsibleUserId: number | null; responsible: string | null; notes: string | null; items: number; active: boolean }
export interface OrderStock {
  order: { id: number; number: string; status: string; plannedEnd: string | null };
  atOrder: Array<{ itemId: number; code: string; item: string; unit: string; returnable: boolean; lotId: number | null; lot: string | null; quantity: number }>;
  units: Array<{ id: number; tag: string; itemId: number; item: string; status: string; nextInspectionAt: string | null; nextCalibrationAt: string | null; expiringBeforeEnd: boolean }>;
  movements: Array<{ id: number; number: string; type: string; typeLabel: string; date: string; reversed: boolean; summary: string }>;
  cost: { sent: number; returned: number; lost: number; ppe: number; total: number } | null;
  canMove: boolean;
}
export interface ImportResult { items: number; categories: number; locations: number; lines: number; errors: string[] }

// ---------------------------------------------------------------- rótulos

export const TRACKING_LABEL: Record<Tracking, string> = { quantidade: "Quantidade", lote: "Lote", unidade: "Unidade (peça)" };
export const TRACKING_OPTIONS = (Object.keys(TRACKING_LABEL) as Tracking[]).map((id) => ({ id, name: TRACKING_LABEL[id] }));
export const FLAG_OPTIONS = [
  { id: "epi", name: "EPI" }, { id: "inspecao", name: "Exige inspeção" }, { id: "calibracao", name: "Exige calibração" },
  { id: "alugavel", name: "Alugável" }, { id: "loja", name: "Na loja do site" },
];
export const HOLDER_LABEL: Record<HolderType, string> = { local: "Local de estoque", os: "Obra (OS)", funcionario: "Funcionário", locacao: "Locação", fornecedor: "Fornecedor", externo: "—" };
export const HOLDER_OPTIONS = (["local", "os", "funcionario", "locacao", "fornecedor"] as HolderType[]).map((id) => ({ id, name: HOLDER_LABEL[id] }));
export const PRESET_OPTIONS = [
  { id: "consumivel", name: "Consumível (sai e não volta)" },
  { id: "reutilizavel", name: "Equipamento reutilizável (peça, com inspeção)" },
  { id: "calibravel", name: "Instrumento calibrável (peça, com calibração)" },
  { id: "epi", name: "EPI (entregue ao funcionário)" },
];
/** Lançamentos feitos à mão na tela de Movimentações, com a permissão de cada um. */
export const MANUAL_TYPES = [
  { id: "entrada_avulsa", name: "Entrada avulsa", permission: PERM_MOVE, icon: "package-plus", hint: "Chegou sem pedido de compra (doação, devolução, achado)." },
  { id: "transferencia", name: "Transferência", permission: PERM_MOVE, icon: "arrow-left-right", hint: "De um local de estoque para outro." },
  { id: "consumo_interno", name: "Consumo interno", permission: PERM_MOVE, icon: "package-minus", hint: "Gasto da própria empresa, fora de obra." },
  { id: "venda", name: "Venda", permission: PERM_MOVE, icon: "badge-dollar-sign", hint: "Saída vendida a um cliente (fora da loja do site)." },
  { id: "saldo_inicial", name: "Saldo inicial", permission: PERM_ADJUST, icon: "package-open", hint: "O que já existia antes de usar o sistema." },
  { id: "ajuste", name: "Ajuste", permission: PERM_ADJUST, icon: "sliders-horizontal", hint: "Corrige a diferença (+ ou −) com o motivo." },
] as const;
export type ManualType = (typeof MANUAL_TYPES)[number]["id"];
export const CONDITION_OPTIONS = [
  { id: "ok", name: "Em ordem" }, { id: "sujo", name: "Sujo" }, { id: "avariado", name: "Avariado" }, { id: "faltando", name: "Não voltou" },
];

/** Quantidade com até 3 casas, sem zeros sobrando. */
export const qty = (value?: number | null) => decimal(Number(value ?? 0), Number.isInteger(Number(value ?? 0)) ? 0 : 3).replace(/(,\d*?)0+$/, "$1").replace(/,$/, "");

export function DueBadge({ state, label }: { state: DueState | null; label?: string }) {
  if (!state) return null;
  const text = label ?? (state === "vencido" ? "Vencido" : state === "a_vencer" ? "A vencer" : "Em dia");
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
      state === "vencido" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : state === "a_vencer" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300")}>
      {text}
    </span>
  );
}

export const Pill = ({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "red" | "amber" | "green" }) => (
  <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
    tone === "red" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : tone === "amber" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
      : tone === "green" ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300" : "bg-muted text-muted-foreground")}>{children}</span>
);

// ---------------------------------------------------------------- consultas comuns

/** Quem pode buscar as opções de escolha (locais, itens, peças, lotes): as mesmas permissões da API. */
export const PICKER_PERMISSIONS = ["list_itens_estoque", "movimentar_estoque", "create_pedidos_de_compra", "update_pedidos_de_compra", "create_entregas_epi", "create_locacoes", "update_locacoes", "list_equipamentos", "inspecoes_equipamentos", "update_comercial"];
export function useCanPick() {
  const { can } = useVerify();
  return PICKER_PERMISSIONS.some((permission) => can(permission));
}

/** Opções dos formulários (categorias, locais, centros de custo...): também para quem só movimenta, compra, entrega EPI ou aluga. */
export function useStockOptions(enabled = true) {
  const canPick = useCanPick();
  return useQuery({
    queryKey: [STOCK_KEYS.options],
    queryFn: () => stockApi.get<StockOptions>("options"),
    enabled: enabled && canPick,
    retry: false,
    staleTime: 60_000,
  });
}

/** Lista enxuta para escolher item; com local, `available` é o saldo naquele local. */
export function useItemOptions(locationId?: string | number | null, enabled = true) {
  return useQuery({
    queryKey: [STOCK_KEYS.itemOptions, locationId ? String(locationId) : ""],
    queryFn: () => stockApi.get<ItemOption[]>("items/options", locationId ? { locationId } : undefined),
    enabled,
    retry: false,
    staleTime: 30_000,
  });
}

/** Planilha CSV feita no navegador (separador ;, com BOM para o Excel abrir acentos). */
export function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number | null | undefined>>) {
  const cell = (value: string | number | null | undefined) => {
    const text = typeof value === "number" ? String(value).replace(".", ",") : String(value ?? "");
    return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [header, ...rows].map((row) => row.map(cell).join(";")).join("\r\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------- reposição → pedido de compra

/** A tela de Reposição guarda aqui as linhas do pedido; a do pedido lê com `?reposicao=1` e apaga. */
export const REORDER_STORAGE_KEY = "worksafe.estoque.reposicao";
export interface ReorderDraft {
  supplierId: number | null;
  items: Array<{ description: string; unit: string; quantity: number; unitPrice: number; itemId: number }>;
}
export function readReorderDraft(): ReorderDraft | null {
  try {
    const raw = sessionStorage.getItem(REORDER_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ReorderDraft) : null;
    return parsed && Array.isArray(parsed.items) && parsed.items.length ? parsed : null;
  } catch { return null; }
}
