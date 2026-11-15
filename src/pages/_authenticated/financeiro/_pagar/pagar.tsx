import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, patch } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import Pagination from "@/components/general-components/Pagination";
import HeaderLists from "@/components/general-components/HeaderLists";
import SideForm from "@/components/general-components/SideForm";
import CalendarPicker from "@/components/general-components/Calendar";
import Select from "@/components/general-components/Select";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ApiError } from "@/general-interfaces/api.interface";
import { cn } from "@/lib/utils";
import { CHART_KEY, FINANCIAL_ABILITY, formatMoney } from "../-shared/financial";
import { DUE_LABEL, PAYABLES_KEY, PAYABLES_SUMMARY_KEY, Payable, PayableSummary, dueState, plusDays, useSuppliers } from "../-shared/payables";
import { formatDate, paymentMethodLabel, todayInput } from "../_receber/-components/options";
import PayableForm from "./-PayableForm";
import PayableSettle from "./-PayableSettle";

export const Route = createFileRoute("/_authenticated/financeiro/_pagar/pagar")({ component: Payables });

type View = "abertas" | "atrasadas" | "hoje" | "semana" | "depois" | "pagas" | "excluidas";
const LIMIT = 30;
const currentMonth = () => todayInput().slice(0, 7);
/** Primeiro dia do mês seguinte a AAAA-MM. */
const nextMonth = (month: string) => {
  const [year, m] = month.split("-").map(Number);
  return m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, "0")}-01`;
};

/** O que cada visão pede à listagem. As abertas não olham o mês: atrasada não some porque o mês virou. */
function filtersOf(view: View, today: string, month: string | null): Array<{ key: string; value: string }> {
  const open = [{ key: "status", value: "aberta" }, { key: "active", value: "true" }, { key: "order-dueDate", value: "asc" }];
  switch (view) {
    case "atrasadas": return [...open, { key: "lt-dueDate", value: today }];
    case "hoje": return [...open, { key: "gte-dueDate", value: today }, { key: "lt-dueDate", value: plusDays(today, 1) }];
    case "semana": return [...open, { key: "gte-dueDate", value: plusDays(today, 1) }, { key: "lt-dueDate", value: plusDays(today, 8) }];
    case "depois": return [...open, { key: "gte-dueDate", value: plusDays(today, 8) }];
    case "pagas": return [{ key: "status", value: "paga" }, { key: "active", value: "true" }, { key: "order-paidAt", value: "desc" }, ...(month ? [{ key: "gte-paidAt", value: `${month}-01` }, { key: "lt-paidAt", value: nextMonth(month) }] : [])];
    case "excluidas": return [{ key: "active", value: "false" }, { key: "order-dueDate", value: "desc" }];
    default: return open;
  }
}

function Payables() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("abertas");
  const [month, setMonth] = useState<string | null>(currentMonth());
  const [supplierId, setSupplierId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(LIMIT);
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<Payable | null>(null);
  const [settling, setSettling] = useState<Payable | null>(null);
  const today = todayInput();

  const { data: summary } = useQuery<PayableSummary | undefined>({
    queryKey: [PAYABLES_SUMMARY_KEY, month],
    queryFn: () => get("financial", "payables-summary", month ? [{ key: "month", value: month }] : []),
  });
  const { data: suppliers } = useSuppliers();

  const params = [
    ...filtersOf(view, today, month),
    ...(supplierId ? [{ key: "supplierId", value: supplierId }] : []),
    ...(search.trim() ? [{ key: "like-description", value: search.trim() }] : []),
    { key: "show", value: ["supplier", "serviceOrder", "chartAccount", "costCenter", "bankAccount"] },
    { key: "page", value: page }, { key: "limit", value: limit },
  ];
  const { data, isLoading, isError, error } = useQuery<{ rows: Payable[]; total: number } | undefined, ApiError>({
    queryKey: [PAYABLES_KEY, params],
    queryFn: () => get("financial-payables", "", params),
    placeholderData: (previous) => previous,
  });

  const refresh = () => { for (const key of [PAYABLES_KEY, PAYABLES_SUMMARY_KEY, "financialBankBalances", CHART_KEY]) queryClient.invalidateQueries({ queryKey: [key] }); };
  const { mutate: run } = useMutation({
    mutationFn: ({ item, action }: { item: Payable; action: "unsettle" | "inactive" | "active"; done: string }) => patch("financial-payables", `${action}/${item.id}`),
    onSuccess: (_data, { done }) => { toast({ title: done, variant: "success" }); refresh(); },
    onError: (err: ApiError) => toast({ title: "Não foi possível concluir", description: err.response?.data?.message || "Erro desconhecido.", variant: "destructive" }),
  });

  const pick = (next: View) => { setView((current) => (current === next ? "abertas" : next)); setPage(0); };
  const handleSearch = useCallback((text: string) => { setSearch(text); setPage(0); }, []);

  if (!can(`view_${FINANCIAL_ABILITY}`)) return null;
  const canUpdate = can(`update_${FINANCIAL_ABILITY}`);

  const cards: Array<{ view: View; label: string; bucket?: { count: number; total: number }; tone: string }> = [
    { view: "atrasadas", label: "Atrasadas", bucket: summary?.overdue, tone: "text-red-600 dark:text-red-400" },
    { view: "hoje", label: "Vencem hoje", bucket: summary?.dueToday, tone: "text-amber-600 dark:text-amber-400" },
    { view: "semana", label: "Próximos 7 dias", bucket: summary?.dueWeek, tone: "text-foreground" },
    { view: "depois", label: "Depois", bucket: summary?.later, tone: "text-foreground" },
    { view: "pagas", label: month ? "Pagas no mês" : "Pagas", bucket: summary?.paid, tone: "text-green-600 dark:text-green-400" },
  ];

  return (
    <>
      <HeaderLists
        titlePage="Contas a Pagar"
        descriptionPage="O que a empresa tem a pagar: fornecedores, despesas fixas e gastos das obras."
        entityName="Conta a Pagar"
        ability={FINANCIAL_ABILITY}
        limit={data?.total || 0}
        showInputSearch
        showSearch={false}
        showCreate
        searchPlaceholder="Buscar pela descrição..."
        searchParams={{ limit, page }}
        onlimitChange={(_name, value) => { setLimit(Number(value)); setPage(0); }}
        openSearch={() => {}}
        openForm={setOpenForm}
        setFormData={setFormData}
        setFormType={() => {}}
        iconForm="plus"
        addButtonName="Nova"
        onTextSearch={handleSearch}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 my-4">
        {cards.map((card) => (
          <button key={card.view} type="button" onClick={() => pick(card.view)} aria-pressed={view === card.view}
            className={cn("rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 cursor-pointer", view === card.view && "border-primary ring-1 ring-primary")}>
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={cn("text-lg font-bold tabular-nums", card.tone)}>{card.bucket ? formatMoney(card.bucket.total) : "—"}</p>
            <p className="text-xs text-muted-foreground">{card.bucket ? `${card.bucket.count} ${card.bucket.count === 1 ? "conta" : "contas"}` : " "}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="w-full sm:w-72">
          <Select name="supplierFilter" options={(suppliers?.rows ?? []) as never[]} state={supplierId}
            onChange={(_, value) => { setSupplierId(String(Array.isArray(value) ? value[0] ?? "" : value ?? "")); setPage(0); }} placeholder="Todos os fornecedores" clearable />
        </div>
        {view === "pagas" && (
          <CalendarPicker mode="month" name="month" value={month} onValueChange={(_, value) => { setMonth(value || null); setPage(0); }}
            placeholder="Todos os meses" fromYear={2020} toYear={2035} />
        )}
        <div className="sm:ml-auto flex items-center gap-2 text-sm">
          {view !== "abertas" && view !== "excluidas" && <Button variant="outline" size="sm" onClick={() => pick("abertas")}>Ver todas as abertas</Button>}
          <Button variant={view === "excluidas" ? "default" : "outline"} size="sm" onClick={() => pick("excluidas")}>
            {view === "excluidas" ? "Voltar às abertas" : "Excluídas"}
          </Button>
        </div>
      </div>

      <SideForm
        openSheet={openForm}
        setOpenSheet={setOpenForm}
        title={formData ? "Editar conta a pagar" : "Nova conta a pagar"}
        description={formData ? "Altere os dados da conta." : "Lance uma conta, um parcelamento ou uma despesa que se repete."}
        side="right"
        form={<PayableForm key={formData?.id ?? "new"} formData={formData} close={() => setOpenForm(false)} />}
      />
      {settling && <PayableSettle item={settling} onClose={() => setSettling(null)} />}

      <div className="rounded-lg border overflow-hidden">
        <div className="hidden lg:flex items-center py-2 px-4 bg-primary font-semibold text-sm text-inverse-foreground">
          <div className="w-3/12">Conta</div>
          <div className="w-2/12">Valor</div>
          <div className="w-2/12">Datas</div>
          <div className="w-2/12">Documentos</div>
          <div className="w-1/12">Situação</div>
          <div className="w-2/12 text-right">Ações</div>
        </div>
        {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 w-full my-1" />)}
        {isError && <p className="p-4 text-destructive font-medium">Erro: {error?.response?.data?.message}</p>}
        {!isLoading && !isError && !data?.rows?.length && (
          <p className="p-4 text-sm text-muted-foreground">{view === "abertas" && !search && !supplierId ? "Nenhuma conta em aberto." : "Nenhuma conta nesta visão."}</p>
        )}
        {data?.rows?.map((item) => {
          const state = dueState(item, today);
          const badge = item.inactiveAt ? { text: "Excluída", className: "bg-muted text-muted-foreground" } : DUE_LABEL[state];
          const attachments = [["Boleto", item.billUrl], ["Nota", item.invoiceUrl], ["Comprovante", item.receiptUrl]].filter(([, url]) => url) as Array<[string, string]>;
          return (
            <div key={item.id} className={cn("relative flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-3 border-b last:border-b-0 text-sm", item.inactiveAt && "opacity-60")}>
              <div className="lg:w-3/12 pr-10 lg:pr-3 min-w-0">
                <p className="font-semibold break-words">
                  {item.description}
                  {item.installmentNumber && item.installmentTotal && <span className="ml-2 text-xs font-normal rounded bg-muted px-1.5 py-0.5">{item.installmentNumber}/{item.installmentTotal}</span>}
                </p>
                <p className="text-xs text-muted-foreground break-words">{item.supplier?.name ?? "Sem fornecedor"}</p>
                {(item.chartAccount || item.costCenter || item.serviceOrder) && (
                  <p className="text-xs text-muted-foreground break-words">
                    {[item.chartAccount && `${item.chartAccount.code} ${item.chartAccount.name}`, item.costCenter?.name].filter(Boolean).join(" · ")}
                    {item.serviceOrder && (
                      <Link to="/servicos/ordens-de-servico/$orderId" params={{ orderId: String(item.serviceOrder.id) }} className="ml-1 underline">{item.serviceOrder.number}</Link>
                    )}
                  </p>
                )}
              </div>
              <div className="lg:w-2/12 tabular-nums">
                <p className="font-medium">{formatMoney(item.value)}</p>
                {item.paidValue && Number(item.paidValue) !== Number(item.value) && <p className="text-xs text-muted-foreground">Pago: {formatMoney(item.paidValue)}</p>}
              </div>
              <div className="lg:w-2/12">
                <p><span className="text-xs text-muted-foreground">Venc:</span> {formatDate(item.dueDate)}</p>
                {item.paidAt && <p className="text-green-600"><span className="text-xs text-muted-foreground">Pago:</span> {formatDate(item.paidAt)}</p>}
                {(item.paymentMethod || item.bankAccount) && (
                  <p className="text-xs text-muted-foreground">{[item.paymentMethod && paymentMethodLabel(item.paymentMethod), item.bankAccount?.name].filter(Boolean).join(" · ")}</p>
                )}
              </div>
              <div className="lg:w-2/12 text-xs">
                {item.documentNumber && <p className="break-all">Nº {item.documentNumber}</p>}
                <p className="flex flex-wrap gap-x-2">
                  {attachments.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer" className="underline text-primary">{label}</a>)}
                </p>
                {!item.documentNumber && !attachments.length && <span className="text-muted-foreground">—</span>}
              </div>
              <div className="lg:w-1/12"><span className={cn("inline-block rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", badge.className)}>{badge.text}</span></div>
              <div className="absolute top-2 right-2 lg:static lg:w-2/12 flex justify-end items-center gap-1">
                {canUpdate && item.status === "aberta" && !item.inactiveAt && (
                  <Button size="sm" variant="outline" className="hidden lg:inline-flex h-8" onClick={() => setSettling(item)}>Pagar</Button>
                )}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button className="h-8 w-8 rounded-full p-0" variant="outline" size="sm" aria-label={`Ações de ${item.description}`}>
                      <Icon name="ellipsis-vertical" className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canUpdate && item.status === "aberta" && !item.inactiveAt && (
                      <DropdownMenuItem className="gap-2" onSelect={() => setSettling(item)}><Icon name="circle-check" className="w-3 h-3" /> Dar baixa</DropdownMenuItem>
                    )}
                    {canUpdate && !item.inactiveAt && (
                      <DropdownMenuItem className="gap-2" onSelect={() => { setFormData(item); setOpenForm(true); }}><Icon name="pencil" className="w-3 h-3" /> Editar</DropdownMenuItem>
                    )}
                    {canUpdate && item.status === "paga" && (
                      <DropdownMenuItem className="p-0" onSelect={(event) => event.preventDefault()}>
                        <ConfirmDialog title="Estornar a baixa?" description="A conta volta a ficar em aberto e o valor volta para o saldo da conta bancária."
                          onConfirm={() => run({ item, action: "unsettle", done: "Baixa estornada!" })} titleBttn="Estornar baixa" iconBttn="undo-2" />
                      </DropdownMenuItem>
                    )}
                    {!item.inactiveAt && item.status === "aberta" && can(`inactive_${FINANCIAL_ABILITY}`) && (
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

      {data && data.total > limit && (
        <div className="mt-4">
          <Pagination totalItems={data.total} itemsPerPage={limit} currentPage={page} onPageChange={setPage} maxVisiblePages={5} />
        </div>
      )}
    </>
  );
}
