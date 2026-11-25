import React, { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input as ShadInput } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { commercialApi, dateBr, errorMessage, money, todayIso } from "./commercial";
import { Checkbox } from "@/components/ui/checkbox";
import { RetentionFields, RetentionRates, RetentionState, rebase, retentionList, retentionState, retentionSum } from "./retentions";
import { Contract, ContractInstallment, CustomerOrder, PAYMENT_METHOD_OPTIONS, dueRuleText } from "./contracts";
import EmitNfseCallout from "../../financeiro/_notas/-shared/EmitNfseCallout";

type BillContract = { id: number; number: string; customer: { name: string }; customerOrder?: CustomerOrder | null; retentionRates?: RetentionRates };
type BillInstallment = Pick<ContractInstallment, "id" | "number" | "total" | "value" | "suggestedDue" | "dueRule" | "dueDate" | "dueDays" | "work" | "depositValue">;
const parcelLabel = (inst: Pick<ContractInstallment, "number" | "total">) => (inst.total > 1 ? `parcela ${inst.number}/${inst.total}` : "pagamento único");

/**
 * Registrar a NF de uma parcela: cria a conta a receber. Com `others` (as demais
 * parcelas sem nota do contrato), dá para pôr várias parcelas na mesma nota:
 * cada uma vira a sua conta a receber, com o vencimento próprio.
 */
export function BillDialog({ contract, installment, others = [], onClose, onDone }: {
  contract: BillContract; installment: BillInstallment; others?: BillInstallment[];
  onClose: () => void; onDone: (contract: Contract) => void;
}) {
  const [form, setForm] = useState({ invoiceNumber: "", invoiceIssuedAt: todayIso(), paymentMethod: "boleto" });
  const [extra, setExtra] = useState<number[]>([]);
  const chosen = [installment, ...others.filter((o) => extra.includes(o.id))].sort((a, b) => a.number - b.number);
  const [dues, setDues] = useState<Record<number, string>>(() => Object.fromEntries([installment, ...others].map((i) => [i.id, i.suggestedDue])));
  const base = Math.round(chosen.reduce((sum, i) => sum + i.value, 0) * 100) / 100;
  const deposit = Math.round(chosen.reduce((sum, i) => sum + (i.depositValue ?? 0), 0) * 100) / 100;
  const [retentions, setRetentions] = useState<RetentionState>(() => retentionState(installment.value, contract.retentionRates));
  const [error, setError] = useState("");
  const toggle = (id: number, on: boolean) => {
    const next = on ? [...extra, id] : extra.filter((x) => x !== id);
    setExtra(next);
    const total = Math.round([installment, ...others.filter((o) => next.includes(o.id))].reduce((sum, i) => sum + i.value, 0) * 100) / 100;
    setRetentions((state) => rebase(state, total));
  };
  const { mutate, isPending } = useMutation({
    mutationFn: () => commercialApi.post<Contract>(`contracts/${contract.id}/installments/bill`, {
      ...form, installmentIds: chosen.map((i) => i.id), dueDates: Object.fromEntries(chosen.map((i) => [i.id, dues[i.id]])), retentions: retentionList(retentions),
    }),
    onSuccess: (result) => {
      onDone(result);
      toast({ title: chosen.length > 1 ? `${chosen.length} contas a receber criadas` : "Conta a receber criada", description: "Já aparece em Financeiro → Contas a Receber.", variant: "success" });
      onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.invoiceNumber.trim()) return setError("Informe o número da nota fiscal");
    if (!form.invoiceIssuedAt || chosen.some((i) => !dues[i.id])) return setError("Informe a data da nota e o vencimento");
    if (retentionSum(retentions) >= base) return setError("As retenções passam do valor da nota");
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar nota fiscal — {chosen.length > 1 ? `${chosen.length} parcelas` : parcelLabel(installment)}</DialogTitle>
          <DialogDescription>
            {contract.number} · {contract.customer.name} · <b>{money(base)}</b>. A nota é emitida fora do sistema; aqui você registra o número e {chosen.length > 1 ? "cada parcela vira uma conta a receber" : "a parcela vira conta a receber"}.
            {contract.customerOrder?.number
              ? <span className="block mt-1">Pedido do cliente para citar na nota: <b className="text-foreground">{contract.customerOrder.number}</b>.</span>
              : <span className="block mt-1">Esta venda está sem o número do pedido do cliente.</span>}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <EmitNfseCallout origin={{ kind: "installments", contractId: contract.id, installmentIds: chosen.map((i) => i.id) }} onLeave={onClose} />
          <div className="grid sm:grid-cols-3 gap-3">
            <div><Label htmlFor="billNumber">Número da nota <span>*</span></Label>
              <ShadInput id="billNumber" className="mt-1" value={form.invoiceNumber} maxLength={60} autoFocus onChange={(event) => setForm((f) => ({ ...f, invoiceNumber: event.target.value }))} /></div>
            <div><Label>Data da nota <span>*</span></Label>
              <CalendarPicker mode="single" name="invoiceIssuedAt" className="mt-1 w-full" value={form.invoiceIssuedAt} fromYear={2024} toYear={2040}
                onValueChange={(_, value) => setForm((f) => ({ ...f, invoiceIssuedAt: value ?? "" }))} /></div>
            <div><Label>Forma de pagamento</Label>
              <div className="mt-1"><Select name="paymentMethod" state={form.paymentMethod} modal options={PAYMENT_METHOD_OPTIONS} onChange={(_, value) => setForm((f) => ({ ...f, paymentMethod: String(value) }))} /></div></div>
          </div>
          <div className="rounded-md border divide-y">
            {[installment, ...others].sort((a, b) => a.number - b.number).map((inst) => {
              const included = inst.id === installment.id || extra.includes(inst.id);
              return (
                <div key={inst.id} className="px-3 py-2 grid sm:grid-cols-[minmax(0,1fr)_8rem_12rem] items-center gap-2 text-sm">
                  <label className="flex items-center gap-2 min-w-0">
                    {others.length > 0 && (
                      <Checkbox checked={included} disabled={inst.id === installment.id} aria-label={`Incluir a ${parcelLabel(inst)} nesta nota`}
                        onCheckedChange={(on) => toggle(inst.id, on === true)} />
                    )}
                    <span className="truncate first-letter:uppercase">{parcelLabel(inst)} <span className="text-xs text-muted-foreground">· combinado: {dueRuleText(inst)}</span></span>
                  </label>
                  <span className="tabular-nums font-medium sm:text-right">{money(inst.value)}</span>
                  {included
                    ? <CalendarPicker mode="single" name={`due-${inst.id}`} className="w-full" value={dues[inst.id]} fromYear={2024} toYear={2040} placeholder="Vencimento"
                        onValueChange={(_, value) => setDues((d) => ({ ...d, [inst.id]: value ?? "" }))} />
                    : <span className="text-xs text-muted-foreground">fora desta nota</span>}
                </div>
              );
            })}
          </div>
          {deposit > 0 && (
            <p className="text-xs text-muted-foreground -mt-2">Caução contratual: <b className="text-foreground tabular-nums">{money(deposit)}</b> desta nota fica retida na conta da caução do contrato (paga no fim da obra). A receber agora: <b className="text-foreground tabular-nums">{money(base - deposit)}</b>.</p>
          )}
          {others.length > 0 && <p className="text-xs text-muted-foreground -mt-2">Marque as outras parcelas que vão na mesma nota (NF global). Cada uma continua com o seu vencimento.</p>}
          <RetentionFields base={base} state={retentions} onChange={setRetentions} idPrefix="billRet" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Registrando..." : chosen.length > 1 ? "Registrar e criar as contas a receber" : "Registrar e criar a conta a receber"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Pedido de compra do cliente (número, data e arquivo). Aparece na proposta aceita,
 * na venda fechada e, só para leitura, no faturamento.
 */
export function CustomerOrderCard({ contractId, order, canEdit, onSaved }: { contractId: number; order?: CustomerOrder | null; canEdit: boolean; onSaved: (contract: Contract) => void }) {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [number, setNumber] = useState(order?.number ?? "");
  const [date, setDate] = useState(order?.date ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const start = () => { setNumber(order?.number ?? ""); setDate(order?.date ?? ""); setFile(null); setRemoveFile(false); setEditing(true); };
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("number", number.trim());
      form.append("date", date ?? "");
      if (file) form.append("file", file);
      else if (removeFile) form.append("removeFile", "true");
      return (await api.put<Contract>(`commercial/contracts/${contractId}/customer-order`, form)).data;
    },
    onSuccess: (result) => {
      onSaved(result); setEditing(false);
      // com o pedido em mãos, a ordem de serviço que esperava por ele anda
      queryClient.invalidateQueries({ queryKey: ["serviceOrders"] });
      queryClient.invalidateQueries({ queryKey: ["serviceOrder"] });
      toast({ title: "Pedido do cliente salvo", variant: "success" });
    },
    onError: (err) => toast({ title: "Não foi possível salvar o pedido do cliente", description: errorMessage(err), variant: "destructive" }),
  });
  const pick = (files: FileList | null) => {
    const chosen = files?.[0];
    if (input.current) input.current.value = "";
    if (!chosen) return;
    if (chosen.size > 10 * 1024 * 1024) return toast({ title: "Arquivo grande demais", description: "O limite é 10 MB.", variant: "destructive" });
    setFile(chosen); setRemoveFile(false);
  };
  const filled = Boolean(order?.number || order?.date || order?.fileUrl);

  return (
    <section className="rounded-card border bg-card p-4 text-sm" aria-label="Pedido do cliente">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-base">Pedido do cliente</h2>
          <p className="text-xs text-muted-foreground">O pedido de compra que o cliente manda para confirmar o aceite. O número vai na nota fiscal.</p>
        </div>
        {canEdit && !editing && <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={start}><Icon name={filled ? "pencil" : "plus"} className="w-4 h-4 mr-1" /> {filled ? "Editar" : "Informar"}</Button>}
      </div>
      {!editing && (
        filled ? (
          <div className="mt-3 grid gap-1">
            <p><span className="text-muted-foreground">Número: </span><b>{order?.number || "não informado"}</b>{order?.date ? <span className="text-muted-foreground"> · de {dateBr(order.date)}</span> : null}</p>
            {order?.fileUrl
              ? <a href={order.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1 underline"><Icon name="paperclip" className="w-3.5 h-3.5" /> {order.fileName || "Abrir o arquivo"}</a>
              : <p className="text-xs text-muted-foreground">Sem arquivo anexado.</p>}
          </div>
        ) : <p className="mt-3 text-amber-700 dark:text-amber-400">Aguardando o pedido do cliente.</p>
      )}
      {editing && (
        <form className="mt-3 grid gap-3" onSubmit={(event) => { event.preventDefault(); mutate(); }}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label htmlFor={`orderNumber-${contractId}`}>Número do pedido</Label>
              <ShadInput id={`orderNumber-${contractId}`} className="mt-1" maxLength={60} value={number} placeholder="Ex.: 4500123456" onChange={(event) => setNumber(event.target.value)} /></div>
            <div><Label>Data do pedido</Label>
              <CalendarPicker mode="single" name="customerOrderDate" className="mt-1 w-full" value={date} placeholder="Opcional" fromYear={2024} toYear={2040}
                onValueChange={(_, value) => setDate(String(value ?? ""))} /></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={input} type="file" accept="application/pdf,image/*" className="hidden" onChange={(event) => pick(event.target.files)} />
            <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}><Icon name="paperclip" className="w-4 h-4 mr-1" /> {file || (order?.fileUrl && !removeFile) ? "Trocar o arquivo" : "Anexar o pedido (PDF ou imagem)"}</Button>
            {file && <span className="text-xs text-muted-foreground truncate max-w-[16rem]">{file.name}</span>}
            {!file && order?.fileUrl && !removeFile && (
              <>
                <span className="text-xs text-muted-foreground truncate max-w-[16rem]">{order.fileName}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setRemoveFile(true)}>Remover o arquivo</Button>
              </>
            )}
            {removeFile && <span className="text-xs text-muted-foreground">O arquivo será removido ao salvar.</span>}
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
            <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
        </form>
      )}
    </section>
  );
}

/** Linha pendente de uma OL (o que a medição leva). */
export interface MeasurementLine { kind: string; description: string; periodStart: string | null; periodEnd: string | null; value: number }
const plusDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

/**
 * Faturar a medição de uma ordem de locação: tudo o que está pendente (períodos
 * vencidos, avarias, frete, caução abatida) vira um boletim (BM) e uma conta a
 * receber do contrato, com a comissão proporcional.
 */
export function MeasurementBillDialog({ contract, rental, lines, onClose, onDone }: {
  contract: BillContract;
  rental: { id: number; number: string }; lines: MeasurementLine[];
  onClose: () => void; onDone: (contract: Contract) => void;
}) {
  const total = Math.round(lines.reduce((sum, line) => sum + line.value, 0) * 100) / 100;
  const [form, setForm] = useState({ invoiceNumber: "", invoiceIssuedAt: todayIso(), dueDate: plusDays(7), paymentMethod: "boleto" });
  const [retentions, setRetentions] = useState<RetentionState>(() => retentionState(total, contract.retentionRates));
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => commercialApi.post<Contract & { billed: { number: string; value: number } }>(`contracts/${contract.id}/measurements`, { rentalId: rental.id, ...form, retentions: retentionList(retentions) }),
    onSuccess: (result) => {
      onDone(result);
      toast({ title: `${result.billed.number} faturada`, description: total > 0 ? "A conta a receber já aparece em Financeiro → Contas a Receber." : "Valor zero (coberto pela caução): nenhuma conta a receber.", variant: "success" });
      onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (total > 0 && !form.invoiceNumber.trim()) return setError("Informe o número da nota fiscal");
    if (total > 0 && retentionSum(retentions) >= total) return setError("As retenções passam do valor da medição");
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Faturar a medição — {rental.number}</DialogTitle>
          <DialogDescription>
            {contract.number} · {contract.customer.name}. A nota é emitida fora do sistema; aqui você registra o número e a medição vira conta a receber.
            {contract.customerOrder?.number && <span className="block mt-1">Pedido do cliente para citar na nota: <b className="text-foreground">{contract.customerOrder.number}</b>.</span>}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          {total > 0 && <EmitNfseCallout origin={{ kind: "rental", contractId: contract.id, rentalId: rental.id }} onLeave={onClose} />}
          <ul className="rounded border divide-y text-sm">
            {lines.map((line, index) => (
              <li key={index} className="px-3 py-1.5 flex items-center justify-between gap-3">
                <span className="min-w-0">{line.description}</span>
                <span className={line.value < 0 ? "tabular-nums text-green-700 dark:text-green-400 shrink-0" : "tabular-nums shrink-0"}>{money(line.value)}</span>
              </li>
            ))}
            <li className="px-3 py-1.5 flex items-center justify-between gap-3 font-semibold"><span>Total da medição</span><span className="tabular-nums">{money(total)}</span></li>
          </ul>
          {total > 0 && <RetentionFields base={total} state={retentions} onChange={setRetentions} idPrefix="measRet" />}
          {total > 0 && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label htmlFor="measurementNumber">Número da nota <span>*</span></Label>
                <ShadInput id="measurementNumber" className="mt-1" value={form.invoiceNumber} maxLength={60} autoFocus onChange={(event) => setForm((f) => ({ ...f, invoiceNumber: event.target.value }))} /></div>
              <div><Label>Data da nota <span>*</span></Label>
                <CalendarPicker mode="single" name="measurementIssuedAt" className="mt-1 w-full" value={form.invoiceIssuedAt} fromYear={2024} toYear={2040}
                  onValueChange={(_, value) => setForm((f) => ({ ...f, invoiceIssuedAt: value ?? "" }))} /></div>
              <div><Label>Vencimento <span>*</span></Label>
                <CalendarPicker mode="single" name="measurementDue" className="mt-1 w-full" value={form.dueDate} fromYear={2024} toYear={2040}
                  onValueChange={(_, value) => setForm((f) => ({ ...f, dueDate: value ?? "" }))} /></div>
              <div><Label>Forma de pagamento</Label>
                <div className="mt-1"><Select name="measurementMethod" state={form.paymentMethod} modal options={PAYMENT_METHOD_OPTIONS} onChange={(_, value) => setForm((f) => ({ ...f, paymentMethod: String(value) }))} /></div></div>

            </div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Faturando..." : total > 0 ? "Registrar e criar a conta a receber" : "Registrar a medição"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
