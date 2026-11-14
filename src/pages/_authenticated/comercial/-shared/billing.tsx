import React, { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input as ShadInput } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { NumField, commercialApi, dateBr, errorMessage, money, todayIso } from "./commercial";
import { Contract, ContractInstallment, CustomerOrder, PAYMENT_METHOD_OPTIONS, dueRuleText } from "./contracts";

/** Registrar a NF de uma parcela: cria a conta a receber. */
export function BillDialog({ contract, installment, onClose, onDone }: {
  contract: { id: number; number: string; customer: { name: string }; customerOrder?: CustomerOrder | null };
  installment: Pick<ContractInstallment, "id" | "number" | "total" | "value" | "suggestedDue" | "dueRule" | "dueDate" | "dueDays">;
  onClose: () => void; onDone: (contract: Contract) => void;
}) {
  const [form, setForm] = useState({ invoiceNumber: "", invoiceIssuedAt: todayIso(), dueDate: installment.suggestedDue, paymentMethod: "boleto", netValue: null as number | null });
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => commercialApi.post<Contract>(`contracts/${contract.id}/installments/${installment.id}/bill`, form),
    onSuccess: (result) => { onDone(result); toast({ title: "Conta a receber criada", description: "A parcela já aparece em Financeiro → Contas a Receber.", variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.invoiceNumber.trim()) return setError("Informe o número da nota fiscal");
    if (!form.invoiceIssuedAt || !form.dueDate) return setError("Informe a data da nota e o vencimento");
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar nota fiscal — {installment.total > 1 ? `parcela ${installment.number}/${installment.total}` : "pagamento único"}</DialogTitle>
          <DialogDescription>
            {contract.number} · {contract.customer.name} · <b>{money(installment.value)}</b>. A nota é emitida fora do sistema; aqui você registra o número e a parcela vira conta a receber.
            {contract.customerOrder?.number
              ? <span className="block mt-1">Pedido do cliente para citar na nota: <b className="text-foreground">{contract.customerOrder.number}</b>.</span>
              : <span className="block mt-1">Esta venda está sem o número do pedido do cliente.</span>}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label htmlFor="billNumber">Número da nota <span>*</span></Label>
              <ShadInput id="billNumber" className="mt-1" value={form.invoiceNumber} maxLength={60} autoFocus onChange={(event) => setForm((f) => ({ ...f, invoiceNumber: event.target.value }))} /></div>
            <div><Label>Data da nota <span>*</span></Label>
              <CalendarPicker mode="single" name="invoiceIssuedAt" className="mt-1 w-full" value={form.invoiceIssuedAt} fromYear={2024} toYear={2040}
                onValueChange={(_, value) => setForm((f) => ({ ...f, invoiceIssuedAt: value ?? "" }))} /></div>
            <div><Label>Vencimento <span>*</span></Label>
              <CalendarPicker mode="single" name="dueDate" className="mt-1 w-full" value={form.dueDate} fromYear={2024} toYear={2040}
                onValueChange={(_, value) => setForm((f) => ({ ...f, dueDate: value ?? "" }))} />
              <p className="text-xs text-muted-foreground mt-1">Combinado: {dueRuleText(installment)}.</p></div>
            <div><Label>Forma de pagamento</Label>
              <div className="mt-1"><Select name="paymentMethod" state={form.paymentMethod} modal options={PAYMENT_METHOD_OPTIONS} onChange={(_, value) => setForm((f) => ({ ...f, paymentMethod: String(value) }))} /></div></div>
            <div className="sm:col-span-2"><Label htmlFor="billNet">Valor líquido a receber (opcional)</Label>
              <NumField id="billNet" kind="money" className="mt-1 sm:w-1/2" value={form.netValue} placeholder={String(installment.value).replace(".", ",")}
                onChange={(netValue) => setForm((f) => ({ ...f, netValue }))} onEmpty={() => setForm((f) => ({ ...f, netValue: null }))} />
              <p className="text-xs text-muted-foreground mt-1">Preencha se a nota tiver retenções (ISS, INSS, IR): é o que o cliente deposita de fato.</p></div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Registrando..." : "Registrar e criar a conta a receber"}</Button>
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
    onSuccess: (result) => { onSaved(result); setEditing(false); toast({ title: "Pedido do cliente salvo", variant: "success" }); },
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
    <section className="rounded-lg border p-4 text-sm" aria-label="Pedido do cliente">
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
