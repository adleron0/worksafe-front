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
import Icon from "@/components/general-components/Icon";
import { FormPageGrid, FormSection, SummaryRow } from "@/components/general-components/FormPage";

/** Guias de imposto: cruzadas com os impostos retidos pelos clientes no mesmo mês. */
const TAX_GUIDE_OPTIONS = [
  { id: "das", name: "DAS (Simples Nacional)" }, { id: "iss", name: "ISS" }, { id: "inss", name: "INSS (GPS/DCTFWeb)" },
  { id: "irpj", name: "IRPJ" }, { id: "csll", name: "CSLL" }, { id: "pis", name: "PIS" }, { id: "cofins", name: "COFINS" },
];
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
  { id: "recorrente", name: "Despesa fixa todo mês (sem data para acabar)" },
  { id: "repetir", name: "Repetir por alguns meses" },
];
const SCOPES = [
  { id: "esta", name: "Só esta parcela" },
  { id: "proximas", name: "Esta e as próximas em aberto" },
  { id: "todas", name: "Todas as parcelas em aberto" },
];

/** Cadastro e edição de conta a pagar. Ao criar, pode lançar várias parcelas de uma vez. */
export default function PayableForm({ formData, close, duplicate = false }: { formData: Payable | null; close: () => void; duplicate?: boolean }) {
  const { can } = useVerify();
  const { showLoader, hideLoader } = useLoader();
  const queryClient = useQueryClient();
  const isEdit = Boolean(formData) && !duplicate;
  const paid = isEdit && formData?.status === "paga";
  const inGroup = isEdit && Boolean(formData?.groupKey) && formData?.status === "aberta";

  const [state, setState] = useState({
    supplierId: formData?.supplierId ? String(formData.supplierId) : "",
    description: formData?.description ?? "",
    value: Number(formData?.value ?? 0),
    dueDate: duplicate ? "" : toDateInput(formData?.dueDate),
    accrualDate: duplicate ? "" : formData?.accrualDate ?? "",
    paymentMethod: formData?.paymentMethod ?? "",
    documentNumber: formData?.documentNumber ?? "",
    serviceOrderId: formData?.serviceOrderId ? String(formData.serviceOrderId) : "",
    chartAccountId: formData?.chartAccountId ? String(formData.chartAccountId) : "",
    costCenterId: formData?.costCenterId ? String(formData.costCenterId) : "",
    observations: formData?.observations ?? "",
    taxKind: formData?.taxKind ?? "",
    barcode: duplicate ? "" : formData?.barcode ?? "",
    pixCode: duplicate ? "" : formData?.pixCode ?? "",
    mode: "unica",
    count: "2",
    endDate: "",
    scope: "esta",
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

  const recurring = !isEdit && state.mode === "recorrente";
  const several = !isEdit && (state.mode === "dividir" || state.mode === "repetir");
  const count = Number(state.count);

  const validate = () => {
    const found: Record<string, string> = {};
    if (state.description.trim().length < 2) found.description = "Informe a descrição";
    if (!state.value || state.value <= 0) found.value = "Informe o valor";
    if (!state.dueDate) found.dueDate = "Informe o vencimento";
    if (several && (!Number.isInteger(count) || count < 2 || count > 60)) found.count = "De 2 a 60 parcelas";
    const code = state.barcode.replace(/\D/g, "");
    if (code && (code.length < 44 || code.length > 48)) found.barcode = "A linha digitável tem de 44 a 48 números";
    if (recurring && state.endDate && state.endDate < state.dueDate) found.endDate = "A data final é antes do primeiro vencimento";
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
        chartAccountId: state.chartAccountId, costCenterId: state.costCenterId, observations: state.observations.trim(), taxKind: state.taxKind,
      };
      if (recurring) {
        return (await api.post("financial/recurrences", {
          kind: "payable", description: base.description, value: base.value, startDate: base.dueDate, endDate: state.endDate || null,
          supplierId: base.supplierId || null, chartAccountId: base.chartAccountId || null, costCenterId: base.costCenterId || null,
          serviceOrderId: base.serviceOrderId || null, paymentMethod: base.paymentMethod || null, observations: base.observations,
        })).data;
      }
      if (several) return (await api.post("financial-payables/installments", { ...base, count, mode: state.mode })).data;
      if (inGroup && state.scope !== "esta") {
        // descrição, fornecedor e classificação valem para as outras parcelas; vencimento e anexos ficam só nesta
        await api.put(`financial/payables/group/${formData!.groupKey}`, {
          scope: state.scope, fromId: formData!.id, description: base.description, supplierId: base.supplierId || null, paymentMethod: base.paymentMethod || null,
          chartAccountId: base.chartAccountId || null, costCenterId: base.costCenterId || null, serviceOrderId: base.serviceOrderId || null, value: base.value,
        });
      }
      base.barcode = state.barcode.replace(/\D/g, "");
      base.pixCode = state.pixCode.trim();
      const data: Record<string, unknown> = { ...base, accrualDate: state.accrualDate || state.dueDate.slice(0, 7), ...files };
      for (const column of removed) data[column] = "";
      return isEdit ? put("financial-payables", String(formData!.id), data) : post("financial-payables", "", data);
    },
    onSuccess: () => {
      hideLoader();
      toast({ title: recurring ? "Despesa fixa criada: os próximos 12 meses já estão lançados!" : several ? `${count} parcelas lançadas!` : `Conta a pagar ${isEdit ? "atualizada" : "lançada"}!`, variant: "success" });
      for (const key of [PAYABLES_KEY, PAYABLES_SUMMARY_KEY, CHART_KEY, "financialRecurrences"]) queryClient.invalidateQueries({ queryKey: [key] });
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

  const supplierName = (suppliers?.rows ?? []).find((sup: { id: number; name: string }) => String(sup.id) === state.supplierId)?.name;
  const modeName = MODES.find((m) => m.id === state.mode)?.name;
  const submitLabel = isEdit ? "Salvar alterações" : recurring ? "Criar despesa fixa" : several ? "Lançar parcelas" : "Lançar conta";

  return (
    <form onSubmit={handleSubmit}>
      <FormPageGrid aside={<>
        <section className="rounded-card border bg-card p-4 flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Resumo</p>
          <SummaryRow label={state.mode === "dividir" && !isEdit ? "Valor total" : (state.mode === "repetir" || recurring) && !isEdit ? "Por mês" : "Valor"} strong>
            {formatMoney(state.value || 0)}
          </SummaryRow>
          {several && count >= 2 && count <= 60 && state.value > 0 && (
            <SummaryRow label={state.mode === "dividir" ? `${count} parcelas de` : `${count} meses, total`}>
              {formatMoney(state.mode === "dividir" ? state.value / count : state.value * count)}
            </SummaryRow>
          )}
          <SummaryRow label={several || recurring ? "1º vencimento" : "Vencimento"}>{state.dueDate ? state.dueDate.split("-").reverse().join("/") : "—"}</SummaryRow>
          <SummaryRow label="Fornecedor">{supplierName ?? "Sem fornecedor"}</SummaryRow>
          {!isEdit && <SummaryRow label="Lançamento">{modeName}</SummaryRow>}
          {isEdit && <SummaryRow label="Situação">{paid ? "Paga" : formData?.inactiveAt ? "Excluída" : "Em aberto"}</SummaryRow>}
        </section>

        {!several && !recurring ? (
          <section className="rounded-card border bg-card p-4 flex flex-col gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Anexos</p>
            {ATTACHMENTS.map(({ field, column, label }) => {
              const current = !duplicate && !removed.includes(column) && !files[field] ? formData?.[column] : null;
              return (
                <div key={field} className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  {current ? (
                    <div className="flex items-center gap-2">
                      <a href={current} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><Icon name="paperclip" className="w-3.5 h-3.5" /> Abrir</a>
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-muted-foreground" onClick={() => setRemoved((prev) => [...prev, column])}>Remover</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <input id={field} type="file" accept={FILE_TYPES} className="hidden"
                        onChange={(event) => { const file = event.target.files?.[0]; if (file) setFiles((prev) => ({ ...prev, [field]: file })); }} />
                      <Button type="button" variant="outline" size="sm" className="h-7 shrink-0" onClick={() => document.getElementById(field)?.click()}><Icon name="upload" className="w-3.5 h-3.5" /> Escolher</Button>
                      <span className="min-w-0 truncate text-xs text-muted-foreground">{files[field]?.name ?? "Nenhum"}</span>
                    </div>
                  )}
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">PDF, XML ou imagem.</p>
          </section>
        ) : (
          <p className="text-xs text-muted-foreground px-1">Boleto, nota, linha digitável e comprovante entram depois, em cada {recurring ? "mês" : "parcela"}.</p>
        )}

        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={isPending}>{submitLabel}</Button>
          <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
        </div>
      </>}>
        <FormSection title="Dados da conta" description="Quem recebe, o que é, quanto e quando.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supplierId">Fornecedor</Label>
              <Select name="supplierId" options={(suppliers?.rows ?? []) as never[]} state={state.supplierId} onChange={set}
                placeholder="Sem fornecedor" isLoading={loadingSuppliers} clearable modal />
              {!loadingSuppliers && !suppliers?.rows?.length && (
                <p className="text-xs text-muted-foreground mt-1">Nenhum fornecedor cadastrado. Cadastre em Financeiro → Fornecedores.</p>
              )}
            </div>
            <div>
              <Label htmlFor="documentNumber">Nº da nota ou documento</Label>
              <Input id="documentNumber" name="documentNumber" value={state.documentNumber} maxLength={60} onValueChange={set} className="mt-1" />
            </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="value">{state.mode === "dividir" && !isEdit ? "Valor total" : (state.mode === "repetir" || recurring) && !isEdit ? "Valor por mês" : "Valor"} <span>*</span></Label>
              <Input id="value" name="value" format="currency" value={state.value} onValueChange={set} disabled={paid} className="mt-1" />
              {paid && <p className="text-xs text-muted-foreground mt-1">Estorne a baixa para alterar o valor.</p>}
              {hint("value")}
            </div>
            <div>
              <Label htmlFor="dueDate">{several || recurring ? "Primeiro vencimento" : "Vencimento"} <span>*</span></Label>
              <CalendarPicker mode="natural" name="dueDate" value={state.dueDate} onValueChange={set} placeholder="dd/mm/aaaa" className="mt-1" />
              {hint("dueDate")}
            </div>
            {!several && !recurring && (
              <div>
                <Label htmlFor="accrualDate">Competência</Label>
                <CalendarPicker mode="month" name="accrualDate" value={state.accrualDate || null} onValueChange={set}
                  placeholder="Mês do vencimento" fromYear={2020} toYear={2035} className="mt-1 bg-transparent" />
              </div>
            )}
            {several && (
              <div>
                <Label htmlFor="count">{state.mode === "dividir" ? "Número de parcelas" : "Quantos meses"} <span>*</span></Label>
                <Input id="count" name="count" type="number" min={2} max={60} value={state.count} onValueChange={set} className="mt-1" />
                {hint("count")}
              </div>
            )}
          </div>

          {recurring && (
            <div className="rounded-lg bg-muted/50 p-3 flex flex-col gap-3">
              <p className="text-sm">Todo mês, no dia do primeiro vencimento. Os próximos 12 meses ficam lançados (aparecem no fluxo de caixa) e o sistema vai lançando os seguintes sozinho.</p>
              <div className="sm:max-w-xs">
                <Label htmlFor="endDate">Termina em (opcional)</Label>
                <CalendarPicker mode="natural" name="endDate" value={state.endDate} onValueChange={set} placeholder="Sem data para acabar" className="mt-1" />
                {hint("endDate")}
              </div>
              <p className="text-xs text-muted-foreground">Para mudar o valor ou encerrar depois, use Financeiro → Recorrentes.</p>
            </div>
          )}

          {inGroup && (
            <div className="rounded-lg bg-muted/50 p-3">
              <Label htmlFor="scope">Aplicar as mudanças em</Label>
              <Select name="scope" options={SCOPES} state={state.scope} onChange={set} modal />
              <p className="text-xs text-muted-foreground mt-1">Descrição, valor, fornecedor, forma e classificação. Vencimento, documento e anexos mudam só nesta parcela; parcela paga não muda.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentMethod">Forma de pagamento</Label>
              <Select name="paymentMethod" options={paymentMethodOptions} state={state.paymentMethod} onChange={set} placeholder="A definir" clearable modal />
            </div>
            {!recurring && (
              <div>
                <Label htmlFor="taxKind">É guia de imposto?</Label>
                <Select name="taxKind" options={TAX_GUIDE_OPTIONS} state={state.taxKind} onChange={set} placeholder="Não é guia de imposto" clearable modal />
                <p className="text-xs text-muted-foreground mt-1">Marcando a guia (DAS, ISS...), o sistema confere se algum cliente já reteve esse imposto no mês e avisa antes de pagar duas vezes.</p>
              </div>
            )}
          </div>
        </FormSection>

        {!several && !recurring && (
          <FormSection title="Para pagar" description="Na lista aparece um botão para copiar e colar no banco, sem abrir o PDF.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="barcode">Linha digitável do boleto</Label>
                <Input id="barcode" name="barcode" value={state.barcode} maxLength={60} placeholder="Cole aqui os números do boleto" onValueChange={set} className="mt-1" />
                {hint("barcode")}
              </div>
              <div>
                <Label htmlFor="pixCode">PIX copia e cola</Label>
                <Input id="pixCode" name="pixCode" type="textArea" value={state.pixCode} maxLength={600} placeholder="Cole o código PIX do fornecedor" onValueChange={set} className="mt-1" />
              </div>
            </div>
          </FormSection>
        )}

        <FormSection title="Classificação" description="Para o DRE, o resultado por área e o resultado de cada obra.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </FormSection>

        <FormSection title="Observações">
          <Input id="observations" name="observations" type="textArea" value={state.observations} maxLength={500} onValueChange={set} />
        </FormSection>
      </FormPageGrid>
    </form>
  );
}
