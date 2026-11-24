import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { get } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import SideForm from "@/components/general-components/SideForm";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import StatusChips from "@/components/general-components/StatusChips";
import ActionsMenu from "@/components/general-components/ActionsMenu";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import MonthRangePicker from "@/components/general-components/MonthRangePicker";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/general-interfaces/api.interface";
import { RECEIVABLE_ENTITY } from "./-components/entity";
import ReceivableRowActions from "./-components/ReceivableRowActions";
import { receivableColumns } from "./-components/receivableColumns";
import { IFinancialRecord } from "./-interfaces/entity.interface";
import { OPEN_STATUSES } from "./-components/options";
import { CHART_KEY, FINANCIAL_ABILITY } from "../-shared/financial";
import {
  ActiveFilters, Bucket, BulkSettleDialog, DueQuickFilter, FilterPanel, SelectionSummary, SummaryCards,
  countFilters, downloadXlsx, reportBulk, toParams, useSelection, useUrlFilters,
} from "../-shared/ledger";

export const Route = createFileRoute("/_authenticated/financeiro/_receber/receber")({
  component: Receivables,
  validateSearch: (search: Record<string, unknown>) => search as Record<string, string>,
});

const entity = RECEIVABLE_ENTITY;
const LIST_KEY = `list${entity.pluralName}`;
const DEFAULT_VIEW = "todas";
const LIMITS = [10, 30, 50, 100, 200];
const OPEN_VIEWS = ["abertas", "atrasadas", "hoje", "semana", "depois"];

interface Summary { overdue: Bucket; dueToday: Bucket; dueWeek: Bucket; later: Bucket; received: Bucket; lost: Bucket; open: Bucket; all?: Bucket; excluded?: Bucket; paidPeriod: string }
interface Response { today: string; view: string; rows: IFinancialRecord[]; total: number; summary: Summary }

function Receivables() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { filters, set, replace } = useUrlFilters({ view: DEFAULT_VIEW });
  const [openFilters, setOpenFilters] = useState(false);
  const [bulkSettle, setBulkSettle] = useState(false);
  const view = filters.view || DEFAULT_VIEW;
  const page = Number(filters.page ?? 0);
  const limit = Number(filters.limit ?? 30);

  const params = toParams({ ...filters, view, page: String(page), limit: String(limit) });
  const navigate = useNavigate();
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<Response | undefined, ApiError>({
    queryKey: [LIST_KEY, "ledger", params],
    queryFn: () => get("financial", "receivables", params),
    placeholderData: (previous) => previous,
  });
  const selection = useSelection(data?.rows);
  const selectedRows = [...selection.selected.values()];
  const settleable = selectedRows.filter((r) => r.gateway === "manual" && OPEN_STATUSES.includes(r.status) && !r.inactiveAt);
  const archivable = selectedRows.filter((r) => r.gateway === "manual" && r.status !== "received" && !r.inactiveAt);
  const total = (rows: IFinancialRecord[]) => rows.reduce((sum, r) => sum + Number(r.netValue ?? r.value ?? 0), 0);
  const summary = data?.summary;

  const refresh = () => { for (const key of [LIST_KEY, "financialBankBalances", CHART_KEY, "financialReports"]) queryClient.invalidateQueries({ queryKey: [key] }); };
  const { mutate: archiveMany } = useMutation({
    mutationFn: async (ids: number[]) => (await api.post("financial/receivables/bulk-archive", { ids })).data,
    onSuccess: (result) => { reportBulk(`${result.archived} ${result.archived === 1 ? "conta inativada" : "contas inativadas"}`, result); selection.clear(); refresh(); },
    onError: (err: ApiError) => toast({ title: "Não foi possível concluir", description: err.response?.data?.message || "Erro desconhecido.", variant: "destructive" }),
  });

  if (!can(`view_${entity.ability}`)) return null;
  const canUpdate = can(`update_${FINANCIAL_ABILITY}`);
  const canCreate = can(`create_${FINANCIAL_ABILITY}`);
  const filterCount = countFilters(filters);
  // o cartão segue o recorte da lista; só a API antiga mandava o mês (AAAA-MM)
  const periodHint = summary?.paidPeriod && /^\d{4}-\d{2}$/.test(summary.paidPeriod) ? `${summary.paidPeriod.slice(5, 7)}/${summary.paidPeriod.slice(0, 4)}` : undefined;
  const cards = [
    { view: "atrasadas", label: "Vencidas", bucket: summary?.overdue, tone: "text-red-600 dark:text-red-400", icon: "triangle-alert", color: "#dc2626" },
    { view: "hoje", label: "Vencem hoje", bucket: summary?.dueToday, tone: "text-amber-600 dark:text-amber-400", icon: "clock", color: "#d97706" },
    { view: "semana", label: "Próximos 7 dias", bucket: summary?.dueWeek, icon: "calendar-days", color: "#3e6f98" },
    { view: "depois", label: "Depois", bucket: summary?.later, icon: "calendar-clock", color: "#78716c" },
    { view: "abertas", label: "Total em aberto", bucket: summary?.open, icon: "wallet" },
    { view: "recebidas", label: "Recebidas", bucket: summary?.received, tone: "text-green-600 dark:text-green-400", hint: periodHint, icon: "circle-check", color: "#16a34a" },
  ];
  const exportNow = (ids?: number[]) => downloadXlsx("financial/receivables/export", ids ? [{ key: "ids", value: ids.join(",") }] : toParams({ ...filters, view }), "contas-a-receber.xlsx");
  const pickView = (next: string) => { selection.clear(); set({ view: next }); };
  const chipView = OPEN_VIEWS.includes(view) ? "abertas" : view;
  // contagens no mesmo recorte da lista (o resumo da API segue os filtros); a visão aberta usa o total da busca
  const COUNTS: Record<string, number | undefined> = { todas: summary?.all?.count, abertas: summary?.open?.count, recebidas: summary?.received?.count, canceladas: summary?.lost?.count, excluidas: summary?.excluded?.count };
  const countOf = (id: string) => (id === chipView && data ? data.total : COUNTS[id]);
  const chips = [
    { value: "todas", label: "Todas", color: "hsl(var(--primary))" },
    { value: "abertas", label: "Em aberto", color: "#d97706" },
    { value: "recebidas", label: "Recebidas", color: "#16a34a" },
    { value: "canceladas", label: "Canceladas", color: "#78716c" },
    { value: "excluidas", label: "Inativas", color: "hsl(var(--border))" },
  ].map((chip) => ({ ...chip, count: countOf(chip.value) }));
  const openEdit = (item: IFinancialRecord) => navigate({ to: "/financeiro/receber/$recordId", params: { recordId: String(item.id) } });
  const openNew = () => navigate({ to: "/financeiro/receber/nova" });
  const canEditRow = (item: IFinancialRecord) => canUpdate && !item.inactiveAt;
  const filtered = filterCount > 0 || !!filters.q;

  return (
    <>
      <PageHeader title="Contas a receber" description="Inscrições, contratos e lançamentos manuais." className="mb-0" />

      <SummaryCards cards={cards} active={view} onPick={(next) => pickView(next === view ? DEFAULT_VIEW : next)} />

      <ListCard>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <StatusChips options={chips} value={chipView} onChange={pickView} className="flex-1" />
          <MonthRangePicker className="sm:w-auto sm:min-w-44" align="end" placeholder="Competência"
            from={filters.accrualFrom || undefined} to={filters.accrualTo || undefined}
            onChange={(accrualFrom, accrualTo) => { selection.clear(); set({ accrualFrom, accrualTo }); }} />
        </div>

        <ListToolbar search={{ value: filters.q ?? "", onChange: (q) => set({ q }), placeholder: "Buscar cliente, aluno, CNPJ/CPF, NF, código ou valor" }}
          onOpenFilters={() => setOpenFilters(true)} filterCount={filterCount}>
          <ActionsMenu groups={[
            {
              label: "Selecionadas",
              items: [
                { id: "settle", label: "Receber selecionadas", icon: "circle-check", count: settleable.length, hidden: !canUpdate,
                  disabledReason: settleable.length ? undefined : "Marque contas manuais em aberto na lista", onSelect: () => setBulkSettle(true) },
                { id: "export-sel", label: "Exportar selecionadas", icon: "file-spreadsheet", count: selection.selected.size,
                  disabledReason: selection.selected.size ? undefined : "Marque contas na lista", onSelect: () => exportNow([...selection.selected.keys()]) },
                { id: "archive", label: "Inativar", icon: "power-off", count: archivable.length, hidden: !can(`inactive_${FINANCIAL_ABILITY}`),
                  disabledReason: archivable.length ? undefined : "Marque contas manuais não recebidas",
                  confirm: { title: `Inativar ${archivable.length} conta(s)?`, description: "Só lançamentos manuais não recebidos são inativados; cobranças do gateway se cancelam no provedor." },
                  onSelect: () => archiveMany(archivable.map((r) => r.id)) },
              ],
            },
            {
              label: "Dados",
              items: [
                { id: "export", label: "Exportar planilha", icon: "file-down", onSelect: () => exportNow() },
                { id: "recurring", label: "Recorrentes", icon: "repeat", onSelect: () => navigate({ to: "/financeiro/recorrentes", search: { tipo: "receivable" } as never }) },
              ],
            },
          ]} />
          {canCreate && <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Nova conta</span></Button>}
        </ListToolbar>

        <div className="flex flex-col gap-2 empty:hidden">
          <DueQuickFilter filters={filters} onChange={(patch) => { selection.clear(); set(patch); }} />
          <ActiveFilters kind="receivable" filters={filters} onRemove={(keys) => set(Object.fromEntries(keys.map((k) => [k, ""])))} onClear={() => replace({ view })} />
        </div>

        <SelectionSummary total={data?.total} noun={["conta", "contas"]} selected={selection.selected.size} selectedTotal={total(selectedRows)} onClear={selection.clear} />

        <DataTable rows={data?.rows} columns={receivableColumns(data?.today, { order: filters.order, onSort: (order) => set({ order }) })} getRowId={(item) => item.id} ariaLabel="Contas a receber"
          loading={isLoading || isFetching} error={isError ? error?.response?.data?.message || "erro desconhecido" : null} onRetry={() => refetch()}
          order={filters.order} onSort={(order) => set({ order })}
          selection={{ isSelected: (item) => selection.selected.has(item.id), toggle: selection.toggle, pageState: selection.pageState, togglePage: selection.togglePage }}
          isRowClickable={canEditRow}
          onRowClick={(item) => { if (canEditRow(item)) openEdit(item); }}
          rowClassName={(item) => (item.inactiveAt ? "opacity-60" : undefined)}
          actions={(item) => <ReceivableRowActions item={item} entity={entity} onEdit={openEdit} />}
          empty={filtered
            ? <EmptyState icon="search-x" title="Nenhuma conta com esses filtros." action={<Button variant="outline" size="sm" onClick={() => replace({ view })}>Limpar filtros</Button>} />
            : <EmptyState title="Nenhuma conta nesta visão." action={canCreate && <Button size="sm" onClick={openNew}><Icon name="plus" className="w-4 h-4" /> Nova conta</Button>} />} />

        <ListFooter total={data?.total ?? 0} page={page} limit={limit} limits={LIMITS}
          onPageChange={(next) => set({ page: String(next) }, true)} onLimitChange={(n) => set({ limit: String(n) })} />
      </ListCard>

      <SideForm openSheet={openFilters} setOpenSheet={setOpenFilters} title="Filtros" description="Combine os filtros; os cartões e a exportação seguem o mesmo recorte." side="left"
        form={<FilterPanel key={JSON.stringify(filters)} kind="receivable" filters={filters} onApply={(patch) => set(patch)} onClear={() => replace({ view, ...(filters.q ? { q: filters.q } : {}) })} close={() => setOpenFilters(false)} />} />
      {bulkSettle && (
        <BulkSettleDialog kind="receivable" ids={settleable.map((r) => r.id)} count={settleable.length} total={total(settleable)}
          onClose={() => setBulkSettle(false)} onDone={() => { selection.clear(); refresh(); }} />
      )}
    </>
  );
}
