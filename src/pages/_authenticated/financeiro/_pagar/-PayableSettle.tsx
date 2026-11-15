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
import { CHART_KEY, formatMoney, useBankAccounts } from "../-shared/financial";
import { PAYABLES_KEY, PAYABLES_SUMMARY_KEY, Payable } from "../-shared/payables";
import { paymentMethodOptions, todayInput } from "../_receber/-components/options";

/** Baixa de conta a pagar: quando saiu, quanto, de qual conta, com o comprovante. */
export default function PayableSettle({ item, onClose }: { item: Payable; onClose: () => void }) {
  const queryClient = useQueryClient();
  const expected = Number(item.value ?? 0);
  const [paidAt, setPaidAt] = useState(todayInput());
  const [paidValue, setPaidValue] = useState(expected);
  const [paymentMethod, setPaymentMethod] = useState(item.paymentMethod || "pix");
  const [observations, setObservations] = useState(item.observations ?? "");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [error, setError] = useState("");
  const { data: bankAccounts, isLoading: loadingBanks } = useBankAccounts();
  // conta de gateway só recebe do provedor: não é de onde sai pagamento
  const banks = (bankAccounts?.rows ?? []).filter((account) => account.type !== "gateway");
  const [bankChoice, setBankChoice] = useState<string | null>(null);
  const bankAccountId = bankChoice ?? String(banks.find((account) => account.isDefault)?.id ?? (banks.length === 1 ? banks[0].id : ""));

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      const fields = { paidAt, paidValue: String(paidValue), paymentMethod, observations, bankAccountId };
      for (const [key, value] of Object.entries(fields)) if (value) form.append(key, value);
      if (receipt) form.append("receiptFile", receipt);
      return (await api.patch(`financial-payables/settle/${item.id}`, form)).data;
    },
    onSuccess: () => {
      toast({ title: "Pagamento registrado!", variant: "success" });
      for (const key of [PAYABLES_KEY, PAYABLES_SUMMARY_KEY, "financialBankBalances", CHART_KEY]) queryClient.invalidateQueries({ queryKey: [key] });
      onClose();
    },
    onError: (err: ApiError) => setError(err.response?.data?.message || "Erro desconhecido."),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!paidAt) return setError("Informe a data do pagamento");
    if (paidAt > todayInput()) return setError("A data do pagamento não pode ser futura");
    if (!paidValue || paidValue <= 0) return setError("Informe o valor pago");
    if (banks.length > 0 && !bankAccountId) return setError("Escolha a conta de onde o dinheiro saiu");
    setError("");
    mutate();
  };

  const difference = Math.round((paidValue - expected) * 100) / 100;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dar baixa</DialogTitle>
          <DialogDescription>
            {item.supplier?.name ? `${item.supplier.name} — ` : ""}{item.description} — {formatMoney(expected)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {item.supplier?.pixKey && <p className="text-xs rounded border p-2 text-muted-foreground">Pix do fornecedor: <span className="text-foreground select-all">{item.supplier.pixKey}</span></p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paidAt">Data do pagamento <span>*</span></Label>
              <CalendarPicker mode="natural" name="paidAt" value={paidAt} onValueChange={(_, value) => setPaidAt(value ?? "")} placeholder="dd/mm/aaaa" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="paidValue">Valor pago <span>*</span></Label>
              <Input id="paidValue" name="paidValue" format="currency" value={paidValue} onValueChange={(_, value) => setPaidValue(Number(value))} className="mt-1" />
            </div>
          </div>
          {difference !== 0 && paidValue > 0 && (
            <p className="text-xs text-muted-foreground -mt-2">
              {difference > 0 ? "Acima" : "Abaixo"} do valor da conta em {formatMoney(Math.abs(difference))} (juros, multa ou desconto). A conta é baixada por inteiro.
            </p>
          )}
          <div>
            <Label htmlFor="paymentMethod">Forma de pagamento</Label>
            <Select name="paymentMethod" options={paymentMethodOptions} state={paymentMethod} onChange={(_, value) => setPaymentMethod(String(value))} placeholder="Selecione" modal />
          </div>
          <div>
            <Label htmlFor="bankAccountId">Conta de saída {banks.length > 0 && <span>*</span>}</Label>
            {banks.length > 0 || loadingBanks ? (
              <Select name="bankAccountId" options={banks as never[]} state={bankAccountId} isLoading={loadingBanks}
                onChange={(_, value) => setBankChoice(String(value))} placeholder="Selecione a conta" modal />
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Nenhuma conta bancária cadastrada. Cadastre em Financeiro → Contas Bancárias para acompanhar o saldo.</p>
            )}
          </div>
          <div>
            <Label htmlFor="settleReceipt">Comprovante</Label>
            <div className="mt-1 flex items-center gap-3 text-sm">
              <input id="settleReceipt" type="file" accept="application/pdf,image/*" className="hidden" onChange={(event) => setReceipt(event.target.files?.[0] ?? null)} />
              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("settleReceipt")?.click()}>Escolher arquivo</Button>
              <span className="min-w-0 truncate text-muted-foreground">{receipt?.name ?? (item.receiptUrl ? "Já tem comprovante anexado" : "Opcional")}</span>
            </div>
          </div>
          <div>
            <Label htmlFor="settleObservations">Observações</Label>
            <Input id="settleObservations" name="observations" type="textArea" value={observations} maxLength={500}
              onValueChange={(_, value) => setObservations(String(value))} className="mt-1" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>Confirmar pagamento</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
