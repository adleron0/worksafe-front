import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
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
import { NumField, commercialApi, dateBr, errorMessage, money, todayIso } from "../-shared/commercial";
import { Contract, PAYMENT_METHOD_OPTIONS, RECORD_STATUS_LABEL } from "../-shared/contracts";
import { RetentionFields, RetentionRates, RetentionState, retentionList, retentionState, retentionSum } from "../-shared/retentions";
import {
  ContractPlan, MeasurementPlanDraft, MeasurementPlanEditor, WorkLinesTable, WorkMeasurement, WorkStatusBadge, WorkSummary, defaultPlan, pctBr,
} from "../-shared/measurement";
import { WorkReport, WorkReportPaper, printWorkReport } from "../-shared/measurement-report";

type Done = (contract: Contract) => void;
const plusDays = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export const publicMeasurementUrl = (key: string) => `${window.location.origin}/medicao/${key}`;

/** Valores do plano no navegador (o mesmo cálculo da API), para o diálogo de passar a venda para medição. */
export function planValues(plan: MeasurementPlanDraft, total: number): ContractPlan {
  const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const mob = r2(total * plan.mobilization.rate);
  const measurable = r2(total - mob);
  const sum = plan.fronts.reduce((s, f) => s + f.weight, 0) || 1;
  const values = plan.fronts.map((f) => r2((measurable * f.weight) / sum));
  if (values.length) values[values.length - 1] = r2(measurable - values.slice(0, -1).reduce((a, b) => a + b, 0));
  const first = mob > 0 ? [{ id: 1, step: null, title: "Mobilização (medição inicial)", weight: plan.mobilization.rate, rule: "conclusao" as const, value: mob, mobilization: true }] : [];
  return { fronts: [...first, ...plan.fronts.map((f, i) => ({ ...f, id: first.length + i + 1, value: values[i] }))], mobilization: { rate: plan.mobilization.rate, value: mob }, depositRate: plan.depositRate, depositReleaseDays: plan.depositReleaseDays, total };
}

/**
 * Medição de obra no contrato: o plano (frentes, mobilização, caução), o
 * resumo medido × faturado × saldo, os boletins e as ações de cada etapa.
 */
export function WorkMeasurementsSection({ contract, canUpdate, canBill, canUnbill, onDone }: {
  contract: Contract; canUpdate: boolean; canBill: boolean; canUnbill: boolean; onDone: Done;
}) {
  const plan = contract.measurementPlan!;
  const works = contract.works!;
  const active = contract.status === "vigente";
  const [editing, setEditing] = useState<WorkMeasurement | "new" | null>(null);
  const [approving, setApproving] = useState<WorkMeasurement | null>(null);
  const [billing, setBilling] = useState<WorkMeasurement | null>(null);
  const [viewing, setViewing] = useState<WorkMeasurement | null>(null);
  const [releasing, setReleasing] = useState(false);
  const fail = (title: string) => (err: unknown) => toast({ title, description: errorMessage(err), variant: "destructive" });
  const { mutate: send } = useMutation({
    mutationFn: (m: WorkMeasurement) => commercialApi.post<Contract & { sent: { publicKey: string } }>(`contracts/${contract.id}/works/${m.id}/send`),
    onSuccess: (result) => {
      onDone(result);
      const url = publicMeasurementUrl(result.sent.publicKey);
      navigator.clipboard?.writeText(url).catch(() => undefined);
      toast({ title: "Boletim pronto para o cliente", description: `Link copiado: ${url}`, variant: "success" });
    },
    onError: fail("Não foi possível enviar"),
  });
  const { mutate: remove } = useMutation({
    mutationFn: (m: WorkMeasurement) => commercialApi.delete<Contract>(`contracts/${contract.id}/works/${m.id}`),
    onSuccess: (result) => { onDone(result); toast({ title: "Boletim excluído", variant: "success" }); },
    onError: fail("Não foi possível excluir"),
  });
  const { mutate: unbill } = useMutation({
    mutationFn: (m: WorkMeasurement) => commercialApi.post<Contract>(`contracts/${contract.id}/measurements/${m.id}/unbill`),
    onSuccess: (result) => { onDone(result); toast({ title: "Faturamento desfeito", description: "A conta a receber foi cancelada e a caução voltou; o boletim ficou aprovado.", variant: "success" }); },
    onError: fail("Não foi possível desfazer"),
  });
  const copy = (key: string) => { navigator.clipboard?.writeText(publicMeasurementUrl(key)).then(() => toast({ title: "Link copiado", variant: "success" })).catch(() => undefined); };
  const lastAcc = new Map<number, number>();
  for (const m of works.measurements.filter((x) => x.status === "faturada")) for (const l of m.lines) if (l.kind === "frente" && l.frontId) lastAcc.set(l.frontId, l.accPercent ?? 0);
  const s: WorkSummary = works.summary;

  return (
    <section className="rounded-lg border p-4" aria-label="Medição de obra">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Medição de obra</h2>
          <p className="text-xs text-muted-foreground">Cada boletim (BM) mede o % concluído das frentes no período, vai ao cliente para aprovar e, aprovado, vira a nota fiscal e a conta a receber.</p>
        </div>
        {active && canUpdate && !s.open && s.balance > 0.005 && (
          <Button type="button" onClick={() => setEditing("new")}><Icon name="plus" className="w-4 h-4 mr-1" /> Novo boletim</Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3 text-sm">
        <div className="rounded border px-3 py-2"><p className="text-xs text-muted-foreground">Medido</p><p className="font-semibold tabular-nums">{money(s.measured)}</p></div>
        <div className="rounded border px-3 py-2"><p className="text-xs text-muted-foreground">Saldo a medir</p><p className="font-semibold tabular-nums">{money(s.balance)}</p></div>
        <div className="rounded border px-3 py-2"><p className="text-xs text-muted-foreground">Notas emitidas</p><p className="font-semibold tabular-nums">{money(s.invoiced)}</p></div>
        <div className="rounded border px-3 py-2">
          <p className="text-xs text-muted-foreground">Caução retida</p>
          <p className="font-semibold tabular-nums">{money(s.deposit)}</p>
        </div>
      </div>

      <details className="mt-3 rounded border text-sm">
        <summary className="px-3 py-2 cursor-pointer font-medium">Plano: {plan.fronts.length} frente(s){plan.mobilization.value > 0 ? ` · mobilização ${pctBr(plan.mobilization.rate * 100)} na medição inicial` : ""}{plan.depositRate > 0 ? ` · caução ${pctBr(plan.depositRate * 100)}` : ""}</summary>
        <div className="divide-y border-t">

          {plan.fronts.map((f) => (
            <div key={f.id} className="px-3 py-1.5 flex justify-between gap-3">
              <span className="min-w-0">{f.title}<span className="text-xs text-muted-foreground"> · {f.rule === "conclusao" ? "só ao concluir" : "pelo %"} · {pctBr(lastAcc.get(f.id) ?? 0)} medido</span></span>
              <span className="tabular-nums shrink-0">{money(f.value)}</span>
            </div>
          ))}
        </div>
      </details>

      {s.depositRecord && (
        <div className="mt-3 rounded border px-3 py-2 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p>Caução contratual: <b className="tabular-nums">{money(s.depositRecord.value)}</b> · {RECORD_STATUS_LABEL[s.depositRecord.status] ?? s.depositRecord.status} · vence em {dateBr(s.depositRecord.dueDate)}</p>
          {s.depositRecord.status === "waiting" && canBill && <Button type="button" size="sm" variant="outline" onClick={() => setReleasing(true)}>Liberar a caução</Button>}
        </div>
      )}

      {works.measurements.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Nenhum boletim ainda. {plan.mobilization.value > 0 ? "O primeiro já leva a mobilização (medição inicial)." : "O primeiro mede o avanço das frentes."}</p>}
      <div className="mt-2 divide-y">
        {works.measurements.map((m) => (
          <div key={m.id} className="py-3 grid gap-2 text-sm">
            <div className="flex flex-col md:flex-row md:items-start gap-1 md:gap-4">
              <div className="md:w-48 shrink-0">
                <p className="font-semibold tabular-nums flex items-center gap-2">{m.label} <WorkStatusBadge status={m.status} /></p>
                <p className="text-xs text-muted-foreground">{dateBr(m.periodStart)} a {dateBr(m.periodEnd)}</p>
              </div>
              <div className="md:w-36 shrink-0"><p className="font-semibold tabular-nums">{money(m.invoiceValue)}</p>{m.depositValue > 0 && <p className="text-xs text-muted-foreground">a receber {money(m.value)}</p>}</div>
              <div className="flex-1 min-w-0">
                {m.record ? (
                  <p><span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", m.record.paid ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200")}>{RECORD_STATUS_LABEL[m.record.status] ?? m.record.status}</span>{" "}
                    NF {m.record.invoiceNumber} de {dateBr(m.record.invoiceIssuedAt)} · vence em {dateBr(m.record.dueDate)}{m.record.netValue !== null && m.record.netValue < m.value ? ` · líquido ${money(m.record.netValue)}` : ""}</p>
                ) : m.status === "enviada" ? <p className="text-muted-foreground">Enviado em {dateBr(m.sentAt)}: aguardando a aprovação do cliente pelo link.</p>
                  : m.status === "contestada" ? <p className="text-red-700 dark:text-red-400">Contestado por {m.decision?.name}: "{m.decision?.note}". Revise e reenvie.</p>
                  : m.status === "aprovada" ? <p className="text-muted-foreground">Aprovado por {m.decision?.name}{m.decision?.manual ? " (registrado no sistema)" : " pelo link"} em {dateBr(m.decidedAt)}.</p>
                  : <p className="text-muted-foreground">Rascunho: confira e envie ao cliente.</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-1 md:pl-[13rem]">
                <Button type="button" variant="ghost" size="sm" onClick={() => setViewing(m)}><Icon name="file-text" className="w-4 h-4 mr-1" /> Boletim</Button>
                {canUpdate && active && ["rascunho", "contestada"].includes(m.status) && <Button type="button" variant="outline" size="sm" onClick={() => setEditing(m)}>Editar</Button>}
                {canUpdate && active && ["rascunho", "contestada"].includes(m.status) && <Button type="button" size="sm" onClick={() => send(m)}><Icon name="send" className="w-4 h-4 mr-1" /> Enviar ao cliente</Button>}
                {m.status === "enviada" && m.publicKey && <Button type="button" variant="outline" size="sm" onClick={() => copy(m.publicKey!)}><Icon name="link" className="w-4 h-4 mr-1" /> Copiar link</Button>}
                {canUpdate && active && ["rascunho", "enviada", "contestada"].includes(m.status) && <Button type="button" variant="outline" size="sm" onClick={() => setApproving(m)}>Registrar aprovação</Button>}
                {canBill && m.status === "aprovada" && contract.status !== "cancelado" && <Button type="button" size="sm" onClick={() => setBilling(m)}><Icon name="receipt" className="w-4 h-4 mr-1" /> Faturar</Button>}
                {canUpdate && m.status !== "faturada" && (
                  <ConfirmDialog title={`Excluir o ${m.label}?`} description="O boletim ainda não foi faturado: ele é apagado e o número volta a ficar livre." onConfirm={() => remove(m)}>
                    <Button type="button" variant="ghost" size="sm" aria-label={`Excluir o ${m.label}`}><Icon name="trash-2" className="w-4 h-4" /></Button>
                  </ConfirmDialog>
                )}
                {canUnbill && m.status === "faturada" && m.record && !m.record.paid && (
                  <ConfirmDialog title={`Desfazer o faturamento do ${m.label}?`} description="A conta a receber é cancelada, a caução dele sai da conta da caução e o boletim volta a ficar aprovado. Só o boletim mais novo pode ser desfeito."
                    onConfirm={() => unbill(m)}>
                    <Button type="button" variant="ghost" size="sm">Desfazer</Button>
                  </ConfirmDialog>
                )}
            </div>
          </div>
        ))}
      </div>

      {editing && <WorkDialog contract={contract} measurement={editing === "new" ? null : editing} onClose={() => setEditing(null)} onDone={onDone} />}
      {approving && <ApproveDialog contract={contract} measurement={approving} onClose={() => setApproving(null)} onDone={onDone} />}
      {billing && <WorkBillDialog contract={contract} measurement={billing} onClose={() => setBilling(null)} onDone={onDone} />}
      {viewing && <WorkReportDialog contractId={contract.id} measurement={viewing} onClose={() => setViewing(null)} />}
      {releasing && s.depositRecord && <ReleaseDepositDialog contract={contract} current={s.depositRecord.dueDate} onClose={() => setReleasing(false)} onDone={onDone} />}
    </section>
  );
}

interface Suggestion {
  periodStart: string; periodEnd: string; rdoDate: string | null; hasOrder: boolean;
  fronts: Array<{ id: number; title: string; rule: string; value: number; step: number | null; prevPercent: number; rdoPercent: number | null; percent: number }>;
}

/** Novo boletim ou edição: período e % acumulado de cada frente (sugerido pelo último RDO fechado). */
function WorkDialog({ contract, measurement, onClose, onDone }: { contract: Contract; measurement: WorkMeasurement | null; onClose: () => void; onDone: Done }) {
  const [periodEnd, setPeriodEnd] = useState<string>(measurement?.periodEnd ?? todayIso());
  const { data: sug, isLoading } = useQuery({
    queryKey: ["workSuggestion", contract.id, measurement ? measurement.id : periodEnd],
    queryFn: () => commercialApi.get<Suggestion>(`contracts/${contract.id}/works/suggestion`, { periodEnd }),
  });
  const [periodStart, setPeriodStart] = useState<string | null>(measurement?.periodStart ?? null);
  const [percents, setPercents] = useState<Record<number, number>>(() => Object.fromEntries((measurement?.lines ?? []).filter((l) => l.kind === "frente" && l.frontId).map((l) => [l.frontId!, l.reportedPercent ?? l.accPercent ?? 0])));
  const [notes, setNotes] = useState(measurement?.notes ?? "");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!sug || measurement) return;
    setPeriodStart((current) => current ?? sug.periodStart);
    setPercents(Object.fromEntries(sug.fronts.map((f) => [f.id, f.percent])));
  }, [sug, measurement]);
  const prevOf = (id: number) => (measurement ? measurement.lines.find((l) => l.frontId === id)?.prevPercent ?? 0 : sug?.fronts.find((f) => f.id === id)?.prevPercent ?? 0);
  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const body = { periodStart, periodEnd, notes, fronts: Object.entries(percents).map(([id, percent]) => ({ id: Number(id), percent })) };
      return measurement ? commercialApi.put<Contract>(`contracts/${contract.id}/works/${measurement.id}`, body) : commercialApi.post<Contract>(`contracts/${contract.id}/works`, body);
    },
    onSuccess: (result) => { onDone(result); toast({ title: measurement ? "Boletim atualizado" : "Boletim criado", description: "Confira o boletim e envie ao cliente para aprovar.", variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const plan = contract.measurementPlan!;
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{measurement ? `Editar o ${measurement.label}` : "Novo boletim de medição"}</DialogTitle>
          <DialogDescription>
            {contract.number} · {contract.customer.name}. Informe o % acumulado de cada frente até o fim do período.
            {sug?.rdoDate ? ` Sugestão tirada do último RDO fechado (${dateBr(sug.rdoDate)}).` : sug && !sug.hasOrder ? " Esta venda não tem ordem de serviço com RDO: informe o avanço à mão." : sug ? " Ainda não há RDO fechado: informe o avanço à mão." : ""}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(event: React.FormEvent) => { event.preventDefault(); setError(""); mutate(); }}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Início do período</Label>
              <CalendarPicker mode="single" name="workStart" className="mt-1 w-full" value={periodStart} fromYear={2024} toYear={2040} onValueChange={(_, value) => setPeriodStart(value)} /></div>
            <div><Label>Fim do período</Label>
              <CalendarPicker mode="single" name="workEnd" className="mt-1 w-full" value={periodEnd} fromYear={2024} toYear={2040} onValueChange={(_, value) => setPeriodEnd(value ?? todayIso())} /></div>
          </div>
          {isLoading && !measurement ? <Skeleton className="h-32 w-full" /> : (
            <div className="rounded border divide-y">
              {plan.fronts.map((f) => {
                const prev = prevOf(f.id);
                const acc = percents[f.id] ?? prev;
                const billedAcc = f.rule === "conclusao" ? (acc >= 100 ? 100 : prev) : acc;
                const rdo = sug?.fronts.find((x) => x.id === f.id)?.rdoPercent;
                return (
                  <div key={f.id} className="px-3 py-2 grid sm:grid-cols-[minmax(0,1fr)_7rem_8rem] items-center gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{f.title}</p>
                      <p className="text-xs text-muted-foreground">{money(f.value)} · já medido {pctBr(prev)}{rdo !== null && rdo !== undefined ? ` · RDO ${pctBr(rdo)}` : ""}{f.rule === "conclusao" ? " · só entra ao concluir" : ""}</p>
                    </div>
                    <NumField kind="number" digits={2} suffix="%" value={acc} ariaLabel={`% acumulado de ${f.title}`} onChange={(value) => setPercents((p) => ({ ...p, [f.id]: Math.min(100, Math.max(0, value)) }))} />
                    <p className="tabular-nums sm:text-right">{money(Math.max(0, Math.round(f.value * (billedAcc - prev)) / 100))}</p>
                  </div>
                );
              })}
            </div>
          )}
          <div><Label htmlFor="workNotes">Observações para o cliente (opcional)</Label>
            <Textarea id="workNotes" className="mt-1" rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">A mobilização (medição inicial) vem inteira no primeiro boletim e a caução entra sozinha, conforme o plano. O relatório do período sai dos RDOs fechados.</p>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : measurement ? "Salvar o boletim" : "Criar o boletim"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ApproveDialog({ contract, measurement, onClose, onDone }: { contract: Contract; measurement: WorkMeasurement; onClose: () => void; onDone: Done }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => commercialApi.post<Contract>(`contracts/${contract.id}/works/${measurement.id}/approve`, { name, note }),
    onSuccess: (result) => { onDone(result); toast({ title: `${measurement.label} aprovado`, description: "Já pode faturar.", variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar a aprovação do {measurement.label}</DialogTitle>
          <DialogDescription>Use quando o cliente aprovou por outro canal (e-mail, WhatsApp, reunião). Fica registrado quem aprovou e quem lançou.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); if (name.trim().length < 2) return setError("Informe quem aprovou pelo cliente"); setError(""); mutate(); }}>
          <div><Label htmlFor="approveName">Quem aprovou pelo cliente <span>*</span></Label>
            <ShadInput id="approveName" className="mt-1" maxLength={160} value={name} autoFocus onChange={(e) => setName(e.target.value)} /></div>
          <div><Label htmlFor="approveNote">Como aprovou (opcional)</Label>
            <ShadInput id="approveNote" className="mt-1" maxLength={500} value={note} placeholder="Ex.: e-mail de 18/11" onChange={(e) => setNote(e.target.value)} /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Registrando..." : "Registrar aprovação"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Faturar o boletim aprovado: a nota sai no valor medido; a conta a receber é
 * a nota menos a caução; retenções de imposto sobre o valor da nota.
 */
export function WorkBillDialog({ contract, measurement, onClose, onDone }: {
  contract: { id: number; number: string; customer: { name: string }; customerOrder?: { number: string | null } | null; retentionRates?: RetentionRates };
  measurement: Pick<WorkMeasurement, "id" | "label" | "lines" | "invoiceValue" | "depositValue" | "value">; onClose: () => void; onDone: Done;
}) {
  const [form, setForm] = useState({ invoiceNumber: "", invoiceIssuedAt: todayIso(), dueDate: plusDays(30), paymentMethod: "boleto" });
  const [retentions, setRetentions] = useState<RetentionState>(() => retentionState(measurement.invoiceValue, contract.retentionRates));
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => commercialApi.post<Contract>(`contracts/${contract.id}/works/${measurement.id}/bill`, { ...form, retentions: retentionList(retentions) }),
    onSuccess: (result) => { onDone(result); toast({ title: `${measurement.label} faturado`, description: "A conta a receber já aparece em Financeiro → Contas a Receber.", variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Faturar o {measurement.label}</DialogTitle>
          <DialogDescription>
            {contract.number} · {contract.customer.name}. Emita a nota fora do sistema no valor medido e registre aqui.
            {contract.customerOrder?.number && <span className="block mt-1">Pedido do cliente para citar na nota: <b className="text-foreground">{contract.customerOrder.number}</b>.</span>}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => {
          event.preventDefault();
          if (!form.invoiceNumber.trim()) return setError("Informe o número da nota fiscal");
          if (retentionSum(retentions) >= measurement.value) return setError("As retenções passam do valor a receber");
          setError(""); mutate();
        }}>
          <WorkLinesTable lines={measurement.lines} invoiceValue={measurement.invoiceValue} depositValue={measurement.depositValue} value={measurement.value} />
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label htmlFor="workNf">Número da nota <span>*</span></Label>
              <ShadInput id="workNf" className="mt-1" value={form.invoiceNumber} maxLength={60} autoFocus onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))} /></div>
            <div><Label>Data da nota <span>*</span></Label>
              <CalendarPicker mode="single" name="workIssued" className="mt-1 w-full" value={form.invoiceIssuedAt} fromYear={2024} toYear={2040} onValueChange={(_, value) => setForm((f) => ({ ...f, invoiceIssuedAt: value ?? "" }))} /></div>
            <div><Label>Vencimento <span>*</span></Label>
              <CalendarPicker mode="single" name="workDue" className="mt-1 w-full" value={form.dueDate} fromYear={2024} toYear={2040} onValueChange={(_, value) => setForm((f) => ({ ...f, dueDate: value ?? "" }))} /></div>
            <div><Label>Forma de pagamento</Label>
              <div className="mt-1"><Select name="workMethod" state={form.paymentMethod} modal options={PAYMENT_METHOD_OPTIONS} onChange={(_, value) => setForm((f) => ({ ...f, paymentMethod: String(value) }))} /></div></div>
          </div>
          <RetentionFields base={measurement.invoiceValue} receivable={measurement.value} state={retentions} onChange={setRetentions} idPrefix="workRet" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Faturando..." : "Registrar e criar a conta a receber"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** O boletim com o relatório do período, para ver, copiar o link ou imprimir/salvar em PDF. */
function WorkReportDialog({ contractId, measurement, onClose }: { contractId: number; measurement: WorkMeasurement; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["workReport", contractId, measurement.id, measurement.status],
    queryFn: () => commercialApi.get<WorkReport>(`contracts/${contractId}/works/${measurement.id}/report`),
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Boletim {measurement.label}</DialogTitle>
          <DialogDescription>O que o cliente vê para aprovar: a medição por frente e o relatório do período tirado dos RDOs fechados.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={!data} onClick={() => data && printWorkReport(data)}><Icon name="printer" className="w-4 h-4 mr-1" /> Imprimir / PDF</Button>
          {data?.publicKey && <Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(publicMeasurementUrl(data.publicKey!)).then(() => toast({ title: "Link copiado", variant: "success" }))}><Icon name="link" className="w-4 h-4 mr-1" /> Copiar o link do cliente</Button>}
        </div>
        {error && <p className="text-destructive text-sm">{errorMessage(error)}</p>}
        {isLoading || !data ? <Skeleton className="h-96 w-full" /> : <div className="rounded border p-4 bg-white text-black"><WorkReportPaper report={data} /></div>}
      </DialogContent>
    </Dialog>
  );
}

function ReleaseDepositDialog({ contract, current, onClose, onDone }: { contract: Contract; current: string | null; onClose: () => void; onDone: Done }) {
  const [dueDate, setDueDate] = useState<string>(todayIso());
  const { mutate, isPending } = useMutation({
    mutationFn: () => commercialApi.put<Contract>(`contracts/${contract.id}/deposit`, { dueDate }),
    onSuccess: (result) => { onDone(result); toast({ title: "Caução liberada", description: "O vencimento da conta da caução foi atualizado.", variant: "success" }); onClose(); },
    onError: (err) => toast({ title: "Não foi possível liberar", description: errorMessage(err), variant: "destructive" }),
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Liberar a caução</DialogTitle>
          <DialogDescription>A obra terminou (ou chegou a data combinada): escolha quando o cliente paga a caução retida. Hoje vence em {dateBr(current)}.</DialogDescription>
        </DialogHeader>
        <div><Label>Novo vencimento</Label>
          <CalendarPicker mode="single" name="depositDue" className="mt-1 w-full" value={dueDate} fromYear={2024} toYear={2040} onValueChange={(_, value) => setDueDate(value ?? todayIso())} /></div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" disabled={isPending} onClick={() => mutate()}>Liberar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Venda de serviço em parcelas, sem nada faturado: passar para medição de obra. */
export function SwitchToMeasurementDialog({ contract, steps, onClose, onDone }: { contract: Contract; steps: Array<{ title: string; duration: number }>; onClose: () => void; onDone: Done }) {
  const [plan, setPlan] = useState<MeasurementPlanDraft>(() => defaultPlan(steps));
  const { mutate, isPending } = useMutation({
    mutationFn: () => commercialApi.put<Contract>(`contracts/${contract.id}/measurement-plan`, { plan }),
    onSuccess: (result) => { onDone(result); toast({ title: "Venda passou a ser faturada por medição", description: "As parcelas sem nota foram trocadas pelo plano de medição.", variant: "success" }); onClose(); },
    onError: (err) => toast({ title: "Não foi possível mudar", description: errorMessage(err), variant: "destructive" }),
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Faturar {contract.number} por medição de obra</DialogTitle>
          <DialogDescription>As parcelas sem nota saem e a venda passa a ser faturada por boletim de medição. Dá para fazer enquanto nada foi faturado.</DialogDescription>
        </DialogHeader>
        <MeasurementPlanEditor plan={plan} onChange={setPlan} steps={steps} values={planValues(plan, contract.value)} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" disabled={isPending} onClick={() => mutate()}>{isPending ? "Salvando..." : "Passar para medição"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
