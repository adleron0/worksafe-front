import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import StatusChips from "@/components/general-components/StatusChips";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import { cn } from "@/lib/utils";
import { errorMessage, money } from "../../comercial/-shared/commercial";
import { ORDERS_ABILITY, ordersApi } from "../-shared/orders";
import { COSTS_PERMISSION, MarginTag, RESULTS_KEY, ResultList } from "../-shared/results";
import { resultColumns } from "./-components/resultColumns";

export const Route = createFileRoute("/_authenticated/servicos/_ordens/resultado-das-obras")({
  component: ResultsPage,
});

const VIEWS = [{ value: "", label: "Todas as obras" }, { value: "andamento", label: "Em andamento" }, { value: "terminadas", label: "Concluídas e encerradas" }];

/** Resumo para a gestão: quanto cada obra deve dar de lucro, contra o que a proposta previu. */
function ResultsPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
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
      <PageHeader title="Resultado das obras" description="O que cada proposta previu de lucro e como cada obra deve terminar, pelo que já foi gasto, comprado e feito." />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <ListCard>
        <StatusChips ariaLabel="Obras" value={view} onChange={setView} options={VIEWS} />
        <ListToolbar search={{ value: search, onChange: setSearch, placeholder: "Buscar por número, título ou cliente..." }} />
        <DataTable rows={data?.rows} columns={resultColumns} getRowId={(row) => row.id} ariaLabel="Resultado das obras" minWidth={880}
          loading={isLoading} error={error ? errorMessage(error) : null}
          onRowClick={(row) => navigate({ to: "/servicos/ordens-de-servico/$orderId", params: { orderId: String(row.id) } })}
          empty={<EmptyState title="Nenhuma obra aqui." description="As ordens de serviço nascem das propostas de serviço aceitas." />} />
        {data && data.rows.length >= 100 && <p className="text-xs text-muted-foreground">Mostrando as 100 obras mais recentes. Use a busca para chegar às demais.</p>}
      </ListCard>
    </>
  );
}
