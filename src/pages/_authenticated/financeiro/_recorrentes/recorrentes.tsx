import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { get } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import Icon from "@/components/general-components/Icon";
import StatusBadge from "@/components/general-components/StatusBadge";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import StatusChips from "@/components/general-components/StatusChips";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/general-interfaces/api.interface";
import { cn } from "@/lib/utils";
import { EntityBadge } from "@/components/general-components/EntitySelect";
import { FINANCIAL_ABILITY, formatMoney } from "../-shared/financial";
import { PAYABLES_KEY } from "../-shared/payables";
import { formatDate, paymentMethodLabel } from "../_receber/-components/options";
import RecurrenceRowActions from "./-components/RecurrenceRowActions";
import { Kind, RECURRENCES_KEY as KEY, Recurrence } from "./-components/RecurrenceForm";

export const Route = createFileRoute("/_authenticated/financeiro/_recorrentes/recorrentes")({
  component: Recurrences,
  validateSearch: (search: Record<string, unknown>): { tipo?: string } => (search.tipo === "receivable" ? { tipo: "receivable" } : {}),
});

const KINDS: Array<{ value: Kind; label: string }> = [{ value: "payable", label: "A pagar" }, { value: "receivable", label: "A receber" }];
const muted = "text-xs text-muted-foreground";
const COLUMNS: DataColumn<Recurrence>[] = [
  {
    id: "description", header: "Descrição", className: "min-w-[240px]",
    cell: (item) => (
      <div className="min-w-0 max-w-[22rem]">
        <p className="font-semibold truncate">{item.description}{item.entity && <EntityBadge entity={item.entity} className="ml-1.5" />}</p>
        <p className={`${muted} truncate`}>
          {[item.supplier?.name ?? item.customer?.name, item.chartAccount && `${item.chartAccount.code} ${item.chartAccount.name}`, item.costCenter?.name].filter(Boolean).join(" · ") || "Sem classificação"}
        </p>
      </div>
    ),
  },
  {
    id: "value", header: "Valor por mês",
    cell: (item) => (
      <div className="tabular-nums whitespace-nowrap">
        <p className="font-medium">{formatMoney(item.value)}</p>
        <p className={muted}>{item.paymentMethod ? paymentMethodLabel(item.paymentMethod) : "Forma a definir"}</p>
      </div>
    ),
  },
  {
    id: "day", header: "Todo dia",
    cell: (item) => (
      <div className="whitespace-nowrap">
        <p>Dia {item.dayOfMonth}</p>
        <p className={muted}>desde {formatDate(item.startDate)}{item.endDate ? ` até ${formatDate(item.endDate)}` : ""}</p>
      </div>
    ),
  },
  {
    id: "next", header: "Próximo vencimento",
    cell: (item) => (item.inactiveAt
      ? <StatusBadge tone="neutral" pulse={false}>Encerrado</StatusBadge>
      : (
        <div className="whitespace-nowrap">
          <p>{item.nextDue ? formatDate(item.nextDue) : "—"}</p>
          <p className={muted}>{item.upcoming} lançado(s) à frente · {formatMoney(item.yearTotal)}</p>
        </div>
      )),
  },
];

function Recurrences() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [kind, setKindState] = useState<Kind>(search.tipo === "receivable" ? "receivable" : "payable");
  // o tipo fica no endereço: ao voltar de um cadastro, a lista abre no mesmo tipo
  const setKind = (next: Kind) => {
    setKindState(next);
    navigate({ to: "/financeiro/recorrentes", search: next === "receivable" ? { tipo: "receivable" } : {}, replace: true });
  };
  const [showEnded, setShowEnded] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<Recurrence[] | undefined>({ queryKey: [KEY, kind], queryFn: () => get("financial", "recurrences", [{ key: "kind", value: kind }]) });
  const { mutate: end } = useMutation({
    mutationFn: async (id: number) => (await api.patch(`financial/recurrences/${id}/end`, {})).data,
    onSuccess: (result) => {
      toast({ title: "Recorrente encerrado", description: `${result.removed} lançamento(s) futuro(s) em aberto removido(s).`, variant: "success" });
      for (const k of [KEY, PAYABLES_KEY, "listContas a Receber", "financialReports"]) queryClient.invalidateQueries({ queryKey: [k] });
    },
    onError: (err: ApiError) => toast({ title: "Não foi possível encerrar", description: err.response?.data?.message, variant: "destructive" }),
  });
  if (!can(`view_${FINANCIAL_ABILITY}`)) return null;
  const active = (data ?? []).filter((r) => !r.inactiveAt);
  const ended = (data ?? []).filter((r) => r.inactiveAt);
  const monthly = active.reduce((sum, r) => sum + Number(r.value), 0);
  const listPath = kind === "payable" ? "/financeiro/pagar" : "/financeiro/receber";

  const openMonths = (item: Recurrence) => navigate({ to: listPath, search: { view: "todas", recurrenceId: String(item.id), order: "dueDate:asc" } as never });
  const openNew = () => navigate({ to: "/financeiro/recorrentes/nova", search: kind === "receivable" ? { tipo: "receivable" } : {} });
  const edit = (item: Recurrence) => navigate({ to: "/financeiro/recorrentes/$recurrenceId", params: { recurrenceId: String(item.id) } });

  return (
    <>
      <PageHeader title="Recorrentes" description="Despesas fixas (aluguel, internet, contador) e mensalidades. Os próximos 12 meses ficam lançados e entram no fluxo de caixa." />

      <ListCard>
        <StatusChips ariaLabel="Tipo" value={kind} onChange={setKind} options={KINDS} />
        <ListToolbar>
          {can(`create_${FINANCIAL_ABILITY}`) && <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Novo recorrente</span></Button>}
        </ListToolbar>
        <p className="text-sm -mt-1">
          <span className="text-muted-foreground">{active.length} ativo(s) · por mês </span>
          <span className={cn("font-bold tabular-nums", kind === "payable" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>{formatMoney(monthly)}</span>
        </p>
        <DataTable rows={data ? [...active, ...(showEnded ? ended : [])] : undefined} columns={COLUMNS} getRowId={(item) => item.id} ariaLabel="Recorrentes" minWidth={820}
          loading={isLoading} onRowClick={openMonths}
          rowClassName={(item) => (item.inactiveAt ? "opacity-60" : undefined)}
          actions={(item) => (
            <RecurrenceRowActions description={item.description} ended={!!item.inactiveAt} canUpdate={can(`update_${FINANCIAL_ABILITY}`)} canEnd={can(`inactive_${FINANCIAL_ABILITY}`)}
              onOpenMonths={() => openMonths(item)} onEdit={() => edit(item)} onEnd={() => end(item.id)} />
          )}
          empty={<EmptyState title={`Nenhum recorrente ${kind === "payable" ? "a pagar" : "a receber"} ativo.`} />} />
        {ended.length > 0 && (
          <Button variant="link" size="sm" className="px-0 w-fit" onClick={() => setShowEnded((v) => !v)}>{showEnded ? "Esconder encerrados" : `Mostrar ${ended.length} encerrado(s)`}</Button>
        )}
      </ListCard>
    </>
  );
}
