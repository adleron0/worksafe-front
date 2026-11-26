import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { get, patch } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import SideForm from "@/components/general-components/SideForm";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import StatusChips from "@/components/general-components/StatusChips";
import ActionsMenu from "@/components/general-components/ActionsMenu";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { EmptyState, RowActionsTrigger } from "@/components/general-components/DataTable";
import MonthRangePicker from "@/components/general-components/MonthRangePicker";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ApiError } from "@/general-interfaces/api.interface";
import { EntityBadge, EntityFilter, useEntities } from "@/components/general-components/EntitySelect";
import { CHART_KEY, FINANCIAL_ABILITY } from "../-shared/financial";
import { PAYABLES_KEY, PAYABLES_SUMMARY_KEY, Payable, PayableList } from "../-shared/payables";
import {
  ActiveFilters, BulkSettleDialog, DueQuickFilter, FilterPanel, SelectionSummary, SummaryCards,
  countFilters, downloadXlsx, reportBulk, toParams, useSelection, useUrlFilters,
} from "../-shared/ledger";
import PayableSettle from "./-PayableSettle";
import { payableColumns } from "./-payableColumns";

export const Route = createFileRoute("/_authenticated/financeiro/_pagar/pagar")({
  component: Payables,
  validateSearch: (search: Record<string, unknown>) => search as Record<string, string>,
});

const DEFAULT_VIEW = "todas";
const LIMITS = [10, 30, 50, 100, 200];
const OPEN_VIEWS = ["abertas", "atrasadas", "hoje", "semana", "depois"];
type RowAction = "unsettle" | "inactive" | "active";

function Payables() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { filters, set, replace } = useUrlFilters({ view: DEFAULT_VIEW });
  const [openFilters, setOpenFilters] = useState(false);
  const [settling, setSettling] = useState<Payable | null>(null);
  const [bulkSettle, setBulkSettle] = useState(false);
  const view = filters.view || DEFAULT_VIEW;
  const page = Number(filters.page ?? 0);
  const limit = Number(filters.limit ?? 30);

  const params = toParams({ ...filters, view, page: String(page), limit: String(limit) });
  const navigate = useNavigate();
  const { multi } = useEntities();
  const [confirm, setConfirm] = useState<{ item: Payable; action: RowAction } | null>(null);
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<PayableList | undefined, ApiError>({
    queryKey: [PAYABLES_KEY, "ledger", params],
    queryFn: () => get("financial", "payables", params),
    placeholderData: (previous) => previous,
  });
  const selection = useSelection(data?.rows);
  const selectedRows = [...selection.selected.values()];
  const selectedTotal = selectedRows.reduce((sum, row) => sum + Number(row.value), 0);
  const today = data?.today ?? new Date().toISOString().slice(0, 10);
  const summary = data?.summary;

  const refresh = () => { for (const key of [PAYABLES_KEY, PAYABLES_SUMMARY_KEY, "financialBankBalances", CHART_KEY]) queryClient.invalidateQueries({ queryKey: [key] }); };
  const fail = (err: ApiError) => toast({ title: "Não foi possível concluir", description: err.response?.data?.message || "Erro desconhecido.", variant: "destructive" });
  const { mutate: run } = useMutation({
    mutationFn: ({ item, action }: { item: Payable; action: RowAction; done: string }) => patch("financial-payables", `${action}/${item.id}`),
    onSuccess: (_data, { done }) => { toast({ title: done, variant: "success" }); refresh(); },
    onError: fail,
  });
  const { mutate: archiveMany } = useMutation({
    mutationFn: async (ids: number[]) => (await api.post("financial/payables/bulk-archive", { ids })).data,
    onSuccess: (result) => { reportBulk(`${result.archived} ${result.archived === 1 ? "conta excluída" : "contas excluídas"}`, result); selection.clear(); refresh(); },
    onError: fail,
  });

  if (!can(`view_${FINANCIAL_ABILITY}`)) return null;
  const canUpdate = can(`update_${FINANCIAL_ABILITY}`);
  const canCreate = can(`create_${FINANCIAL_ABILITY}`);
  const canArchive = can(`inactive_${FINANCIAL_ABILITY}`);
  const filterCount = countFilters(filters);
  // o cartão segue o recorte da lista; só a API antiga mandava o mês (AAAA-MM)
  const paidHint = summary?.paidPeriod && /^\d{4}-\d{2}$/.test(summary.paidPeriod) ? `${summary.paidPeriod.slice(5, 7)}/${summary.paidPeriod.slice(0, 4)}` : undefined;

  const cards = [
    { view: "atrasadas", label: "Atrasadas", bucket: summary?.overdue, tone: "text-red-600 dark:text-red-400", icon: "triangle-alert", color: "#dc2626" },
    { view: "hoje", label: "Vencem hoje", bucket: summary?.dueToday, tone: "text-amber-600 dark:text-amber-400", icon: "clock", color: "#d97706" },
    { view: "semana", label: "Próximos 7 dias", bucket: summary?.dueWeek, icon: "calendar-days", color: "#3e6f98" },
    { view: "depois", label: "Depois", bucket: summary?.later, icon: "calendar-clock", color: "#78716c" },
    { view: "abertas", label: "Total em aberto", bucket: summary?.open, icon: "wallet" },
    { view: "pagas", label: "Pagas", bucket: summary?.paid, tone: "text-green-600 dark:text-green-400", hint: paidHint, icon: "circle-check", color: "#16a34a" },
  ];
  const pickView = (next: string) => { selection.clear(); set({ view: next }); };
  const openNew = () => navigate({ to: "/financeiro/pagar/nova", search: {} });
  const editRow = (item: Payable) => navigate({ to: "/financeiro/pagar/$payableId", params: { payableId: String(item.id) } });
  const duplicateRow = (item: Payable) => navigate({ to: "/financeiro/pagar/nova", search: { duplicar: String(item.id) } });
  const exportNow = (ids?: number[]) => downloadXlsx("financial/payables/export", ids ? [{ key: "ids", value: ids.join(",") }] : toParams({ ...filters, view }), "contas-a-pagar.xlsx");
  const openSelected = selectedRows.filter((r) => r.status === "aberta" && !r.inactiveAt);
  const chipView = OPEN_VIEWS.includes(view) ? "abertas" : view;
  // contagens no mesmo recorte da lista (o resumo da API segue os filtros); a visão aberta usa o total da busca
  const COUNTS: Record<string, number | undefined> = { todas: summary?.all?.count, abertas: summary?.open?.count, pagas: summary?.paid?.count, excluidas: summary?.excluded?.count };
  const countOf = (id: string) => (id === chipView && data ? data.total : COUNTS[id]);
  const chips = [
    { value: "todas", label: "Todas", color: "hsl(var(--primary))" },
    { value: "abertas", label: "Em aberto", color: "#d97706" },
    { value: "pagas", label: "Pagas", color: "#16a34a" },
    { value: "excluidas", label: "Excluídas", color: "hsl(var(--border))" },
  ].map((chip) => ({ ...chip, count: countOf(chip.value) }));
  const filtered = filterCount > 0 || !!filters.q || !!filters.entityId;
  const baseColumns = payableColumns(today, { order: filters.order, onSort: (order) => set({ order }) });
  const columns = multi
    ? [baseColumns[0], { id: "entity", header: "Empresa", cell: (item: Payable) => <EntityBadge entity={item.entity ?? null} id={item.entityId} /> }, ...baseColumns.slice(1)]
    : baseColumns;
  const CONFIRMS: Record<RowAction, { title: string; description: string; done: string }> = {
    unsettle: { title: "Estornar a baixa?", description: "A conta volta a ficar em aberto e o valor volta para o saldo da conta bancária.", done: "Baixa estornada!" },
    inactive: { title: "Excluir esta conta a pagar?", description: "Ela sai da lista e dos totais. Fica em Excluídas e pode ser restaurada.", done: "Conta excluída!" },
    active: { title: "Restaurar esta conta a pagar?", description: "Ela volta para a lista e para os totais.", done: "Conta restaurada!" },
  };

  const rowActions = (item: Payable) => {
    const isOpen = item.status === "aberta" && !item.inactiveAt;
    const canRestore = !!item.inactiveAt && can(`activate_${FINANCIAL_ABILITY}`);
    return (
      <div className="flex items-center justify-end gap-1">
        {canUpdate && isOpen && <Button size="sm" variant="outline" className="hidden lg:inline-flex h-7 px-2.5" onClick={() => setSettling(item)}>Pagar</Button>}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações de ${item.description}`} /></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canUpdate && isOpen && <DropdownMenuItem className="gap-2" onSelect={() => setSettling(item)}><Icon name="circle-check" className="w-3.5 h-3.5" /> Dar baixa</DropdownMenuItem>}
            {canUpdate && !item.inactiveAt && <DropdownMenuItem className="gap-2" onSelect={() => editRow(item)}><Icon name="pencil" className="w-3.5 h-3.5" /> Editar</DropdownMenuItem>}
            {canCreate && <DropdownMenuItem className="gap-2" onSelect={() => duplicateRow(item)}><Icon name="copy" className="w-3.5 h-3.5" /> Duplicar</DropdownMenuItem>}
            {item.groupKey && <DropdownMenuItem className="gap-2" onSelect={() => replace({ view: "todas", groupKey: item.groupKey!, order: "dueDate:asc" })}><Icon name="layers" className="w-3.5 h-3.5" /> Ver todas as parcelas</DropdownMenuItem>}
            {item.recurrenceId && <DropdownMenuItem className="gap-2" onSelect={() => replace({ view: "todas", recurrenceId: String(item.recurrenceId), order: "dueDate:asc" })}><Icon name="repeat" className="w-3.5 h-3.5" /> Ver todos os meses</DropdownMenuItem>}
            {((canUpdate && item.status === "paga") || (isOpen && canArchive) || canRestore) && <DropdownMenuSeparator />}
            {canUpdate && item.status === "paga" && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm({ item, action: "unsettle" })}><Icon name="undo-2" className="w-3.5 h-3.5" /> Estornar baixa</DropdownMenuItem>}
            {isOpen && canArchive && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm({ item, action: "inactive" })}><Icon name="trash-2" className="w-3.5 h-3.5" /> Excluir</DropdownMenuItem>}
            {canRestore && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm({ item, action: "active" })}><Icon name="undo-2" className="w-3.5 h-3.5" /> Restaurar</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Contas a pagar" description="Fornecedores, despesas fixas e gastos das obras." className="mb-0" />

      <SummaryCards cards={cards} active={view} onPick={(next) => pickView(next === view ? DEFAULT_VIEW : next)} />

      <ListCard>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <StatusChips options={chips} value={chipView} onChange={pickView} className="flex-1" />
          <MonthRangePicker className="sm:w-auto sm:min-w-44" align="end" placeholder="Competência"
            from={filters.accrualFrom || undefined} to={filters.accrualTo || undefined}
            onChange={(accrualFrom, accrualTo) => { selection.clear(); set({ accrualFrom, accrualTo }); }} />
          <EntityFilter value={filters.entityId ? Number(filters.entityId) : null}
            onChange={(id) => { selection.clear(); set({ entityId: id ? String(id) : "" }); }} />
        </div>

        <ListToolbar search={{ value: filters.q ?? "", onChange: (q) => set({ q }), placeholder: "Buscar descrição, fornecedor, CNPJ, nota, código ou valor" }}
          onOpenFilters={() => setOpenFilters(true)} filterCount={filterCount}>
          <ActionsMenu groups={[
            {
              label: "Selecionadas",
              items: [
                { id: "settle", label: "Pagar selecionadas", icon: "circle-check", count: openSelected.length, hidden: !canUpdate,
                  disabledReason: openSelected.length ? undefined : "Marque contas em aberto na lista", onSelect: () => setBulkSettle(true) },
                { id: "export-sel", label: "Exportar selecionadas", icon: "file-spreadsheet", count: selection.selected.size,
                  disabledReason: selection.selected.size ? undefined : "Marque contas na lista", onSelect: () => exportNow([...selection.selected.keys()]) },
                { id: "archive", label: "Excluir", icon: "trash-2", count: openSelected.length, hidden: !canArchive,
                  disabledReason: openSelected.length ? undefined : "Marque contas em aberto na lista",
                  confirm: { title: `Excluir ${openSelected.length} conta(s)?`, description: "As contas em aberto saem da lista e dos totais (ficam em Excluídas). Contas pagas são ignoradas." },
                  onSelect: () => archiveMany(openSelected.map((r) => r.id)) },
              ],
            },
            {
              label: "Dados",
              items: [
                { id: "export", label: "Exportar planilha", icon: "file-down", onSelect: () => exportNow() },
                { id: "recurring", label: "Recorrentes", icon: "repeat", onSelect: () => navigate({ to: "/financeiro/recorrentes" }) },
              ],
            },
          ]} />
          {canCreate && <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Nova conta</span></Button>}
        </ListToolbar>

        <div className="flex flex-col gap-2">
          <DueQuickFilter filters={filters} onChange={(patch) => { selection.clear(); set(patch); }} />
          <ActiveFilters kind="payable" filters={filters} onRemove={(keys) => set(Object.fromEntries(keys.map((k) => [k, ""])))} onClear={() => replace({ view })} />
        </div>

        <SelectionSummary total={data?.total} noun={["conta", "contas"]} selected={selection.selected.size} selectedTotal={selectedTotal} onClear={selection.clear} />

        <DataTable rows={data?.rows} columns={columns} getRowId={(item) => item.id} ariaLabel="Contas a pagar"
          loading={isLoading || isFetching} error={isError ? error?.response?.data?.message || "erro desconhecido" : null} onRetry={() => refetch()}
          order={filters.order} onSort={(order) => set({ order })}
          selection={{ isSelected: (item) => selection.selected.has(item.id), toggle: selection.toggle, pageState: selection.pageState, togglePage: selection.togglePage }}
          isRowClickable={(item) => canUpdate && !item.inactiveAt}
          onRowClick={(item) => { if (canUpdate && !item.inactiveAt) editRow(item); }}
          rowClassName={(item) => (item.inactiveAt ? "opacity-60" : undefined)}
          actions={rowActions}
          empty={filtered
            ? <EmptyState icon="search-x" title="Nenhuma conta com esses filtros." action={<Button variant="outline" size="sm" onClick={() => replace({ view })}>Limpar filtros</Button>} />
            : <EmptyState title={view === "abertas" ? "Nenhuma conta em aberto." : "Nenhuma conta nesta visão."} action={canCreate && <Button size="sm" onClick={openNew}><Icon name="plus" className="w-4 h-4" /> Nova conta</Button>} />} />

        <ListFooter total={data?.total ?? 0} page={page} limit={limit} limits={LIMITS}
          onPageChange={(next) => set({ page: String(next) }, true)} onLimitChange={(n) => set({ limit: String(n) })} />
      </ListCard>

      <SideForm openSheet={openFilters} setOpenSheet={setOpenFilters} title="Filtros" description="Combine os filtros; os cartões e a exportação seguem o mesmo recorte." side="left"
        form={<FilterPanel key={JSON.stringify(filters)} kind="payable" filters={filters} onApply={(patch) => set(patch)} onClear={() => replace({ view, ...(filters.q ? { q: filters.q } : {}) })} close={() => setOpenFilters(false)} />} />
      {settling && <PayableSettle item={settling} onClose={() => setSettling(null)} />}
      {bulkSettle && (
        <BulkSettleDialog kind="payable" ids={openSelected.map((r) => r.id)} count={openSelected.length}
          total={openSelected.reduce((s, r) => s + Number(r.value), 0)}
          onClose={() => setBulkSettle(false)} onDone={() => { selection.clear(); refresh(); }} />
      )}
      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }} title={CONFIRMS[confirm.action].title} description={CONFIRMS[confirm.action].description}
          onConfirm={() => { run({ item: confirm.item, action: confirm.action, done: CONFIRMS[confirm.action].done }); setConfirm(null); }} />
      )}
    </>
  );
}
