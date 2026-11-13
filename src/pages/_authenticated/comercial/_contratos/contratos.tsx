import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Skeleton } from "@/components/ui/skeleton";
import Input from "@/components/general-components/Input";
import Pagination from "@/components/general-components/Pagination";
import { cn } from "@/lib/utils";
import { COMMERCIAL_ABILITY, commercialApi, dateBr, errorMessage, money } from "../-shared/commercial";
import { CONTRACTS_KEY, ContractRow, ContractStatus, ContractStatusBadge } from "../-shared/contracts";
import { KIND_LABEL } from "../-shared/proposals";

export const Route = createFileRoute("/_authenticated/comercial/_contratos/contratos")({
  component: ContractsPage,
});

interface ListResponse { rows: ContractRow[]; total: number; summary: Partial<Record<ContractStatus, { count: number; total: number }>> }
const FILTERS: Array<{ value: "" | ContractStatus; label: string }> = [
  { value: "", label: "Todos" }, { value: "vigente", label: "Vigentes" }, { value: "concluido", label: "Concluídos" }, { value: "cancelado", label: "Cancelados" },
];
const LIMIT = 20;

function ContractsPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"" | ContractStatus>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const params = { page, limit: LIMIT, ...(status ? { status } : {}), ...(search.trim() ? { search: search.trim() } : {}) };
  const { data, isLoading, error } = useQuery({
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
      <div>
        <h1 className="text-xl font-bold">Contratos</h1>
        <p className="text-sm text-muted-foreground">Propostas aceitas. Daqui saem as contas a receber: cada parcela vira um título quando a nota fiscal dela é registrada.</p>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center gap-3 my-4 p-4 rounded-lg border">
        <div className="flex flex-wrap rounded-md border overflow-hidden w-fit" role="tablist" aria-label="Situação">
          {FILTERS.map((filter) => (
            <button key={filter.value || "all"} type="button" role="tab" aria-selected={status === filter.value}
              onClick={() => { setStatus(filter.value); setPage(0); }}
              className={cn("px-3 py-1.5 text-sm", status === filter.value ? "bg-primary text-inverse-foreground" : "hover:bg-muted")}>
              {filter.label} <span className="opacity-70 tabular-nums">{filter.value ? summary[filter.value]?.count ?? 0 : all}</span>
            </button>
          ))}
        </div>
        <div className="w-full xl:w-80">
          <Input name="search" value={search} onValueChange={(_, value) => { setSearch(String(value)); setPage(0); }} placeholder="Buscar por número, título ou cliente..." icon="search" />
        </div>
        {summary.vigente && <p className="xl:ml-auto text-sm text-muted-foreground">Vigentes: <b className="text-foreground tabular-nums">{money(summary.vigente.total)}</b></p>}
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="hidden lg:flex items-center py-2 px-4 bg-primary font-semibold text-sm text-inverse-foreground">
          <div className="w-36">Número</div>
          <div className="flex-1">Cliente e título</div>
          <div className="w-28">Situação</div>
          <div className="w-32 text-right">Valor</div>
          <div className="w-32 text-right">Faturado</div>
          <div className="w-32 text-right">Recebido</div>
          <div className="w-32 text-right">A faturar</div>
        </div>
        {isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-14 w-full my-1" />)}
        {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
        {!isLoading && !error && !data?.rows.length && (
          <p className="p-6 text-sm text-muted-foreground">
            {search || status ? "Nenhum contrato com esses filtros." : "Nenhum contrato ainda. Um contrato nasce quando uma proposta é aceita."}
          </p>
        )}
        {data?.rows.map((row) => (
          <button key={row.id} type="button" onClick={() => open(row.id)}
            className="w-full text-left flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-3 border-b last:border-b-0 text-sm hover:bg-muted/40">
            <div className="lg:w-36">
              <p className="font-semibold tabular-nums">{row.number}</p>
              <p className="text-xs text-muted-foreground">{KIND_LABEL[row.kind]} · {dateBr(row.acceptedAt)}</p>
            </div>
            <div className="flex-1 min-w-0 lg:pr-4">
              <p className="font-medium truncate">{row.customer.name}</p>
              <p className="text-xs text-muted-foreground truncate">{row.title}</p>
            </div>
            <div className="lg:w-28"><ContractStatusBadge status={row.status} /></div>
            <div className="lg:w-32 lg:text-right font-semibold tabular-nums"><span className="lg:hidden text-xs font-normal text-muted-foreground">Valor: </span>{money(row.value)}</div>
            <div className="lg:w-32 lg:text-right tabular-nums"><span className="lg:hidden text-xs text-muted-foreground">Faturado: </span>{money(row.billed)}</div>
            <div className="lg:w-32 lg:text-right tabular-nums"><span className="lg:hidden text-xs text-muted-foreground">Recebido: </span>{money(row.received)}</div>
            <div className={cn("lg:w-32 lg:text-right tabular-nums", row.toBill > 0.005 && row.status === "vigente" && "text-amber-700 dark:text-amber-300 font-medium")}>
              <span className="lg:hidden text-xs font-normal text-muted-foreground">A faturar: </span>{money(row.toBill)}
            </div>
          </button>
        ))}
      </div>
      {data && data.total > LIMIT && <div className="mt-4"><Pagination totalItems={data.total} itemsPerPage={LIMIT} currentPage={page} onPageChange={setPage} maxVisiblePages={5} /></div>}
    </>
  );
}
