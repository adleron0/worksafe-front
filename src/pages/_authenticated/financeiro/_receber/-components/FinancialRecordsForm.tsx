import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useLoader } from "@/context/GeneralContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";
import { ApiError, Response } from "@/general-interfaces/api.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { IFinancialRecord } from "../-interfaces/entity.interface";
import { paymentMethodOptions, toDateInput } from "./options";

interface FormProps {
  formData: IFinancialRecord | null;
  setOpenForm: (open: boolean) => void;
  entity: IDefaultEntity;
}

interface FormState {
  customerId: string;
  description: string;
  value: number;
  netValue: number;
  dueDate: string;
  accrualDate: string;
  paymentMethod: string;
  installmentNumber: string;
  installmentTotal: string;
  invoiceNumber: string;
  invoiceIssuedAt: string;
  observations: string;
}

const INVOICE_TYPES = "application/pdf,application/xml,text/xml,image/*";

const FinancialRecordsForm: React.FC<FormProps> = ({ formData, setOpenForm, entity }) => {
  const { showLoader, hideLoader } = useLoader();
  const queryClient = useQueryClient();
  const isEdit = Boolean(formData);
  // Cobrança de gateway espelha o provedor: aqui só entram NF e anotações.
  const gatewayOwned = isEdit && formData?.gateway !== "manual";
  const settled = formData?.status === "received";

  const [state, setState] = useState<FormState>({
    customerId: formData?.customerId ? String(formData.customerId) : "",
    description: formData?.description ?? "",
    value: Number(formData?.value ?? 0),
    netValue: Number(formData?.netValue ?? 0),
    dueDate: toDateInput(formData?.dueDate),
    accrualDate: formData?.accrualDate ?? "",
    paymentMethod: formData?.paymentMethod ?? "transferencia",
    installmentNumber: formData?.installmentNumber ? String(formData.installmentNumber) : "",
    installmentTotal: formData?.installmentTotal ? String(formData.installmentTotal) : "",
    invoiceNumber: formData?.invoiceNumber ?? "",
    invoiceIssuedAt: toDateInput(formData?.invoiceIssuedAt),
    observations: formData?.observations ?? "",
  });
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [removeInvoice, setRemoveInvoice] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (name: string, value: string | number | string[] | null) =>
    setState((prev) => ({ ...prev, [name]: Array.isArray(value) ? value[0] ?? "" : value ?? "" }));

  const { data: customers, isLoading: loadingCustomers } = useQuery<Response | undefined>({
    queryKey: ["optionsCustomers"],
    queryFn: () => get<Response>("customer", "", [
      { key: "limit", value: 100 },
      { key: "order-name", value: "asc" },
    ]),
    enabled: !gatewayOwned,
  });

  const validate = () => {
    const found: Record<string, string> = {};
    if (!gatewayOwned) {
      if (!state.customerId && !formData?.traineeId) found.customerId = "Selecione o cliente";
      if (!state.value || state.value <= 0) found.value = "Informe o valor";
      if (!state.dueDate) found.dueDate = "Informe o vencimento";
      const number = Number(state.installmentNumber || 0);
      const total = Number(state.installmentTotal || 0);
      if ((number && !total) || (!number && total)) found.installmentNumber = "Informe a parcela e o total";
      else if (number > total) found.installmentNumber = "Parcela maior que o total";
    }
    if (state.netValue && state.netValue > state.value && state.value > 0) found.netValue = "Líquido maior que o valor da nota";
    if (state.invoiceIssuedAt && !state.invoiceNumber.trim()) found.invoiceNumber = "Informe o número da NF";
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const payload = () => {
    // "" limpa o campo na API (o FormData não envia null).
    const invoice: Record<string, unknown> = {
      invoiceNumber: state.invoiceNumber.trim(),
      invoiceIssuedAt: state.invoiceIssuedAt,
      netValue: state.netValue > 0 ? state.netValue : "",
      description: state.description.trim(),
      observations: state.observations.trim(),
    };
    if (invoiceFile) invoice.invoiceFile = invoiceFile;
    else if (removeInvoice) invoice.invoiceUrl = "";
    if (gatewayOwned) return invoice;
    return {
      ...invoice,
      customerId: state.customerId,
      value: state.value,
      dueDate: state.dueDate,
      accrualDate: state.accrualDate || state.dueDate.slice(0, 7),
      paymentMethod: state.paymentMethod,
      installmentNumber: state.installmentNumber,
      installmentTotal: state.installmentTotal,
    };
  };

  const { mutate, isPending } = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      showLoader("Salvando conta a receber...");
      return isEdit ? put(entity.model, String(formData!.id), data) : post(entity.model, "", data);
    },
    onSuccess: () => {
      hideLoader();
      toast({ title: `${entity.name} ${isEdit ? "atualizada" : "cadastrada"}!`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      setOpenForm(false);
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({
        title: `Erro ao salvar ${entity.name.toLowerCase()}`,
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (validate()) mutate(payload());
  };

  const hint = (name: string) => errors[name] && <p className="text-red-500 text-sm mt-1">{errors[name]}</p>;
  const currentInvoice = !removeInvoice && !invoiceFile ? formData?.invoiceUrl : null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full mt-4">
      {gatewayOwned && (
        <p className="text-sm rounded border p-3 text-muted-foreground">
          Cobrança gerada pelo gateway ({formData?.gateway.toUpperCase()}). Valor, vencimento e forma de pagamento
          vêm do provedor; aqui você registra a nota fiscal e as anotações.
        </p>
      )}

      {!gatewayOwned && (
        <>
          <div>
            <Label htmlFor="customerId">Cliente <span>*</span></Label>
            <Select
              name="customerId"
              options={(customers?.rows ?? []) as never[]}
              state={state.customerId}
              onChange={set}
              placeholder="Selecione o cliente"
              isLoading={loadingCustomers}
              modal
            />
            {hint("customerId")}
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" name="description" value={state.description} maxLength={255}
              placeholder="Ex.: Turma fechada NR-35 — 20 alunos" onValueChange={set} className="mt-1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="value">Valor <span>*</span></Label>
              <Input id="value" name="value" format="currency" value={state.value} onValueChange={set}
                disabled={settled} className="mt-1" />
              {settled && <p className="text-xs text-muted-foreground mt-1">Estorne a baixa para alterar o valor.</p>}
              {hint("value")}
            </div>
            <div>
              <Label htmlFor="dueDate">Vencimento <span>*</span></Label>
              <CalendarPicker mode="natural" name="dueDate" value={state.dueDate} onValueChange={set}
                placeholder="dd/mm/aaaa" className="mt-1" />
              {hint("dueDate")}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentMethod">Forma de pagamento</Label>
              <Select name="paymentMethod" options={paymentMethodOptions} state={state.paymentMethod}
                onChange={set} placeholder="Selecione" modal />
            </div>
            <div>
              <Label htmlFor="accrualDate">Competência</Label>
              <CalendarPicker mode="month" name="accrualDate" value={state.accrualDate || null}
                onValueChange={set} placeholder="Mês do vencimento" fromYear={2020} toYear={2035} />
            </div>
          </div>

          <div>
            <Label>Parcela</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input name="installmentNumber" type="number" min={1} value={state.installmentNumber}
                onValueChange={set} placeholder="Nº" className="w-24" />
              <span className="text-muted-foreground">de</span>
              <Input name="installmentTotal" type="number" min={1} value={state.installmentTotal}
                onValueChange={set} placeholder="Total" className="w-24" />
            </div>
            {hint("installmentNumber")}
          </div>
        </>
      )}

      <div className="rounded border p-3 flex flex-col gap-4">
        <p className="font-medium text-sm">Nota fiscal</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="invoiceNumber">Número da NF</Label>
            <Input id="invoiceNumber" name="invoiceNumber" value={state.invoiceNumber} maxLength={60}
              onValueChange={set} placeholder="Ex.: 2026/000123" className="mt-1" />
            {hint("invoiceNumber")}
          </div>
          <div>
            <Label htmlFor="invoiceIssuedAt">Data de emissão</Label>
            <CalendarPicker mode="natural" name="invoiceIssuedAt" value={state.invoiceIssuedAt}
              onValueChange={set} placeholder="dd/mm/aaaa" className="mt-1" />
          </div>
        </div>
        <div>
          <Label htmlFor="netValue">Valor líquido a receber</Label>
          <Input id="netValue" name="netValue" format="currency" value={state.netValue} onValueChange={set} className="mt-1" />
          <p className="text-xs text-muted-foreground mt-1">
            Preencha quando a nota tiver retenções (ISS, INSS, IR). Em branco, vale o valor cheio.
          </p>
          {hint("netValue")}
        </div>
        <div>
          <Label htmlFor="invoiceFile">Arquivo da NF (PDF, XML ou imagem)</Label>
          {currentInvoice ? (
            <div className="flex items-center gap-3 mt-1 text-sm">
              <a href={currentInvoice} target="_blank" rel="noreferrer" className="underline text-primary">Abrir arquivo atual</a>
              <Button type="button" variant="outline" size="sm" onClick={() => setRemoveInvoice(true)}>Remover</Button>
            </div>
          ) : (
            <input id="invoiceFile" type="file" accept={INVOICE_TYPES} className="mt-1 block w-full text-sm"
              onChange={(event) => setInvoiceFile(event.target.files?.[0] ?? null)} />
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="observations">Observações</Label>
        <Input id="observations" name="observations" type="textArea" value={state.observations} maxLength={255}
          onValueChange={set} className="mt-1" />
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isPending}>{isEdit ? "Atualizar" : "Cadastrar"}</Button>
        <Button type="button" variant="outline" className="flex-1" onClick={() => setOpenForm(false)}>Cancelar</Button>
      </div>
    </form>
  );
};

export default FinancialRecordsForm;
