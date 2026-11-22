import { clickableRow } from "@/utils/clickable-row";
import tailwindUtils from "@/utils/tailwind.utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import KanbanView, { KanbanColumn } from "@/components/general-components/KanbanView";
import Pagination from "@/components/general-components/Pagination";
import Select from "@/components/general-components/Select";
import ViewToggle, { useStoredView } from "@/components/general-components/ViewToggle";
import { errorMessage } from "../../comercial/-shared/commercial";
import {
  MoveDialog, ORDERS_ABILITY, ORDERS_KEY, ORDER_MOVES, ORDER_STAGES, ORDER_STATUS_LABEL, OrderList, OrderRow, OrderStageBadge, OrderStatus,
  isForward, moveLabel, nextStage, ordersApi, periodText,
} from "../-shared/orders";

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
    : { page, limit: LIMIT, ...(status ? { status } : {}), ...(search.trim() ? { search: search.trim() } : {}) };
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

  const rowMenu = (row: OrderRow, onCard = false) => (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button className={onCard ? "h-6 w-6 p-0 shrink-0" : "h-8 w-8 rounded-full p-0"} variant={onCard ? "ghost" : "outline"} size="sm" aria-label={`Ações de ${row.number}`}>
          <Icon name="ellipsis-vertical" className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="gap-2" onSelect={() => open(row.id)}><Icon name="eye" className="w-3 h-3" /> Abrir</DropdownMenuItem>
        {canUpdate && ORDER_MOVES[row.status].length > 0 && <DropdownMenuSeparator />}
        {canUpdate && ORDER_MOVES[row.status].map((target) => (
          <DropdownMenuItem key={target} className="gap-2" onSelect={() => setMoving({ order: row, target })}>
            <Icon name={target === "cancelada" ? "ban" : isForward(row.status, target) || row.status === "cancelada" ? "arrow-right" : "undo-2"} className="w-3 h-3" /> {moveLabel(row.status, target)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const order = (row: OrderRow) => (row.customerOrderNumber
    ? <span className="inline-flex items-center gap-1"><Icon name="file-check" className="w-3 h-3 shrink-0" /> Pedido {row.customerOrderNumber}</span>
    : <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400"><Icon name="file-question" className="w-3 h-3 shrink-0" /> Sem pedido do cliente</span>);
  const empty = search || status ? "Nenhuma ordem de serviço com esses filtros." : "Nenhuma ordem de serviço ainda. Ela nasce sozinha quando uma proposta de serviço é aceita.";

  return (
    <>
      <div>
        <h1 className="text-xl font-bold">Ordens de serviço</h1>
        <p className="text-sm text-muted-foreground">Cada proposta de serviço aceita vira uma OS: mobilizar, agendar, executar e concluir.</p>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center gap-3 my-4 p-4 rounded-lg border">
        <ViewToggle view={view} onChange={(next) => { changeView(next); setPage(0); }} />
        {!kanban && (
          <div className="w-full xl:w-60">
            <Select name="status" state={status} clearable placeholder={`Todas as etapas (${activeCount})`} modal={false}
              options={[...ORDER_STAGES.map(({ id, name }) => ({ id, name: `${name} (${summary[id] ?? 0})` })), { id: "cancelada", name: `Canceladas (${summary.cancelada ?? 0})` }]}
              onChange={(_, value) => { setStatus(String(value ?? "")); setPage(0); }} />
          </div>
        )}
        <div className="w-full xl:w-80">
          <Input name="search" value={search} onValueChange={(_, value) => { setSearch(String(value)); setPage(0); }} placeholder="Buscar por número, título ou cliente..." icon="search" />
        </div>
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}

      {kanban && !error && (
        <div className="p-2">
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
                  <p className="truncate">{order(row)}</p>
                </div>
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
        <p className="mt-3 text-xs text-muted-foreground">O kanban mostra {KANBAN_LIMIT} de {data.total} ordens de serviço. Use a busca ou a visão em lista para chegar às demais.</p>
      )}

      {!kanban && !error && (
        <div className="rounded-lg border overflow-hidden">
          <div className="hidden lg:flex items-center py-2 px-4 bg-primary font-semibold text-sm text-inverse-foreground">
            <div className="w-36">Número</div>
            <div className="flex-1">Cliente e serviço</div>
            <div className="w-44">Etapa</div>
            <div className="w-64">Quando</div>
            <div className="w-24">Mobilização</div>
            <div className="w-16 text-right">Ações</div>
          </div>
          {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 w-full my-1" />)}
          {!isLoading && !data?.rows.length && <p className="p-6 text-sm text-muted-foreground">{empty}</p>}
          {data?.rows.map((row) => (
            <div key={row.id} {...clickableRow(() => open(row.id))} className={`relative flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-3 last:border-b-0 text-sm ${tailwindUtils.itemClickable}`}>
              <div className="lg:w-36">
                <button type="button" className="font-semibold tabular-nums hover:underline text-left" onClick={() => open(row.id)}>{row.number}</button>
                <p className="text-xs text-muted-foreground">{order(row)}</p>
              </div>
              <div className="flex-1 min-w-0 pr-10 lg:pr-4">
                <p className="font-medium truncate">{row.customer.name}</p>
                <p className="text-xs text-muted-foreground truncate">{row.title}{row.responsible ? ` · ${row.responsible}` : ""}</p>
              </div>
              <div className="lg:w-44"><OrderStageBadge status={row.status} late={row.late} /></div>
              <div className="lg:w-64 text-muted-foreground text-xs">{periodText(row)}</div>
              <div className="lg:w-24 text-muted-foreground tabular-nums"><span className="lg:hidden text-xs">Mobilização: </span>{row.checklist.done}/{row.checklist.total}</div>
              <div className="absolute top-2 right-2 lg:static lg:w-16 flex justify-end">{rowMenu(row)}</div>
            </div>
          ))}
        </div>
      )}
      {!kanban && data && data.total > LIMIT && (
        <div className="mt-4"><Pagination totalItems={data.total} itemsPerPage={LIMIT} currentPage={page} onPageChange={setPage} maxVisiblePages={5} /></div>
      )}
      {(summary.cancelada ?? 0) > 0 && (kanban || !status) && (
        <p className="mt-3 text-xs text-muted-foreground">{summary.cancelada} ordem(ns) de serviço cancelada(s) não aparecem aqui; na visão em lista, filtre por "Canceladas".</p>
      )}

      {moving && <MoveDialog order={moving.order} target={moving.target} onClose={() => setMoving(null)} />}
    </>
  );
}
