import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { Response } from "@/general-interfaces/api.interface";
import { paymentMethodOptions } from "./options";
import AccountSelect from "../../-shared/AccountSelect";
import { descendantIds, useBankAccounts, useChartAccounts, useCostCenters } from "../../-shared/financial";

interface SearchFormProps {
  onSearch: (data: Record<string, unknown>) => void;
  onClear: () => void;
  openSheet: (open: boolean) => void;
  params: Record<string, unknown>;
}

const originOptions = [
  { id: "manual", name: "Manual (empresas / por fora)" },
  { id: "asaas", name: "Asaas" },
  { id: "infinitePay", name: "InfinitePay" },
];
const invoiceOptions = [
  { id: "true", name: "Sem nota fiscal" },
  { id: "false", name: "Com nota fiscal" },
];
const recordOptions = [
  { id: "true", name: "Ativas" },
  { id: "false", name: "Inativas" },
];

const str = (value: unknown) => (value === undefined || value === null ? "" : String(value));

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, onClear, openSheet, params }) => {
  const [state, setState] = useState({
    customerId: str(params.customerId),
    invoiceNumber: str(params["like-invoiceNumber"]),
    noInvoice: str(params["null-invoiceNumber"]),
    gateway: str(params.gateway),
    paymentMethod: str(params.paymentMethod),
    active: str(params.active),
    // a conta escolhida fica em um parâmetro só da tela; a API recebe a lista de ids
    chartAccount: str(params["ui-chartAccount"]),
    costCenterId: str(params.costCenterId),
    bankAccountId: str(params.bankAccountId),
  });
  const { data: accounts } = useChartAccounts({ inactive: true });
  const { data: costCenters } = useCostCenters();
  const { data: bankAccounts } = useBankAccounts();
  const set = (name: string, value: string | number | string[]) =>
    setState((prev) => ({ ...prev, [name]: Array.isArray(value) ? value[0] ?? "" : String(value) }));

  const { data: customers, isLoading } = useQuery<Response | undefined>({
    queryKey: ["optionsCustomers"],
    queryFn: () => get<Response>("customer", "", [
      { key: "limit", value: 100 },
      { key: "order-name", value: "asc" },
    ]),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // null remove o filtro da consulta
    onSearch({
      customerId: state.customerId || null,
      "like-invoiceNumber": state.invoiceNumber.trim() || null,
      "null-invoiceNumber": state.noInvoice || null,
      gateway: state.gateway || null,
      paymentMethod: state.paymentMethod || null,
      active: state.active || null,
      // conta mãe traz todas as filhas
      "in-chartAccountId": state.chartAccount ? descendantIds(accounts ?? [], Number(state.chartAccount)) : null,
      "ui-chartAccount": state.chartAccount || null,
      costCenterId: state.costCenterId || null,
      bankAccountId: state.bankAccountId || null,
      page: 0,
    });
    openSheet(false);
  };

  const handleClear = () => {
    setState({ customerId: "", invoiceNumber: "", noInvoice: "", gateway: "", paymentMethod: "", active: "", chartAccount: "", costCenterId: "", bankAccountId: "" });
    onClear();
    openSheet(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full mt-4">
      <div>
        <Label htmlFor="customerId">Cliente</Label>
        <Select name="customerId" options={(customers?.rows ?? []) as never[]} state={state.customerId}
          onChange={set} placeholder="Todos" isLoading={isLoading} clearable modal />
      </div>
      <div>
        <Label>Conta (plano de contas)</Label>
        <AccountSelect accounts={accounts ?? []} value={state.chartAccount} mode="any" clearable
          onChange={(value) => set("chartAccount", value)} placeholder="Todas (conta mãe inclui as filhas)" />
      </div>
      <div>
        <Label htmlFor="costCenterId">Centro de custo</Label>
        <Select name="costCenterId" options={(costCenters?.rows ?? []) as never[]} state={state.costCenterId}
          onChange={set} placeholder="Todos" clearable modal />
      </div>
      <div>
        <Label htmlFor="bankAccountId">Conta de entrada</Label>
        <Select name="bankAccountId" options={(bankAccounts?.rows ?? []) as never[]} state={state.bankAccountId}
          onChange={set} placeholder="Todas" clearable modal />
      </div>
      <div>
        <Label htmlFor="invoiceNumber">Número da NF</Label>
        <Input id="invoiceNumber" name="invoiceNumber" value={state.invoiceNumber} onValueChange={set}
          placeholder="Contém..." className="mt-1" />
      </div>
      <div>
        <Label htmlFor="noInvoice">Nota fiscal</Label>
        <Select name="noInvoice" options={invoiceOptions} state={state.noInvoice} onChange={set}
          placeholder="Todas" clearable modal />
      </div>
      <div>
        <Label htmlFor="gateway">Origem</Label>
        <Select name="gateway" options={originOptions} state={state.gateway} onChange={set}
          placeholder="Todas" clearable modal />
      </div>
      <div>
        <Label htmlFor="paymentMethod">Forma de pagamento</Label>
        <Select name="paymentMethod" options={paymentMethodOptions} state={state.paymentMethod} onChange={set}
          placeholder="Todas" clearable modal />
      </div>
      <div>
        <Label htmlFor="active">Registro</Label>
        <Select name="active" options={recordOptions} state={state.active} onChange={set}
          placeholder="Ativas" clearable modal />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">Buscar</Button>
        <Button type="button" variant="outline" className="flex-1" onClick={handleClear}>Limpar</Button>
      </div>
    </form>
  );
};

export default SearchForm;
