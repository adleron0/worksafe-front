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
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
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
type RetentionRow = Report["rows"][number];
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
  const editRow = (row: RetentionRow) => setEditing({ id: row.financialRecordId, label: row.invoiceNumber ? `NF ${row.invoiceNumber}` : `conta ${row.financialRecordId}` });
  const monthColumns: DataColumn<MonthRow>[] = [
    { id: "month", header: "Mês da nota", cell: (m) => <span className="font-medium whitespace-nowrap">{monthLabel(m.month)}</span> },
    ...(usedTaxes.length ? usedTaxes : RETENTION_TAXES.slice(0, 2)).map((t): DataColumn<MonthRow> => ({
      id: t.id, header: t.name, align: "right", cell: (m) => <span className="tabular-nums whitespace-nowrap">{m.totals[t.id] ? money(m.totals[t.id]) : "—"}</span>,
    })),
    { id: "total", header: "Total", align: "right", cell: (m) => <span className="tabular-nums font-semibold whitespace-nowrap">{m.total ? money(m.total) : "—"}</span> },
    {
      id: "guides", header: "Guias do mês",
      cell: (m) => <p className="text-xs truncate max-w-[18rem]">{m.guides.length ? m.guides.map((g) => `${g.label} ${money(g.value)}${g.status === "paga" ? " (paga)" : ""}`).join(" · ") : <span className="text-muted-foreground">nenhuma marcada</span>}</p>,
    },
    {
      id: "declared", header: "Na guia",
      cell: (m) => (m.count === 0 ? null : m.declared ? (
        <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 text-xs font-medium whitespace-nowrap"><Icon name="check" className="w-3 h-3" /> Informado
          {canUpdate && <ConfirmDialog title={`Desfazer a marcação de ${monthLabel(m.month)}?`} description="As retenções do mês voltam a aparecer como pendentes de informar na guia." onConfirm={() => declare({ month: m.month, undo: true })}>
            <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-xs">desfazer</Button>
          </ConfirmDialog>}
        </span>
      ) : canUpdate ? (
        <ConfirmDialog title={`Retenções de ${monthLabel(m.month)} informadas na guia?`} description="Confirme que a guia do mês (DAS/ISS) foi apurada com estes valores como retidos, ou seja, sem pagar de novo o que o cliente recolheu."
          onConfirm={() => declare({ month: m.month })}>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs">Marcar como informado</Button>
        </ConfirmDialog>
      ) : <span className="text-xs text-amber-700 whitespace-nowrap">{m.pending} pendente(s)</span>),
    },
  ];
  const rowColumns: DataColumn<RetentionRow>[] = [
    { id: "month", header: "Mês", cell: (row) => <span className="text-muted-foreground whitespace-nowrap">{monthLabel(row.accrualDate)}</span> },
    {
      id: "invoice", header: "Nota e cliente", className: "min-w-[240px]",
      cell: (row) => (
        <div className="min-w-0 max-w-[24rem]">
          <p className="truncate"><b>NF {row.invoiceNumber ?? "—"}</b> · {row.customer?.name ?? "sem cliente"}</p>
          {row.description && <p className="text-xs text-muted-foreground truncate">{row.description}</p>}
        </div>
      ),
    },
    { id: "tax", header: "Imposto", cell: (row) => <span className="font-medium whitespace-nowrap">{row.label}{row.rate !== null ? ` ${String(row.rate).replace(".", ",")}%` : ""}</span> },
    { id: "value", header: "Valor", align: "right", cell: (row) => <span className="tabular-nums font-semibold whitespace-nowrap">{money(row.value)}</span> },
  ];

  return (
    <>
      <PageHeader title="Impostos retidos"
        description={<span className="block max-w-3xl">O que os clientes descontaram das notas e recolheram eles mesmos. Na guia do mês (DAS, ISS), esse valor entra como <b>retido</b>: não pode ser pago de novo.</span>}
        actions={(
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-32"><Label className="text-xs">De</Label><Select name="from" state={from} options={monthOptions} onChange={(_, value) => setFrom(String(value))} /></div>
            <div className="w-32"><Label className="text-xs">Até</Label><Select name="to" state={to} options={monthOptions} onChange={(_, value) => setTo(String(value))} /></div>
          </div>
        )} />

      {error && <p className="text-destructive">{errorMessage(error)}</p>}
      {isLoading && <div className="grid gap-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-64 w-full" /></div>}

      {data && (
        <>
          {data.alerts.length > 0 && (
            <section className="mb-4 grid gap-2" aria-label="Alertas de pagamento em dobro">
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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 mb-4">
            <div className="rounded-lg border px-3 py-2"><p className="text-xs text-muted-foreground">Total retido</p><p className="text-lg font-semibold tabular-nums">{money(data.total)}</p></div>
            {RETENTION_TAXES.map((tax) => (
              <div key={tax.id} className="rounded-lg border px-3 py-2"><p className="text-xs text-muted-foreground">{tax.name}</p><p className="text-lg font-semibold tabular-nums">{money(data.totals[tax.id])}</p></div>
            ))}
          </div>

          <ListCard>
            <DataTable rows={months} columns={monthColumns} getRowId={(m) => m.month} ariaLabel="Retenções por mês" minWidth={760}
              rowClassName={(m) => (m.count === 0 ? "text-muted-foreground" : undefined)}
              empty={<EmptyState title="Nenhum mês no período." />} />
          </ListCard>

          <ListCard className="mt-4">
            <div>
              <h2 className="font-semibold">Retenções por nota</h2>
              <p className="text-xs text-muted-foreground">Informe ou corrija as retenções em <Link to="/financeiro/receber" className="underline">Contas a Receber</Link> (menu da conta → Impostos retidos) ou ao registrar a nota no <Link to="/financeiro/faturar" className="underline">A Faturar</Link>.</p>
            </div>
            <DataTable rows={[...data.rows].reverse()} columns={rowColumns} getRowId={(row) => row.id} ariaLabel="Retenções por nota" minWidth={640}
              actions={canUpdate ? (row) => <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => editRow(row)}>Editar</Button> : undefined}
              empty={<EmptyState title="Nenhum imposto retido no período." />} />
          </ListCard>
        </>
      )}

      {editing && <RetentionDialog recordId={editing.id} label={editing.label} onClose={() => setEditing(null)} />}
    </>
  );
}
