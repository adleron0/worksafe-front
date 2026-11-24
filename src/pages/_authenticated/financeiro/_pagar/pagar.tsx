import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { get, patch } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import Pagination from "@/components/general-components/Pagination";
import SideForm from "@/components/general-components/SideForm";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ApiError } from "@/general-interfaces/api.interface";
import { cn } from "@/lib/utils";
import { CHART_KEY, FINANCIAL_ABILITY, formatMoney } from "../-shared/financial";
import { DUE_LABEL, PAYABLES_KEY, PAYABLES_SUMMARY_KEY, Payable, PayableList, dueState } from "../-shared/payables";
import {
  ActiveFilters, BulkSettleDialog, CopyButton, DueQuickFilter, FilterPanel, SearchBox, SelectBox, SelectionBar, SortButton, SummaryCards,
  countFilters, downloadXlsx, reportBulk, toParams, useSelection, useUrlFilters,
} from "../-shared/ledger";
import { formatDate, paymentMethodLabel } from "../_receber/-components/options";
import PayableForm from "./-PayableForm";
import PayableSettle from "./-PayableSettle";

export const Route = createFileRoute("/_authenticated/financeiro/_pagar/pagar")({
  component: Payables,
  validateSearch: (search: Record<string, unknown>) => search as Record<string, string>,
});

const VIEWS = [
  { id: "todas", label: "Todas" },
  { id: "abertas", label: "Em aberto" },
  { id: "pagas", label: "Pagas" },
  { id: "excluidas", label: "Excluídas" },
];
const DEFAULT_VIEW = "todas";
const LIMITS = [30, 50, 100, 200];

function Payables() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { filters, set, replace } = useUrlFilters({ view: DEFAULT_VIEW });
  const [openFilters, setOpenFilters] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<Payable | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [settling, setSettling] = useState<Payable | null>(null);
  const [bulkSettle, setBulkSettle] = useState(false);
  const view = filters.view || DEFAULT_VIEW;
  const page = Number(filters.page ?? 0);
  const limit = Number(filters.limit ?? 30);

  const params = toParams({ ...filters, view, page: String(page), limit: String(limit) });
  const { data, isLoading, isError, error } = useQuery<PayableList | undefined, ApiError>({
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
    mutationFn: ({ item, action }: { item: Payable; action: "unsettle" | "inactive" | "active"; done: string }) => patch("financial-payables", `${action}/${item.id}`),
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
  const paidHint = summary?.paidPeriod && summary.paidPeriod !== "filtro" ? `${summary.paidPeriod.slice(5, 7)}/${summary.paidPeriod.slice(0, 4)}` : "no período";

  const cards = [
    { view: "atrasadas", label: "Atrasadas", bucket: summary?.overdue, tone: "text-red-600 dark:text-red-400" },
    { view: "hoje", label: "Vencem hoje", bucket: summary?.dueToday, tone: "text-amber-600 dark:text-amber-400" },
    { view: "semana", label: "Próximos 7 dias", bucket: summary?.dueWeek },
    { view: "depois", label: "Depois", bucket: summary?.later },
    { view: "abertas", label: "Total em aberto", bucket: summary?.open },
    { view: "pagas", label: "Pagas", bucket: summary?.paid, tone: "text-green-600 dark:text-green-400", hint: paidHint },
  ];
  const pickCard = (next: string) => { selection.clear(); set({ view: next === view ? DEFAULT_VIEW : next }); };
  const openNew = () => { setFormData(null); setDuplicate(false); setOpenForm(true); };
  const editRow = (item: Payable) => { setFormData(item); setDuplicate(false); setOpenForm(true); };
  const duplicateRow = (item: Payable) => { setFormData(item); setDuplicate(true); setOpenForm(true); };
  const exportNow = (ids?: number[]) => downloadXlsx("financial/payables/export", ids ? [{ key: "ids", value: ids.join(",") }] : toParams({ ...filters, view }), "contas-a-pagar.xlsx");
  const emptyText = filterCount || filters.q ? "Nenhuma conta com esses filtros." : view === "abertas" ? "Nenhuma conta em aberto." : "Nenhuma conta nesta visão.";

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">Fornecedores, despesas fixas e gastos das obras. Filtre, pague em lote e exporte o que estiver na tela.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild><Link to="/financeiro/recorrentes"><Icon name="repeat" className="w-4 h-4" /> Recorrentes</Link></Button>
          <Button variant="outline" size="sm" onClick={() => exportNow()}><Icon name="file-spreadsheet" className="w-4 h-4" /> Exportar</Button>
          {canCreate && <Button size="sm" onClick={openNew}><Icon name="plus" className="w-4 h-4" /> Nova conta</Button>}
        </div>
      </div>

      <SummaryCards cards={cards} active={view} onPick={pickCard} />

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-3">
        <SearchBox value={filters.q ?? ""} onChange={(q) => set({ q })} placeholder="Descrição, fornecedor, CNPJ, nº da nota, código ou valor" />
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

      <ActiveFilters kind="payable" filters={filters} onRemove={(keys) => set(Object.fromEntries(keys.map((k) => [k, ""])))} onClear={() => replace({ view })} />

      <SelectionBar count={selection.selected.size} total={selectedTotal} onClear={selection.clear}>
        {canUpdate && selectedRows.some((r) => r.status === "aberta" && !r.inactiveAt) && (
          <Button size="sm" onClick={() => setBulkSettle(true)}><Icon name="circle-check" className="w-4 h-4" /> Pagar selecionadas</Button>
        )}
        <Button size="sm" variant="outline" onClick={() => exportNow([...selection.selected.keys()])}><Icon name="file-spreadsheet" className="w-4 h-4" /> Exportar</Button>
        {canArchive && selectedRows.some((r) => r.status === "aberta" && !r.inactiveAt) && (
          <ConfirmDialog title={`Excluir ${selection.selected.size} conta(s)?`} description="As contas em aberto saem da lista e dos totais (ficam em Excluídas). Contas pagas são ignoradas."
            onConfirm={() => archiveMany([...selection.selected.keys()])}>
            <Button size="sm" variant="outline"><Icon name="trash-2" className="w-4 h-4" /> Excluir</Button>
          </ConfirmDialog>
        )}
      </SelectionBar>

      <SideForm openSheet={openFilters} setOpenSheet={setOpenFilters} title="Filtros" description="Combine os filtros; os cartões e a exportação seguem o mesmo recorte." side="left"
        form={<FilterPanel key={JSON.stringify(filters)} kind="payable" filters={filters} onApply={(patch) => set(patch)} onClear={() => replace({ view, ...(filters.q ? { q: filters.q } : {}) })} close={() => setOpenFilters(false)} />} />
      <SideForm openSheet={openForm} setOpenSheet={setOpenForm}
        title={duplicate ? "Duplicar conta a pagar" : formData ? "Editar conta a pagar" : "Nova conta a pagar"}
        description={duplicate ? "Uma conta nova com os mesmos dados; ajuste o que mudar." : formData ? "Altere os dados da conta." : "Lance uma conta, um parcelamento ou uma despesa fixa."} side="right"
        form={<PayableForm key={`${formData?.id ?? "new"}-${duplicate}`} formData={formData} duplicate={duplicate} close={() => setOpenForm(false)} />} />
      {settling && <PayableSettle item={settling} onClose={() => setSettling(null)} />}
      {bulkSettle && (
        <BulkSettleDialog kind="payable" ids={selectedRows.filter((r) => r.status === "aberta" && !r.inactiveAt).map((r) => r.id)}
          count={selectedRows.filter((r) => r.status === "aberta" && !r.inactiveAt).length}
          total={selectedRows.filter((r) => r.status === "aberta" && !r.inactiveAt).reduce((s, r) => s + Number(r.value), 0)}
          onClose={() => setBulkSettle(false)} onDone={() => { selection.clear(); refresh(); }} />
      )}

      <div className="rounded-lg border overflow-hidden">
        <div className="hidden lg:flex items-center gap-2 py-2 px-4 bg-primary font-semibold text-sm text-inverse-foreground">
          <div className="w-6"><SelectBox checked={selection.allOnPage} onChange={selection.togglePage} label="Selecionar todas desta página" inverse /></div>
          <div className="w-3/12"><SortButton label="Conta" field="description" order={filters.order} onSort={(order) => set({ order })} /></div>
          <div className="w-2/12"><SortButton label="Valor" field="value" order={filters.order} onSort={(order) => set({ order })} /></div>
          <div className="w-2/12">
            <SortButton label="Vencimento" field="dueDate" order={filters.order} onSort={(order) => set({ order })} />
            {(view === "pagas" || view === "todas") && <> · <SortButton label="Pagamento" field="paidAt" order={filters.order} onSort={(order) => set({ order })} /></>}
          </div>
          <div className="w-2/12">Documentos</div>
          <div className="w-1/12">Situação</div>
          <div className="flex-1 text-right">Ações</div>
        </div>
        {isLoading && Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 w-full my-1" />)}
        {isError && <p className="p-4 text-destructive font-medium">Erro: {error?.response?.data?.message}</p>}
        {!isLoading && !isError && !data?.rows?.length && <p className="p-6 text-sm text-muted-foreground text-center">{emptyText}</p>}
        {data?.rows?.map((item) => {
          const state = dueState(item, today);
          const badge = item.inactiveAt ? { text: "Excluída", className: "bg-muted text-muted-foreground" } : DUE_LABEL[state];
          const attachments = [["Boleto", item.billUrl], ["Nota", item.invoiceUrl], ["Comprovante", item.receiptUrl]].filter(([, url]) => url) as Array<[string, string]>;
          const isOpen = item.status === "aberta" && !item.inactiveAt;
          const extras = Number(item.interestValue ?? 0) + Number(item.fineValue ?? 0) - Number(item.discountValue ?? 0);
          return (
            <div key={item.id} className={cn("relative flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-2 px-4 py-3 border-b last:border-b-0 text-sm", item.inactiveAt && "opacity-60", selection.selected.has(item.id) && "bg-primary/5")}>
              <div className="lg:w-6 absolute lg:static left-4 top-3.5">
                <SelectBox checked={selection.selected.has(item.id)} onChange={(on) => selection.toggle(item, on)} label={`Selecionar ${item.description}`} />
              </div>
              <div className="lg:w-3/12 pl-7 lg:pl-0 pr-10 lg:pr-3 min-w-0">
                <p className="font-semibold break-words">
                  {item.description}
                  {item.installmentNumber && item.installmentTotal && <span className="ml-2 text-xs font-normal rounded bg-muted px-1.5 py-0.5">{item.installmentNumber}/{item.installmentTotal}</span>}
                  {item.recurrenceId && <span className="ml-2 text-xs font-normal rounded bg-muted px-1.5 py-0.5 inline-flex items-center gap-1"><Icon name="repeat" className="w-3 h-3" />mensal</span>}
                </p>
                <p className="text-xs text-muted-foreground break-words">{item.supplier?.name ?? "Sem fornecedor"} <span className="opacity-60">· #{item.id}</span></p>
                {(item.chartAccount || item.costCenter || item.serviceOrder) && (
                  <p className="text-xs text-muted-foreground break-words">
                    {[item.chartAccount && `${item.chartAccount.code} ${item.chartAccount.name}`, item.costCenter?.name].filter(Boolean).join(" · ")}
                    {item.serviceOrder && <Link to="/servicos/ordens-de-servico/$orderId" params={{ orderId: String(item.serviceOrder.id) }} className="ml-1 underline">{item.serviceOrder.number}</Link>}
                  </p>
                )}
              </div>
              <div className="lg:w-2/12 pl-7 lg:pl-0 tabular-nums">
                <p className="font-medium">{formatMoney(item.value)}</p>
                {item.paidValue && Number(item.paidValue) !== Number(item.value) && (
                  <p className="text-xs text-muted-foreground">Pago: {formatMoney(item.paidValue)} {extras !== 0 && <span>({extras > 0 ? "+" : "−"}{formatMoney(Math.abs(extras))} {extras > 0 ? "juros/multa" : "desconto"})</span>}</p>
                )}
              </div>
              <div className="lg:w-2/12 pl-7 lg:pl-0">
                <p><span className="text-xs text-muted-foreground">Venc:</span> {formatDate(item.dueDate)}</p>
                {item.paidAt && <p className="text-green-600"><span className="text-xs text-muted-foreground">Pago:</span> {formatDate(item.paidAt)}</p>}
                {(item.paymentMethod || item.bankAccount) && <p className="text-xs text-muted-foreground">{[item.paymentMethod && paymentMethodLabel(item.paymentMethod), item.bankAccount?.name].filter(Boolean).join(" · ")}</p>}
              </div>
              <div className="lg:w-2/12 pl-7 lg:pl-0 text-xs flex flex-col gap-1">
                {item.documentNumber && <p className="break-all">Nº {item.documentNumber}</p>}
                {attachments.length > 0 && <p className="flex flex-wrap gap-x-2">{attachments.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer" className="underline text-primary">{label}</a>)}</p>}
                {isOpen && (item.barcode || item.pixCode) && (
                  <p className="flex flex-wrap gap-1">
                    {item.barcode && <CopyButton text={item.barcode} label="Linha digitável" />}
                    {item.pixCode && <CopyButton text={item.pixCode} label="PIX copia e cola" />}
                  </p>
                )}
                {isOpen && !item.barcode && !item.pixCode && item.supplier?.pixKey && <p><CopyButton text={item.supplier.pixKey} label="Chave PIX" /></p>}
                {!item.documentNumber && !attachments.length && !(isOpen && (item.barcode || item.pixCode || item.supplier?.pixKey)) && <span className="text-muted-foreground">—</span>}
              </div>
              <div className="lg:w-1/12 pl-7 lg:pl-0">
                <span className={cn("inline-block rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", badge.className)}>{badge.text}</span>
                {item.statementRef && <p className="text-[10px] text-muted-foreground mt-0.5">conciliada</p>}
              </div>
              <div className="absolute top-2 right-2 lg:static lg:flex-1 flex justify-end items-center gap-1">
                {canUpdate && isOpen && <Button size="sm" variant="outline" className="hidden lg:inline-flex h-8" onClick={() => setSettling(item)}>Pagar</Button>}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button className="h-8 w-8 rounded-full p-0" variant="outline" size="sm" aria-label={`Ações de ${item.description}`}><Icon name="ellipsis-vertical" className="w-3 h-3" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canUpdate && isOpen && <DropdownMenuItem className="gap-2" onSelect={() => setSettling(item)}><Icon name="circle-check" className="w-3 h-3" /> Dar baixa</DropdownMenuItem>}
                    {canUpdate && !item.inactiveAt && <DropdownMenuItem className="gap-2" onSelect={() => editRow(item)}><Icon name="pencil" className="w-3 h-3" /> Editar</DropdownMenuItem>}
                    {canCreate && <DropdownMenuItem className="gap-2" onSelect={() => duplicateRow(item)}><Icon name="copy" className="w-3 h-3" /> Duplicar</DropdownMenuItem>}
                    {item.groupKey && <DropdownMenuItem className="gap-2" onSelect={() => replace({ view: "todas", groupKey: item.groupKey!, order: "dueDate:asc" })}><Icon name="layers" className="w-3 h-3" /> Ver todas as parcelas</DropdownMenuItem>}
                    {item.recurrenceId && <DropdownMenuItem className="gap-2" onSelect={() => replace({ view: "todas", recurrenceId: String(item.recurrenceId), order: "dueDate:asc" })}><Icon name="repeat" className="w-3 h-3" /> Ver todos os meses</DropdownMenuItem>}
                    {(canUpdate || canArchive) && <DropdownMenuSeparator />}
                    {canUpdate && item.status === "paga" && (
                      <DropdownMenuItem className="p-0" onSelect={(event) => event.preventDefault()}>
                        <ConfirmDialog title="Estornar a baixa?" description="A conta volta a ficar em aberto e o valor volta para o saldo da conta bancária."
                          onConfirm={() => run({ item, action: "unsettle", done: "Baixa estornada!" })} titleBttn="Estornar baixa" iconBttn="undo-2" />
                      </DropdownMenuItem>
                    )}
                    {isOpen && canArchive && (
                      <DropdownMenuItem className="p-0" onSelect={(event) => event.preventDefault()}>
                        <ConfirmDialog title="Excluir esta conta a pagar?" description="Ela sai da lista e dos totais. Fica em Excluídas e pode ser restaurada."
                          onConfirm={() => run({ item, action: "inactive", done: "Conta excluída!" })} titleBttn="Excluir" iconBttn="trash-2" />
                      </DropdownMenuItem>
                    )}
                    {item.inactiveAt && can(`activate_${FINANCIAL_ABILITY}`) && (
                      <DropdownMenuItem className="p-0" onSelect={(event) => event.preventDefault()}>
                        <ConfirmDialog title="Restaurar esta conta a pagar?" description="Ela volta para a lista e para os totais."
                          onConfirm={() => run({ item, action: "active", done: "Conta restaurada!" })} titleBttn="Restaurar" iconBttn="undo-2" />
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
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
