import { EntityBadge, useEntities } from "@/components/general-components/EntitySelect";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import useVerify from "@/hooks/use-verify";
import Icon from "@/components/general-components/Icon";
import ListCard from "@/components/general-components/ListCard";
import StatusBadge from "@/components/general-components/StatusBadge";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import { FormPageHeader } from "@/components/general-components/FormPage";
import { Button } from "@/components/ui/button";
import { errorMessage, money } from "../../comercial/-shared/commercial";
import { dateBr, formatDoc, PendingTraining, STATUS_INFO, usePendingTraining } from "./-shared/fiscal";

export const Route = createFileRoute("/_authenticated/financeiro/_notas/notas_/a-emitir")({
  component: PendingPage,
});

/**
 * Notas a emitir do treinamento: inscrições pagas de turma aberta que ainda não
 * têm nota. Uma pessoa física por nota, ou várias inscrições da mesma empresa
 * numa nota só. Vaga paga por contrato tem a nota pelo contrato.
 */
function PendingPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = usePendingTraining(can("view_nfse"));
  const [selected, setSelected] = useState<number[]>([]);
  const { multi } = useEntities();
  const rows = data ?? [];
  const chosen = rows.filter((r) => selected.includes(r.subscriptionId));
  // regra da nota: uma pessoa física, ou todas da mesma empresa
  const problem = useMemo(() => {
    if (!chosen.length) return "Marque as inscrições da nota";
    if (chosen.some((r) => r.invoice)) return "Uma das marcadas já tem nota em andamento";
    if (chosen.length > 1) {
      // cada CNPJ do grupo emite a sua nota
      if (new Set(chosen.map((r) => r.entityId ?? 0)).size > 1) return "As marcadas são de turmas de CNPJs diferentes: uma nota por CNPJ";
      const companies = new Set(chosen.map((r) => r.customer?.id ?? 0));
      if (companies.size > 1 || companies.has(0)) return "Várias inscrições numa nota só quando são da mesma empresa";
    }
    return null;
  }, [chosen]);
  if (!can("view_nfse")) return null;
  const emit = (ids: number[]) => navigate({ to: "/financeiro/notas/nova", search: { origem: "subscriptions", inscricoes: ids.join(",") } as never });

  const columns: DataColumn<PendingTraining>[] = [
    {
      id: "name", header: "Aluno", className: "min-w-[220px]",
      cell: (r) => <div className="min-w-0"><p className="font-medium truncate">{r.name}</p><p className="text-xs text-muted-foreground">{formatDoc(r.cpf)}</p></div>,
    },
    { id: "class", header: "Turma", className: "min-w-[200px]", cell: (r) => <p className="text-xs truncate max-w-[18rem]">{r.courseName}{r.className ? ` · ${r.className}` : ""}</p> },
    ...(multi ? [{ id: "entity", header: "Emitente", cell: (r: PendingTraining) => <EntityBadge id={r.entityId} /> }] : []),
    { id: "customer", header: "Empresa", cell: (r) => <span className="text-xs">{r.customer?.name ?? <span className="text-muted-foreground">pessoa física</span>}</span> },
    { id: "paid", header: "Pago em", cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{dateBr(r.paidAt)}</span> },
    { id: "value", header: "Valor", align: "right", cell: (r) => <span className="tabular-nums">{money(r.value)}</span> },
    {
      id: "invoice", header: "Nota",
      cell: (r) => (r.invoice
        ? <button type="button" className="underline text-xs" onClick={() => navigate({ to: "/financeiro/notas/$invoiceId", params: { invoiceId: String(r.invoice!.id) } })}>
            <StatusBadge tone={STATUS_INFO[r.invoice.status].tone} pulse={false}>{STATUS_INFO[r.invoice.status].label}</StatusBadge></button>
        : <span className="text-xs text-muted-foreground">sem nota</span>),
    },
  ];

  return (
    <>
      <FormPageHeader backTo="/financeiro/notas" backLabel="Notas fiscais" title="Notas a emitir"
        description="Inscrições pagas em turma aberta que ainda não têm nota fiscal." />
      <ListCard>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
          <p className="text-sm text-muted-foreground">{selected.length ? `${selected.length} marcada(s) · ${money(chosen.reduce((s, r) => s + r.value, 0))}` : "Marque uma pessoa física ou várias inscrições da mesma empresa."}</p>
          {can("emitir_nfse") && (
            <Button type="button" disabled={!!problem} onClick={() => emit(selected)} title={problem ?? undefined}>
              <Icon name="file-badge" className="w-4 h-4" /> Emitir nota {selected.length > 1 ? `(${selected.length})` : ""}
            </Button>
          )}
        </div>
        {selected.length > 0 && problem && <p className="text-xs text-amber-700">{problem}</p>}
        <DataTable rows={rows} columns={columns} getRowId={(r) => r.subscriptionId} ariaLabel="Inscrições pagas sem nota" minWidth={820}
          loading={isLoading} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
          selection={{
            isSelected: (r) => selected.includes(r.subscriptionId),
            toggle: (r, on) => setSelected((cur) => (on ? [...cur, r.subscriptionId] : cur.filter((id) => id !== r.subscriptionId))),
            pageState: selected.length === 0 ? false : selected.length === rows.length ? true : "indeterminate",
            togglePage: (on) => setSelected(on ? rows.filter((r) => !r.invoice).map((r) => r.subscriptionId) : []),
          }}
          actions={can("emitir_nfse") ? (r) => (r.invoice ? null : <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => emit([r.subscriptionId])}>Emitir</Button>) : undefined}
          empty={<EmptyState icon="circle-check" title="Nenhuma inscrição paga sem nota." description="Quando um aluno pagar a inscrição de uma turma aberta, ela aparece aqui." />} />
      </ListCard>
    </>
  );
}
