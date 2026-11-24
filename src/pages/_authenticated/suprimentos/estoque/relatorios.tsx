import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import { dateBr, errorMessage, money } from "../../comercial/-shared/commercial";
import { STOCK_ABILITY, downloadCsv, qty, stockApi } from "../-shared/stock";
import { REPORT_KEY, StockReport } from "../-shared/inventory";

export const Route = createFileRoute("/_authenticated/suprimentos/estoque/relatorios")({
  component: ReportsPage,
});

/** Relatórios do estoque no período: valor parado por categoria, consumo por obra e por centro de custo, itens mais usados e ajustes. */
function ReportsPage() {
  const { can } = useVerify();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const params = { ...(from ? { from } : {}), ...(to ? { to } : {}) };
  const { data, isLoading, error } = useQuery({ queryKey: [REPORT_KEY, params], queryFn: () => stockApi.get<StockReport>("reports", params), placeholderData: (previous) => previous });
  if (!can(`view_${STOCK_ABILITY}`)) return null;
  const seesCost = data?.stockValue !== null && data?.stockValue !== undefined;
  const value = (v: number | null) => (v === null ? "—" : money(v));

  const exportCsv = () => {
    if (!data) return;
    const rows: Array<Array<string | number | null>> = [
      ...data.byCategory.map((r) => ["Valor por categoria", r.name, null, r.value]),
      ...data.byOrder.map((r) => ["Consumo por obra", `${r.number} ${r.title}`, null, r.value]),
      ...data.byCostCenter.map((r) => ["Consumo por centro de custo", r.name, null, r.value]),
      ...data.topItems.map((r) => ["Itens mais usados", r.name, r.out, r.value]),
      ["Ajustes", `${data.adjustments.count} linha(s)`, null, data.adjustments.value],
    ];
    downloadCsv(`relatorio-estoque-${data.from}-a-${data.to}.csv`, ["Relatório", "Nome", "Quantidade", "Valor"], rows);
  };

  const block = (title: string, hint: string, children: React.ReactNode) => (
    <section className="rounded-card border bg-card p-4">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="mt-2">{children}</div>
    </section>
  );
  const list = (rows: Array<{ key: string | number; label: React.ReactNode; right: React.ReactNode }>, empty: string) => rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
    <ul className="divide-y text-sm">{rows.map((row) => <li key={row.key} className="py-1.5 flex items-center justify-between gap-3"><span className="min-w-0 truncate">{row.label}</span><span className="tabular-nums shrink-0">{row.right}</span></li>)}</ul>
  );

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Relatórios do estoque</h1>
          <p className="text-sm text-muted-foreground">{data ? `De ${dateBr(data.from)} a ${dateBr(data.to)}` : "Sem período escolhido: os últimos 30 dias."}{!seesCost && data ? " Valores só para quem vê custos." : ""}</p>
        </div>
        <Button type="button" variant="outline" disabled={!data} onClick={exportCsv}><Icon name="download" className="w-4 h-4 mr-1" /> Exportar planilha</Button>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 my-4 p-4 rounded-card border bg-card">
        <div className="w-full sm:w-44"><CalendarPicker mode="single" name="from" className="w-full" value={from} placeholder="De" fromYear={2020} toYear={2040} onValueChange={(_, v) => setFrom(String(v ?? ""))} /></div>
        <div className="w-full sm:w-44"><CalendarPicker mode="single" name="to" className="w-full" value={to} placeholder="Até" fromYear={2020} toYear={2040} onValueChange={(_, v) => setTo(String(v ?? ""))} /></div>
        {(from || to) && <Button type="button" variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); }}>Últimos 30 dias</Button>}
      </div>
      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {isLoading && <div className="grid lg:grid-cols-2 gap-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-48 w-full" />)}</div>}
      {data && (
        <div className="grid lg:grid-cols-2 gap-4 items-start">
          {block("Valor parado por categoria", seesCost ? `Saldo de hoje pelo custo médio: ${money(data.stockValue)}` : "Saldo de hoje pelo custo médio",
            list(data.byCategory.map((r) => ({ key: r.name, label: r.name, right: value(r.value) })), "Nenhum saldo."))}
          {block("Consumo por obra", "Material que contou no custo das obras (saídas menos sobras devolvidas)",
            list(data.byOrder.map((r) => ({ key: r.id, label: <Link to="/servicos/ordens-de-servico/$orderId" params={{ orderId: String(r.id) }} className="hover:underline">{r.number} · {r.title}</Link>, right: value(r.value) })), "Nenhum consumo em obra no período."))}
          {block("Consumo por centro de custo", "Consumo interno e EPI fora de obra",
            list(data.byCostCenter.map((r) => ({ key: r.name, label: r.name, right: value(r.value) })), "Nenhum consumo interno no período."))}
          {block("Itens mais usados", "O que mais saiu dos locais de estoque",
            list(data.topItems.map((r) => ({ key: r.id, label: <Link to="/suprimentos/estoque/itens/$itemId" params={{ itemId: String(r.id) }} className="hover:underline">{r.name}</Link>, right: <>{qty(r.out)} {r.unit}{r.value !== null ? ` · ${money(r.value)}` : ""}</> })), "Nada saiu no período."))}
          {block("Ajustes", "Correções manuais e de inventário no período", (
            <p className="text-sm">{data.adjustments.count} linha(s) de ajuste{data.adjustments.value !== null ? <> · saldo em valor <span className={data.adjustments.value < 0 ? "text-red-600 dark:text-red-400 font-semibold" : "font-semibold"}>{money(data.adjustments.value)}</span></> : ""}. <Link to="/suprimentos/estoque/movimentacoes" className="text-primary underline">Ver movimentações</Link></p>
          ))}
        </div>
      )}
    </>
  );
}
