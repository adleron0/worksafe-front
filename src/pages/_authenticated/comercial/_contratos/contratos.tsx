import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import StatusChips from "@/components/general-components/StatusChips";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import { cn } from "@/lib/utils";
import { COMMERCIAL_ABILITY, commercialApi, dateBr, errorMessage, money } from "../-shared/commercial";
import { CONTRACTS_KEY, ContractRow, ContractStatus, ContractStatusBadge } from "../-shared/contracts";
import { KIND_LABEL } from "../-shared/proposals";

export const Route = createFileRoute("/_authenticated/comercial/_contratos/contratos")({
  component: ContractsPage,
});

interface ListResponse { rows: ContractRow[]; total: number; summary: Partial<Record<ContractStatus, { count: number; total: number }>> }
type Filter = "todos" | ContractStatus;
const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "todos", label: "Todos" }, { value: "vigente", label: "Vigentes" }, { value: "concluido", label: "Concluídos" }, { value: "cancelado", label: "Cancelados" },
];
const LIMITS = [10, 20, 50, 100];

const columns: DataColumn<ContractRow>[] = [
  {
    id: "number", header: "Número", className: "w-40",
    cell: (row) => (
      <div>
        <p className="font-semibold tabular-nums">{row.number}</p>
        <p className="text-xs text-muted-foreground whitespace-nowrap">{KIND_LABEL[row.kind]} · {dateBr(row.acceptedAt)}</p>
      </div>
    ),
  },
  {
    id: "customer", header: "Cliente e título",
    cell: (row) => (
      <div className="min-w-0 max-w-[26rem]">
        <p className="font-medium truncate">{row.customer.name}</p>
        <p className="text-xs text-muted-foreground truncate">{row.title}</p>
      </div>
    ),
  },
  { id: "status", header: "Situação", className: "w-28", cell: (row) => <ContractStatusBadge status={row.status} /> },
  { id: "value", header: "Valor", align: "right", className: "w-32 font-semibold tabular-nums", cell: (row) => money(row.value) },
  { id: "billed", header: "Faturado", align: "right", className: "w-32 tabular-nums", cell: (row) => money(row.billed) },
  { id: "received", header: "Recebido", align: "right", className: "w-32 tabular-nums", cell: (row) => money(row.received) },
  {
    id: "toBill", header: "A faturar", align: "right", className: "w-32 tabular-nums",
    cell: (row) => <span className={cn(row.toBill > 0.005 && row.status === "vigente" && "text-amber-700 dark:text-amber-300 font-medium")}>{money(row.toBill)}</span>,
  },
];

function ContractsPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"" | ContractStatus>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const params = { page, limit, ...(status ? { status } : {}), ...(search.trim() ? { search: search.trim() } : {}) };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [CONTRACTS_KEY, params],
    queryFn: () => commercialApi.get<ListResponse>("contracts", params),
    placeholderData: (previous) => previous,
  });
  if (!can(`view_${COMMERCIAL_ABILITY}`)) return null;
  const open = (id: number) => navigate({ to: "/comercial/contratos/$contractId", params: { contractId: String(id) } });
  const summary = data?.summary ?? {};
  const all = Object.values(summary).reduce((sum, entry) => sum + (entry?.count ?? 0), 0);

  return (
    <>
      <PageHeader title="Contratos" description="Propostas aceitas. Daqui saem as contas a receber: cada parcela vira um título quando a nota fiscal dela é registrada." />

      <ListCard>
        <StatusChips<Filter> value={status || "todos"} onChange={(value) => { setStatus(value === "todos" ? "" : value); setPage(0); }}
          options={FILTERS.map((filter) => ({ value: filter.value, label: filter.label, count: filter.value === "todos" ? all : summary[filter.value]?.count ?? 0 }))} />
        <ListToolbar search={{ value: search, onChange: (text) => { setSearch(text); setPage(0); }, placeholder: "Buscar por número, título ou cliente..." }}>
          {summary.vigente && <p className="text-sm text-muted-foreground">Vigentes: <b className="text-foreground tabular-nums">{money(summary.vigente.total)}</b></p>}
        </ListToolbar>
        <DataTable rows={data?.rows} columns={columns} getRowId={(row) => row.id} ariaLabel="Contratos" minWidth={960}
          loading={isLoading || isFetching} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
          onRowClick={(row) => open(row.id)}
          empty={search || status
            ? <EmptyState icon="search-x" title="Nenhum contrato com esses filtros." />
            : <EmptyState title="Nenhum contrato ainda." description="Um contrato nasce quando uma proposta é aceita." />} />
        <ListFooter total={data?.total ?? 0} page={page} limit={limit} limits={LIMITS}
          onPageChange={setPage} onLimitChange={(next) => { setLimit(next); setPage(0); }} />
      </ListCard>
    </>
  );
}
