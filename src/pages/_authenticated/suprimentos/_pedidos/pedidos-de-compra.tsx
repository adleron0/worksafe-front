import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Icon from "@/components/general-components/Icon";
import KanbanView, { KanbanColumn } from "@/components/general-components/KanbanView";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import StatusChips, { StatusChipOption } from "@/components/general-components/StatusChips";
import DataTable, { DataColumn, EmptyState, RowActionsTrigger } from "@/components/general-components/DataTable";
import ViewToggle, { useStoredView } from "@/components/general-components/ViewToggle";
import { errorMessage, money } from "../../comercial/-shared/commercial";
import {
  GROUP_LABEL, PURCHASES_ABILITY, PURCHASES_KEY, PURCHASE_MOVES, PURCHASE_STAGES, PURCHASE_STATUS_LABEL, PurchaseList, PurchaseMoveDialog, PurchaseRow, PurchaseStageBadge,
  PurchaseStatus, allowedMoves, isForward, moveLabel, needsApproval, nextStage, purchaseWhen, purchasesApi, targetOf,
} from "../-shared/purchases";

const STATUSES: PurchaseStatus[] = ["solicitado", "aprovado", "comprado", "recebido", "recusado", "cancelado"];
export const Route = createFileRoute("/_authenticated/suprimentos/_pedidos/pedidos-de-compra")({
  component: PurchasesPage,
  // ?status=comprado abre a lista já filtrada (ex.: cartão "Recebimentos pendentes" do estoque)
  validateSearch: (search: Record<string, unknown>): { status?: PurchaseStatus } =>
    (STATUSES.includes(search.status as PurchaseStatus) ? { status: search.status as PurchaseStatus } : {}),
});

const COLUMNS: KanbanColumn[] = PURCHASE_STAGES.map(({ id, name, color }) => ({ id, name, value: id, color }));
const KANBAN_LIMIT = 200;
const LIMITS = [10, 20, 50, 100];
const OFF: PurchaseStatus[] = ["recusado", "cancelado"];

/** Pedidos de compra: o quadro de Suprimentos (solicitar, aprovar, comprar, receber). */
function PurchasesPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const [view, changeView] = useStoredView("worksafe.suprimentos.pc.view");
  const initial = Route.useSearch();
  const [status, setStatus] = useState<string>(initial.status ?? "");
  // filtro de etapa só existe na lista: chegando filtrado, abre em lista
  useEffect(() => { if (initial.status) changeView("lista"); }, [initial.status]); // eslint-disable-line react-hooks/exhaustive-deps
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [moving, setMoving] = useState<{ purchase: PurchaseRow; target: PurchaseStatus } | null>(null);
  // refaz o quadro quando um arrasto não vira passagem (ou enquanto o formulário da passagem não é confirmado)
  const [boardKey, setBoardKey] = useState(0);
  const kanban = view === "kanban";

  const params = kanban
    ? { page: 0, limit: KANBAN_LIMIT, ...(search.trim() ? { search: search.trim() } : {}) }
    : { page, limit, ...(status ? { status } : {}), ...(search.trim() ? { search: search.trim() } : {}) };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [PURCHASES_KEY, params],
    queryFn: () => purchasesApi.get<PurchaseList>("", params),
    placeholderData: (previous) => previous,
  });
  const open = (id: number | "novo") => navigate({ to: "/suprimentos/pedidos-de-compra/$purchaseId", params: { purchaseId: String(id) } });

  if (!can(`view_${PURCHASES_ABILITY}`)) return null;
  const canUpdate = can(`update_${PURCHASES_ABILITY}`);
  const canApprove = can(`approve_${PURCHASES_ABILITY}`);
  const summary = data?.summary ?? {};
  const activeCount = PURCHASE_STAGES.reduce((sum, stage) => sum + (summary[stage.id]?.count ?? 0), 0);
  const offCount = OFF.reduce((sum, id) => sum + (summary[id]?.count ?? 0), 0);

  /** Arrastar um cartão: só vira passagem se ela existir e a pessoa puder; a etapa só muda quando o formulário é confirmado. */
  const drop = (target: string | number, _id: string | number, purchase: PurchaseRow) => {
    setBoardKey((value) => value + 1);
    const to = String(target) as PurchaseStatus;
    if (to === purchase.status) return;
    if (!canUpdate) return toast({ title: "Sem permissão para mudar a etapa", variant: "destructive" });
    if (!PURCHASE_MOVES[purchase.status].includes(to)) {
      const next = nextStage(purchase.status, true);
      return toast({
        title: `De "${PURCHASE_STATUS_LABEL[purchase.status]}" não dá para ir direto para "${PURCHASE_STATUS_LABEL[to]}"`,
        description: next ? `O próximo passo é "${PURCHASE_STATUS_LABEL[next]}".` : undefined, variant: "destructive",
      });
    }
    if (needsApproval(purchase.status, to) && !canApprove) return toast({ title: "Só quem tem a permissão de aprovação aprova pedidos de compra", variant: "destructive" });
    setMoving({ purchase, target: to });
  };

  const rowMenu = (row: PurchaseRow, onCard = false) => {
    const moves = canUpdate ? allowedMoves(row.status, canApprove) : [];
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          {onCard
            ? <Button className="h-6 w-6 p-0 shrink-0" variant="ghost" size="sm" aria-label={`Ações de ${row.number}`}><Icon name="ellipsis-vertical" className="w-3 h-3" /></Button>
            : <RowActionsTrigger label={`Ações de ${row.number}`} />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="gap-2" onSelect={() => open(row.id)}><Icon name="eye" className="w-3 h-3" /> Abrir</DropdownMenuItem>
          {moves.length > 0 && <DropdownMenuSeparator />}
          {moves.map((target) => (
            <DropdownMenuItem key={target} className="gap-2" onSelect={() => setMoving({ purchase: row, target })}>
              <Icon name={OFF.includes(target) ? "ban" : isForward(row.status, target) || OFF.includes(row.status) ? "arrow-right" : "undo-2"} className="w-3 h-3" /> {moveLabel(row.status, target)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };
  const empty = search || status ? "Nenhum pedido de compra com esses filtros." : "Nenhum pedido de compra ainda.";

  const filtered = !!(search || status);
  const statusOptions: StatusChipOption[] = [
    { value: "todas", label: "Todas as etapas", count: activeCount },
    ...PURCHASE_STAGES.map(({ id, name, color }) => ({ value: id, label: name, color, count: summary[id]?.count ?? 0 })),
    { value: "recusado", label: "Recusados", color: "#ef4444", count: summary.recusado?.count ?? 0 },
    { value: "cancelado", label: "Cancelados", color: "#6b7280", count: summary.cancelado?.count ?? 0 },
  ];
  const columns: DataColumn<PurchaseRow>[] = [
    {
      id: "number", header: "Número", className: "w-32", cell: (row) => (
        <div>
          <p className="font-semibold tabular-nums">{row.number}</p>
          <p className="text-xs text-muted-foreground">{GROUP_LABEL[row.group] ?? row.group}</p>
        </div>
      ),
    },
    {
      id: "title", header: "Pedido", cell: (row) => (
        <div className="min-w-0 max-w-md">
          <p className="font-medium truncate">{row.title}</p>
          <p className="text-xs text-muted-foreground truncate">{[row.supplier?.name ?? "Sem fornecedor", targetOf(row), row.requestedBy && `pedido por ${row.requestedBy}`].filter(Boolean).join(" · ")}</p>
        </div>
      ),
    },
    { id: "status", header: "Etapa", className: "w-40", cell: (row) => <PurchaseStageBadge status={row.status} late={row.late} /> },
    { id: "when", header: "Prazo", className: "text-muted-foreground text-xs whitespace-nowrap", cell: (row) => purchaseWhen(row) },
    { id: "total", header: "Valor", align: "right", className: "w-32 tabular-nums font-medium", cell: (row) => money(row.total) },
  ];

  return (
    <>
      <PageHeader title="Pedidos de compra" description="Compras, locações e contratação de terceiros: solicitar, aprovar, comprar e receber." />

      <ListCard>
        {!kanban && <StatusChips options={statusOptions} value={status || "todas"} onChange={(value) => { setStatus(value === "todas" ? "" : value); setPage(0); }} ariaLabel="Etapa" />}

        <ListToolbar search={{ value: search, onChange: (text) => { setSearch(text); setPage(0); }, placeholder: "Buscar por número, título ou fornecedor..." }}>
          {(summary.solicitado?.count ?? 0) > 0 && (
            <p className="hidden md:block text-sm text-muted-foreground">Esperando aprovação: <span className="font-semibold text-foreground tabular-nums">{money(summary.solicitado?.total)}</span></p>
          )}
          <ViewToggle view={view} onChange={(next) => { changeView(next); setPage(0); }} />
          {can(`create_${PURCHASES_ABILITY}`) && <Button onClick={() => open("novo")}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Novo pedido</span></Button>}
        </ListToolbar>

        {kanban && error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
        {kanban && !error && (
          <div className="p-2">
            <KanbanView key={boardKey} data={data?.rows ?? []} columns={COLUMNS} statusField="status" isLoading={isLoading} storageKey="worksafe.suprimentos.pc.kanban.hidden" columnWidth={270}
              emptyMessage={empty} onStatusChange={drop}>
              {(row: PurchaseRow) => (
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" className="flex-1 min-w-0 overflow-hidden text-left" onClick={() => open(row.id)}>
                      <p className="font-medium text-sm truncate">{row.title}</p>
                      <p className="text-xs text-muted-foreground truncate tabular-nums">{row.number} · {GROUP_LABEL[row.group] ?? row.group}</p>
                    </button>
                    {rowMenu(row, true)}
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-2 truncate"><Icon name="truck" className="w-3 h-3 shrink-0" /> {row.supplier?.name ?? "Sem fornecedor"}</p>
                    {targetOf(row) && <p className="flex items-center gap-2 truncate"><Icon name={row.rental ? "package" : row.courseClass ? "graduation-cap" : "scroll-text"} className="w-3 h-3 shrink-0" /> {targetOf(row)}</p>}
                    <p className="flex items-center gap-2"><Icon name="calendar" className="w-3 h-3 shrink-0" /> <span className={row.late ? "font-semibold text-red-600 dark:text-red-400" : ""}>{purchaseWhen(row)}{row.late ? " · atrasado" : ""}</span></p>
                  </div>
                  <p className="pt-2 border-t text-sm font-semibold tabular-nums">{money(row.total)}</p>
                </div>
              )}
            </KanbanView>
          </div>
        )}
        {kanban && data && data.total > KANBAN_LIMIT && (
          <p className="text-xs text-muted-foreground">O kanban mostra {KANBAN_LIMIT} de {data.total} pedidos. Use a busca ou a visão em lista para chegar aos demais.</p>
        )}

        {!kanban && (
          <>
            <DataTable rows={data?.rows} columns={columns} getRowId={(row) => row.id} ariaLabel="Pedidos de compra"
              loading={isLoading || isFetching} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
              onRowClick={(row) => open(row.id)} actions={(row) => rowMenu(row)}
              empty={filtered
                ? <EmptyState icon="search-x" title={empty} action={<Button variant="outline" size="sm" onClick={() => { setSearch(""); setStatus(""); setPage(0); }}>Limpar filtros</Button>} />
                : <EmptyState title={empty} action={can(`create_${PURCHASES_ABILITY}`) && <Button size="sm" onClick={() => open("novo")}><Icon name="plus" className="w-4 h-4" /> Novo pedido</Button>} />} />
            <ListFooter total={data?.total ?? 0} page={page} limit={limit} limits={LIMITS} onPageChange={setPage} onLimitChange={(value) => { setLimit(value); setPage(0); }} />
          </>
        )}
        {offCount > 0 && (kanban || !status) && (
          <p className="text-xs text-muted-foreground">{offCount} pedido(s) recusado(s) ou cancelado(s) não aparecem aqui; na visão em lista, filtre por "Recusados" ou "Cancelados".</p>
        )}
      </ListCard>

      {moving && <PurchaseMoveDialog purchase={moving.purchase} target={moving.target} onClose={() => setMoving(null)} />}
    </>
  );
}
