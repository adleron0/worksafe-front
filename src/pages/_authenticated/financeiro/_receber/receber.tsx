import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { get } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import Pagination from "@/components/general-components/Pagination";
import SideForm from "@/components/general-components/SideForm";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/general-interfaces/api.interface";
import { cn } from "@/lib/utils";
import ItemSkeleton from "./-skeletons/ItemSkeleton";
import ItemList from "./-components/FinancialRecordsItem";
import Form from "./-components/FinancialRecordsForm";
import { IFinancialRecord } from "./-interfaces/entity.interface";
import { OPEN_STATUSES } from "./-components/options";
import { CHART_KEY, FINANCIAL_ABILITY } from "../-shared/financial";
import {
  ActiveFilters, Bucket, BulkSettleDialog, DueQuickFilter, FilterPanel, SearchBox, SelectBox, SelectionBar, SummaryCards,
  countFilters, downloadXlsx, reportBulk, toParams, useSelection, useUrlFilters,
} from "../-shared/ledger";

export const Route = createFileRoute("/_authenticated/financeiro/_receber/receber")({
  component: Receivables,
  validateSearch: (search: Record<string, unknown>) => search as Record<string, string>,
});

const entity = { name: "Conta a Receber", pluralName: "Contas a Receber", model: "financial-records", ability: "financeiro" };
const LIST_KEY = `list${entity.pluralName}`;
const VIEWS = [
  { id: "todas", label: "Todas" },
  { id: "abertas", label: "Em aberto" },
  { id: "recebidas", label: "Recebidas" },
  { id: "canceladas", label: "Canceladas" },
  { id: "excluidas", label: "Inativas" },
];
const DEFAULT_VIEW = "todas";
const LIMITS = [30, 50, 100, 200];

interface Summary { overdue: Bucket; dueToday: Bucket; dueWeek: Bucket; later: Bucket; received: Bucket; lost: Bucket; open: Bucket; paidPeriod: string }
interface Response { today: string; view: string; rows: IFinancialRecord[]; total: number; summary: Summary }

function Receivables() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { filters, set, replace } = useUrlFilters({ view: DEFAULT_VIEW });
  const [openFilters, setOpenFilters] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<IFinancialRecord | null>(null);
  const [bulkSettle, setBulkSettle] = useState(false);
  const view = filters.view || DEFAULT_VIEW;
  const page = Number(filters.page ?? 0);
  const limit = Number(filters.limit ?? 30);

  const params = toParams({ ...filters, view, page: String(page), limit: String(limit) });
  const { data, isLoading, isError, error } = useQuery<Response | undefined, ApiError>({
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
  const periodHint = summary?.paidPeriod && summary.paidPeriod !== "filtro" ? `${summary.paidPeriod.slice(5, 7)}/${summary.paidPeriod.slice(0, 4)}` : "no período";
  const cards = [
    { view: "atrasadas", label: "Vencidas", bucket: summary?.overdue, tone: "text-red-600 dark:text-red-400" },
    { view: "hoje", label: "Vencem hoje", bucket: summary?.dueToday, tone: "text-amber-600 dark:text-amber-400" },
    { view: "semana", label: "Próximos 7 dias", bucket: summary?.dueWeek },
    { view: "depois", label: "Depois", bucket: summary?.later },
    { view: "abertas", label: "Total em aberto", bucket: summary?.open },
    { view: "recebidas", label: "Recebidas", bucket: summary?.received, tone: "text-green-600 dark:text-green-400", hint: periodHint },
  ];
  const exportNow = (ids?: number[]) => downloadXlsx("financial/receivables/export", ids ? [{ key: "ids", value: ids.join(",") }] : toParams({ ...filters, view }), "contas-a-receber.xlsx");

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contas a Receber</h1>
          <p className="text-sm text-muted-foreground">Inscrições, contratos e lançamentos manuais. Clique no nome da coluna para ordenar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild><Link to="/financeiro/recorrentes" search={{ tipo: "receivable" } as never}><Icon name="repeat" className="w-4 h-4" /> Recorrentes</Link></Button>
          <Button variant="outline" size="sm" onClick={() => exportNow()}><Icon name="file-spreadsheet" className="w-4 h-4" /> Exportar</Button>
          {canCreate && <Button size="sm" onClick={() => { setFormData(null); setOpenForm(true); }}><Icon name="plus" className="w-4 h-4" /> Nova conta</Button>}
        </div>
      </div>

      <SummaryCards cards={cards} active={view} onPick={(next) => { selection.clear(); set({ view: next === view ? DEFAULT_VIEW : next }); }} />

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-3">
        <SearchBox value={filters.q ?? ""} onChange={(q) => set({ q })} placeholder="Cliente, aluno, CNPJ/CPF, descrição, NF, código ou valor" />
        <Button variant="outline" size="sm" className="h-9 w-fit" onClick={() => setOpenFilters(true)}>
          <Icon name="sliders-horizontal" className="w-4 h-4" /> Filtros
          {filterCount > 0 && <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5">{filterCount}</span>}
        </Button>
        <div className="flex flex-wrap gap-1 p-1 bg-muted rounded-lg w-fit lg:ml-auto">
          {VIEWS.map((option) => (
            <Button key={option.id} size="sm" variant={view === option.id || (option.id === "abertas" && ["atrasadas", "hoje", "semana", "depois"].includes(view)) ? "default" : "ghost"}
              className="h-7" onClick={() => { selection.clear(); set({ view: option.id }); }}>{option.label}</Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-3">
        <DueQuickFilter filters={filters} onChange={(patch) => { selection.clear(); set(patch); }} />
      </div>
      <ActiveFilters kind="receivable" filters={filters} onRemove={(keys) => set(Object.fromEntries(keys.map((k) => [k, ""])))} onClear={() => replace({ view })} />

      <SelectionBar count={selection.selected.size} total={total(selectedRows)} onClear={selection.clear}>
        {canUpdate && settleable.length > 0 && <Button size="sm" onClick={() => setBulkSettle(true)}><Icon name="circle-check" className="w-4 h-4" /> Receber selecionadas</Button>}
        <Button size="sm" variant="outline" onClick={() => exportNow([...selection.selected.keys()])}><Icon name="file-spreadsheet" className="w-4 h-4" /> Exportar</Button>
        {can(`inactive_${FINANCIAL_ABILITY}`) && archivable.length > 0 && (
          <ConfirmDialog title={`Inativar ${archivable.length} conta(s)?`} description="Só lançamentos manuais não recebidos são inativados; cobranças do gateway se cancelam no provedor."
            onConfirm={() => archiveMany(archivable.map((r) => r.id))}>
            <Button size="sm" variant="outline"><Icon name="power-off" className="w-4 h-4" /> Inativar</Button>
          </ConfirmDialog>
        )}
      </SelectionBar>

      <SideForm openSheet={openFilters} setOpenSheet={setOpenFilters} title="Filtros" description="Combine os filtros; os cartões e a exportação seguem o mesmo recorte." side="left"
        form={<FilterPanel key={JSON.stringify(filters)} kind="receivable" filters={filters} onApply={(patch) => set(patch)} onClear={() => replace({ view, ...(filters.q ? { q: filters.q } : {}) })} close={() => setOpenFilters(false)} />} />
      <SideForm openSheet={openForm} setOpenSheet={setOpenForm}
        title={formData ? `Editar ${entity.name}` : `Cadastrar ${entity.name}`}
        description={formData ? `Edite as informações da ${entity.name}.` : "Lance uma conta a receber avulsa. Mensalidade fixa? Use Recorrentes."} side="right"
        form={<Form key={formData?.id ?? "new"} formData={formData} setOpenForm={setOpenForm} entity={entity} />} />
      {bulkSettle && (
        <BulkSettleDialog kind="receivable" ids={settleable.map((r) => r.id)} count={settleable.length} total={total(settleable)}
          onClose={() => setBulkSettle(false)} onDone={() => { selection.clear(); refresh(); }} />
      )}

      <div className="space-y-2 mt-2">
        {isLoading ? Array.from({ length: 5 }, (_, i) => <ItemSkeleton key={i} index={i} />)
          : isError ? <div className="w-full flex justify-center items-center font-medium text-destructive py-4 rounded border border-destructive"><p>Erro: {error?.response?.data?.message}</p></div>
          : data?.rows?.length ? data.rows.map((item, i) => (
            <ItemList key={item.id} item={item} entity={entity} index={i} setFormData={setFormData} setOpenForm={setOpenForm} today={data.today}
              selected={selection.selected.has(item.id)} onSelect={(on) => selection.toggle(item, on)} order={filters.order} onSort={(order) => set({ order })}
              headerSelect={<SelectBox checked={selection.allOnPage} onChange={selection.togglePage} label="Selecionar todas desta página" inverse />} />
          ))
          : <p className="p-6 text-sm text-muted-foreground text-center rounded border">{filterCount || filters.q ? "Nenhuma conta com esses filtros." : "Nenhuma conta nesta visão."}</p>}
      </div>

      {data && data.total > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{data.total} {data.total === 1 ? "conta" : "contas"} · mostrar</span>
            {LIMITS.map((n) => (
              <button key={n} type="button" onClick={() => set({ limit: String(n) })} className={cn("rounded px-1.5 py-0.5", limit === n ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{n}</button>
            ))}
          </div>
          {data.total > limit && <Pagination totalItems={data.total} itemsPerPage={limit} currentPage={page} onPageChange={(next) => set({ page: String(next) }, true)} maxVisiblePages={5} />}
        </div>
      )}
    </>
  );
}
