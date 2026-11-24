import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import Select from "@/components/general-components/Select";
import Icon from "@/components/general-components/Icon";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FINANCIAL_ABILITY } from "../-shared/financial";
import { errorMessage, money } from "../../comercial/-shared/commercial";
import { RETENTION_TAXES } from "../../comercial/-shared/retentions";
import RetentionDialog from "../-shared/RetentionDialog";

export const Route = createFileRoute("/_authenticated/financeiro/_retencoes/retencoes")({
  component: RetentionsPage,
});

type Tax = (typeof RETENTION_TAXES)[number]["id"];
interface MonthRow {
  month: string; totals: Record<Tax, number>; total: number; count: number; pending: number; declared: boolean;
  guides: Array<{ id: number; taxKind: string; label: string; description: string; value: number; status: string; dueDate: string; paidAt: string | null }>;
}
interface Alert {
  type: "pagou_cheio" | "recebido_menor" | "retencao_nao_informada" | "retido_e_pago"; severity: "alta" | "media"; message: string;
  financialRecordId?: number; invoiceNumber?: string | null; customer?: string | null; value?: number; month?: string; payableId?: number; guide?: string; taxes?: Tax[]; retained?: number;
}
interface Report {
  from: string; to: string; months: MonthRow[]; totals: Record<Tax, number>; total: number; alerts: Alert[];
  rows: Array<{ id: number; tax: Tax; label: string; rate: number | null; base: number; value: number; accrualDate: string; invoiceNumber: string | null; declaredAt: string | null; contractId: number | null; financialRecordId: number; customer: { id: number; name: string } | null; description: string | null; recordStatus: string }>;
}

const KEY = "financialRetentions";
const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const monthLabel = (month: string) => { const [y, m] = month.split("-"); return `${MONTH_NAMES[Number(m) - 1]}/${y}`; };
const currentMonth = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 7);
const shift = (month: string, delta: number) => { const [y, m] = month.split("-").map(Number); return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7); };
const ALERT_TITLE: Record<Alert["type"], string> = {
  pagou_cheio: "Reteve e pagou cheio",
  recebido_menor: "Recebido menor que o líquido",
  retencao_nao_informada: "Retenção não informada?",
  retido_e_pago: "Guia de imposto já retido",
};

/**
 * Impostos retidos pelos clientes (plano 08, fase 9): por mês da nota, o que os
 * clientes já recolheram e por isso não pode ser pago de novo na guia (DAS,
 * ISS), com os alertas de pagamento em dobro.
 */
function RetentionsPage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [to, setTo] = useState(currentMonth());
  const [from, setFrom] = useState(shift(currentMonth(), -5));
  const [editing, setEditing] = useState<{ id: number; label: string } | null>(null);
  const monthOptions = useMemo(() => Array.from({ length: 36 }, (_, i) => shift(currentMonth(), -i)).map((m) => ({ id: m, name: monthLabel(m) })), []);

  const { data, isLoading, error } = useQuery({
    queryKey: [KEY, from, to],
    queryFn: async () => (await api.get<Report>("financial/retentions", { params: { from, to } })).data,
    placeholderData: (previous) => previous,
  });
  const { mutate: declare } = useMutation({
    mutationFn: async ({ month, undo }: { month: string; undo?: boolean }) => (await api.post<{ updated: number }>("financial/retentions/declare", { month, undo })).data,
    onSuccess: (result, { undo }) => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast({ title: undo ? "Marcação desfeita" : "Retenções marcadas como informadas na guia", description: `${result.updated} retenção(ões).`, variant: "success" });
    },
    onError: (err) => toast({ title: "Não foi possível marcar", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`view_${FINANCIAL_ABILITY}`)) return null;
  const canUpdate = can(`update_${FINANCIAL_ABILITY}`);
  const months = [...(data?.months ?? [])].reverse();
  const usedTaxes = RETENTION_TAXES.filter((t) => (data?.totals[t.id] ?? 0) > 0);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Impostos retidos</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">O que os clientes descontaram das notas e recolheram eles mesmos. Na guia do mês (DAS, ISS), esse valor entra como <b>retido</b>: não pode ser pago de novo.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-32"><Label className="text-xs">De</Label><Select name="from" state={from} options={monthOptions} onChange={(_, value) => setFrom(String(value))} /></div>
          <div className="w-32"><Label className="text-xs">Até</Label><Select name="to" state={to} options={monthOptions} onChange={(_, value) => setTo(String(value))} /></div>
        </div>
      </div>

      {error && <p className="mt-4 text-destructive">{errorMessage(error)}</p>}
      {isLoading && <div className="grid gap-3 mt-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-64 w-full" /></div>}

      {data && (
        <>
          {data.alerts.length > 0 && (
            <section className="mt-4 grid gap-2" aria-label="Alertas de pagamento em dobro">
              {data.alerts.map((alert, index) => (
                <div key={index} className={cn("rounded-lg border px-3 py-2 text-sm flex flex-col sm:flex-row sm:items-start gap-2",
                  alert.severity === "alta" ? "border-red-300 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100" : "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100")}>
                  <Icon name="triangle-alert" className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{ALERT_TITLE[alert.type]}{alert.invoiceNumber ? ` · NF ${alert.invoiceNumber}` : ""}{alert.customer ? ` · ${alert.customer}` : ""}</p>
                    <p>{alert.message}</p>
                  </div>
                  {alert.financialRecordId && canUpdate && (
                    <Button type="button" size="sm" variant="outline" className="shrink-0 bg-background" onClick={() => setEditing({ id: alert.financialRecordId!, label: alert.invoiceNumber ? `NF ${alert.invoiceNumber}` : `conta ${alert.financialRecordId}` })}>
                      Revisar retenções
                    </Button>
                  )}
                  {alert.type === "retido_e_pago" && alert.month && canUpdate && (
                    <Button type="button" size="sm" variant="outline" className="shrink-0 bg-background" onClick={() => declare({ month: alert.month! })}>Guia já descontou o retido</Button>
                  )}
                </div>
              ))}
            </section>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 my-4">
            <div className="rounded-lg border px-3 py-2"><p className="text-xs text-muted-foreground">Total retido</p><p className="text-lg font-semibold tabular-nums">{money(data.total)}</p></div>
            {RETENTION_TAXES.map((tax) => (
              <div key={tax.id} className="rounded-lg border px-3 py-2"><p className="text-xs text-muted-foreground">{tax.name}</p><p className="text-lg font-semibold tabular-nums">{money(data.totals[tax.id])}</p></div>
            ))}
          </div>

          <section className="rounded-card border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Mês da nota</th>
                  {(usedTaxes.length ? usedTaxes : RETENTION_TAXES.slice(0, 2)).map((t) => <th key={t.id} className="text-right font-medium px-3 py-2">{t.name}</th>)}
                  <th className="text-right font-medium px-3 py-2">Total</th>
                  <th className="text-left font-medium px-3 py-2">Guias do mês</th>
                  <th className="text-left font-medium px-3 py-2">Na guia</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {months.map((m) => (
                  <tr key={m.month} className={m.count === 0 ? "text-muted-foreground" : ""}>
                    <td className="px-3 py-2 font-medium">{monthLabel(m.month)}</td>
                    {(usedTaxes.length ? usedTaxes : RETENTION_TAXES.slice(0, 2)).map((t) => <td key={t.id} className="px-3 py-2 text-right tabular-nums">{m.totals[t.id] ? money(m.totals[t.id]) : "—"}</td>)}
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{m.total ? money(m.total) : "—"}</td>
                    <td className="px-3 py-2 text-xs">{m.guides.length ? m.guides.map((g) => `${g.label} ${money(g.value)}${g.status === "paga" ? " (paga)" : ""}`).join(" · ") : <span className="text-muted-foreground">nenhuma marcada</span>}</td>
                    <td className="px-3 py-2">
                      {m.count === 0 ? null : m.declared ? (
                        <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 text-xs font-medium"><Icon name="check" className="w-3 h-3" /> Informado
                          {canUpdate && <ConfirmDialog title={`Desfazer a marcação de ${monthLabel(m.month)}?`} description="As retenções do mês voltam a aparecer como pendentes de informar na guia." onConfirm={() => declare({ month: m.month, undo: true })}>
                            <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-xs">desfazer</Button>
                          </ConfirmDialog>}
                        </span>
                      ) : canUpdate ? (
                        <ConfirmDialog title={`Retenções de ${monthLabel(m.month)} informadas na guia?`} description="Confirme que a guia do mês (DAS/ISS) foi apurada com estes valores como retidos, ou seja, sem pagar de novo o que o cliente recolheu."
                          onConfirm={() => declare({ month: m.month })}>
                          <Button type="button" variant="outline" size="sm" className="h-7 text-xs">Marcar como informado</Button>
                        </ConfirmDialog>
                      ) : <span className="text-xs text-amber-700">{m.pending} pendente(s)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mt-4 rounded-lg border">
            <div className="px-3 py-2 border-b">
              <h2 className="font-semibold">Retenções por nota</h2>
              <p className="text-xs text-muted-foreground">Informe ou corrija as retenções em <Link to="/financeiro/receber" className="underline">Contas a Receber</Link> (menu da conta → Impostos retidos) ou ao registrar a nota no <Link to="/financeiro/faturar" className="underline">A Faturar</Link>.</p>
            </div>
            {data.rows.length === 0 && <p className="px-3 py-6 text-sm text-muted-foreground text-center">Nenhum imposto retido no período.</p>}
            <div className="divide-y">
              {[...data.rows].reverse().map((row) => (
                <div key={row.id} className="px-3 py-2 grid sm:grid-cols-[7rem_minmax(0,1fr)_6rem_8rem_auto] items-center gap-x-3 gap-y-1 text-sm">
                  <span className="text-muted-foreground">{monthLabel(row.accrualDate)}</span>
                  <span className="min-w-0 truncate"><b>NF {row.invoiceNumber ?? "—"}</b> · {row.customer?.name ?? "sem cliente"} <span className="text-xs text-muted-foreground">{row.description}</span></span>
                  <span className="font-medium">{row.label}{row.rate !== null ? ` ${String(row.rate).replace(".", ",")}%` : ""}</span>
                  <span className="tabular-nums sm:text-right font-semibold">{money(row.value)}</span>
                  {canUpdate
                    ? <Button type="button" variant="ghost" size="sm" className="h-7 justify-self-start sm:justify-self-end" onClick={() => setEditing({ id: row.financialRecordId, label: row.invoiceNumber ? `NF ${row.invoiceNumber}` : `conta ${row.financialRecordId}` })}>Editar</Button>
                    : <span />}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {editing && <RetentionDialog recordId={editing.id} label={editing.label} onClose={() => setEditing(null)} />}
    </>
  );
}
