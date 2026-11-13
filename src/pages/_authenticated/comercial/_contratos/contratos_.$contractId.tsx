import { Link, createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input as ShadInput } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CalendarPicker from "@/components/general-components/Calendar";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { COMMERCIAL_ABILITY, NumField, commercialApi, dateBr, errorMessage, money, todayIso } from "../-shared/commercial";
import {
  CONTRACTS_KEY, CONTRACT_KEY, Contract, ContractClassSlot, ContractInstallment, ContractStatus, ContractStatusBadge,
  PAYMENT_METHOD_OPTIONS, RECORD_STATUS_LABEL, dueRuleText,
} from "../-shared/contracts";
import { DocumentPaper } from "../-shared/document";
import { KIND_LABEL, formatCnpj } from "../-shared/proposals";

export const Route = createFileRoute("/_authenticated/comercial/_contratos/contratos_/$contractId")({
  component: ContractPage,
});

const dateTime = (value?: string | null) => (value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "");
const cpfBr = (cpf?: string) => (cpf && cpf.length === 11 ? cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4") : cpf ?? "");

function ContractPage() {
  const { contractId } = Route.useParams();
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [billing, setBilling] = useState<ContractInstallment | null>(null);
  const [creatingClass, setCreatingClass] = useState<ContractClassSlot | null>(null);
  const [document, setDocument] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<ContractStatus | null>(null);
  const [dates, setDates] = useState<{ startDate: string | null; endDate: string | null; notes: string }>({ startDate: null, endDate: null, notes: "" });

  const { data: contract, isLoading, error } = useQuery({
    queryKey: [CONTRACT_KEY, contractId],
    queryFn: () => commercialApi.get<Contract>(`contracts/${contractId}`),
  });
  useEffect(() => { if (contract) setDates({ startDate: contract.startDate, endDate: contract.endDate, notes: contract.notes ?? "" }); }, [contract]);

  const apply = (result: Contract) => {
    queryClient.setQueryData([CONTRACT_KEY, contractId], result);
    queryClient.invalidateQueries({ queryKey: [CONTRACTS_KEY] });
    // o que mudou aqui também muda em Contas a Receber
    queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0] ?? "").startsWith("list") });
  };
  const fail = (title: string) => (err: unknown) => toast({ title, description: errorMessage(err), variant: "destructive" });

  const { mutate: saveDates, isPending: saving } = useMutation({
    mutationFn: () => commercialApi.put<Contract>(`contracts/${contractId}`, dates),
    onSuccess: (result) => { apply(result); toast({ title: "Contrato atualizado", variant: "success" }); },
    onError: fail("Não foi possível salvar"),
  });
  const { mutate: unbill } = useMutation({
    mutationFn: (installment: ContractInstallment) => commercialApi.post<Contract>(`contracts/${contractId}/installments/${installment.id}/unbill`),
    onSuccess: (result) => { apply(result); toast({ title: "Faturamento desfeito", description: "O título saiu do Contas a Receber.", variant: "success" }); },
    onError: fail("Não foi possível desfazer"),
  });
  const { mutate: loadDocument, isPending: loadingDocument } = useMutation({
    mutationFn: () => commercialApi.get<{ html: string }>(`contracts/${contractId}/document`),
    onSuccess: (result) => setDocument(result.html),
    onError: fail("Não foi possível abrir o documento"),
  });

  if (!can(`view_${COMMERCIAL_ABILITY}`)) return null;
  if (error) return <div className="p-4"><p className="text-destructive font-medium">Erro: {errorMessage(error)}</p><Link to="/comercial/contratos" className="underline text-sm">Voltar para os contratos</Link></div>;
  if (isLoading || !contract) return <div className="grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;

  const canUpdate = can(`update_${COMMERCIAL_ABILITY}`);
  const canBill = can("create_financeiro");
  const canUnbill = can("inactive_financeiro");
  const active = contract.status === "vigente";
  const signer = contract.signer;
  const dirty = dates.startDate !== contract.startDate || dates.endDate !== contract.endDate || dates.notes !== (contract.notes ?? "");

  return (
    <>
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/comercial/contratos" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Contratos</Link>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h1 className="text-xl font-bold tabular-nums">{contract.number}</h1>
            <ContractStatusBadge status={contract.status} />
          </div>
          <p className="text-sm text-muted-foreground truncate">{contract.customer.name} · {contract.title} · {KIND_LABEL[contract.kind]}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {contract.hasDocument && <Button type="button" variant="outline" disabled={loadingDocument} onClick={() => loadDocument()}><Icon name="file-text" className="w-4 h-4 mr-1" /> Ver o documento aceito</Button>}
          {canUpdate && active && <Button type="button" variant="outline" onClick={() => setStatusTarget("concluido")}><Icon name="check" className="w-4 h-4 mr-1" /> Concluir</Button>}
          {canUpdate && active && <Button type="button" variant="ghost" onClick={() => setStatusTarget("cancelado")}>Cancelar contrato</Button>}
          {canUpdate && !active && <Button type="button" variant="outline" onClick={() => setStatusTarget("vigente")}>Reabrir</Button>}
        </div>
      </div>

      {contract.statusNote && !active && <p className="mt-3 rounded-md border px-3 py-2 text-sm text-muted-foreground">Observação: {contract.statusNote}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 my-4">
        <Stat label="Valor do contrato" value={money(contract.value)} />
        <Stat label="Faturado (com nota)" value={money(contract.billed)} />
        <Stat label="Recebido" value={money(contract.received)} />
        <Stat label="A faturar" value={money(contract.toBill)} highlight={contract.toBill > 0.005 && active} />
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        <div className="grid gap-4 min-w-0">
          <section className="rounded-lg border p-4">
            <h2 className="font-semibold">Parcelas</h2>
            <p className="text-xs text-muted-foreground">Registrar a nota fiscal de uma parcela cria a conta a receber dela, com baixa manual no financeiro.</p>
            {contract.installments.length === 0 && <p className="mt-3 text-sm text-muted-foreground">A proposta foi aceita sem condições de pagamento.</p>}
            <div className="mt-2 divide-y">
              {contract.installments.map((installment) => (
                <div key={installment.id} className="py-3 flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 text-sm">
                  <div className="lg:w-56">
                    <p className="font-medium">{installment.total > 1 ? `Parcela ${installment.number}/${installment.total}` : "Pagamento único"}{installment.description ? ` · ${installment.description}` : ""}</p>
                    <p className="text-xs text-muted-foreground">Combinado: {dueRuleText(installment)}</p>
                  </div>
                  <div className="lg:w-32 font-semibold tabular-nums">{money(installment.value)}</div>
                  <div className="flex-1 min-w-0">
                    {installment.record ? (
                      <p>
                        <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", installment.record.paid ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200")}>
                          {RECORD_STATUS_LABEL[installment.record.status] ?? installment.record.status}
                        </span>{" "}
                        NF {installment.record.invoiceNumber} de {dateBr(installment.record.invoiceIssuedAt)} · vence em {dateBr(installment.record.dueDate)}
                        {installment.record.paidAt ? ` · pago em ${dateBr(installment.record.paidAt)}` : ""}
                        {!installment.record.hasInvoiceFile && <span className="block text-xs text-muted-foreground">Arquivo da nota ainda não anexado (anexe em Contas a Receber).</span>}
                      </p>
                    ) : (
                      <p className="text-muted-foreground">Ainda sem nota fiscal · vencimento sugerido {dateBr(installment.suggestedDue)}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!installment.record && active && canBill && (
                      <Button type="button" size="sm" onClick={() => setBilling(installment)}><Icon name="receipt" className="w-4 h-4 mr-1" /> Registrar NF</Button>
                    )}
                    {installment.record && !installment.record.paid && canUnbill && (
                      <ConfirmDialog title="Desfazer o faturamento desta parcela?" description="A conta a receber desta parcela é cancelada e a parcela volta a ficar sem nota. Use quando a nota foi lançada errada."
                        onConfirm={() => unbill(installment)}>
                        <Button type="button" variant="ghost" size="sm">Desfazer</Button>
                      </ConfirmDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {contract.billed > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">A baixa do pagamento é feita em <Link to="/financeiro/receber" className="underline">Financeiro → Contas a Receber</Link>.</p>
            )}
          </section>

          {contract.classes.length > 0 && (
            <section className="rounded-lg border p-4">
              <h2 className="font-semibold">Treinamentos do contrato</h2>
              <p className="text-xs text-muted-foreground">Cada item pode virar uma turma fechada: ligada ao cliente, fora do site e sem cobrança individual dos alunos.</p>
              <div className="mt-2 divide-y">
                {contract.classes.map((slot) => {
                  const wanted = Math.max(1, Math.ceil(slot.quantity));
                  return (
                    <div key={slot.index} className="py-3 flex flex-col lg:flex-row lg:items-start gap-2 lg:gap-4 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{slot.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {[`${wanted} turma${wanted === 1 ? "" : "s"}`, slot.students ? `${slot.students} alunos` : "", slot.workload ? `${slot.workload} h` : "", slot.dates, slot.location].filter(Boolean).join(" · ")}
                        </p>
                        {slot.classes.map((klass) => (
                          <p key={klass.id} className="mt-1">
                            <Icon name="graduation-cap" className="w-3 h-3 inline mr-1" />
                            <Link to="/treinamentos/turmas/$turmaId" params={{ turmaId: String(klass.id) }} className="underline">{klass.name}</Link>
                            {klass.initialDate ? ` · ${dateBr(klass.initialDate)}` : ""}{klass.inactiveAt ? " · inativa" : ""}
                          </p>
                        ))}
                      </div>
                      {contract.status !== "cancelado" && slot.courseId && slot.classes.length < wanted && can("create_classes") && (
                        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setCreatingClass(slot)}>
                          <Icon name="plus" className="w-4 h-4 mr-1" /> Criar turma fechada
                        </Button>
                      )}
                      {!slot.courseId && <span className="text-xs text-muted-foreground shrink-0">Item sem curso: crie a turma em Treinamentos → Turmas.</span>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="rounded-lg border p-4 grid gap-3">
            <h2 className="font-semibold">Execução</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Início</Label>
                <CalendarPicker mode="single" name="startDate" className="mt-1 w-full" value={dates.startDate} disabled={!canUpdate} placeholder="A definir" fromYear={2024} toYear={2040}
                  onValueChange={(_, value) => setDates((d) => ({ ...d, startDate: value }))} /></div>
              <div><Label className="text-xs">Conclusão</Label>
                <CalendarPicker mode="single" name="endDate" className="mt-1 w-full" value={dates.endDate} disabled={!canUpdate} placeholder="A definir" fromYear={2024} toYear={2040}
                  onValueChange={(_, value) => setDates((d) => ({ ...d, endDate: value }))} />
                <p className="text-xs text-muted-foreground mt-1">Usada para sugerir o vencimento das parcelas "após a conclusão".</p></div>
            </div>
            <div><Label htmlFor="contractNotes" className="text-xs">Observações internas</Label>
              <Textarea id="contractNotes" className="mt-1" rows={3} value={dates.notes} disabled={!canUpdate} onChange={(event) => setDates((d) => ({ ...d, notes: event.target.value }))} /></div>
            {canUpdate && <div><Button type="button" disabled={!dirty || saving} onClick={() => saveDates()}>{saving ? "Salvando..." : "Salvar"}</Button></div>}
          </section>
        </div>

        <aside className="grid gap-4">
          <section className="rounded-lg border p-4 text-sm grid gap-1">
            <h2 className="font-semibold text-base">Cliente</h2>
            <p className="font-medium">{contract.customer.corporateName}</p>
            <p className="text-muted-foreground">CNPJ {formatCnpj(contract.customer.cnpj)}</p>
            <p className="text-muted-foreground">{contract.customer.email} · {contract.customer.phone}</p>
            {contract.proposal && (
              <p className="mt-2">Proposta <Link to="/comercial/propostas/$proposalId" params={{ proposalId: String(contract.proposal.id) }} className="underline font-medium">{contract.proposal.number}</Link></p>
            )}
          </section>
          <section className="rounded-lg border p-4 text-sm grid gap-1">
            <h2 className="font-semibold text-base">Aceite</h2>
            <p>Em {dateTime(contract.acceptedAt)}</p>
            {signer?.manual ? (
              <p className="text-muted-foreground">Registrado manualmente no sistema{signer.note ? `: ${signer.note}` : "."}</p>
            ) : signer ? (
              <>
                <p className="font-medium">{signer.name}</p>
                <p className="text-muted-foreground">{[signer.role, signer.cpf ? `CPF ${cpfBr(signer.cpf)}` : "", signer.email].filter(Boolean).join(" · ")}</p>
                <p className="text-xs text-muted-foreground break-all">
                  Aceite eletrônico pelo link · IP {signer.ip ?? "não registrado"} · {signer.codeVerified ? "código confirmado por e-mail" : "sem confirmação por código"}
                </p>
              </>
            ) : null}
            {contract.documentHash && <p className="text-xs text-muted-foreground break-all mt-1">Documento: {contract.documentHash}</p>}
          </section>
        </aside>
      </div>

      {billing && <BillDialog contract={contract} installment={billing} onClose={() => setBilling(null)} onDone={apply} />}
      {creatingClass && <ClassDialog contract={contract} slot={creatingClass} onClose={() => setCreatingClass(null)} onDone={apply} />}
      {statusTarget && <StatusDialog contract={contract} target={statusTarget} onClose={() => setStatusTarget(null)} onDone={apply} />}
      <Dialog open={document !== null} onOpenChange={(open) => { if (!open) setDocument(null); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documento aceito — {contract.number}</DialogTitle>
            <DialogDescription>Exatamente o que o cliente leu e aceitou. Não pode ser alterado.</DialogDescription>
          </DialogHeader>
          {document !== null && <DocumentPaper html={document} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg border px-3 py-2", highlight && "border-amber-400 bg-amber-50 dark:bg-amber-950")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/** Registrar a NF de uma parcela: cria a conta a receber. */
function BillDialog({ contract, installment, onClose, onDone }: { contract: Contract; installment: ContractInstallment; onClose: () => void; onDone: (contract: Contract) => void }) {
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

function ClassDialog({ contract, slot, onClose, onDone }: { contract: Contract; slot: ContractClassSlot; onClose: () => void; onDone: (contract: Contract) => void }) {
  const [form, setForm] = useState<{ name: string; initialDate: string | null; finalDate: string | null }>({ name: `${slot.description} — ${contract.customer.name}`.slice(0, 100), initialDate: null, finalDate: null });
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => commercialApi.post<Contract>(`contracts/${contract.id}/classes/${slot.index}`, form),
    onSuccess: (result) => { onDone(result); toast({ title: "Turma fechada criada", description: "Complete os dados e inscreva os alunos em Treinamentos → Turmas.", variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar turma fechada</DialogTitle>
          <DialogDescription>A turma nasce ligada a {contract.customer.name}, fora do site e sem venda. Os demais dados você completa em Treinamentos → Turmas.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); if (form.name.trim().length < 2) return setError("Informe o nome da turma"); setError(""); mutate(); }}>
          <div><Label htmlFor="className">Nome da turma <span>*</span></Label>
            <ShadInput id="className" className="mt-1" value={form.name} maxLength={100} onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Início</Label>
              <CalendarPicker mode="single" name="initialDate" className="mt-1 w-full" value={form.initialDate} placeholder="A definir" fromYear={2024} toYear={2040} onValueChange={(_, value) => setForm((f) => ({ ...f, initialDate: value }))} /></div>
            <div><Label>Término</Label>
              <CalendarPicker mode="single" name="finalDate" className="mt-1 w-full" value={form.finalDate} placeholder="A definir" fromYear={2024} toYear={2040} onValueChange={(_, value) => setForm((f) => ({ ...f, finalDate: value }))} /></div>
          </div>
          {slot.dates && <p className="text-xs text-muted-foreground">Datas previstas na proposta: {slot.dates}</p>}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Criando..." : "Criar turma"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_TEXT: Record<ContractStatus, { title: string; description: string; action: string }> = {
  concluido: { title: "Concluir o contrato", description: "Marca o serviço ou treinamento como entregue. Contrato concluído não recebe faturamento novo; os títulos já lançados continuam no financeiro.", action: "Concluir" },
  cancelado: { title: "Cancelar o contrato", description: "Só é possível se não houver conta a receber em aberto deste contrato. Dá para reabrir depois.", action: "Cancelar contrato" },
  vigente: { title: "Reabrir o contrato", description: "O contrato volta a ficar vigente e pode receber faturamento.", action: "Reabrir" },
};

function StatusDialog({ contract, target, onClose, onDone }: { contract: Contract; target: ContractStatus; onClose: () => void; onDone: (contract: Contract) => void }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const text = STATUS_TEXT[target];
  const { mutate, isPending } = useMutation({
    mutationFn: () => commercialApi.patch<Contract>(`contracts/status/${contract.id}`, { status: target, note }),
    onSuccess: (result) => { onDone(result); toast({ title: "Contrato atualizado", variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{text.title} {contract.number}</DialogTitle>
          <DialogDescription>{text.description}</DialogDescription>
        </DialogHeader>
        <div><Label htmlFor="statusNote">Observação (opcional)</Label>
          <Textarea id="statusNote" className="mt-1" rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
          <Button type="button" disabled={isPending} onClick={() => mutate()}>{text.action}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
