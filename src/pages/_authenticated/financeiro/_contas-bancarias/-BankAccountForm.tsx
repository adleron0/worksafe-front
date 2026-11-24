import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";
import { FormPageGrid, FormSection, SummaryRow } from "@/components/general-components/FormPage";
import { SimpleEntity, SimplePages, useSimpleSave } from "../-shared/SimpleCrud";
import { BankAccount, bankTypeLabel, bankTypeOptions, formatMoney, gatewayOptions } from "../-shared/financial";

export const BANK_ACCOUNT_ENTITY: SimpleEntity = {
  name: "Conta Bancária",
  pluralName: "Contas Bancárias",
  model: "financial-bank-accounts",
  article: "a",
  description: "Contas, caixas e saldos de gateway. O saldo é o saldo inicial + o que entrou − o que saiu ± as transferências, a partir da data inicial (veja Implantação).",
  optionKeys: ["optionsBankAccounts", "financialBankBalances"],
};

export const BANK_ACCOUNT_PAGES: SimplePages = {
  list: "/financeiro/contas-bancarias",
  new: "/financeiro/contas-bancarias/nova",
  edit: "/financeiro/contas-bancarias/$bankAccountId",
  param: "bankAccountId",
};

/** Cadastro e edição de conta bancária, caixa ou saldo de gateway. */
export default function BankAccountForm({ formData, close, onSaved }: { formData?: BankAccount; close: () => void; onSaved: () => void }) {
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
  const { save, isPending, error, setError } = useSimpleSave(BANK_ACCOUNT_ENTITY, formData, close, onSaved);
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

  const gatewayName = gatewayOptions.find((g) => g.id === state.gateway)?.name;
  return (
    <form onSubmit={handleSubmit}>
      <FormPageGrid aside={<>
        <section className="rounded-card border bg-card p-4 flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Resumo</p>
          <SummaryRow label="Saldo inicial" strong>{formatMoney(Number(state.openingBalance) || 0)}</SummaryRow>
          <SummaryRow label="Data do saldo">{state.openingBalanceDate ? state.openingBalanceDate.split("-").reverse().join("/") : "Data inicial do financeiro"}</SummaryRow>
          <SummaryRow label="Conta">{state.name.trim() || "—"}</SummaryRow>
          <SummaryRow label="Tipo">{bankTypeLabel(state.type)}</SummaryRow>
          {isGateway && <SummaryRow label="Provedor">{gatewayName ?? "—"}</SummaryRow>}
          <SummaryRow label="Padrão na baixa">{state.isDefault ? "Sim" : "Não"}</SummaryRow>
        </section>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={isPending}>{formData ? "Atualizar" : "Cadastrar"}</Button>
          <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
        </div>
      </>}>
        <FormSection title="Dados" description="Como a conta aparece na baixa e nos relatórios.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Nome <span>*</span></Label>
              <Input id="name" name="name" value={state.name} maxLength={120} onValueChange={set} placeholder="Ex.: Itaú principal" className="mt-1" />
            </div>
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
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={state.isDefault} onCheckedChange={(checked) => setState((prev) => ({ ...prev, isDefault: checked === true }))} />
            Conta padrão (já vem escolhida na baixa)
          </label>
        </FormSection>

        {!isGateway && !isCash && (
          <FormSection title="Dados bancários" description="Banco, agência, conta, Pix e titular.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bankCode">Cód. banco</Label>
                <Input id="bankCode" name="bankCode" value={state.bankCode} maxLength={10} onValueChange={set} placeholder="341" className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="bankName">Banco</Label>
                <Input id="bankName" name="bankName" value={state.bankName} maxLength={120} onValueChange={set} placeholder="Itaú" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </FormSection>
        )}

        <FormSection title="Saldo inicial" description="O saldo inicial é o do fim do dia anterior à data. Só entra no saldo o que foi pago, recebido ou transferido a partir dela. Sem data, vale a data inicial do financeiro (Implantação).">
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
        </FormSection>
      </FormPageGrid>
    </form>
  );
}
