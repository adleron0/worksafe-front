import { clickableRow } from "@/utils/clickable-row";
import tailwindUtils from "@/utils/tailwind.utils";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import { dateBr, errorMessage } from "../../comercial/-shared/commercial";
import { ORDERS_ABILITY, RDO_PERMISSION } from "../-shared/orders";
import { recentReportColumns } from "./-components/recentReportColumns";
import { RECENT_REPORTS_KEY, RecentReports, reportsApi } from "../-shared/reports";

export const Route = createFileRoute("/_authenticated/servicos/_ordens/diario-de-obra")({
  component: DiaryPage,
});

/** A tela do encarregado: as obras em andamento, com o RDO de hoje a um toque, e os últimos RDOs. */
function DiaryPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: [RECENT_REPORTS_KEY], queryFn: () => reportsApi.get<RecentReports>("service-reports") });
  if (!can(`view_${ORDERS_ABILITY}`)) return null;
  const canEdit = can(RDO_PERMISSION);
  return (
    <>
      <PageHeader title="Diário de obra (RDO)" description="Lance o relatório de cada dia de obra: equipe, horas, o que foi feito e o avanço." />

      {error && <p className="my-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {isLoading && <Skeleton className="h-24 w-full my-4" />}

      {data && (
        <>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Obras em andamento</h2>
          {data.running.length === 0 && <p className="rounded-card border bg-card p-4 text-sm text-muted-foreground">Nenhuma obra em execução. O RDO é liberado quando a execução da ordem de serviço é iniciada.</p>}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.running.map((order) => {
              const draft = order.todayReports.find((report) => report.status !== "fechado");
              const closed = order.todayReports.length > 0 && !draft;
              return (
                <div key={order.id} {...clickableRow()} className={`rounded-card border bg-card p-4 grid gap-2 hover:bg-card ${tailwindUtils.cardClickable}`}>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{order.customer}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      <Link to="/servicos/ordens-de-servico/$orderId" params={{ orderId: String(order.id) }} className="underline hover:text-foreground tabular-nums">{order.number}</Link> · {order.title}
                    </p>
                    <p className="text-xs text-muted-foreground">Começou em {dateBr(order.startedAt)}{order.plannedEnd ? ` · término previsto ${dateBr(order.plannedEnd)}` : ""}</p>
                    {order.location && <p className="text-xs text-muted-foreground truncate">{order.location}</p>}
                  </div>
                  {draft ? (
                    <Button asChild variant="outline"><Link to="/servicos/ordens-de-servico/$orderId/rdo/$reportId" params={{ orderId: String(order.id), reportId: String(draft.id) }}><Icon name="pencil" className="w-4 h-4 mr-1" /> Continuar o RDO de hoje</Link></Button>
                  ) : closed ? (
                    <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-1"><Icon name="check" className="w-4 h-4" /> RDO de hoje fechado</p>
                  ) : canEdit ? (
                    <Button asChild><Link to="/servicos/ordens-de-servico/$orderId/rdo/$reportId" params={{ orderId: String(order.id), reportId: "novo" }}><Icon name="plus" className="w-4 h-4 mr-1" /> RDO de hoje</Link></Button>
                  ) : <p className="text-sm text-muted-foreground">Sem RDO de hoje.</p>}
                </div>
              );
            })}
          </div>

          <h2 className="mt-6 mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Últimos RDOs</h2>
          <ListCard>
            <DataTable rows={data.rows} columns={recentReportColumns} getRowId={(row) => row.id} ariaLabel="Últimos RDOs" minWidth={820}
              onRowClick={(row) => navigate({ to: "/servicos/ordens-de-servico/$orderId/rdo/$reportId", params: { orderId: String(row.orderId), reportId: String(row.id) } })}
              empty={<EmptyState title="Nenhum RDO lançado ainda." />} />
          </ListCard>
        </>
      )}
    </>
  );
}
