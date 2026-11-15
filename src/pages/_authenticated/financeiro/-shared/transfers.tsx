import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { get } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";
import { ApiError } from "@/general-interfaces/api.interface";
import { FINANCIAL_ABILITY, formatMoney, useBankAccounts } from "./financial";
import { formatDate, todayInput } from "../_receber/-components/options";

interface Transfer { id: number; value: number | string; date: string; description: string | null; statementRef: string | null; fromBankAccount: { id: number; name: string }; toBankAccount: { id: number; name: string } }
const KEY = "financialTransfers";

/** Transferências entre contas (caixa → banco, banco → banco): mexem no saldo das duas, sem ser receita nem despesa. */
export default function TransfersSection() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery<Transfer[] | undefined>({ queryKey: [KEY], queryFn: () => get("financial", "transfers") });
  const { mutate: undo } = useMutation({
    mutationFn: async (id: number) => (await api.patch(`financial/transfers/${id}/inactive`, {})).data,
    onSuccess: () => { toast({ title: "Transferência desfeita", variant: "success" }); for (const k of [KEY, "financialBankBalances", "financialReports"]) queryClient.invalidateQueries({ queryKey: [k] }); },
    onError: (err: ApiError) => toast({ title: "Não foi possível desfazer", description: err.response?.data?.message, variant: "destructive" }),
  });
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg font-semibold">Transferências entre contas</h2>
          <p className="text-sm text-muted-foreground">Dinheiro que passou de uma conta da empresa para outra. Não entra como receita nem despesa.</p>
        </div>
        {can(`create_${FINANCIAL_ABILITY}`) && <Button size="sm" onClick={() => setOpen(true)}><Icon name="arrow-left-right" className="w-4 h-4" /> Transferir</Button>}
      </div>
      <div className="rounded-lg border overflow-hidden">
        {isLoading && <p className="p-4 text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && !data?.length && <p className="p-4 text-sm text-muted-foreground">Nenhuma transferência.</p>}
        {data?.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-2 border-b last:border-b-0 text-sm">
            <span className="w-24 text-muted-foreground">{formatDate(t.date)}</span>
            <span className="flex-1 min-w-48">{t.fromBankAccount.name} <Icon name="arrow-right" className="w-3 h-3 inline" /> {t.toBankAccount.name}
              {t.description && <span className="block text-xs text-muted-foreground">{t.description}</span>}
            </span>
            <span className="tabular-nums font-semibold">{formatMoney(t.value)}</span>
            {can(`inactive_${FINANCIAL_ABILITY}`) && (
              <ConfirmDialog title="Desfazer esta transferência?" description="O valor volta para a conta de origem." onConfirm={() => undo(t.id)}>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label="Desfazer"><Icon name="undo-2" className="w-3 h-3" /></Button>
              </ConfirmDialog>
            )}
          </div>
        ))}
      </div>
      {open && <TransferDialog onClose={() => setOpen(false)} />}
    </div>
  );
}

function TransferDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: banks } = useBankAccounts();
  const [state, setState] = useState({ fromBankAccountId: "", toBankAccountId: "", value: 0, date: todayInput(), description: "" });
  const [error, setError] = useState("");
  const set = (name: string, value: string | number | string[] | null) => setState((prev) => ({ ...prev, [name]: Array.isArray(value) ? value[0] ?? "" : value ?? "" }));
  const { mutate, isPending } = useMutation({
    mutationFn: async () => (await api.post("financial/transfers", state)).data,
    onSuccess: () => { toast({ title: "Transferência registrada!", variant: "success" }); for (const k of [KEY, "financialBankBalances", "financialReports"]) queryClient.invalidateQueries({ queryKey: [k] }); onClose(); },
    onError: (err: ApiError) => setError(err.response?.data?.message || "Erro desconhecido."),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!state.fromBankAccountId || !state.toBankAccountId) return setError("Escolha as duas contas");
    if (state.fromBankAccountId === state.toBankAccountId) return setError("As contas precisam ser diferentes");
    if (!state.value || state.value <= 0) return setError("Informe o valor");
    setError("");
    mutate();
  };
  const options = (banks?.rows ?? []) as never[];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Transferir entre contas</DialogTitle><DialogDescription>Ex.: depósito do caixa no banco, ou passar saldo do Asaas para a conta corrente.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div><Label>De <span>*</span></Label><Select name="fromBankAccountId" options={options} state={state.fromBankAccountId} onChange={set} placeholder="Conta de origem" modal /></div>
          <div><Label>Para <span>*</span></Label><Select name="toBankAccountId" options={options} state={state.toBankAccountId} onChange={set} placeholder="Conta de destino" modal /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valor <span>*</span></Label><Input name="value" format="currency" value={state.value} onValueChange={set} className="mt-1" /></div>
            <div><Label>Data</Label><CalendarPicker mode="natural" name="date" value={state.date} onValueChange={set} className="mt-1" /></div>
          </div>
          <div><Label>Descrição</Label><Input name="description" value={state.description} maxLength={255} onValueChange={set} className="mt-1" /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={isPending}>Transferir</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
