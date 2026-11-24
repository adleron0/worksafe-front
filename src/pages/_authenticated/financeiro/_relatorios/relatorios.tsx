import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";
import MonthRangePicker from "@/components/general-components/MonthRangePicker";
import Icon from "@/components/general-components/Icon";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ApiError } from "@/general-interfaces/api.interface";
import { cn } from "@/lib/utils";
import { FINANCIAL_ABILITY, formatMoney, useBankAccounts } from "../-shared/financial";
import { QUICK_RANGES, downloadXlsx } from "../-shared/ledger";
import { plusDays } from "../-shared/payables";
import { todayInput } from "../_receber/-components/options";

export const Route = createFileRoute("/_authenticated/financeiro/_relatorios/relatorios")({
  component: Reports,
  validateSearch: (search: Record<string, unknown>): { aba?: string } => (search.aba === "dre" ? { aba: "dre" } : {}),
});

const REPORTS_KEY = "financialReports";
const short = (value: number) => new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);

function Reports() {
  const { can } = useVerify();
  const search = Route.useSearch();
  const [tab, setTab] = useState<"caixa" | "dre">(search.aba === "dre" ? "dre" : "caixa");
  if (!can(`view_${FINANCIAL_ABILITY}`)) return null;
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Relatórios financeiros</h1>
          <p className="text-sm text-muted-foreground">Fluxo de caixa (o que entrou, saiu e vai entrar e sair) e o resultado do mês (DRE).</p>
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          <Button size="sm" className="h-7" variant={tab === "caixa" ? "default" : "ghost"} onClick={() => setTab("caixa")}><Icon name="chart-line" className="w-4 h-4" /> Fluxo de caixa</Button>
          <Button size="sm" className="h-7" variant={tab === "dre" ? "default" : "ghost"} onClick={() => setTab("dre")}><Icon name="scale" className="w-4 h-4" /> DRE</Button>
        </div>
      </div>
      {tab === "caixa" ? <CashFlow /> : <Dre />}
    </>
  );
}

/* ------------------------------------------------------------------ fluxo de caixa */

interface FlowRow { key: string; label: string; start: string; end: string; opening: number; realizedIn: number; realizedOut: number; projectedIn: number; projectedOut: number; transfers: number; closing: number }
interface Flow {
  today: string; from: string; to: string; group: string; opening: number; closing: number;
  totals: { realizedIn: number; realizedOut: number; projectedIn: number; projectedOut: number; transfers: number };
  overdue: { in: number; inCount: number; out: number; outCount: number };
  lowest: { key: string; label: string; closing: number } | null;
  rows: FlowRow[];
}

const flowConfig = {
  entradas: { label: "Entradas", theme: { light: "#2a9d8f", dark: "#2a9d8f" } },
  saidas: { label: "Saídas", theme: { light: "#e76f51", dark: "#e0694e" } },
  saldo: { label: "Saldo", theme: { light: "hsl(var(--foreground))", dark: "hsl(var(--foreground))" } },
} satisfies ChartConfig;

const GROUPS = [{ id: "day", name: "Por dia" }, { id: "week", name: "Por semana" }, { id: "month", name: "Por mês" }];
const FLOW_RANGES = [
  { id: "30", label: "Próximos 30 dias", range: () => [todayInput(), plusDays(todayInput(), 30)] },
  { id: "90", label: "Próximos 90 dias", range: () => [todayInput(), plusDays(todayInput(), 90)] },
  { id: "mes", label: "Este mês", range: QUICK_RANGES.find((q) => q.id === "mes")!.range },
  { id: "passado", label: "Mês passado", range: QUICK_RANGES.find((q) => q.id === "passado")!.range },
  { id: "6m", label: "Próximos 6 meses", range: () => [`${todayInput().slice(0, 7)}-01`, plusDays(todayInput(), 183)] },
];

function CashFlow() {
  const [from, setFrom] = useState(`${todayInput().slice(0, 7)}-01`);
  const [to, setTo] = useState(plusDays(todayInput(), 60));
  const [group, setGroup] = useState("week");
  const [banks, setBanks] = useState<string[]>([]);
  const { data: bankAccounts } = useBankAccounts();
  const params = [{ key: "from", value: from }, { key: "to", value: to }, { key: "group", value: group }, ...(banks.length ? [{ key: "bankAccountId", value: banks.join(",") }] : [])];
  const { data, isLoading, isError, error } = useQuery<Flow | undefined, ApiError>({
    queryKey: [REPORTS_KEY, "cash-flow", params],
    queryFn: () => get("financial", "reports/cash-flow", params),
    placeholderData: (previous) => previous,
  });
  const chart = (data?.rows ?? []).map((r) => ({ label: r.label, entradas: r.realizedIn + r.projectedIn, saidas: r.realizedOut + r.projectedOut, saldo: r.closing, future: r.end >= (data?.today ?? "") }));
  const inTotal = (data?.totals.realizedIn ?? 0) + (data?.totals.projectedIn ?? 0);
  const outTotal = (data?.totals.realizedOut ?? 0) + (data?.totals.projectedOut ?? 0);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row lg:items-end gap-3 rounded-lg border p-3">
        <div className="min-w-64">
          <Label>Período</Label>
          <CalendarPicker mode="range" name="flowRange" value={`${from}|${to}`} numberOfMonths={2}
            onValueChange={(_, value) => { const [a, b] = (value ?? "|").split("|"); if (a && b) { setFrom(a); setTo(b); } }} />
          <div className="flex flex-wrap gap-1 mt-2">
            {FLOW_RANGES.map((q) => {
              const [a, b] = q.range();
              return <button key={q.id} type="button" onClick={() => { setFrom(a); setTo(b); }} className={cn("rounded-full border px-2 py-0.5 text-xs", from === a && to === b ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted")}>{q.label}</button>;
            })}
          </div>
        </div>
        <div className="w-40"><Label>Agrupar</Label><Select name="group" options={GROUPS} state={group} onChange={(_, v) => setGroup(String(v))} /></div>
        <div className="w-full lg:w-64"><Label>Contas</Label><Select name="banks" options={(bankAccounts?.rows ?? []) as never[]} state={banks} multiple onChange={(_, v) => setBanks(Array.isArray(v) ? v : [String(v)])} placeholder="Todas as contas" /></div>
        <Button variant="outline" size="sm" className="lg:ml-auto" onClick={() => downloadXlsx("financial/reports/cash-flow", [...params, { key: "format", value: "xlsx" }], "fluxo-de-caixa.xlsx")}>
          <Icon name="file-spreadsheet" className="w-4 h-4" /> Exportar
        </Button>
      </div>

      {isError && <p className="text-destructive">Erro: {error?.response?.data?.message}</p>}
      {isLoading && <Skeleton className="h-72 w-full" />}
      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Stat label="Saldo no início" value={data.opening} />
            <Stat label="Entradas (realizadas + previstas)" value={inTotal} sub={`${formatMoney(data.totals.realizedIn)} já entraram`} />
            <Stat label="Saídas (realizadas + previstas)" value={-outTotal} sub={`${formatMoney(data.totals.realizedOut)} já saíram`} />
            <Stat label="Saldo previsto no fim" value={data.closing} strong />
            <Stat label="Menor saldo no período" value={data.lowest?.closing ?? 0} sub={data.lowest?.label} warn={(data.lowest?.closing ?? 0) < 0} />
          </div>
          {(data.overdue.inCount > 0 || data.overdue.outCount > 0) && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm flex flex-wrap gap-x-6 gap-y-1 items-center">
              <Icon name="triangle-alert" className="w-4 h-4 text-amber-600" />
              <span>Fora da projeção, porque já venceram:</span>
              {data.overdue.inCount > 0 && <Link to="/financeiro/receber" search={{ view: "atrasadas" } as never} className="underline">{data.overdue.inCount} a receber · {formatMoney(data.overdue.in)}</Link>}
              {data.overdue.outCount > 0 && <Link to="/financeiro/pagar" search={{ view: "atrasadas" } as never} className="underline">{data.overdue.outCount} a pagar · {formatMoney(data.overdue.out)}</Link>}
            </div>
          )}
          {data.rows.length > 0 && data.rows.length <= 120 && (
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium mb-2">Entradas, saídas e saldo acumulado</p>
              <ChartContainer config={flowConfig} className="h-72 w-full">
                <ComposedChart data={chart} margin={{ left: 4, right: 8, top: 8 }} barGap={2}>
                  <CartesianGrid vertical={false} strokeOpacity={0.4} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={short} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => (
                    <div className="flex w-full justify-between gap-4"><span className="text-muted-foreground">{flowConfig[name as keyof typeof flowConfig]?.label}</span><span className="font-medium tabular-nums">{formatMoney(Number(value))}</span></div>
                  )} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="entradas" fill="var(--color-entradas)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="saidas" fill="var(--color-saidas)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Line dataKey="saldo" type="monotone" stroke="var(--color-saldo)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ChartContainer>
            </div>
          )}
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-primary text-inverse-foreground">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold">Período</th>
                  <th className="px-3 py-2 font-semibold text-right">Saldo inicial</th>
                  <th className="px-3 py-2 font-semibold text-right">Entrou</th>
                  <th className="px-3 py-2 font-semibold text-right">Saiu</th>
                  <th className="px-3 py-2 font-semibold text-right">Vai entrar</th>
                  <th className="px-3 py-2 font-semibold text-right">Vai sair</th>
                  {banks.length > 0 && <th className="px-3 py-2 font-semibold text-right">Transferências</th>}
                  <th className="px-3 py-2 font-semibold text-right">Saldo final</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.key} className={cn("border-b last:border-b-0", r.start <= data.today && r.end >= data.today && "bg-primary/5")}>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.label}{r.start <= data.today && r.end >= data.today && <span className="ml-1 text-xs text-muted-foreground">(hoje)</span>}</td>
                    <Money value={r.opening} />
                    <Money value={r.realizedIn} muted />
                    <Money value={-r.realizedOut} muted />
                    <Money value={r.projectedIn} muted />
                    <Money value={-r.projectedOut} muted />
                    {banks.length > 0 && <Money value={r.transfers} muted />}
                    <Money value={r.closing} bold />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Realizado pela data do pagamento; previsto pelo vencimento das contas em aberto, de hoje em diante. O saldo parte do saldo inicial das contas bancárias cadastradas. Transferências entre contas só aparecem quando o filtro é por conta.</p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, strong, warn }: { label: string; value: number; sub?: string; strong?: boolean; warn?: boolean }) {
  return (
    <div className={cn("rounded-lg border p-3 min-w-0", warn && "border-red-300 dark:border-red-800")}>
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className={cn("text-lg tabular-nums truncate", strong ? "font-bold" : "font-semibold", (value < 0 || warn) && "text-red-600 dark:text-red-400")}>{formatMoney(value)}</p>
      {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      {warn && <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"><Icon name="triangle-alert" className="w-3 h-3" /> fica negativo</p>}
    </div>
  );
}
function Money({ value, muted, bold }: { value: number; muted?: boolean; bold?: boolean }) {
  return <td className={cn("px-3 py-1.5 text-right tabular-nums whitespace-nowrap", muted && value === 0 && "text-muted-foreground", bold && "font-semibold", value < 0 && bold && "text-red-600 dark:text-red-400")}>{value === 0 && muted ? "—" : formatMoney(value)}</td>;
}

/* ------------------------------------------------------------------ DRE */

interface DreRow { key: string; label: string; kind: "line" | "total" | "result"; values: Record<string, number>; total: number; accounts: Array<{ id: number | null; code: string; name: string; values: Record<string, number>; total: number }> }
interface DreData { from: string; to: string; basis: string; months: string[]; rows: DreRow[]; margin: Record<string, number | null> }

const monthsBack = (n: number) => {
  const [y, m] = todayInput().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 - n, 1)).toISOString().slice(0, 7);
};

function Dre() {
  const [from, setFrom] = useState(monthsBack(5));
  const [to, setTo] = useState(todayInput().slice(0, 7));
  const [basis, setBasis] = useState("competencia");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const params = [{ key: "from", value: from }, { key: "to", value: to }, { key: "basis", value: basis }];
  const { data, isLoading, isError, error } = useQuery<DreData | undefined, ApiError>({
    queryKey: [REPORTS_KEY, "dre", params],
    queryFn: () => get("financial", "reports/dre", params),
    placeholderData: (previous) => previous,
  });
  const label = (m: string) => `${m.slice(5, 7)}/${m.slice(2, 4)}`;
  const hasData = data?.rows.some((r) => r.kind === "line" && r.total !== 0);
  const unclassified = data?.rows.filter((r) => (r.key === "sem_receita" || r.key === "sem_despesa") && r.total !== 0) ?? [];

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-end gap-3 rounded-lg border p-3">
        <div className="w-64"><Label>Meses</Label><MonthRangePicker className="mt-1" clearable={false} from={from} to={to} onChange={(a, b) => { if (a && b) { setFrom(a); setTo(b); } }} /></div>
        <div className="w-56"><Label>Regime</Label><Select name="basis" options={[{ id: "competencia", name: "Competência (mês da conta)" }, { id: "caixa", name: "Caixa (mês do pagamento)" }]} state={basis} onChange={(_, v) => setBasis(String(v))} /></div>
        <div className="flex gap-1 flex-wrap">
          {[["3", 2], ["6", 5], ["12", 11]].map(([labelText, n]) => (
            <button key={labelText} type="button" onClick={() => { setFrom(monthsBack(Number(n))); setTo(todayInput().slice(0, 7)); }}
              className={cn("rounded-full border px-2 py-0.5 text-xs", from === monthsBack(Number(n)) && to === todayInput().slice(0, 7) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted")}>Últimos {labelText} meses</button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="md:ml-auto" onClick={() => downloadXlsx("financial/reports/dre", [...params, { key: "format", value: "xlsx" }], "dre.xlsx")}>
          <Icon name="file-spreadsheet" className="w-4 h-4" /> Exportar
        </Button>
      </div>
      {isError && <p className="text-destructive">Erro: {error?.response?.data?.message}</p>}
      {isLoading && <Skeleton className="h-72 w-full" />}
      {data && !hasData && <p className="text-sm text-muted-foreground rounded border p-6 text-center">Nenhum lançamento no período.</p>}
      {data && hasData && (
        <>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: `${320 + data.months.length * 110}px` }}>
              <thead className="bg-primary text-inverse-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold sticky left-0 bg-primary">Linha</th>
                  {data.months.map((m) => <th key={m} className="px-3 py-2 text-right font-semibold">{label(m)}</th>)}
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.filter((r) => r.kind !== "line" || r.total !== 0 || ["receita_bruta", "despesa_operacional"].includes(r.key)).map((row) => (
                  <Fragment key={row.key}>
                    <tr className={cn("border-b", row.kind === "total" && "bg-muted/50 font-semibold", row.kind === "result" && "bg-primary/10 font-bold")}>
                      <td className="px-3 py-1.5 sticky left-0 bg-inherit whitespace-nowrap">
                        {row.accounts.length > 0 ? (
                          <button type="button" className="inline-flex items-center gap-1 hover:underline" onClick={() => setOpen((prev) => ({ ...prev, [row.key]: !prev[row.key] }))}>
                            <Icon name={open[row.key] ? "chevron-down" : "chevron-right"} className="w-3 h-3" />{row.label}
                          </button>
                        ) : <span className={cn(row.kind === "line" && "pl-4")}>{row.label}</span>}
                      </td>
                      {data.months.map((m) => <DreCell key={m} value={row.values[m]} result={row.kind !== "line"} />)}
                      <DreCell value={row.total} result={row.kind !== "line"} bold />
                    </tr>
                    {open[row.key] && row.accounts.map((account) => (
                      <tr key={`${row.key}-${account.id ?? "none"}`} className="border-b text-xs text-muted-foreground">
                        <td className="px-3 py-1 pl-9 sticky left-0 bg-background whitespace-nowrap">{account.code} {account.name}</td>
                        {data.months.map((m) => <DreCell key={m} value={account.values[m]} />)}
                        <DreCell value={account.total} />
                      </tr>
                    ))}
                  </Fragment>
                ))}
                <tr className="text-xs text-muted-foreground">
                  <td className="px-3 py-1.5 sticky left-0 bg-background">Margem sobre a receita bruta</td>
                  {data.months.map((m) => <td key={m} className="px-3 py-1.5 text-right tabular-nums">{data.margin[m] === null ? "—" : `${data.margin[m]}%`}</td>)}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          {unclassified.length > 0 && (
            <p className="text-xs rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-2">
              Há lançamentos sem conta do plano (ou com conta sem grupo de DRE): {unclassified.map((r) => `${r.label.replace(/[()−+]/g, "").trim().toLowerCase()} ${formatMoney(r.total)}`).join(" e ")}.
              Classifique-os em Contas a Pagar/Receber (filtro “Conta do plano”) para a DRE ficar fiel.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Cada conta do plano entra na linha do seu grupo de DRE (ou do grupo da conta mãe). {basis === "competencia" ? "Competência: tudo o que pertence ao mês, pago ou não; cobranças canceladas ficam de fora." : "Caixa: só o que foi pago ou recebido no mês."} Juros, multa e desconto das baixas formam o resultado financeiro.
          </p>
        </>
      )}
    </div>
  );
}

function DreCell({ value = 0, result, bold }: { value?: number; result?: boolean; bold?: boolean }) {
  return <td className={cn("px-3 py-1.5 text-right tabular-nums whitespace-nowrap", bold && "font-semibold", result && value < 0 && "text-red-600 dark:text-red-400", !value && "text-muted-foreground")}>{value ? formatMoney(value) : "—"}</td>;
}
