import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import SlideConfirm from "@/components/general-components/SlideConfirm";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import StatusBadge from "@/components/general-components/StatusBadge";
import { FormPageGrid, FormSection, SummaryRow } from "@/components/general-components/FormPage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errorMessage, money } from "../../../comercial/-shared/commercial";
import { dateBr, dateTimeBr, FEDERAL_TAXES, FISCAL_KEYS, formatDoc, Invoice, openFile, STATUS_INFO } from "../-shared/fiscal";

const EVENT_LABEL: Record<string, string> = {
  emitida: "Nota autorizada", rejeitada: "Rejeitada pelo ambiente nacional", cancelada: "Nota cancelada", substituida: "Nota substituída", email: "Enviada por e-mail", conferida: "Conferência no ambiente nacional",
};
const RECORD_STATUS: Record<string, string> = { waiting: "Em aberto", received: "Recebida", overdue: "Vencida", cancelled: "Cancelada", processing: "Processando", declined: "Recusada", chargeback: "Estornada" };
const CANCEL_REASONS = [{ id: "1", name: "Erro na emissão" }, { id: "2", name: "Serviço não prestado" }, { id: "9", name: "Outros" }];

/** Ficha da nota autorizada, enviando, cancelada ou substituída: documento, valores, cobrança, histórico e ações. */
export default function InvoiceView({ invoice }: { invoice: Invoice }) {
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sendOpen, setSendOpen] = useState(false);
  const [sendTo, setSendTo] = useState(invoice.taker.email ?? "");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState("1");
  const [reason, setReason] = useState("");
  const [cancelReceivables, setCancelReceivables] = useState(true);
  const info = STATUS_INFO[invoice.status];
  const fileBase = `NFS-e ${invoice.number ?? invoice.id}`;
  const refresh = (data: Invoice) => { queryClient.setQueryData([FISCAL_KEYS.invoice, invoice.id], data); queryClient.invalidateQueries({ queryKey: [FISCAL_KEYS.invoices] }); };

  const check = useMutation({
    mutationFn: async () => (await api.post<Invoice>(`fiscal/invoices/${invoice.id}/check`)).data,
    onSuccess: (data) => { refresh(data); toast({ title: data.status === "autorizada" ? `Nota ${data.number} autorizada` : "A nota não chegou ao ambiente nacional", description: data.status === "autorizada" ? undefined : data.messages[0]?.message, variant: data.status === "autorizada" ? "success" : "default" }); },
    onError: (err) => toast({ title: "Não foi possível conferir", description: errorMessage(err), variant: "destructive" }),
  });
  const send = useMutation({
    mutationFn: async () => (await api.post<Invoice>(`fiscal/invoices/${invoice.id}/send`, { to: sendTo })).data,
    onSuccess: (data) => { refresh(data); setSendOpen(false); toast({ title: "Nota enviada por e-mail", description: data.emailSentTo ?? undefined, variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível enviar", description: errorMessage(err), variant: "destructive" }),
  });
  const cancel = useMutation({
    mutationFn: async () => (await api.post<Invoice>(`fiscal/invoices/${invoice.id}/cancel`, { reasonCode: Number(reasonCode), reason, cancelReceivables })).data,
    onSuccess: (data) => { refresh(data); setCancelOpen(false); toast({ title: `Nota ${data.number ?? ""} cancelada`, variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível cancelar", description: errorMessage(err), variant: "destructive" }),
  });
  const replace = useMutation({
    mutationFn: async () => (await api.post<Invoice>(`fiscal/invoices/${invoice.id}/replace`)).data,
    onSuccess: (draft) => { queryClient.invalidateQueries({ queryKey: [FISCAL_KEYS.invoices] }); navigate({ to: "/financeiro/notas/$invoiceId", params: { invoiceId: String(draft.id) } }); toast({ title: "Rascunho da nota substituta criado", description: "Corrija o que precisa e emita: a nota atual será substituída.", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível começar a substituição", description: errorMessage(err), variant: "destructive" }),
  });

  const authorized = invoice.status === "autorizada";
  const received = (invoice.receivables ?? []).some((r) => r.status === "received" || r.paidAt);
  const fed = invoice.federalRetentions ?? { inss: 0, ir: 0, csll: 0, pis: 0, cofins: 0 };
  const address = invoice.taker.address;

  const aside = (
    <>
      <section className="rounded-card border bg-card p-4 flex flex-col gap-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Valores</p>
        <SummaryRow label="Valor do serviço" strong>{money(invoice.grossValue)}</SummaryRow>
        {invoice.discountValue > 0 && <SummaryRow label="Desconto">− {money(invoice.discountValue)}</SummaryRow>}
        {invoice.issValue > 0 && <SummaryRow label={invoice.issWithheld ? "ISS retido" : "ISS (no Simples)"}>{invoice.issWithheld ? "− " : ""}{money(invoice.issValue)}</SummaryRow>}
        {FEDERAL_TAXES.filter((t) => Number(fed[t.id] ?? 0) > 0).map((t) => <SummaryRow key={t.id} label={`${t.name} retido`}>− {money(Number(fed[t.id]))}</SummaryRow>)}
        <div className="border-t pt-2"><SummaryRow label="Líquido" strong>{money(invoice.netValue)}</SummaryRow></div>
      </section>

      <div className="flex flex-col gap-2">
        {(authorized || invoice.status === "cancelada" || invoice.status === "substituida") && (
          <>
            <Button type="button" onClick={() => openFile(`fiscal/invoices/${invoice.id}/pdf`, `${fileBase}.pdf`).catch((e) => toast({ title: "Não foi possível abrir o PDF", description: errorMessage(e), variant: "destructive" }))}>
              <Icon name="file-text" className="w-4 h-4" /> Ver PDF (DANFSe)
            </Button>
            {invoice.hasXml && <Button type="button" variant="outline" onClick={() => openFile(`fiscal/invoices/${invoice.id}/xml`, `${fileBase}.xml`, true)}><Icon name="file-code" className="w-4 h-4" /> Baixar XML</Button>}
            {invoice.externalUrl && <a href={invoice.externalUrl} target="_blank" rel="noreferrer" className="text-sm underline text-center">Arquivo da nota</a>}
          </>
        )}
        {authorized && can("emitir_nfse") && <Button type="button" variant="outline" onClick={() => setSendOpen(true)}><Icon name="mail" className="w-4 h-4" /> Enviar por e-mail</Button>}
        {invoice.status === "emitindo" && can("emitir_nfse") && (
          <Button type="button" disabled={check.isPending} onClick={() => check.mutate()}><Icon name="refresh-cw" className="w-4 h-4" /> Conferir no ambiente nacional</Button>
        )}
        {authorized && invoice.provider === "sefin" && can("cancelar_nfse") && can("emitir_nfse") && (
          <ConfirmDialog title="Substituir esta nota?" description="Abre um rascunho igual a esta nota para você corrigir. Ao emitir a substituta, esta nota fica cancelada por substituição e as contas a receber passam para a nova."
            onConfirm={() => replace.mutate()}>
            <Button type="button" variant="outline" disabled={replace.isPending}><Icon name="replace" className="w-4 h-4" /> Substituir (corrigir)</Button>
          </ConfirmDialog>
        )}
        {authorized && can("cancelar_nfse") && (
          <Button type="button" variant="outline" className="text-destructive" onClick={() => setCancelOpen(true)}><Icon name="ban" className="w-4 h-4" /> Cancelar nota</Button>
        )}
        <Button type="button" variant="ghost" onClick={() => navigate({ to: "/financeiro/notas" })}>Voltar para a lista</Button>
      </div>
    </>
  );

  return (
    <>
      <FormPageGrid aside={aside}>
        {invoice.messages.length > 0 && (
          <div className={invoice.status === "emitindo" || invoice.status === "rejeitada" ? "rounded-card border border-red-300 bg-red-50 dark:bg-red-950 p-3 text-sm text-red-900 dark:text-red-100" : "rounded-card border border-amber-300 bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-900 dark:text-amber-100"}>
            <ul className="list-disc pl-4">{invoice.messages.map((m) => <li key={m.code + m.message}>{m.code && !["conexao", "nao-gerada"].includes(m.code) ? <b>{m.code}: </b> : null}{m.message}</li>)}</ul>
          </div>
        )}
        {invoice.origin?.label && (
          <p className="rounded-card border bg-muted/50 p-3 text-sm flex items-center gap-1.5"><Icon name="link" className="w-4 h-4" /> Nota de {invoice.origin.label}{invoice.origin.kind === "contract" ? " · as parcelas usam o saldo desta nota ao serem faturadas" : invoice.origin.kind === "subscriptions" ? (invoice.originBilledAt ? " · ligada ao pagamento" : "") : invoice.originBilledAt ? " · faturada" : ""}</p>
        )}
        {invoice.status === "cancelada" && <p className="rounded-card border bg-muted p-3 text-sm">Cancelada em {dateTimeBr(invoice.cancelledAt)}: {invoice.cancelReason}</p>}
        {invoice.status === "substituida" && invoice.replacedById && (
          <p className="rounded-card border bg-muted p-3 text-sm">Substituída pela <Link to="/financeiro/notas/$invoiceId" params={{ invoiceId: String(invoice.replacedById) }} className="underline">nota nova</Link>.</p>
        )}
        {invoice.replacesId && (
          <p className="rounded-card border bg-muted p-3 text-sm">Esta nota substitui a <Link to="/financeiro/notas/$invoiceId" params={{ invoiceId: String(invoice.replacesId) }} className="underline">nota anterior</Link>.</p>
        )}

        <FormSection title="Documento">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
            <SummaryRow label="Situação"><StatusBadge tone={info.tone} pulse={info.pulse}>{info.label}</StatusBadge></SummaryRow>
            <SummaryRow label="Ambiente">{invoice.provider === "externa" ? "Emitida fora do sistema" : invoice.environment === "producao" ? "Produção" : "Testes (sem valor fiscal)"}</SummaryRow>
            <SummaryRow label="Número">{invoice.number ?? "—"}</SummaryRow>
            <SummaryRow label="Emitida em">{dateTimeBr(invoice.issuedAt)}</SummaryRow>
            <SummaryRow label="Competência">{dateBr(invoice.competence)}</SummaryRow>
            <SummaryRow label="DPS (série/número)">{invoice.dpsSeries ? `${invoice.dpsSeries}/${invoice.dpsNumber}` : "—"}</SummaryRow>
          </div>
          {invoice.accessKey && <p className="text-xs text-muted-foreground break-all">Chave de acesso: <span className="font-mono text-foreground">{invoice.accessKey}</span></p>}
          {invoice.emailSentAt && <p className="text-xs text-muted-foreground">Enviada por e-mail em {dateTimeBr(invoice.emailSentAt)} para {invoice.emailSentTo}</p>}
        </FormSection>

        <FormSection title="Tomador">
          <p className="text-sm"><b>{invoice.taker.name}</b> · {formatDoc(invoice.taker.document)}{invoice.taker.municipalRegistration ? ` · IM ${invoice.taker.municipalRegistration}` : ""}</p>
          <p className="text-sm text-muted-foreground">{address ? [address.street, address.number, address.complement, address.district, address.cityName && `${address.cityName}/${address.uf ?? ""}`, address.cep].filter(Boolean).join(", ") : "Sem endereço"}</p>
          {invoice.taker.email && <p className="text-sm text-muted-foreground">{invoice.taker.email}</p>}
          {invoice.customerId && <Link to="/clientes/$customerId" params={{ customerId: String(invoice.customerId) }} className="text-sm underline">Abrir o cliente</Link>}
        </FormSection>

        <FormSection title="Serviço">
          <p className="text-sm"><b>{invoice.service.name ?? "Serviço"}</b> · código {invoice.service.nationalCode}{invoice.service.nbsCode ? ` · NBS ${invoice.service.nbsCode}` : ""}</p>
          {invoice.service.nationalLabel && <p className="text-xs text-muted-foreground">{invoice.service.nationalLabel}</p>}
          <p className="text-sm whitespace-pre-line rounded-lg border bg-muted/40 p-3">{invoice.description}</p>
          {(invoice.reference || invoice.order || invoice.notes) && (
            <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
              {invoice.reference && <span>Referência: {invoice.reference}</span>}
              {invoice.order && <span>Pedido do cliente: {invoice.order}</span>}
              {invoice.notes && <span>Observações: {invoice.notes}</span>}
            </div>
          )}
        </FormSection>

        <FormSection title="Cobrança" description="Contas a receber ligadas a esta nota.">
          {(invoice.receivables ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{invoice.receivable ? "A conta a receber nasce quando a nota for autorizada." : "Nenhuma conta a receber ligada a esta nota."}</p>
          ) : (
            <div className="flex flex-col divide-y">
              {invoice.receivables!.map((r) => (
                <div key={r.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <Link to="/financeiro/receber/$recordId" params={{ recordId: String(r.id) }} className="underline truncate block">{r.description ?? `Conta ${r.id}`}</Link>
                    <span className="text-xs text-muted-foreground">Vence {dateBr(r.dueDate)} · {RECORD_STATUS[r.status] ?? r.status}</span>
                  </div>
                  <span className="tabular-nums font-semibold">{money(r.netValue ?? r.value)}</span>
                </div>
              ))}
            </div>
          )}
        </FormSection>

        {(invoice.events ?? []).length > 0 && (
          <FormSection title="Histórico">
            <ol className="flex flex-col gap-1.5 text-sm">
              {invoice.events!.map((e) => (
                <li key={e.id} className="flex gap-2"><span className="text-muted-foreground whitespace-nowrap">{dateTimeBr(e.createdAt)}</span><span>{EVENT_LABEL[e.kind] ?? e.kind}</span></li>
              ))}
            </ol>
          </FormSection>
        )}
      </FormPageGrid>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar a nota por e-mail</DialogTitle>
            <DialogDescription>Vão o PDF (DANFSe) e o XML. Separe vários e-mails com vírgula.</DialogDescription>
          </DialogHeader>
          <div><Label>Para</Label><Input name="sendTo" value={sendTo} onValueChange={(_, v) => setSendTo(String(v))} className="mt-1" /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setSendOpen(false)}>Cancelar</Button>
            <Button type="button" disabled={send.isPending || !sendTo} onClick={() => send.mutate()}>Enviar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar a nota {invoice.number}</DialogTitle>
            <DialogDescription>{invoice.provider === "sefin" ? "O cancelamento é registrado no ambiente nacional e não pode ser desfeito." : "A nota foi emitida fora: cancele também no portal onde ela foi emitida."}</DialogDescription>
          </DialogHeader>
          {received ? (
            <p className="text-sm rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950 p-3">Esta nota já tem conta recebida. Em vez de cancelar, use <b>Substituir (corrigir)</b>.</p>
          ) : (
            <>
              <div><Label>Motivo</Label><Select name="reasonCode" options={CANCEL_REASONS as never[]} state={reasonCode} onChange={(_, v) => setReasonCode(String(Array.isArray(v) ? v[0] ?? "1" : v))} modal /></div>
              <div><Label>Explique (vai para o ambiente nacional)</Label><Input type="textArea" name="reason" rows={2} value={reason} onValueChange={(_, v) => setReason(String(v))} className="mt-1" placeholder="ex.: valor informado errado na emissão" /></div>
              {(invoice.receivables ?? []).length > 0 && (
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={cancelReceivables} onCheckedChange={(v) => setCancelReceivables(v === true)} /> Cancelar também a conta a receber em aberto</label>
              )}
              <SlideConfirm label="Deslize para cancelar a nota" pending={cancel.isPending} disabled={reason.trim().length < 15} onConfirm={() => { cancel.mutate(); }} />
              {reason.trim().length > 0 && reason.trim().length < 15 && <p className="text-xs text-muted-foreground">O motivo precisa de pelo menos 15 letras.</p>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
