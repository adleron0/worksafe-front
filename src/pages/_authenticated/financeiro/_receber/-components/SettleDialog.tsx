import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";
import { ApiError } from "@/general-interfaces/api.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { IFinancialRecord } from "../-interfaces/entity.interface";
import { formatCurrency, paymentMethodOptions, todayInput } from "./options";
import { CHART_KEY, useBankAccounts } from "../../-shared/financial";
import { SettleExtras } from "../../-shared/ledger";

interface SettleDialogProps {
  item: IFinancialRecord;
  entity: IDefaultEntity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Baixa manual: confirma que o dinheiro entrou por fora do sistema. */
const SettleDialog: React.FC<SettleDialogProps> = ({ item, entity, open, onOpenChange }) => {
  const queryClient = useQueryClient();
  const expected = Number(item.netValue ?? item.value ?? 0);
  const [paidAt, setPaidAt] = useState(todayInput());
  const [receivedValue, setReceivedValue] = useState(expected);
  const [extras, setExtras] = useState({ interest: 0, fine: 0, discount: 0 });
  const [receipt, setReceipt] = useState<File | null>(null);
  const changeExtras = (next: typeof extras) => { setExtras(next); setReceivedValue(Math.round((expected + next.interest + next.fine - next.discount) * 100) / 100); };
  const [paymentMethod, setPaymentMethod] = useState(item.paymentMethod || "transferencia");
  const [observations, setObservations] = useState(item.observations ?? "");
  const [error, setError] = useState("");
  const { data: bankAccounts, isLoading: loadingBanks } = useBankAccounts();
  // conta de gateway recebe sozinha pelo provedor: não é destino de baixa manual
  const banks = (bankAccounts?.rows ?? []).filter((account) => account.type !== "gateway");
  const [bankChoice, setBankChoice] = useState<string | null>(null);
  const bankAccountId = bankChoice ?? String(banks.find((account) => account.isDefault)?.id ?? (banks.length === 1 ? banks[0].id : ""));

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      const fields: Record<string, string> = {
        paidAt, receivedValue: String(receivedValue), paymentMethod, observations, bankAccountId: bankAccountId || "",
        interestValue: extras.interest ? String(extras.interest) : "", fineValue: extras.fine ? String(extras.fine) : "", discountValue: extras.discount ? String(extras.discount) : "",
      };
      for (const [key, value] of Object.entries(fields)) if (value) form.append(key, value);
      if (receipt) form.append("receiptFile", receipt);
      const response = await api.patch(`${entity.model}/settle/${item.id}`, form);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: "Baixa registrada!", variant: "success" });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      queryClient.invalidateQueries({ queryKey: ["financialBankBalances"] });
      queryClient.invalidateQueries({ queryKey: [CHART_KEY] });
      queryClient.invalidateQueries({ queryKey: ["financialReports"] });
      onOpenChange(false);
    },
    onError: (err: ApiError) => {
      const message = err.response?.data?.message || "Erro desconhecido.";
      setError(message);
      toast({ title: "Erro ao dar baixa", description: message, variant: "destructive" });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!paidAt) return setError("Informe a data do pagamento");
    if (paidAt > todayInput()) return setError("A data do pagamento não pode ser futura");
    if (!receivedValue || receivedValue <= 0) return setError("Informe o valor recebido");
    if (banks.length > 0 && !bankAccountId) return setError("Escolha a conta em que o dinheiro entrou");
    setError("");
    mutate();
  };

  const difference = Math.round((receivedValue - expected) * 100) / 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dar baixa</DialogTitle>
          <DialogDescription>
            {item.customer?.name || item.trainee?.name || "Conta a receber"} — {formatCurrency(expected)}
            {item.invoiceNumber ? ` — NF ${item.invoiceNumber}` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paidAt">Data do pagamento <span>*</span></Label>
              <CalendarPicker mode="natural" name="paidAt" value={paidAt}
                onValueChange={(_, value) => setPaidAt(value ?? "")} placeholder="dd/mm/aaaa" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="receivedValue">Valor recebido <span>*</span></Label>
              <Input id="receivedValue" name="receivedValue" format="currency" value={receivedValue}
                onValueChange={(_, value) => setReceivedValue(Number(value))} className="mt-1" />
            </div>
          </div>
          <SettleExtras base={expected} extras={extras} onChange={changeExtras} />
          {difference !== 0 && receivedValue > 0 && extras.interest + extras.fine + extras.discount === 0 && (
            <p className="text-xs text-muted-foreground -mt-2">
              {difference > 0 ? "Acima" : "Abaixo"} do esperado em {formatCurrency(Math.abs(difference))}: entra como {difference > 0 ? "juros" : "desconto"}. O título é baixado por inteiro.
            </p>
          )}
          <div>
            <Label htmlFor="paymentMethod">Forma de pagamento</Label>
            <Select name="paymentMethod" options={paymentMethodOptions} state={paymentMethod}
              onChange={(_, value) => setPaymentMethod(String(value))} placeholder="Selecione" modal />
          </div>
          <div>
            <Label htmlFor="bankAccountId">Conta de entrada {banks.length > 0 && <span>*</span>}</Label>
            {banks.length > 0 || loadingBanks ? (
              <Select name="bankAccountId" options={banks as never[]} state={bankAccountId} isLoading={loadingBanks}
                onChange={(_, value) => setBankChoice(String(value))} placeholder="Selecione a conta" modal />
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Nenhuma conta bancária cadastrada. Cadastre em Financeiro → Contas Bancárias para acompanhar o saldo.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="receivableReceipt">Comprovante</Label>
            <div className="mt-1 flex items-center gap-3 text-sm">
              <input id="receivableReceipt" type="file" accept="application/pdf,image/*" className="hidden" onChange={(event) => setReceipt(event.target.files?.[0] ?? null)} />
              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("receivableReceipt")?.click()}>Escolher arquivo</Button>
              <span className="min-w-0 truncate text-muted-foreground">{receipt?.name ?? "Opcional"}</span>
            </div>
          </div>
          <div>
            <Label htmlFor="settleObservations">Observações</Label>
            <Input id="settleObservations" name="observations" type="textArea" value={observations} maxLength={255}
              onValueChange={(_, value) => setObservations(String(value))} className="mt-1" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>Confirmar baixa</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SettleDialog;
