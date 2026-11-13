import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";
import SimpleCrud, { SimpleEntity, useSimpleSave } from "../-shared/SimpleCrud";
import { BankAccount, bankTypeLabel, bankTypeOptions, formatMoney, gatewayOptions } from "../-shared/financial";

const entity: SimpleEntity = {
  name: "Conta Bancária",
  pluralName: "Contas Bancárias",
  model: "financial-bank-accounts",
  article: "a",
  description: "Contas, caixas e saldos de gateway onde o dinheiro entra. O saldo é o saldo inicial mais os recebimentos baixados na conta.",
  optionKeys: ["optionsBankAccounts", "financialBankBalances"],
};

export const Route = createFileRoute("/_authenticated/financeiro/_contas-bancarias/contas-bancarias")({
  component: BankAccounts,
});

const bankLine = (item: BankAccount) => {
  if (item.type === "gateway") return gatewayOptions.find((g) => g.id === item.gateway)?.name ?? item.gateway ?? "";
  const agency = item.agency ? `Ag. ${item.agency}${item.agencyDigit ? `-${item.agencyDigit}` : ""}` : "";
  const account = item.account ? `Conta ${item.account}${item.accountDigit ? `-${item.accountDigit}` : ""}` : "";
  return [item.bankName, agency, account].filter(Boolean).join(" · ");
};

function BankAccounts() {
  const { data: balances } = useQuery<Array<{ id: number; balance: number }> | undefined>({
    queryKey: ["financialBankBalances"],
    queryFn: () => get("financial", "bank-balances"),
  });
  const balanceOf = (id: number) => balances?.find((b) => b.id === id)?.balance;

  return (
    <SimpleCrud<BankAccount>
      entity={entity}
      header={<>
        <div className="flex-1">Conta</div>
        <div className="w-44">Tipo</div>
        <div className="w-40 text-right pr-6">Saldo</div>
      </>}
      renderRow={(item) => <>
        <div className="flex-1 pr-10 lg:pr-2">
          <p className="font-semibold">
            {item.name}
            {item.isDefault && <span className="ml-2 text-xs font-normal rounded bg-primary text-inverse-foreground px-1.5 py-0.5">Padrão</span>}
            {item.inactiveAt && <span className="ml-2 text-xs font-normal rounded bg-muted px-1.5 py-0.5">Inativa</span>}
          </p>
          {bankLine(item) && <p className="text-xs text-muted-foreground">{bankLine(item)}</p>}
          {item.pixKey && <p className="text-xs text-muted-foreground">Pix: {item.pixKey}</p>}
        </div>
        <div className="lg:w-44 text-muted-foreground">{bankTypeLabel(item.type)}</div>
        <div className="lg:w-40 lg:text-right lg:pr-6 tabular-nums font-semibold">
          <span className="lg:hidden text-xs text-muted-foreground font-normal">Saldo: </span>
          {balanceOf(item.id) === undefined ? "—" : formatMoney(balanceOf(item.id))}
        </div>
      </>}
      renderForm={(props) => <BankAccountForm {...props} />}
      inactivateWarning="Deixa de aparecer na baixa. Os recebimentos já lançados continuam ligados à conta."
    />
  );
}

function BankAccountForm({ formData, close, onSaved }: { formData?: BankAccount; close: () => void; onSaved: () => void }) {
  const [state, setState] = useState({
    name: formData?.name ?? "",
    type: formData?.type ?? "corrente",
    gateway: formData?.gateway ?? "",
    bankCode: formData?.bankCode ?? "",
    bankName: formData?.bankName ?? "",
    agency: formData?.agency ?? "",
    agencyDigit: formData?.agencyDigit ?? "",
    account: formData?.account ?? "",
    accountDigit: formData?.accountDigit ?? "",
    pixKey: formData?.pixKey ?? "",
    holderName: formData?.holderName ?? "",
    holderDocument: formData?.holderDocument ?? "",
    openingBalance: Number(formData?.openingBalance ?? 0),
    openingBalanceDate: formData?.openingBalanceDate ? formData.openingBalanceDate.slice(0, 10) : "",
    isDefault: formData?.isDefault ?? false,
  });
  const { save, isPending, error, setError } = useSimpleSave(entity, formData, close, onSaved);
  const set = (name: string, value: string | number | string[] | null) =>
    setState((prev) => ({ ...prev, [name]: Array.isArray(value) ? value[0] ?? "" : value ?? "" }));
  const isGateway = state.type === "gateway";
  const isCash = state.type === "caixa";

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (state.name.trim().length < 2) return setError("Informe o nome da conta");
    if (isGateway && !state.gateway) return setError("Escolha o provedor");
    setError("");
    // "" limpa o campo na API (o FormData não envia null)
    save({ ...state, name: state.name.trim(), gateway: isGateway ? state.gateway : "", isDefault: String(state.isDefault) });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full mt-4">
      <div>
        <Label htmlFor="name">Nome <span>*</span></Label>
        <Input id="name" name="name" value={state.name} maxLength={120} onValueChange={set} placeholder="Ex.: Itaú principal" className="mt-1" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Tipo</Label>
          <Select name="type" options={bankTypeOptions} state={state.type} onChange={set} placeholder="Selecione" modal />
        </div>
        {isGateway && (
          <div>
            <Label htmlFor="gateway">Provedor <span>*</span></Label>
            <Select name="gateway" options={gatewayOptions} state={state.gateway} onChange={set} placeholder="Selecione" modal />
          </div>
        )}
      </div>
      {isGateway && (
        <p className="text-xs text-muted-foreground -mt-2">
          Os recebimentos confirmados por este provedor entram no saldo desta conta automaticamente.
        </p>
      )}

      {!isGateway && !isCash && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="bankCode">Cód. banco</Label>
              <Input id="bankCode" name="bankCode" value={state.bankCode} maxLength={10} onValueChange={set} placeholder="341" className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label htmlFor="bankName">Banco</Label>
              <Input id="bankName" name="bankName" value={state.bankName} maxLength={120} onValueChange={set} placeholder="Itaú" className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3">
              <Label htmlFor="agency">Agência</Label>
              <Input id="agency" name="agency" value={state.agency} maxLength={20} onValueChange={set} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="agencyDigit">Dígito</Label>
              <Input id="agencyDigit" name="agencyDigit" value={state.agencyDigit} maxLength={5} onValueChange={set} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3">
              <Label htmlFor="account">Conta</Label>
              <Input id="account" name="account" value={state.account} maxLength={30} onValueChange={set} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="accountDigit">Dígito</Label>
              <Input id="accountDigit" name="accountDigit" value={state.accountDigit} maxLength={5} onValueChange={set} className="mt-1" />
            </div>
          </div>
          <div>
            <Label htmlFor="pixKey">Chave Pix</Label>
            <Input id="pixKey" name="pixKey" value={state.pixKey} maxLength={140} onValueChange={set} className="mt-1" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="holderName">Titular</Label>
              <Input id="holderName" name="holderName" value={state.holderName} maxLength={255} onValueChange={set} placeholder="Se diferente da empresa" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="holderDocument">CNPJ/CPF do titular</Label>
              <Input id="holderDocument" name="holderDocument" value={state.holderDocument} maxLength={20} onValueChange={set} className="mt-1" />
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="openingBalance">Saldo inicial</Label>
          <Input id="openingBalance" name="openingBalance" format="currency" value={state.openingBalance} onValueChange={set} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="openingBalanceDate">Data do saldo inicial</Label>
          <CalendarPicker mode="natural" name="openingBalanceDate" value={state.openingBalanceDate} onValueChange={set}
            placeholder="dd/mm/aaaa" className="mt-1" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Com data, o saldo conta só os recebimentos a partir dela. Sem data, conta todos.
      </p>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <Checkbox checked={state.isDefault} onCheckedChange={(checked) => setState((prev) => ({ ...prev, isDefault: checked === true }))} />
        Conta padrão (já vem escolhida na baixa)
      </label>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isPending}>{formData ? "Atualizar" : "Cadastrar"}</Button>
        <Button type="button" variant="outline" className="flex-1" onClick={close}>Cancelar</Button>
      </div>
    </form>
  );
}
