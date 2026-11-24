import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Skeleton } from "@/components/ui/skeleton";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { decimal, errorMessage, money } from "../../comercial/-shared/commercial";
import { ORDERS_ABILITY, OrderStageBadge, ordersApi } from "../-shared/orders";
import { COSTS_PERMISSION, MarginTag, RESULTS_KEY, ResultList, Versus } from "../-shared/results";

export const Route = createFileRoute("/_authenticated/servicos/_ordens/resultado-das-obras")({
  component: ResultsPage,
});

const VIEWS = [{ id: "andamento", name: "Em andamento" }, { id: "terminadas", name: "Concluídas e encerradas" }];

/** Resumo para a gestão: quanto cada obra deve dar de lucro, contra o que a proposta previu. */
function ResultsPage() {
  const { can } = useVerify();
  const [view, setView] = useState("");
  const [search, setSearch] = useState("");
  const allowed = can(`view_${ORDERS_ABILITY}`) && can(COSTS_PERMISSION);
  const params = { ...(view ? { view } : {}), ...(search.trim() ? { search: search.trim() } : {}) };
  const { data, isLoading, error } = useQuery({
    queryKey: [RESULTS_KEY, params], enabled: allowed,
    queryFn: () => ordersApi.get<ResultList>("results", params),
    placeholderData: (previous) => previous,
  });
  if (!allowed) return null;
  const totals = data?.totals;

  return (
    <>
      <div>
        <h1 className="text-xl font-bold">Resultado das obras</h1>
        <p className="text-sm text-muted-foreground">O que cada proposta previu de lucro e como cada obra deve terminar, pelo que já foi gasto, comprado e feito.</p>
      </div>

      <div className="my-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-card border bg-card p-4">
          <p className="text-xs text-muted-foreground">Receita das obras</p>
          <p className="text-xl font-semibold tabular-nums">{totals ? money(totals.budget.revenue) : "—"}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{totals ? `${totals.orders} obra${totals.orders === 1 ? "" : "s"} · faturado ${money(totals.realized.revenue)}` : ""}</p>
        </div>
        <div className="rounded-card border bg-card p-4">
          <p className="text-xs text-muted-foreground">Lucro orçado</p>
          <p className="text-xl font-semibold tabular-nums">{totals ? money(totals.budget.profit) : "—"}</p>
          <p className="text-xs">{totals && <MarginTag margin={totals.budget.margin} />}</p>
        </div>
        <div className="rounded-card border bg-card p-4">
          <p className="text-xs text-muted-foreground">Lucro projetado</p>
          <p className={cn("text-xl font-semibold tabular-nums", totals && totals.projected.profit < 0 && "text-red-600 dark:text-red-400")}>{totals ? money(totals.projected.profit) : "—"}</p>
          <p className="text-xs">{totals && <MarginTag margin={totals.projected.margin} />}</p>
        </div>
        <div className="rounded-card border bg-card p-4">
          <p className="text-xs text-muted-foreground">Abaixo do orçado</p>
          <p className={cn("text-xl font-semibold tabular-nums", totals && totals.below > 0 && "text-red-600 dark:text-red-400")}>{totals ? totals.below : "—"}</p>
          <p className="text-xs text-muted-foreground">{totals ? (totals.below === 1 ? "obra caminha para lucrar menos que o previsto" : "obras caminham para lucrar menos que o previsto") : ""}</p>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-4 p-4 rounded-card border bg-card">
        <div className="w-full xl:w-64">
          <Select name="view" state={view} clearable placeholder="Todas as obras" modal={false} options={VIEWS} onChange={(_, value) => setView(String(value ?? ""))} />
        </div>
        <div className="w-full xl:w-80">
          <Input name="search" value={search} onValueChange={(_, value) => setSearch(String(value))} placeholder="Buscar por número, título ou cliente..." icon="search" />
        </div>
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {!error && (
        <div className="rounded-card border bg-card overflow-hidden">
          <div className="hidden lg:flex items-center gap-3 py-2.5 border-b px-4 font-semibold text-[12.5px] text-muted-foreground">
            <div className="flex-[2]">Obra</div>
            <div className="flex-1">Etapa</div>
            <div className="flex-1 text-right">Receita</div>
            <div className="flex-1 text-right">Lucro orçado</div>
            <div className="flex-[1.6] text-right">Lucro projetado</div>
          </div>
          {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 w-full my-1" />)}
          {!isLoading && !data?.rows.length && <p className="p-6 text-sm text-muted-foreground">Nenhuma obra aqui. As ordens de serviço nascem das propostas de serviço aceitas.</p>}
          {data?.rows.map((row) => (
            <div key={row.id} className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-3 px-4 py-2.5 border-b border-border/70 last:border-b-0 hover:bg-muted/40 transition-colors text-sm hover:bg-muted/40">
              <div className="lg:flex-[2] min-w-0">
                <p className="font-medium truncate">{row.customer}</p>
                <p className="text-xs text-muted-foreground truncate">
                  <Link to="/servicos/ordens-de-servico/$orderId" params={{ orderId: String(row.id) }} className="font-semibold tabular-nums underline hover:text-foreground">{row.number}</Link> · {row.title}
                </p>
              </div>
              <div className="lg:flex-1">
                <OrderStageBadge status={row.status} />
                <p className="text-xs text-muted-foreground tabular-nums">
                  {row.frozen ? "resultado congelado" : row.progress !== null ? `${decimal(row.progress, 0)}% feito` : ""}
                  {!row.frozen && row.pending > 0 ? `${row.progress !== null ? " · " : ""}${row.pending} em aberto` : ""}
                </p>
              </div>
              <div className="lg:flex-1 lg:text-right tabular-nums"><span className="lg:hidden text-xs text-muted-foreground">Receita: </span>{money(row.budget.revenue)}</div>
              <div className="lg:flex-1 lg:text-right tabular-nums">
                <span className="lg:hidden text-xs text-muted-foreground">Lucro orçado: </span>{money(row.budget.profit)}
                <p className="text-xs"><MarginTag margin={row.budget.margin} showLabel={false} /></p>
              </div>
              <div className="lg:flex-[1.6] lg:text-right tabular-nums">
                <span className="lg:hidden text-xs text-muted-foreground">Lucro projetado: </span>
                <span className={cn("font-semibold", row.projected.profit < 0 && "text-red-600 dark:text-red-400")}>{money(row.projected.profit)}</span>
                <p className="text-xs"><MarginTag margin={row.projected.margin} showLabel={false} /> · <Versus projected={row.projected.profit} budget={row.budget.profit} /></p>
              </div>
            </div>
          ))}
        </div>
      )}
      {data && data.rows.length >= 100 && <p className="mt-3 text-xs text-muted-foreground">Mostrando as 100 obras mais recentes. Use a busca para chegar às demais.</p>}
    </>
  );
}
