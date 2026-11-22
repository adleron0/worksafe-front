import { clickableRow } from "@/utils/clickable-row";
import tailwindUtils from "@/utils/tailwind.utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
const LIMIT = 20;
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
  const [moving, setMoving] = useState<{ purchase: PurchaseRow; target: PurchaseStatus } | null>(null);
  // refaz o quadro quando um arrasto não vira passagem (ou enquanto o formulário da passagem não é confirmado)
  const [boardKey, setBoardKey] = useState(0);
  const kanban = view === "kanban";

  const params = kanban
    ? { page: 0, limit: KANBAN_LIMIT, ...(search.trim() ? { search: search.trim() } : {}) }
    : { page, limit: LIMIT, ...(status ? { status } : {}), ...(search.trim() ? { search: search.trim() } : {}) };
  const { data, isLoading, error } = useQuery({
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
          <Button className={onCard ? "h-6 w-6 p-0 shrink-0" : "h-8 w-8 rounded-full p-0"} variant={onCard ? "ghost" : "outline"} size="sm" aria-label={`Ações de ${row.number}`}>
            <Icon name="ellipsis-vertical" className="w-3 h-3" />
          </Button>
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

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Pedidos de compra</h1>
          <p className="text-sm text-muted-foreground">Compras, locações e contratação de terceiros: solicitar, aprovar, comprar e receber.</p>
        </div>
        {can(`create_${PURCHASES_ABILITY}`) && <Button onClick={() => open("novo")}><Icon name="plus" className="w-4 h-4 mr-1" /> Novo pedido</Button>}
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center gap-3 my-4 p-4 rounded-lg border">
        <ViewToggle view={view} onChange={(next) => { changeView(next); setPage(0); }} />
        {!kanban && (
          <div className="w-full xl:w-60">
            <Select name="status" state={status} clearable placeholder={`Todas as etapas (${activeCount})`} modal={false}
              options={[...PURCHASE_STAGES, { id: "recusado" as const, name: "Recusados" }, { id: "cancelado" as const, name: "Cancelados" }].map(({ id, name }) => ({ id, name: `${name} (${summary[id]?.count ?? 0})` }))}
              onChange={(_, value) => { setStatus(String(value ?? "")); setPage(0); }} />
          </div>
        )}
        <div className="w-full xl:w-80">
          <Input name="search" value={search} onValueChange={(_, value) => { setSearch(String(value)); setPage(0); }} placeholder="Buscar por número, título ou fornecedor..." icon="search" />
        </div>
        {(summary.solicitado?.count ?? 0) > 0 && (
          <p className="xl:ml-auto text-sm text-muted-foreground">Esperando aprovação: <span className="font-semibold text-foreground tabular-nums">{money(summary.solicitado?.total)}</span></p>
        )}
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}

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
        <p className="mt-3 text-xs text-muted-foreground">O kanban mostra {KANBAN_LIMIT} de {data.total} pedidos. Use a busca ou a visão em lista para chegar aos demais.</p>
      )}

      {!kanban && !error && (
        <div className="rounded-lg border overflow-hidden">
          <div className="hidden lg:flex items-center py-2 px-4 bg-primary font-semibold text-sm text-inverse-foreground">
            <div className="w-36">Número</div>
            <div className="flex-1">Pedido</div>
            <div className="w-40">Etapa</div>
            <div className="w-48">Prazo</div>
            <div className="w-32 text-right pr-4">Valor</div>
            <div className="w-16 text-right">Ações</div>
          </div>
          {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 w-full my-1" />)}
          {!isLoading && !data?.rows.length && <p className="p-6 text-sm text-muted-foreground">{empty}</p>}
          {data?.rows.map((row) => (
            <div key={row.id} {...clickableRow(() => open(row.id))} className={`relative flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-3 last:border-b-0 text-sm ${tailwindUtils.itemClickable}`}>
              <div className="lg:w-36">
                <button type="button" className="font-semibold tabular-nums hover:underline text-left" onClick={() => open(row.id)}>{row.number}</button>
                <p className="text-xs text-muted-foreground">{GROUP_LABEL[row.group] ?? row.group}</p>
              </div>
              <div className="flex-1 min-w-0 pr-10 lg:pr-4">
                <p className="font-medium truncate">{row.title}</p>
                <p className="text-xs text-muted-foreground truncate">{[row.supplier?.name ?? "Sem fornecedor", targetOf(row), row.requestedBy && `pedido por ${row.requestedBy}`].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="lg:w-40"><PurchaseStageBadge status={row.status} late={row.late} /></div>
              <div className="lg:w-48 text-muted-foreground text-xs">{purchaseWhen(row)}</div>
              <div className="lg:w-32 lg:text-right lg:pr-4 tabular-nums font-medium">{money(row.total)}</div>
              <div className="absolute top-2 right-2 lg:static lg:w-16 flex justify-end">{rowMenu(row)}</div>
            </div>
          ))}
        </div>
      )}
      {!kanban && data && data.total > LIMIT && (
        <div className="mt-4"><Pagination totalItems={data.total} itemsPerPage={LIMIT} currentPage={page} onPageChange={setPage} maxVisiblePages={5} /></div>
      )}
      {offCount > 0 && (kanban || !status) && (
        <p className="mt-3 text-xs text-muted-foreground">{offCount} pedido(s) recusado(s) ou cancelado(s) não aparecem aqui; na visão em lista, filtre por "Recusados" ou "Cancelados".</p>
      )}

      {moving && <PurchaseMoveDialog purchase={moving.purchase} target={moving.target} onClose={() => setMoving(null)} />}
    </>
  );
}
