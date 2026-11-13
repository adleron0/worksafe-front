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
      const response = await api.patch(`${entity.model}/settle/${item.id}`, {
        paidAt, receivedValue, paymentMethod, observations, bankAccountId: bankAccountId || null,
      });
      return response.data;
    },
    onSuccess: () => {
      toast({ title: "Baixa registrada!", variant: "success" });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      queryClient.invalidateQueries({ queryKey: ["financialBankBalances"] });
      queryClient.invalidateQueries({ queryKey: [CHART_KEY] });
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
          {difference !== 0 && receivedValue > 0 && (
            <p className="text-xs text-muted-foreground -mt-2">
              {difference > 0 ? "Acima" : "Abaixo"} do esperado em {formatCurrency(Math.abs(difference))}. O título é baixado por inteiro.
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
