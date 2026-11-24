import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { get } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import SideForm from "@/components/general-components/SideForm";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import StatusChips from "@/components/general-components/StatusChips";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/general-interfaces/api.interface";
import { cn } from "@/lib/utils";
import AccountSelect from "../-shared/AccountSelect";
import { FINANCIAL_ABILITY, formatMoney, useChartAccounts, useCostCenters } from "../-shared/financial";
import { PAYABLES_KEY, useSuppliers } from "../-shared/payables";
import { useCustomerOptions } from "../-shared/ledger";
import { formatDate, paymentMethodLabel, paymentMethodOptions, toDateInput, todayInput } from "../_receber/-components/options";
import RecurrenceRowActions from "./-components/RecurrenceRowActions";

export const Route = createFileRoute("/_authenticated/financeiro/_recorrentes/recorrentes")({
  component: Recurrences,
  validateSearch: (search: Record<string, unknown>): { tipo?: string } => (search.tipo === "receivable" ? { tipo: "receivable" } : {}),
});

type Kind = "payable" | "receivable";
interface Recurrence {
  id: number; kind: Kind; description: string; value: number; dayOfMonth: number; startDate: string; endDate: string | null;
  supplierId: number | null; customerId: number | null; chartAccountId: number | null; costCenterId: number | null; serviceOrderId: number | null;
  paymentMethod: string | null; observations: string | null; inactiveAt: string | null;
  supplier: { id: number; name: string } | null; customer: { id: number; name: string } | null;
  chartAccount: { id: number; code: string; name: string } | null; costCenter: { id: number; name: string } | null;
  upcoming: number; nextDue: string | null; yearTotal: number;
}
const KEY = "financialRecurrences";
const KINDS: Array<{ value: Kind; label: string }> = [{ value: "payable", label: "A pagar" }, { value: "receivable", label: "A receber" }];
const muted = "text-xs text-muted-foreground";
const COLUMNS: DataColumn<Recurrence>[] = [
  {
    id: "description", header: "Descrição", className: "min-w-[240px]",
    cell: (item) => (
      <div className="min-w-0 max-w-[22rem]">
        <p className="font-semibold truncate">{item.description}</p>
        <p className={`${muted} truncate`}>
          {[item.supplier?.name ?? item.customer?.name, item.chartAccount && `${item.chartAccount.code} ${item.chartAccount.name}`, item.costCenter?.name].filter(Boolean).join(" · ") || "Sem classificação"}
        </p>
      </div>
    ),
  },
  {
    id: "value", header: "Valor por mês",
    cell: (item) => (
      <div className="tabular-nums whitespace-nowrap">
        <p className="font-medium">{formatMoney(item.value)}</p>
        <p className={muted}>{item.paymentMethod ? paymentMethodLabel(item.paymentMethod) : "Forma a definir"}</p>
      </div>
    ),
  },
  {
    id: "day", header: "Todo dia",
    cell: (item) => (
      <div className="whitespace-nowrap">
        <p>Dia {item.dayOfMonth}</p>
        <p className={muted}>desde {formatDate(item.startDate)}{item.endDate ? ` até ${formatDate(item.endDate)}` : ""}</p>
      </div>
    ),
  },
  {
    id: "next", header: "Próximo vencimento",
    cell: (item) => (item.inactiveAt
      ? <span className="text-xs rounded bg-muted px-1.5 py-0.5">Encerrado</span>
      : (
        <div className="whitespace-nowrap">
          <p>{item.nextDue ? formatDate(item.nextDue) : "—"}</p>
          <p className={muted}>{item.upcoming} lançado(s) à frente · {formatMoney(item.yearTotal)}</p>
        </div>
      )),
  },
];

function Recurrences() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [kind, setKind] = useState<Kind>(search.tipo === "receivable" ? "receivable" : "payable");
  const [editing, setEditing] = useState<Recurrence | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [showEnded, setShowEnded] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<Recurrence[] | undefined>({ queryKey: [KEY, kind], queryFn: () => get("financial", "recurrences", [{ key: "kind", value: kind }]) });
  const { mutate: end } = useMutation({
    mutationFn: async (id: number) => (await api.patch(`financial/recurrences/${id}/end`, {})).data,
    onSuccess: (result) => {
      toast({ title: "Recorrente encerrado", description: `${result.removed} lançamento(s) futuro(s) em aberto removido(s).`, variant: "success" });
      for (const k of [KEY, PAYABLES_KEY, "listContas a Receber", "financialReports"]) queryClient.invalidateQueries({ queryKey: [k] });
    },
    onError: (err: ApiError) => toast({ title: "Não foi possível encerrar", description: err.response?.data?.message, variant: "destructive" }),
  });
  if (!can(`view_${FINANCIAL_ABILITY}`)) return null;
  const active = (data ?? []).filter((r) => !r.inactiveAt);
  const ended = (data ?? []).filter((r) => r.inactiveAt);
  const monthly = active.reduce((sum, r) => sum + Number(r.value), 0);
  const listPath = kind === "payable" ? "/financeiro/pagar" : "/financeiro/receber";

  const openMonths = (item: Recurrence) => navigate({ to: listPath, search: { view: "todas", recurrenceId: String(item.id), order: "dueDate:asc" } as never });
  const openNew = () => { setEditing(null); setOpenForm(true); };

  return (
    <>
      <PageHeader title="Recorrentes" description="Despesas fixas (aluguel, internet, contador) e mensalidades. Os próximos 12 meses ficam lançados e entram no fluxo de caixa." />

      <SideForm openSheet={openForm} setOpenSheet={setOpenForm} side="right"
        title={editing ? "Editar recorrente" : "Novo recorrente"}
        description={editing ? "A mudança vale para os lançamentos em aberto de hoje em diante. Os já vencidos e os pagos não mudam." : "Lance uma vez; o sistema cria um lançamento por mês."}
        form={<RecurrenceForm key={`${editing?.id ?? "new"}-${kind}`} kind={editing?.kind ?? kind} item={editing} close={() => setOpenForm(false)} />} />

      <ListCard>
        <StatusChips ariaLabel="Tipo" value={kind} onChange={setKind} options={KINDS} />
        <ListToolbar>
          {can(`create_${FINANCIAL_ABILITY}`) && <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Novo recorrente</span></Button>}
        </ListToolbar>
        <p className="text-sm -mt-1">
          <span className="text-muted-foreground">{active.length} ativo(s) · por mês </span>
          <span className={cn("font-bold tabular-nums", kind === "payable" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>{formatMoney(monthly)}</span>
        </p>
        <DataTable rows={data ? [...active, ...(showEnded ? ended : [])] : undefined} columns={COLUMNS} getRowId={(item) => item.id} ariaLabel="Recorrentes" minWidth={820}
          loading={isLoading} onRowClick={openMonths}
          rowClassName={(item) => (item.inactiveAt ? "opacity-60" : undefined)}
          actions={(item) => (
            <RecurrenceRowActions description={item.description} ended={!!item.inactiveAt} canUpdate={can(`update_${FINANCIAL_ABILITY}`)} canEnd={can(`inactive_${FINANCIAL_ABILITY}`)}
              onOpenMonths={() => openMonths(item)} onEdit={() => { setEditing(item); setOpenForm(true); }} onEnd={() => end(item.id)} />
          )}
          empty={<EmptyState title={`Nenhum recorrente ${kind === "payable" ? "a pagar" : "a receber"} ativo.`} />} />
        {ended.length > 0 && (
          <Button variant="link" size="sm" className="px-0 w-fit" onClick={() => setShowEnded((v) => !v)}>{showEnded ? "Esconder encerrados" : `Mostrar ${ended.length} encerrado(s)`}</Button>
        )}
      </ListCard>
    </>
  );
}

function RecurrenceForm({ kind, item, close }: { kind: Kind; item: Recurrence | null; close: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(item);
  const [state, setState] = useState({
    description: item?.description ?? "", value: Number(item?.value ?? 0), startDate: toDateInput(item?.startDate) || todayInput(), endDate: toDateInput(item?.endDate),
    supplierId: item?.supplierId ? String(item.supplierId) : "", customerId: item?.customerId ? String(item.customerId) : "",
    chartAccountId: item?.chartAccountId ? String(item.chartAccountId) : "", costCenterId: item?.costCenterId ? String(item.costCenterId) : "",
    paymentMethod: item?.paymentMethod ?? "", observations: item?.observations ?? "",
  });
  const [error, setError] = useState("");
  const set = (name: string, value: string | number | string[] | null) => setState((prev) => ({ ...prev, [name]: Array.isArray(value) ? value[0] ?? "" : value ?? "" }));
  const { data: suppliers } = useSuppliers(kind === "payable");
  const { data: customers } = useCustomerOptions(kind === "receivable");
  const { data: accounts } = useChartAccounts();
  const { data: centers } = useCostCenters();
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const body = {
        kind, description: state.description.trim(), value: state.value, endDate: state.endDate || null,
        ...(kind === "payable" ? { supplierId: state.supplierId || null } : { customerId: state.customerId || null }),
        chartAccountId: state.chartAccountId || null, costCenterId: state.costCenterId || null, paymentMethod: state.paymentMethod || null, observations: state.observations,
      };
      return isEdit ? (await api.put(`financial/recurrences/${item!.id}`, body)).data : (await api.post("financial/recurrences", { ...body, startDate: state.startDate })).data;
    },
    onSuccess: (result) => {
      toast({ title: isEdit ? `Recorrente atualizado (${result.changed ?? 0} mês(es) em aberto alterado(s))` : `Recorrente criado: ${result.created} mês(es) lançado(s)`, variant: "success" });
      for (const k of [KEY, PAYABLES_KEY, "listContas a Receber", "financialReports"]) queryClient.invalidateQueries({ queryKey: [k] });
      close();
    },
    onError: (err: ApiError) => setError(err.response?.data?.message || "Erro desconhecido."),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (state.description.trim().length < 2) return setError("Informe a descrição");
    if (!state.value || state.value <= 0) return setError("Informe o valor");
    if (kind === "receivable" && !state.customerId) return setError("Informe o cliente");
    if (state.endDate && state.endDate < state.startDate) return setError("A data final é antes do primeiro vencimento");
    setError("");
    mutate();
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4 mt-4">
      <p className="text-sm rounded bg-muted px-3 py-2">{kind === "payable" ? "Despesa fixa (a pagar)" : "Mensalidade (a receber)"}</p>
      {kind === "payable" ? (
        <div>
          <Label>Fornecedor</Label>
          <Select name="supplierId" options={(suppliers?.rows ?? []) as never[]} state={state.supplierId} onChange={set} placeholder="Sem fornecedor" clearable modal />
        </div>
      ) : (
        <div>
          <Label>Cliente <span>*</span></Label>
          <Select name="customerId" options={(customers?.rows ?? []) as never[]} state={state.customerId} onChange={set} placeholder="Selecione o cliente" modal />
        </div>
      )}
      <div>
        <Label>Descrição <span>*</span></Label>
        <Input name="description" value={state.description} maxLength={255} placeholder={kind === "payable" ? "Ex.: Aluguel do galpão" : "Ex.: Mensalidade de consultoria"} onValueChange={set} className="mt-1" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Valor por mês <span>*</span></Label>
          <Input name="value" format="currency" value={state.value} onValueChange={set} className="mt-1" />
        </div>
        <div>
          <Label>Forma de pagamento</Label>
          <Select name="paymentMethod" options={paymentMethodOptions} state={state.paymentMethod} onChange={set} placeholder="A definir" clearable modal />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Primeiro vencimento <span>*</span></Label>
          {isEdit ? <p className="text-sm mt-2">{formatDate(state.startDate)} (todo dia {item?.dayOfMonth})</p>
            : <CalendarPicker mode="natural" name="startDate" value={state.startDate} onValueChange={set} placeholder="dd/mm/aaaa" className="mt-1" />}
        </div>
        <div>
          <Label>Termina em</Label>
          <CalendarPicker mode="natural" name="endDate" value={state.endDate} onValueChange={set} placeholder="Sem data para acabar" className="mt-1" />
        </div>
      </div>
      <div className="rounded border p-3 flex flex-col gap-3">
        <p className="font-medium text-sm">Classificação</p>
        <div>
          <Label>Conta (plano de contas)</Label>
          <AccountSelect accounts={accounts ?? []} value={state.chartAccountId} nature={kind === "payable" ? "despesa" : "receita"} clearable onChange={(v) => set("chartAccountId", v)} placeholder="Sem conta" />
        </div>
        <div>
          <Label>Centro de custo</Label>
          <Select name="costCenterId" options={(centers?.rows ?? []) as never[]} state={state.costCenterId} onChange={set} placeholder="Sem centro de custo" clearable modal />
        </div>
      </div>
      <div>
        <Label>Observações</Label>
        <Input name="observations" type="textArea" value={state.observations} maxLength={500} onValueChange={set} className="mt-1" />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isPending}>{isEdit ? "Salvar" : "Criar recorrente"}</Button>
        <Button type="button" variant="outline" className="flex-1" onClick={close}>Cancelar</Button>
      </div>
    </form>
  );
}
