import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { useLoader } from "@/context/GeneralContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";
import { ApiError } from "@/general-interfaces/api.interface";
import AccountSelect from "../-shared/AccountSelect";
import { CHART_KEY, formatMoney, useChartAccounts, useCostCenters } from "../-shared/financial";
import { PAYABLES_KEY, PAYABLES_SUMMARY_KEY, Payable, useSuppliers } from "../-shared/payables";
import { paymentMethodOptions, toDateInput } from "../_receber/-components/options";
import { ORDERS_ABILITY, OrderList, ordersApi } from "../../servicos/-shared/orders";

const FILE_TYPES = "application/pdf,application/xml,text/xml,image/*";
const ATTACHMENTS = [
  { field: "billFile", column: "billUrl", label: "Boleto" },
  { field: "invoiceFile", column: "invoiceUrl", label: "Nota do fornecedor" },
  { field: "receiptFile", column: "receiptUrl", label: "Comprovante" },
] as const;
type Column = typeof ATTACHMENTS[number]["column"];

const MODES = [
  { id: "unica", name: "Uma conta só" },
  { id: "dividir", name: "Dividir em parcelas" },
  { id: "repetir", name: "Repetir todo mês (despesa fixa)" },
];

/** Cadastro e edição de conta a pagar. Ao criar, pode lançar várias parcelas de uma vez. */
export default function PayableForm({ formData, close }: { formData: Payable | null; close: () => void }) {
  const { can } = useVerify();
  const { showLoader, hideLoader } = useLoader();
  const queryClient = useQueryClient();
  const isEdit = Boolean(formData);
  const paid = formData?.status === "paga";

  const [state, setState] = useState({
    supplierId: formData?.supplierId ? String(formData.supplierId) : "",
    description: formData?.description ?? "",
    value: Number(formData?.value ?? 0),
    dueDate: toDateInput(formData?.dueDate),
    accrualDate: formData?.accrualDate ?? "",
    paymentMethod: formData?.paymentMethod ?? "",
    documentNumber: formData?.documentNumber ?? "",
    serviceOrderId: formData?.serviceOrderId ? String(formData.serviceOrderId) : "",
    chartAccountId: formData?.chartAccountId ? String(formData.chartAccountId) : "",
    costCenterId: formData?.costCenterId ? String(formData.costCenterId) : "",
    observations: formData?.observations ?? "",
    mode: "unica",
    count: "2",
  });
  const [files, setFiles] = useState<Partial<Record<string, File>>>({});
  const [removed, setRemoved] = useState<Column[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (name: string, value: string | number | string[] | null) =>
    setState((prev) => ({ ...prev, [name]: Array.isArray(value) ? value[0] ?? "" : value ?? "" }));

  const { data: suppliers, isLoading: loadingSuppliers } = useSuppliers();
  const { data: accounts } = useChartAccounts();
  const { data: costCenters } = useCostCenters();
  const seesOrders = can(`view_${ORDERS_ABILITY}`);
  const { data: orders } = useQuery({
    queryKey: ["optionsServiceOrders"],
    queryFn: () => ordersApi.get<OrderList>("", { page: 0, limit: 200 }),
    enabled: seesOrders,
  });
  const orderOptions = (orders?.rows ?? []).map((order) => ({ id: order.id, name: `${order.number} — ${order.customer.name}` }));

  const several = !isEdit && state.mode !== "unica";
  const count = Number(state.count);

  const validate = () => {
    const found: Record<string, string> = {};
    if (state.description.trim().length < 2) found.description = "Informe a descrição";
    if (!state.value || state.value <= 0) found.value = "Informe o valor";
    if (!state.dueDate) found.dueDate = "Informe o vencimento";
    if (several && (!Number.isInteger(count) || count < 2 || count > 60)) found.count = "De 2 a 60 parcelas";
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      showLoader("Salvando conta a pagar...");
      // "" limpa o campo na API (o FormData não envia null)
      const base: Record<string, unknown> = {
        supplierId: state.supplierId, description: state.description.trim(), value: state.value, dueDate: state.dueDate,
        paymentMethod: state.paymentMethod, documentNumber: state.documentNumber.trim(), serviceOrderId: state.serviceOrderId,
        chartAccountId: state.chartAccountId, costCenterId: state.costCenterId, observations: state.observations.trim(),
      };
      if (several) return (await api.post("financial-payables/installments", { ...base, count, mode: state.mode })).data;
      const data: Record<string, unknown> = { ...base, accrualDate: state.accrualDate || state.dueDate.slice(0, 7), ...files };
      for (const column of removed) data[column] = "";
      return isEdit ? put("financial-payables", String(formData!.id), data) : post("financial-payables", "", data);
    },
    onSuccess: () => {
      hideLoader();
      toast({ title: several ? `${count} parcelas lançadas!` : `Conta a pagar ${isEdit ? "atualizada" : "lançada"}!`, variant: "success" });
      for (const key of [PAYABLES_KEY, PAYABLES_SUMMARY_KEY, CHART_KEY]) queryClient.invalidateQueries({ queryKey: [key] });
      close();
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({ title: "Erro ao salvar a conta a pagar", description: error.response?.data?.message || "Erro desconhecido.", variant: "destructive" });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (validate()) mutate();
  };
  const hint = (name: string) => errors[name] && <p className="text-red-500 text-sm mt-1">{errors[name]}</p>;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full mt-4">
      <div>
        <Label htmlFor="supplierId">Fornecedor</Label>
        <Select name="supplierId" options={(suppliers?.rows ?? []) as never[]} state={state.supplierId} onChange={set}
          placeholder="Sem fornecedor" isLoading={loadingSuppliers} clearable modal />
        {!loadingSuppliers && !suppliers?.rows?.length && (
          <p className="text-xs text-muted-foreground mt-1">Nenhum fornecedor cadastrado. Cadastre em Financeiro → Fornecedores.</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Descrição <span>*</span></Label>
        <Input id="description" name="description" value={state.description} maxLength={255}
          placeholder="Ex.: Locação de andaimes — novembro" onValueChange={set} className="mt-1" />
        {hint("description")}
      </div>

      {!isEdit && (
        <div>
          <Label htmlFor="mode">Lançamento</Label>
          <Select name="mode" options={MODES} state={state.mode} onChange={set} placeholder="Selecione" modal />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="value">{state.mode === "dividir" && !isEdit ? "Valor total" : state.mode === "repetir" && !isEdit ? "Valor por mês" : "Valor"} <span>*</span></Label>
          <Input id="value" name="value" format="currency" value={state.value} onValueChange={set} disabled={paid} className="mt-1" />
          {paid && <p className="text-xs text-muted-foreground mt-1">Estorne a baixa para alterar o valor.</p>}
          {hint("value")}
        </div>
        <div>
          <Label htmlFor="dueDate">{several ? "Primeiro vencimento" : "Vencimento"} <span>*</span></Label>
          <CalendarPicker mode="natural" name="dueDate" value={state.dueDate} onValueChange={set} placeholder="dd/mm/aaaa" className="mt-1" />
          {hint("dueDate")}
        </div>
      </div>

      {several && (
        <div>
          <Label htmlFor="count">{state.mode === "dividir" ? "Número de parcelas" : "Quantos meses"} <span>*</span></Label>
          <Input id="count" name="count" type="number" min={2} max={60} value={state.count} onValueChange={set} className="mt-1 w-32" />
          {hint("count")}
          {count >= 2 && count <= 60 && state.value > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {state.mode === "dividir"
                ? `${count} parcelas de cerca de ${formatMoney(state.value / count)}, uma por mês.`
                : `${count} contas de ${formatMoney(state.value)}, uma por mês (total ${formatMoney(state.value * count)}).`}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="documentNumber">Nº da nota ou documento</Label>
          <Input id="documentNumber" name="documentNumber" value={state.documentNumber} maxLength={60} onValueChange={set} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="paymentMethod">Forma de pagamento</Label>
          <Select name="paymentMethod" options={paymentMethodOptions} state={state.paymentMethod} onChange={set} placeholder="A definir" clearable modal />
        </div>
      </div>

      {!several && (
        <div>
          <Label htmlFor="accrualDate">Competência</Label>
          <CalendarPicker mode="month" name="accrualDate" value={state.accrualDate || null} onValueChange={set}
            placeholder="Mês do vencimento" fromYear={2020} toYear={2035} />
        </div>
      )}

      <div className="rounded border p-3 flex flex-col gap-4">
        <p className="font-medium text-sm">Classificação</p>
        <div>
          <Label>Conta (plano de contas)</Label>
          <AccountSelect accounts={accounts ?? []} value={state.chartAccountId} nature="despesa" clearable
            onChange={(value) => set("chartAccountId", value)} placeholder="Sem conta" />
        </div>
        <div>
          <Label htmlFor="costCenterId">Centro de custo</Label>
          <Select name="costCenterId" options={(costCenters?.rows ?? []) as never[]} state={state.costCenterId}
            onChange={set} placeholder="Sem centro de custo" clearable modal />
        </div>
        {(seesOrders || formData?.serviceOrder) && (
          <div>
            <Label htmlFor="serviceOrderId">Ordem de serviço</Label>
            {seesOrders ? (
              <Select name="serviceOrderId" options={orderOptions} state={state.serviceOrderId} onChange={set}
                placeholder="Não é gasto de uma obra" clearable modal />
            ) : <p className="text-sm mt-1">{formData?.serviceOrder?.number}</p>}
            <p className="text-xs text-muted-foreground mt-1">Quando o gasto é de uma obra, ele entra no resultado daquela OS.</p>
          </div>
        )}
      </div>

      {!several ? (
        <div className="rounded border p-3 flex flex-col gap-3">
          <p className="font-medium text-sm">Anexos (PDF, XML ou imagem)</p>
          {ATTACHMENTS.map(({ field, column, label }) => {
            const current = !removed.includes(column) && !files[field] ? formData?.[column] : null;
            return (
              <div key={field} className="flex flex-wrap items-center gap-3 text-sm">
                <span className="w-36 text-muted-foreground">{label}</span>
                {current ? (
                  <>
                    <a href={current} target="_blank" rel="noreferrer" className="underline text-primary">Abrir</a>
                    <Button type="button" variant="outline" size="sm" onClick={() => setRemoved((prev) => [...prev, column])}>Remover</Button>
                  </>
                ) : (
                  <>
                    <input id={field} type="file" accept={FILE_TYPES} className="hidden"
                      onChange={(event) => { const file = event.target.files?.[0]; if (file) setFiles((prev) => ({ ...prev, [field]: file })); }} />
                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(field)?.click()}>Escolher arquivo</Button>
                    <span className="min-w-0 truncate text-muted-foreground">{files[field]?.name ?? "Nenhum"}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Boleto, nota e comprovante são anexados depois, em cada parcela.</p>
      )}

      <div>
        <Label htmlFor="observations">Observações</Label>
        <Input id="observations" name="observations" type="textArea" value={state.observations} maxLength={500} onValueChange={set} className="mt-1" />
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isPending}>{isEdit ? "Atualizar" : several ? "Lançar parcelas" : "Lançar"}</Button>
        <Button type="button" variant="outline" className="flex-1" onClick={close}>Cancelar</Button>
      </div>
    </form>
  );
}
