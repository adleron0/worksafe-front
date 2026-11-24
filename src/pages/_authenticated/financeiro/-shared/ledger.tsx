import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import api, { get } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import QuickFilter from "@/components/general-components/QuickFilter";
import { ApiError } from "@/general-interfaces/api.interface";
import { cn } from "@/lib/utils";
import AccountSelect from "./AccountSelect";
import { formatMoney, useBankAccounts, useChartAccounts, useCostCenters } from "./financial";
import { plusDays, useSuppliers } from "./payables";
import { formatDate, paymentMethodOptions, todayInput } from "../_receber/-components/options";

/* ------------------------------------------------------------------ filtros na URL */

export type Filters = Record<string, string>;
export type LedgerKind = "payable" | "receivable";

/**
 * Filtros guardados na URL: voltar para a tela, atualizar a página ou mandar
 * o link para alguém mantém o mesmo recorte.
 */
export function useUrlFilters(defaults: Filters = {}) {
  const raw = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();
  const filters = useMemo(() => {
    const out: Filters = { ...defaults };
    for (const [key, value] of Object.entries(raw ?? {})) if (value !== undefined && value !== null && value !== "") out[key] = String(value);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(raw)]);
  const replace = (next: Filters) => {
    const clean: Filters = {};
    for (const [key, value] of Object.entries(next)) if (value !== undefined && value !== null && value !== "" && defaults[key] !== value) clean[key] = value;
    navigate({ search: clean as never, replace: true } as never);
  };
  const set = (patch: Partial<Filters>, keepPage = false) => {
    const next: Filters = { ...filters };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === "") delete next[key]; else next[key] = value;
    }
    if (!keepPage) delete next.page;
    replace(next);
  };
  return { filters, set, replace, clear: (keep: string[] = []) => replace(Object.fromEntries(keep.filter((k) => filters[k]).map((k) => [k, filters[k]]))) };
}

/** Converte os filtros em parâmetros de consulta (o que começa com `ui-` fica só na tela). */
export const toParams = (filters: Filters) => Object.entries(filters).filter(([key, value]) => !key.startsWith("ui-") && value !== "").map(([key, value]) => ({ key, value }));

/* ------------------------------------------------------------------ períodos rápidos */

const monthBounds = (offset: number) => {
  const today = todayInput();
  const [year, month] = today.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 + offset, 1));
  const last = new Date(Date.UTC(year, month + offset, 0));
  return [first.toISOString().slice(0, 10), last.toISOString().slice(0, 10)];
};
export const QUICK_RANGES: Array<{ id: string; label: string; range: () => [string, string] }> = [
  { id: "hoje", label: "Hoje", range: () => [todayInput(), todayInput()] },
  { id: "7dias", label: "Próximos 7 dias", range: () => [todayInput(), plusDays(todayInput(), 7)] },
  { id: "30dias", label: "Próximos 30 dias", range: () => [todayInput(), plusDays(todayInput(), 30)] },
  { id: "mes", label: "Este mês", range: () => monthBounds(0) as [string, string] },
  { id: "passado", label: "Mês passado", range: () => monthBounds(-1) as [string, string] },
  { id: "proximo", label: "Próximo mês", range: () => monthBounds(1) as [string, string] },
];

/**
 * Filtro rápido de vencimento (no padrão do QuickFilter das Turmas): os recortes
 * mais usados num clique, sem abrir o painel. Um período escolhido no painel
 * que não é nenhum destes aparece como "Personalizado".
 */
const PERIOD_IDS = ["passado", "mes", "proximo", "30dias"];
export function DueQuickFilter({ filters, onChange }: { filters: Filters; onChange: (patch: Partial<Filters>) => void }) {
  const quick = PERIOD_IDS.map((id) => QUICK_RANGES.find((q) => q.id === id)!);
  const match = quick.find((q) => { const [a, b] = q.range(); return filters.dueFrom === a && filters.dueTo === b; });
  const custom = !match && !!(filters.dueFrom || filters.dueTo);
  const options = [
    { value: "todos", label: "Todos" },
    ...quick.map((q) => ({ value: q.id, label: q.label })),
    ...(custom ? [{ value: "outro", label: "Personalizado" }] : []),
  ];
  return (
    <QuickFilter label="Vencimento" options={options} value={match?.id ?? (custom ? "outro" : "todos")}
      onChange={(id) => {
        if (id === "outro") return;
        if (id === "todos") return onChange({ dueFrom: "", dueTo: "" });
        const [a, b] = QUICK_RANGES.find((q) => q.id === id)!.range();
        onChange({ dueFrom: a, dueTo: b });
      }} />
  );
}

function RangeField({ label, from, to, onChange, quick }: { label: string; from?: string; to?: string; onChange: (from: string, to: string) => void; quick: string[] }) {
  const value = from || to ? `${from ?? ""}|${to ?? ""}` : null;
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1">
        <CalendarPicker mode="range" name={label} value={value} numberOfMonths={1} placeholder="Qualquer data"
          onValueChange={(_, next) => { const [a, b] = (next ?? "|").split("|"); onChange(a ?? "", b ?? ""); }} />
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {QUICK_RANGES.filter((q) => quick.includes(q.id)).map((q) => {
          const [a, b] = q.range();
          const active = from === a && to === b;
          return (
            <button key={q.id} type="button" onClick={() => (active ? onChange("", "") : onChange(a, b))}
              className={cn("rounded-full border px-2 py-0.5 text-xs transition-colors", active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted")}>
              {q.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ opções dos filtros */

export const PAYABLE_ORIGINS = [
  { id: "manual", name: "Lançamento manual" },
  { id: "pedido_compra", name: "Pedido de compra" },
  { id: "recorrencia", name: "Recorrente" },
];
export const RECEIVABLE_ORIGINS = [
  { id: "inscricao", name: "Inscrição em turma" },
  { id: "contrato", name: "Contrato" },
  { id: "manual", name: "Lançamento manual" },
  { id: "recorrencia", name: "Recorrente" },
];
export const RECEIVABLE_STATUS = [
  { id: "waiting", name: "Aguardando" }, { id: "processing", name: "Processando" }, { id: "overdue", name: "Vencido (gateway)" },
  { id: "received", name: "Recebido" }, { id: "cancelled", name: "Cancelado" }, { id: "declined", name: "Recusado" }, { id: "chargeback", name: "Estorno" },
];
export const GATEWAY_OPTIONS = [{ id: "manual", name: "Manual" }, { id: "asaas", name: "Asaas" }, { id: "infinitePay", name: "InfinitePay" }];
const YES_NO = (yes: string, no: string) => [{ id: "com", name: yes }, { id: "sem", name: no }];

export function useCustomerOptions(enabled = true) {
  return useQuery<{ rows: Array<{ id: number; name: string }> } | undefined>({
    queryKey: ["optionsCustomers"],
    queryFn: () => get("customer", "", [{ key: "limit", value: 100 }, { key: "order-name", value: "asc" }]),
    enabled,
  });
}

const csv = (value?: string) => (value ? value.split(",").filter(Boolean) : []);
const joinCsv = (value: string | string[]) => (Array.isArray(value) ? value.filter(Boolean).join(",") : value ?? "");

/* ------------------------------------------------------------------ painel de filtros */

/** Campos do painel "Filtros" (abre de lado). Só aplica ao clicar em Aplicar. */
export function FilterPanel({ kind, filters, onApply, onClear, close }: {
  kind: LedgerKind; filters: Filters; onApply: (patch: Filters) => void; onClear: () => void; close: () => void;
}) {
  const [draft, setDraft] = useState<Filters>(() => ({ ...filters }));
  const set = (key: string, value: string | string[] | number | null) => setDraft((prev) => ({ ...prev, [key]: value === null ? "" : Array.isArray(value) ? joinCsv(value) : String(value) }));
  const setPair = (a: string, b: string) => (from: string, to: string) => setDraft((prev) => ({ ...prev, [a]: from, [b]: to }));
  const { data: accounts } = useChartAccounts();
  const { data: centers } = useCostCenters();
  const { data: banks } = useBankAccounts();
  const { data: suppliers } = useSuppliers(kind === "payable");
  const { data: customers } = useCustomerOptions(kind === "receivable");
  const paidLabel = kind === "payable" ? "Pagamento" : "Recebimento";

  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    const patch: Filters = {};
    for (const key of FILTER_KEYS) patch[key] = draft[key] ?? "";
    onApply(patch);
    close();
  };

  return (
    <form onSubmit={apply} className="flex flex-col gap-4 mt-4">
      <RangeField label="Vencimento" from={draft.dueFrom} to={draft.dueTo} onChange={setPair("dueFrom", "dueTo")} quick={["hoje", "7dias", "30dias", "mes", "proximo"]} />
      <RangeField label={paidLabel} from={draft.paidFrom} to={draft.paidTo} onChange={setPair("paidFrom", "paidTo")} quick={["hoje", "mes", "passado"]} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Competência de</Label>
          <CalendarPicker mode="month" name="accrualFrom" value={draft.accrualFrom || null} onValueChange={(_, v) => set("accrualFrom", v)} placeholder="Início" fromYear={2020} toYear={2035} />
        </div>
        <div>
          <Label>até</Label>
          <CalendarPicker mode="month" name="accrualTo" value={draft.accrualTo || null} onValueChange={(_, v) => set("accrualTo", v)} placeholder="Fim" fromYear={2020} toYear={2035} />
        </div>
      </div>

      {kind === "payable" ? (
        <div>
          <Label>Fornecedor</Label>
          <Select name="supplierId" options={(suppliers?.rows ?? []) as never[]} state={csv(draft.supplierId)} onChange={set} placeholder="Todos" multiple modal />
        </div>
      ) : (
        <div>
          <Label>Cliente</Label>
          <Select name="customerId" options={(customers?.rows ?? []) as never[]} state={csv(draft.customerId)} onChange={set} placeholder="Todos" multiple modal />
        </div>
      )}

      <div>
        <Label>Conta do plano</Label>
        <AccountSelect accounts={accounts ?? []} value={draft.chartAccountId ?? ""} mode="any" nature={kind === "payable" ? "despesa" : "receita"} clearable
          onChange={(value) => set("chartAccountId", value)} placeholder="Todas (conta mãe inclui as filhas)" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Centro de custo</Label>
          <Select name="costCenterId" options={(centers?.rows ?? []) as never[]} state={csv(draft.costCenterId)} onChange={set} placeholder="Todos" multiple modal />
        </div>
        <div>
          <Label>{kind === "payable" ? "Conta de saída" : "Conta de entrada"}</Label>
          <Select name="bankAccountId" options={(banks?.rows ?? []) as never[]} state={csv(draft.bankAccountId)} onChange={set} placeholder="Todas" multiple modal />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Forma de pagamento</Label>
          <Select name="paymentMethod" options={paymentMethodOptions} state={csv(draft.paymentMethod)} onChange={set} placeholder="Todas" multiple modal />
        </div>
        <div>
          <Label>Origem</Label>
          <Select name="origin" options={kind === "payable" ? PAYABLE_ORIGINS : RECEIVABLE_ORIGINS} state={csv(draft.origin)} onChange={set} placeholder="Todas" multiple modal />
        </div>
      </div>
      {kind === "receivable" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Situação no gateway</Label>
            <Select name="status" options={RECEIVABLE_STATUS} state={csv(draft.status)} onChange={set} placeholder="Todas" multiple modal />
          </div>
          <div>
            <Label>Cobrança</Label>
            <Select name="gateway" options={GATEWAY_OPTIONS} state={csv(draft.gateway)} onChange={set} placeholder="Todas" multiple modal />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Valor de</Label>
          <Input name="minValue" format="currency" value={Number(draft.minValue || 0)} onValueChange={(_, v) => set("minValue", Number(v) ? String(v) : "")} className="mt-1" />
        </div>
        <div>
          <Label>até</Label>
          <Input name="maxValue" format="currency" value={Number(draft.maxValue || 0)} onValueChange={(_, v) => set("maxValue", Number(v) ? String(v) : "")} className="mt-1" />
        </div>
      </div>
      <div>
        <Label>{kind === "payable" ? "Comprovante" : "Nota fiscal"}</Label>
        <Select name={kind === "payable" ? "receipt" : "invoice"}
          options={kind === "payable" ? YES_NO("Com comprovante", "Sem comprovante") : YES_NO("Com nota fiscal", "Sem nota fiscal")}
          state={draft[kind === "payable" ? "receipt" : "invoice"] ?? ""} onChange={set} placeholder="Tanto faz" clearable modal />
      </div>
      <div className="flex gap-2 sticky bottom-0 bg-background py-2">
        <Button type="submit" className="flex-1">Aplicar filtros</Button>
        <Button type="button" variant="outline" className="flex-1" onClick={() => { onClear(); close(); }}>Limpar</Button>
      </div>
    </form>
  );
}

const FILTER_KEYS = ["dueFrom", "dueTo", "paidFrom", "paidTo", "accrualFrom", "accrualTo", "supplierId", "customerId", "chartAccountId", "costCenterId",
  "bankAccountId", "paymentMethod", "origin", "status", "gateway", "minValue", "maxValue", "receipt", "invoice"];
export const countFilters = (filters: Filters) => {
  const pairs = [["dueFrom", "dueTo"], ["paidFrom", "paidTo"], ["accrualFrom", "accrualTo"], ["minValue", "maxValue"]];
  const inPairs = pairs.flat();
  return FILTER_KEYS.filter((k) => !inPairs.includes(k) && filters[k]).length + pairs.filter(([a, b]) => filters[a] || filters[b]).length;
};

/* ------------------------------------------------------------------ chips dos filtros ativos */

/** Os filtros aplicados, em etiquetas que se removem uma a uma. */
export function ActiveFilters({ kind, filters, onRemove, onClear }: { kind: LedgerKind; filters: Filters; onRemove: (keys: string[]) => void; onClear: () => void }) {
  const { data: accounts } = useChartAccounts();
  const { data: centers } = useCostCenters();
  const { data: banks } = useBankAccounts();
  const { data: suppliers } = useSuppliers(kind === "payable");
  const { data: customers } = useCustomerOptions(kind === "receivable");
  const names = (list: Array<{ id: number | string; name: string }> | undefined, value: string) => csv(value).map((id) => list?.find((o) => String(o.id) === id)?.name ?? id).join(", ");
  const period = (a?: string, b?: string) => (a && b ? (a === b ? formatDate(a) : `${formatDate(a)} a ${formatDate(b)}`) : a ? `a partir de ${formatDate(a)}` : `até ${formatDate(b)}`);
  const monthText = (m?: string) => (m ? `${m.slice(5, 7)}/${m.slice(0, 4)}` : "");
  const chips: Array<{ keys: string[]; label: string }> = [];
  if (filters.q) chips.push({ keys: ["q"], label: `Busca: “${filters.q}”` });
  if (filters.dueFrom || filters.dueTo) chips.push({ keys: ["dueFrom", "dueTo"], label: `Vencimento ${period(filters.dueFrom, filters.dueTo)}` });
  if (filters.paidFrom || filters.paidTo) chips.push({ keys: ["paidFrom", "paidTo"], label: `${kind === "payable" ? "Pagas" : "Recebidas"} ${period(filters.paidFrom, filters.paidTo)}` });
  if (filters.accrualFrom || filters.accrualTo) chips.push({ keys: ["accrualFrom", "accrualTo"], label: `Competência ${filters.accrualFrom === filters.accrualTo ? monthText(filters.accrualFrom) : [monthText(filters.accrualFrom) || "…", monthText(filters.accrualTo) || "…"].join(" a ")}` });
  if (filters.supplierId) chips.push({ keys: ["supplierId"], label: `Fornecedor: ${names(suppliers?.rows, filters.supplierId)}` });
  if (filters.customerId) chips.push({ keys: ["customerId"], label: `Cliente: ${names(customers?.rows, filters.customerId)}` });
  if (filters.chartAccountId) {
    const account = accounts?.find((a) => String(a.id) === filters.chartAccountId);
    chips.push({ keys: ["chartAccountId"], label: `Conta: ${account ? `${account.code} ${account.name}` : filters.chartAccountId}` });
  }
  if (filters.costCenterId) chips.push({ keys: ["costCenterId"], label: `Centro de custo: ${names(centers?.rows, filters.costCenterId)}` });
  if (filters.bankAccountId) chips.push({ keys: ["bankAccountId"], label: `Conta: ${names(banks?.rows, filters.bankAccountId)}` });
  if (filters.paymentMethod) chips.push({ keys: ["paymentMethod"], label: `Forma: ${names(paymentMethodOptions, filters.paymentMethod)}` });
  if (filters.origin) chips.push({ keys: ["origin"], label: `Origem: ${names(kind === "payable" ? PAYABLE_ORIGINS : RECEIVABLE_ORIGINS, filters.origin)}` });
  if (filters.status) chips.push({ keys: ["status"], label: `Situação: ${names(RECEIVABLE_STATUS, filters.status)}` });
  if (filters.gateway) chips.push({ keys: ["gateway"], label: `Cobrança: ${names(GATEWAY_OPTIONS, filters.gateway)}` });
  if (filters.minValue || filters.maxValue) {
    chips.push({ keys: ["minValue", "maxValue"], label: filters.minValue && filters.maxValue ? `Valor de ${formatMoney(filters.minValue)} a ${formatMoney(filters.maxValue)}` : filters.minValue ? `Valor a partir de ${formatMoney(filters.minValue)}` : `Valor até ${formatMoney(filters.maxValue)}` });
  }
  if (filters.receipt) chips.push({ keys: ["receipt"], label: filters.receipt === "com" ? "Com comprovante" : "Sem comprovante" });
  if (filters.invoice) chips.push({ keys: ["invoice"], label: filters.invoice === "com" ? "Com nota fiscal" : "Sem nota fiscal" });
  if (filters.groupKey) chips.push({ keys: ["groupKey"], label: "Parcelas do mesmo lançamento" });
  if (filters.recurrenceId) chips.push({ keys: ["recurrenceId"], label: "Ocorrências de um recorrente" });
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {chips.map((chip) => (
        <span key={chip.keys.join()} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
          {chip.label}
          <button type="button" aria-label={`Remover filtro ${chip.label}`} className="rounded-full p-0.5 hover:bg-background" onClick={() => onRemove(chip.keys)}>
            <Icon name="x" className="w-3 h-3" />
          </button>
        </span>
      ))}
      {chips.length > 1 && <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onClear}>Limpar todos</Button>}
    </div>
  );
}

/* ------------------------------------------------------------------ barra de busca */

/** Busca única: descrição, fornecedor/cliente, documento, código ou valor. */
export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => setText(value), [value]);
  return (
    <div className="relative w-full sm:w-96">
      <Icon name="search" className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input value={text} placeholder={placeholder} aria-label="Buscar"
        onChange={(event) => { const next = event.target.value; setText(next); clearTimeout(timer.current); timer.current = setTimeout(() => onChange(next.trim()), 400); }}
        className="w-full h-9 rounded-md border bg-background pl-8 pr-8 text-sm outline-none focus:ring-1 focus:ring-primary" />
      {text && (
        <button type="button" aria-label="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted" onClick={() => { setText(""); onChange(""); }}>
          <Icon name="x" className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ cartões */

/** Os cartões de resumo viraram componente geral (também usados em Propostas). */
export { default as SummaryCards } from "@/components/general-components/SummaryCards";
export type { Bucket } from "@/components/general-components/SummaryCards";

/* ------------------------------------------------------------------ ordenação */

// SortButton virou componente geral (blog, financeiro…); reexportado para os imports antigos
export { SortButton } from "@/components/general-components/SortButton";

/* ------------------------------------------------------------------ seleção e lote */

export function SelectBox({ checked, onChange, label, inverse }: { checked: boolean | "indeterminate"; onChange: (checked: boolean) => void; label: string; inverse?: boolean }) {
  return <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} aria-label={label}
    className={cn(inverse ? "border-inverse-foreground data-[state=checked]:bg-inverse-foreground data-[state=checked]:text-primary" : "border-muted-foreground/60")} />;
}

export function useSelection<T extends { id: number }>(rows: T[] | undefined) {
  const [selected, setSelected] = useState<Map<number, T>>(new Map());
  const toggle = (row: T, on: boolean) => setSelected((prev) => { const next = new Map(prev); if (on) next.set(row.id, row); else next.delete(row.id); return next; });
  const ids = rows?.map((r) => r.id) ?? [];
  const allOnPage = ids.length > 0 && ids.every((id) => selected.has(id));
  const someOnPage = ids.some((id) => selected.has(id));
  const togglePage = (on: boolean) => setSelected((prev) => { const next = new Map(prev); for (const row of rows ?? []) { if (on) next.set(row.id, row); else next.delete(row.id); } return next; });
  return { selected, toggle, togglePage, allOnPage, pageState: (allOnPage ? true : someOnPage ? "indeterminate" : false) as boolean | "indeterminate", clear: () => setSelected(new Map()) };
}

/** Barra que aparece com itens marcados: quantos, quanto somam e o que dá para fazer com eles. */
export function SelectionBar({ count, total, onClear, children }: { count: number; total: number; onClear: () => void; children: React.ReactNode }) {
  if (!count) return null;
  return (
    <div className="sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-primary bg-background/95 backdrop-blur px-4 py-2 shadow-md">
      <span className="text-sm font-medium">{count} {count === 1 ? "selecionada" : "selecionadas"} · <span className="tabular-nums">{formatMoney(total)}</span></span>
      <div className="flex flex-wrap items-center gap-2 ml-auto">
        {children}
        <Button size="sm" variant="ghost" onClick={onClear}>Desmarcar</Button>
      </div>
    </div>
  );
}

/** Mostra o que ficou de fora de uma operação em lote. */
export function reportBulk(done: string, result: { skipped?: Array<{ id: number; reason: string }> }) {
  const skipped = result.skipped ?? [];
  toast({
    title: done,
    description: skipped.length ? `${skipped.length} não ${skipped.length === 1 ? "pôde" : "puderam"} ser incluída(s): ${[...new Set(skipped.map((s) => s.reason))].join("; ")}` : undefined,
    variant: skipped.length ? "default" : "success",
  });
}

/** Baixa em lote: mesma data, conta e forma; cada conta pelo próprio valor. */
export function BulkSettleDialog({ kind, count, total, ids, onClose, onDone }: {
  kind: LedgerKind; count: number; total: number; ids: number[]; onClose: () => void; onDone: () => void;
}) {
  const [paidAt, setPaidAt] = useState(todayInput());
  const [paymentMethod, setPaymentMethod] = useState(kind === "payable" ? "pix" : "transferencia");
  const [error, setError] = useState("");
  const { data: bankAccounts, isLoading } = useBankAccounts();
  const banks = (bankAccounts?.rows ?? []).filter((account) => account.type !== "gateway");
  const [bankChoice, setBankChoice] = useState<string | null>(null);
  const bankAccountId = bankChoice ?? String(banks.find((account) => account.isDefault)?.id ?? (banks.length === 1 ? banks[0].id : ""));
  const { mutate, isPending } = useMutation({
    mutationFn: async () => (await api.post(`financial/${kind === "payable" ? "payables" : "receivables"}/bulk-settle`, { ids, paidAt, paymentMethod, bankAccountId: bankAccountId || null })).data,
    onSuccess: (result) => { reportBulk(`${result.settled} ${result.settled === 1 ? "baixa registrada" : "baixas registradas"}!`, result); onDone(); onClose(); },
    onError: (err: ApiError) => setError(err.response?.data?.message || "Erro desconhecido."),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!paidAt) return setError("Informe a data");
    if (paidAt > todayInput()) return setError("A data não pode ser futura");
    if (banks.length > 0 && !bankAccountId) return setError(kind === "payable" ? "Escolha a conta de onde o dinheiro saiu" : "Escolha a conta em que o dinheiro entrou");
    setError("");
    mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{kind === "payable" ? "Pagar selecionadas" : "Receber selecionadas"}</DialogTitle>
          <DialogDescription>{count} {count === 1 ? "conta" : "contas"} · {formatMoney(total)}. Cada uma é baixada pelo próprio valor; juros ou desconto, dê baixa uma a uma.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <Label>{kind === "payable" ? "Data do pagamento" : "Data do recebimento"} <span>*</span></Label>
            <CalendarPicker mode="natural" name="bulkPaidAt" value={paidAt} onValueChange={(_, v) => setPaidAt(v ?? "")} placeholder="dd/mm/aaaa" className="mt-1" />
          </div>
          <div>
            <Label>Forma de pagamento</Label>
            <Select name="bulkMethod" options={paymentMethodOptions} state={paymentMethod} onChange={(_, v) => setPaymentMethod(String(v))} modal />
          </div>
          <div>
            <Label>{kind === "payable" ? "Conta de saída" : "Conta de entrada"} {banks.length > 0 && <span>*</span>}</Label>
            <Select name="bulkBank" options={banks as never[]} state={bankAccountId} isLoading={isLoading} onChange={(_, v) => setBankChoice(String(v))} placeholder="Selecione a conta" modal />
          </div>
          {kind === "receivable" && <p className="text-xs text-muted-foreground">Cobranças do gateway (Asaas etc.) são confirmadas pelo provedor e ficam de fora.</p>}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>Confirmar {count} {count === 1 ? "baixa" : "baixas"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ juros, multa e desconto */

/**
 * Juros, multa e desconto da baixa. O valor pago acompanha (valor + juros +
 * multa − desconto); quem preferir digita o valor pago e a diferença é
 * separada sozinha na API.
 */
export function SettleExtras({ base, extras, onChange }: {
  base: number; extras: { interest: number; fine: number; discount: number }; onChange: (next: { interest: number; fine: number; discount: number }) => void;
}) {
  const [open, setOpen] = useState(extras.interest + extras.fine + extras.discount > 0);
  if (!open) {
    return (
      <button type="button" className="text-xs text-primary underline w-fit -mt-2" onClick={() => setOpen(true)}>
        Teve juros, multa ou desconto?
      </button>
    );
  }
  const field = (key: "interest" | "fine" | "discount", label: string) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input name={key} format="currency" value={extras[key]} onValueChange={(_, v) => onChange({ ...extras, [key]: Number(v) || 0 })} className="mt-1" />
    </div>
  );
  const total = Math.round((base + extras.interest + extras.fine - extras.discount) * 100) / 100;
  return (
    <div className="rounded border p-3 -mt-1 flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">{field("interest", "Juros")}{field("fine", "Multa")}{field("discount", "Desconto")}</div>
      <p className="text-xs text-muted-foreground">Valor final: <span className="font-medium text-foreground tabular-nums">{formatMoney(total)}</span>. Juros, multa e desconto vão para o resultado financeiro da DRE.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ exportar */

/** Baixa a planilha que a API monta com o mesmo recorte da tela. */
export async function downloadXlsx(path: string, params: Array<{ key: string; value: string }>, fallback: string) {
  try {
    const query = new URLSearchParams(params.map((p) => [p.key, p.value]));
    const response = await api.get(`${path}?${query.toString()}`, { responseType: "blob" });
    const disposition = String(response.headers["content-disposition"] ?? "");
    const name = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? fallback;
    const url = URL.createObjectURL(response.data as Blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch {
    toast({ title: "Não foi possível gerar a planilha", variant: "destructive" });
  }
}

/* ------------------------------------------------------------------ copiar */

export function CopyButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label={label} className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs hover:bg-muted", className)}
            onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { toast({ title: "Não foi possível copiar", variant: "destructive" }); } }}>
            <Icon name={done ? "check" : "copy"} className="w-3 h-3" /> {done ? "Copiado" : label}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs break-all">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Linha digitável em blocos legíveis (5.5 5.6 5.6 1 14 do boleto bancário). */
export function formatBarcode(code?: string | null) {
  const d = (code ?? "").replace(/\D/g, "");
  if (d.length === 47) return `${d.slice(0, 5)}.${d.slice(5, 10)} ${d.slice(10, 15)}.${d.slice(15, 21)} ${d.slice(21, 26)}.${d.slice(26, 32)} ${d.slice(32, 33)} ${d.slice(33)}`;
  if (d.length === 48) return d.replace(/(\d{12})(?=\d)/g, "$1 ");
  return d;
}
