import { useEffect, useState } from "react";
import api from "@/services/api";
import { Input as ShadInput } from "@/components/ui/input";
import { ApiError } from "@/general-interfaces/api.interface";
import { cn } from "@/lib/utils";

export const COMMERCIAL_ABILITY = "comercial";

/** Rotas do Comercial recebem JSON (o helper padrão envia multipart). */
export const commercialApi = {
  get: async <T,>(path: string, params?: Record<string, unknown>) => (await api.get<T>(`commercial/${path}`, { params })).data,
  post: async <T,>(path: string, body?: unknown) => (await api.post<T>(`commercial/${path}`, body ?? {})).data,
  put: async <T,>(path: string, body?: unknown) => (await api.put<T>(`commercial/${path}`, body ?? {})).data,
  patch: async <T,>(path: string, body?: unknown) => (await api.patch<T>(`commercial/${path}`, body ?? {})).data,
};

export const errorMessage = (error: unknown) => {
  const message = (error as ApiError)?.response?.data?.message as string | string[] | undefined;
  return Array.isArray(message) ? message.join(" ") : message || "Erro desconhecido.";
};

// ---------------------------------------------------------------- tipos (espelham a API)

export interface CostParams {
  daysInYear: number; restDays: number; vacationDays: number; holidays: number;
  hoursPerDay: number; idleRate: number; monthsDivisor: number;
  additionalDivisor: number; nightRate: number; travelRate: number; weekendRate: number;
  weekendPerWorker: boolean;
  mealPerDay: number; transportFare: number; transportTrips: number; transportDiscount: number;
  fareDiscountRate: number; headcount: number;
  weeklyHours?: number;
}

export type CostGroup = "encargo" | "pessoal_indireto" | "outro_custo";
export interface CostItem {
  /** só na tela: identifica a linha enquanto ela é editada */
  uid: string;
  group: CostGroup; subgroup: string | null; name: string;
  rate: number | null; amount: number | null; quantity: number;
  withCharges: boolean; kind: "fixo" | "por_pessoa"; isDebt: boolean; endsAt: string | null;
}

export interface BaseResult {
  availableDays: number; hoursYear: number; idleHours: number; workedHoursYear: number;
  A: number; B: number; C: number; mealPerHour: number; transportPerHour: number;
  D: number; indirectMonthly: number; indirectPerWorker: number;
  E: number; otherMonthly: number; otherPerWorker: number;
  debtPerHour: number; debtMonthly: number; overheadPerHour: number;
}

export interface ProfessionalRow {
  id: number; name: string; salary: number; salaryWithCharges: number;
  hourCost: number; nightPerHour: number; travelPerHour: number; weekendPerHour: number;
  parts: { labor: number; benefits: number; indirect: number; other: number; debt: number; fareDiscount: number };
}

export interface Sensitivity { headcount: number; overhead: number; hourCost: number; current: boolean; professional?: string }

export interface Defaults {
  margins: Record<string, number>;
  contingencyLevels: Array<{ label: string; rate: number }>;
  contingencyRate: number;
  commission: { rate: number; base: "faturado" | "lucro"; inPrice: boolean };
}

export interface Computed { result: BaseResult; professionals: ProfessionalRow[]; sensitivity: Sensitivity[] }

export interface CostBase extends Computed {
  id: number; name: string; effectiveFrom: string; notes: string | null; inactiveAt: string | null;
  weeklyHours: number; params: CostParams; defaults: Defaults; items: Array<Omit<CostItem, "uid">>;
}

export interface CostBaseVersion {
  id: number; name: string; effectiveFrom: string; notes: string | null; inactiveAt: string | null;
  headcount: number; additionalDivisor: number; weeklyHours: number; current: boolean;
}

export interface TaxBracket { limit: number; rate: number; deduction: number }
export interface TaxResult {
  regime: "tradicional" | "hibrido"; nominal: number; effective: number; das: number;
  inside: number; outside: number; realInside: number; creditOnNet: number;
}
export interface TaxProfile {
  id: number; name: string; regime: "tradicional" | "hibrido"; effectiveFrom: string;
  mode: "nominal" | "efetiva" | "manual"; rbt12: number; manualRate: number | null;
  ibsCbsShare: number; outsideRate: number; brackets: TaxBracket[];
  isDefault: boolean; notes: string | null; inactiveAt: string | null; current: boolean; tax: TaxResult;
}

export interface PriceTotals {
  cost: number; suggested: number; subtotal: number; contingency: number; net: number;
  taxInside: number; taxOutside: number; tax: number; total: number;
  profit: number; profitRate: number; commission: number; customerCredit: number; customerCost: number;
}
export interface PriceMargin {
  realTax: number; unused: number; unusedRate: number; used: number; usedRate: number;
  minTotal: number; minTotalOperational: number; maxDiscountRate: number;
}
export interface PriceLine { cost: number; suggested: number; value: number; margin: number | null; hourCost?: number; hours?: number }
export interface PriceRun {
  taxProfile: { id: number; name: string; regime: "tradicional" | "hibrido" }; tax: TaxResult;
  sections: Array<{ margin: number; cost: number; suggested: number; value: number; lines: PriceLine[] }>;
  totals: PriceTotals; margin: PriceMargin;
}
export interface PreviewResult extends PriceRun {
  date: string; costBase: { id: number; name: string; headcount: number };
  compare?: { tradicional: PriceRun; hibrido: PriceRun };
}

export const KEYS = { versions: "commercialCostBases", base: "commercialCostBase", tax: "commercialTaxProfiles" };

// ---------------------------------------------------------------- formatação

export const money = (value?: number | null) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
export const decimal = (value?: number | null, digits = 2) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value ?? 0));
export const percent = (value?: number | null, digits = 2) => `${decimal(Number(value ?? 0) * 100, digits)}%`;
export const dateBr = (value?: string | null) => (value ? value.slice(0, 10).split("-").reverse().join("/") : "—");
export const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

let uidSeq = 0;
export const newUid = () => `i${++uidSeq}`;

// ---------------------------------------------------------------- campo numérico

interface NumFieldProps {
  value: number | null | undefined;
  onChange: (value: number) => void;
  /** percent: mostra 46,16 e guarda 0,4616 */
  kind?: "number" | "percent" | "money";
  digits?: number;
  disabled?: boolean;
  className?: string;
  id?: string;
  ariaLabel?: string;
  suffix?: string;
  placeholder?: string;
  /** campo opcional: chamado quando o usuário apaga o conteúdo */
  onEmpty?: () => void;
}

const toText = (value: number | null | undefined, kind: string, digits: number) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "";
  const shown = kind === "percent" ? Number(value) * 100 : Number(value);
  // sem separador de milhar: o campo é editável
  return String(Number(shown.toFixed(kind === "percent" ? Math.max(digits, 4) : digits))).replace(".", ",");
};

/** Campo de número com vírgula decimal. Só propaga quando o texto é um número válido. */
export function NumField({ value, onChange, kind = "number", digits = 2, disabled, className, id, ariaLabel, suffix, placeholder, onEmpty }: NumFieldProps) {
  const [text, setText] = useState(() => toText(value, kind, digits));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(toText(value, kind, digits)); }, [value, kind, digits, focused]);

  const adornment = suffix ?? (kind === "percent" ? "%" : undefined);
  return (
    <div className={cn("relative", className)}>
      {kind === "money" && <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>}
      <ShadInput
        id={id} aria-label={ariaLabel} inputMode="decimal" disabled={disabled} value={text} placeholder={placeholder}
        className={cn("tabular-nums text-right", kind === "money" && "pl-8", adornment && "pr-8")}
        onFocus={(event) => { setFocused(true); event.target.select(); }}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const raw = event.target.value.replace(/[^\d,.-]/g, "");
          setText(raw);
          const parsed = Number(raw.replace(/\./g, "").replace(",", "."));
          if (raw.trim() === "") onEmpty?.();
          else if (Number.isFinite(parsed)) onChange(kind === "percent" ? parsed / 100 : parsed);
        }}
      />
      {adornment && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{adornment}</span>}
    </div>
  );
}

/** Linha de formulário: rótulo à esquerda, campo à direita, ajuda embaixo. */
export function Row({ label, hint, children, htmlFor }: { label: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-2 border-b last:border-b-0">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="w-full sm:w-40 shrink-0">{children}</div>
    </div>
  );
}

/** Resultado calculado (não editável) dentro de uma lista de linhas. */
export function ResultRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-2 border-b last:border-b-0 text-sm", strong && "font-semibold")}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
