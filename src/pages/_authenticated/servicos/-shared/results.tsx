import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import TagBadge from "@/components/general-components/TagBadge";
import { cn } from "@/lib/utils";
import { Tip, decimal, errorMessage, marginZoneOf, money } from "../../comercial/-shared/commercial";
import { ORDER_RESULT_KEY, OrderStatus, ordersApi } from "./orders";

/** Resultado da OS: orçado × realizado × projeção (espelha a API). Só para quem vê custos. */
export interface ResultFigures { revenue: number; cost: number; profit: number; margin: number | null }
export interface ResultLine { key: string; label: string; budget: number; realized: number; committed: number; projected: number; note: string | null }
export interface OrderResult {
  status: OrderStatus; frozen: boolean; computedAt: string; closedAt: string | null;
  progress: { done: number | null; planned: number | null };
  revenue: { budget: number; invoiced: number; received: number; toInvoice: number };
  lines: ResultLine[];
  totals: { budget: ResultFigures; realized: ResultFigures; projected: ResultFigures };
  pending: string[];
}
export interface ResultRow {
  id: number; number: string; title: string; status: OrderStatus; customer: string; frozen: boolean; progress: number | null; pending: number;
  budget: ResultFigures; realized: ResultFigures; projected: ResultFigures;
}
export interface ResultList {
  rows: ResultRow[];
  totals: { orders: number; budget: ResultFigures; realized: ResultFigures; projected: ResultFigures; below: number };
}
export const RESULTS_KEY = "serviceOrderResults";
export const COSTS_PERMISSION = "view_custos_comercial";

/** A cor de cada faixa de margem (a mesma da barra da proposta). */
const MARGIN_COLOR: Record<string, string> = { "Risco de prejuízo": "#ef4444", Apertada: "#f59e0b", "Saudável": "#22c55e", Excelente: "#3b82f6" };
const marginText = (margin: number | null) => (margin === null ? "—" : `${decimal(margin, 1)}%`);
/** Margem na escala de cores da proposta, com a palavra junto para não depender só da cor. */
export function MarginTag({ margin, showLabel = true }: { margin: number | null; showLabel?: boolean }) {
  if (margin === null) return <span className="text-muted-foreground">—</span>;
  const zone = marginZoneOf(margin / 100);
  return (
    <TagBadge icon="gauge" color={MARGIN_COLOR[zone.label]} className="tabular-nums">
      <span className="font-semibold">{marginText(margin)}</span>{showLabel && <> · {zone.label.toLowerCase()}</>}
    </TagBadge>
  );
}
/** A obra caminha para fechar acima ou abaixo do que a proposta previu. */
export function Versus({ projected, budget }: { projected: number; budget: number }) {
  const diff = projected - budget;
  if (Math.abs(diff) < 0.005) return <span className="text-muted-foreground">igual ao orçado</span>;
  return <span className={diff < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>{money(Math.abs(diff))} {diff < 0 ? "abaixo" : "acima"} do orçado</span>;
}

const CELL = "py-1.5 px-2 text-right tabular-nums whitespace-nowrap";

/** Bloco da OS: cada linha de custo orçada contra o que já foi gasto, e como a obra deve terminar. */
export function ResultPanel({ orderId }: { orderId: number }) {
  const { data, isLoading, error } = useQuery({ queryKey: [ORDER_RESULT_KEY, String(orderId)], queryFn: () => ordersApi.get<OrderResult>(`${orderId}/result`) });
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (error || !data) return <section className="min-w-0 rounded-card border bg-card p-4"><h2 className="font-semibold">Resultado da obra</h2><p className="mt-2 text-sm text-destructive">{errorMessage(error)}</p></section>;
  const { totals, revenue } = data;
  const finished = data.status === "concluida" || data.status === "encerrada" || data.status === "cancelada";
  const lastTitle = finished ? "Resultado" : "Projeção";
  const over = (line: ResultLine) => line.projected > line.budget + 0.005;

  return (
    <section className="min-w-0 rounded-card border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Resultado da obra</h2>
        {data.progress.done !== null && <span className="text-xs text-muted-foreground tabular-nums">{decimal(data.progress.done, 0)}% da obra feita</span>}
      </div>
      <p className="text-xs text-muted-foreground">
        Uso interno. {data.frozen
          ? `Congelado no encerramento${data.closedAt ? ` em ${new Date(data.closedAt).toLocaleDateString("pt-BR")}` : ""}: não muda mais.`
          : finished ? "Obra terminada: o resultado é o que foi gasto e comprometido."
            : "O orçado vem da proposta; o realizado, dos RDOs, das compras e do faturamento. A projeção diz como a obra deve terminar."}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Lucro orçado</p>
          <p className="text-lg font-semibold tabular-nums">{money(totals.budget.profit)}</p>
          <p className="text-xs"><MarginTag margin={totals.budget.margin} /></p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">{finished ? "Lucro da obra" : "Lucro projetado"}</p>
          <p className={cn("text-lg font-semibold tabular-nums", totals.projected.profit < 0 && "text-red-600 dark:text-red-400")}>{money(totals.projected.profit)}</p>
          <p className="text-xs"><MarginTag margin={totals.projected.margin} /></p>
          <p className="text-xs"><Versus projected={totals.projected.profit} budget={totals.budget.profit} /></p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Faturado</p>
          <p className="text-lg font-semibold tabular-nums">{money(revenue.invoiced)}</p>
          <p className="text-xs text-muted-foreground tabular-nums">de {money(revenue.budget)} · recebido {money(revenue.received)}</p>
          {revenue.toInvoice > 0 && <p className="text-xs text-muted-foreground tabular-nums">a faturar {money(revenue.toInvoice)}</p>}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-1.5 pr-2 text-left font-medium">Custo</th>
              <th className={cn(CELL, "font-medium")}>Orçado</th>
              <th className={cn(CELL, "font-medium")}>Realizado</th>
              <th className={cn(CELL, "font-medium")}>Comprometido</th>
              <th className={cn(CELL, "font-medium")}>{lastTitle}</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((line) => (
              <tr key={line.key} className="border-b last:border-b-0">
                <td className="py-1.5 pr-2">
                  <span className="inline-flex items-center gap-1">{line.label}
                    {line.note && <Tip text={line.note}><span className="text-muted-foreground" aria-label={line.note}><Icon name="info" className="w-3 h-3" /></span></Tip>}
                  </span>
                </td>
                <td className={cn(CELL, "text-muted-foreground")}>{line.budget ? money(line.budget) : "—"}</td>
                <td className={CELL}>{money(line.realized)}</td>
                <td className={cn(CELL, "text-muted-foreground")}>{line.committed ? money(line.committed) : "—"}</td>
                <td className={cn(CELL, over(line) && "font-semibold text-red-600 dark:text-red-400")}>
                  {money(line.projected)}{over(line) && <span className="sr-only"> (acima do orçado)</span>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-medium">
              <td className="py-1.5 pr-2">Custo total</td>
              <td className={CELL}>{money(totals.budget.cost)}</td><td className={CELL}>{money(totals.realized.cost)}</td><td className={CELL} />
              <td className={cn(CELL, totals.projected.cost > totals.budget.cost + 0.005 && "text-red-600 dark:text-red-400")}>{money(totals.projected.cost)}</td>
            </tr>
            <tr className="text-muted-foreground">
              <td className="py-1.5 pr-2">Receita</td>
              <td className={CELL}>{money(totals.budget.revenue)}</td>
              <td className={CELL}><Tip text="O que já foi faturado (nota fiscal registrada)"><span>{money(totals.realized.revenue)}</span></Tip></td><td className={CELL} />
              <td className={CELL}>{money(totals.projected.revenue)}</td>
            </tr>
            <tr className="border-t font-semibold">
              <td className="py-1.5 pr-2">Lucro</td>
              <td className={CELL}>{money(totals.budget.profit)}</td>
              <td className={CELL}><Tip text="Faturado menos o que já foi gasto: só fecha quando tudo for faturado"><span>{money(totals.realized.profit)}</span></Tip></td><td className={CELL} />
              <td className={cn(CELL, totals.projected.profit < 0 && "text-red-600 dark:text-red-400")}>{money(totals.projected.profit)}</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-2 text-muted-foreground">Margem</td>
              <td className={CELL}><MarginTag margin={totals.budget.margin} showLabel={false} /></td>
              <td className={CELL}><MarginTag margin={totals.realized.margin} showLabel={false} /></td><td className={CELL} />
              <td className={CELL}><MarginTag margin={totals.projected.margin} showLabel={false} /></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">O lucro já desconta impostos e a comissão do vendedor. Em vermelho, o que passa do orçado.</p>

      {data.pending.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">{data.frozen ? "Ficou em aberto no encerramento" : "Ainda em aberto nesta obra"}</p>
          <ul className="mt-1 list-disc pl-5">{data.pending.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
