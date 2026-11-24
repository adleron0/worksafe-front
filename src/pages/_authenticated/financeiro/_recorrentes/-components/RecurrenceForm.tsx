import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";
import { FormPageGrid, FormSection, SummaryRow } from "@/components/general-components/FormPage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/general-interfaces/api.interface";
import AccountSelect from "../../-shared/AccountSelect";
import { formatMoney, useChartAccounts, useCostCenters } from "../../-shared/financial";
import { PAYABLES_KEY, useSuppliers } from "../../-shared/payables";
import { useCustomerOptions } from "../../-shared/ledger";
import { formatDate, paymentMethodLabel, paymentMethodOptions, toDateInput, todayInput } from "../../_receber/-components/options";

export type Kind = "payable" | "receivable";
export interface Recurrence {
  id: number; kind: Kind; description: string; value: number; dayOfMonth: number; startDate: string; endDate: string | null;
  supplierId: number | null; customerId: number | null; chartAccountId: number | null; costCenterId: number | null; serviceOrderId: number | null;
  paymentMethod: string | null; observations: string | null; inactiveAt: string | null;
  supplier: { id: number; name: string } | null; customer: { id: number; name: string } | null;
  chartAccount: { id: number; code: string; name: string } | null; costCenter: { id: number; name: string } | null;
  upcoming: number; nextDue: string | null; yearTotal: number;
}
export const RECURRENCES_KEY = "financialRecurrences";
/** Cadastro e edição de um recorrente (despesa fixa ou mensalidade). */
export default function RecurrenceForm({ kind, item, close }: { kind: Kind; item: Recurrence | null; close: () => void }) {
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
      for (const k of [RECURRENCES_KEY, PAYABLES_KEY, "listContas a Receber", "financialReports"]) queryClient.invalidateQueries({ queryKey: [k] });
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
  const partyName = kind === "payable"
    ? suppliers?.rows?.find((row: { id: number }) => String(row.id) === state.supplierId)?.name
    : customers?.rows?.find((row: { id: number }) => String(row.id) === state.customerId)?.name;
  const day = isEdit ? item?.dayOfMonth : state.startDate ? Number(state.startDate.slice(8, 10)) : null;
  return (
    <form onSubmit={submit}>
      <FormPageGrid aside={<>
        <section className="rounded-card border bg-card p-4 flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Resumo</p>
          <SummaryRow label="Por mês" strong>{formatMoney(state.value || 0)}</SummaryRow>
          <SummaryRow label="Tipo">{kind === "payable" ? "Despesa fixa (a pagar)" : "Mensalidade (a receber)"}</SummaryRow>
          <SummaryRow label={kind === "payable" ? "Fornecedor" : "Cliente"}>{partyName ?? (kind === "payable" ? "Sem fornecedor" : "—")}</SummaryRow>
          <SummaryRow label="Todo dia">{day || "—"}</SummaryRow>
          <SummaryRow label="Termina em">{state.endDate ? formatDate(state.endDate) : "Sem data para acabar"}</SummaryRow>
          <SummaryRow label="Forma">{state.paymentMethod ? paymentMethodLabel(state.paymentMethod) : "A definir"}</SummaryRow>
        </section>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={isPending}>{isEdit ? "Salvar" : "Criar recorrente"}</Button>
          <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
        </div>
      </>}>
        <FormSection title="Dados" description={kind === "payable" ? "Quem recebe, o que é e quanto por mês." : "Quem paga, o que é e quanto por mês."}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div>
              <Label>Valor por mês <span>*</span></Label>
              <Input name="value" format="currency" value={state.value} onValueChange={set} className="mt-1" />
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Select name="paymentMethod" options={paymentMethodOptions} state={state.paymentMethod} onChange={set} placeholder="A definir" clearable modal />
            </div>
          </div>
        </FormSection>

        <FormSection title="Período" description={isEdit ? "A mudança vale para os lançamentos em aberto de hoje em diante. Os já vencidos e os pagos não mudam." : "Lance uma vez; o sistema cria um lançamento por mês."}>
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
        </FormSection>

        <FormSection title="Classificação" description="Para o DRE e o resultado por área.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Conta (plano de contas)</Label>
              <AccountSelect accounts={accounts ?? []} value={state.chartAccountId} nature={kind === "payable" ? "despesa" : "receita"} clearable onChange={(v) => set("chartAccountId", v)} placeholder="Sem conta" />
            </div>
            <div>
              <Label>Centro de custo</Label>
              <Select name="costCenterId" options={(centers?.rows ?? []) as never[]} state={state.costCenterId} onChange={set} placeholder="Sem centro de custo" clearable modal />
            </div>
          </div>
        </FormSection>

        <FormSection title="Observações">
          <Input name="observations" type="textArea" value={state.observations} maxLength={500} onValueChange={set} />
        </FormSection>
      </FormPageGrid>
    </form>
  );
}
