import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import Icon from "@/components/general-components/Icon";
import KanbanView, { KanbanColumn } from "@/components/general-components/KanbanView";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import StatusChips from "@/components/general-components/StatusChips";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import ViewToggle, { useStoredView } from "@/components/general-components/ViewToggle";
import { errorMessage } from "../../comercial/-shared/commercial";
import {
  MoveDialog, ORDERS_ABILITY, ORDERS_KEY, ORDER_MOVES, ORDER_STAGES, ORDER_STATUS_LABEL, OrderList, OrderRow, OrderStatus,
  nextStage, ordersApi, periodText,
} from "../-shared/orders";
import OrderRowActions from "./-components/OrderRowActions";
import { CustomerOrder, OrderProgress, orderColumns } from "./-components/orderColumns";

export const Route = createFileRoute("/_authenticated/servicos/_ordens/ordens-de-servico")({
  component: OrdersPage,
});

const COLUMNS: KanbanColumn[] = ORDER_STAGES.map(({ id, name, color }) => ({ id, name, value: id, color }));
const KANBAN_LIMIT = 200;
const LIMIT = 20;

/** Ordens de serviço: o quadro da operação. Cada OS nasce de uma proposta de serviço aceita. */
function OrdersPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const [view, changeView] = useStoredView("worksafe.servicos.os.view");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [moving, setMoving] = useState<{ order: OrderRow; target: OrderStatus } | null>(null);
  // refaz o quadro quando um arrasto não vira passagem (ou enquanto o formulário da passagem não é confirmado)
  const [boardKey, setBoardKey] = useState(0);
  const kanban = view === "kanban";

  const params = kanban
    ? { page: 0, limit: KANBAN_LIMIT, ...(search.trim() ? { search: search.trim() } : {}) }
    : { page, limit: LIMIT, ...(status === "sem_rdo" ? { noReportToday: 1 } : status ? { status } : {}), ...(search.trim() ? { search: search.trim() } : {}) };
  const { data, isLoading, error } = useQuery({
    queryKey: [ORDERS_KEY, params],
    queryFn: () => ordersApi.get<OrderList>("", params),
    placeholderData: (previous) => previous,
  });
  const open = (id: number) => navigate({ to: "/servicos/ordens-de-servico/$orderId", params: { orderId: String(id) } });

  if (!can(`view_${ORDERS_ABILITY}`)) return null;
  const canUpdate = can(`update_${ORDERS_ABILITY}`);
  const summary = data?.summary ?? {};
  const activeCount = ORDER_STAGES.reduce((sum, stage) => sum + (summary[stage.id] ?? 0), 0);

  /** Arrastar um cartão: só vira passagem se ela existir; a etapa só muda quando o formulário é confirmado. */
  const drop = (target: string | number, _id: string | number, order: OrderRow) => {
    setBoardKey((value) => value + 1);
    const to = String(target) as OrderStatus;
    if (to === order.status) return;
    if (!canUpdate) return toast({ title: "Sem permissão para mudar a etapa", variant: "destructive" });
    if (!ORDER_MOVES[order.status].includes(to)) {
      const next = nextStage(order.status);
      return toast({
        title: `De "${ORDER_STATUS_LABEL[order.status]}" não dá para ir direto para "${ORDER_STATUS_LABEL[to]}"`,
        description: next ? `O próximo passo é "${ORDER_STATUS_LABEL[next]}".` : undefined, variant: "destructive",
      });
    }
    setMoving({ order, target: to });
  };

  const move = (row: OrderRow, target: OrderStatus) => setMoving({ order: row, target });
  const rowMenu = (row: OrderRow, onCard = false) => <OrderRowActions row={row} canUpdate={canUpdate} onOpen={open} onMove={move} onCard={onCard} />;
  const empty = status === "sem_rdo" ? "Todas as obras em execução já têm RDO hoje." : search || status ? "Nenhuma ordem de serviço com esses filtros." : "Nenhuma ordem de serviço ainda. Ela nasce sozinha quando uma proposta de serviço é aceita.";

  return (
    <>
      <PageHeader title="Ordens de serviço" description="Cada proposta de serviço aceita vira uma OS: mobilizar, agendar, executar e concluir." />

      <ListCard>
        <ViewToggle view={view} onChange={(next) => { changeView(next); setPage(0); }} />
        {!kanban && (
          <StatusChips ariaLabel="Etapa" value={status} onChange={(value) => { setStatus(value); setPage(0); }}
            options={[
              { value: "", label: "Todas as etapas", count: activeCount },
              ...ORDER_STAGES.map(({ id, name, color }) => ({ value: id as string, label: name, count: summary[id] ?? 0, color })),
              { value: "cancelada", label: "Canceladas", count: summary.cancelada ?? 0 },
              ...((summary.em_execucao ?? 0) > 0 ? [{ value: "sem_rdo", label: "Sem RDO hoje" }] : []),
            ]} />
        )}
        <ListToolbar search={{ value: search, onChange: (text) => { setSearch(text); setPage(0); }, placeholder: "Buscar por número, título ou cliente..." }} />

        {kanban && error && <p className="text-sm text-destructive font-medium">Erro: {errorMessage(error)}</p>}
        {kanban && !error && (
          <div>
            <KanbanView key={boardKey} data={data?.rows ?? []} columns={COLUMNS} statusField="status" isLoading={isLoading} storageKey="worksafe.servicos.os.kanban.hidden" columnWidth={270}
              emptyMessage={empty} onStatusChange={drop}>
              {(row: OrderRow) => (
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" className="flex-1 min-w-0 overflow-hidden text-left" onClick={() => open(row.id)}>
                      <p className="font-medium text-sm truncate">{row.customer.name}</p>
                      <p className="text-xs text-muted-foreground truncate tabular-nums">{row.number} · {row.title}</p>
                    </button>
                    {rowMenu(row, true)}
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-2"><Icon name="calendar" className="w-3 h-3 shrink-0" /> <span className={row.late ? "font-semibold text-red-600 dark:text-red-400" : ""}>{periodText(row)}{row.late ? " · atrasada" : ""}</span></p>
                    {row.responsible && <p className="flex items-center gap-2 truncate"><Icon name="user" className="w-3 h-3 shrink-0" /> {row.responsible}</p>}
                    <p className="truncate"><CustomerOrder row={row} /></p>
                  </div>
                  {row.progress && row.progress.done !== null && <div className="pt-2 border-t"><OrderProgress row={row} /></div>}
                  {(row.status === "a_liberar" || row.status === "a_mobilizar" || row.status === "agendada") && row.checklist.total > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Mobilização</span><span className="tabular-nums">{row.checklist.done}/{row.checklist.total}</span></div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${(row.checklist.done / row.checklist.total) * 100}%` }} /></div>
                    </div>
                  )}
                </div>
              )}
            </KanbanView>
          </div>
        )}
        {kanban && data && data.total > KANBAN_LIMIT && (
          <p className="text-xs text-muted-foreground">O kanban mostra {KANBAN_LIMIT} de {data.total} ordens de serviço. Use a busca ou a visão em lista para chegar às demais.</p>
        )}

        {!kanban && (
          <>
            <DataTable rows={data?.rows} columns={orderColumns} getRowId={(row) => row.id} ariaLabel="Ordens de serviço" minWidth={880}
              loading={isLoading} error={error ? errorMessage(error) : null}
              onRowClick={(row) => open(row.id)} actions={(row) => rowMenu(row)}
              empty={<EmptyState icon={search || status ? "search-x" : "inbox"} title={empty} />} />
            <ListFooter total={data?.total ?? 0} page={page} limit={LIMIT} limits={[LIMIT]} onPageChange={setPage} />
          </>
        )}
        {(summary.cancelada ?? 0) > 0 && (kanban || !status) && (
          <p className="text-xs text-muted-foreground">{summary.cancelada} ordem(ns) de serviço cancelada(s) não aparecem aqui; na visão em lista, filtre por "Canceladas".</p>
        )}
      </ListCard>

      {moving && <MoveDialog order={moving.order} target={moving.target} onClose={() => setMoving(null)} />}
    </>
  );
}
