import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import StatusChips from "@/components/general-components/StatusChips";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import { COMMERCIAL_ABILITY, commercialApi, errorMessage, money } from "../-shared/commercial";
import { DEALS_KEY, DEAL_STATUS, Deal, DealRow, DealStatus, DealStatusBadge } from "../-shared/deals";
import { KindBadge } from "../-shared/proposals";

export const Route = createFileRoute("/_authenticated/comercial/_negociacoes/negociacoes")({
  component: DealsPage,
});

type Filter = "todas" | DealStatus;
const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "todas", label: "Todas" }, { value: "aberta", label: "Abertas" }, { value: "ganha", label: "Ganhas" }, { value: "parcial", label: "Parcialmente ganhas" }, { value: "perdida", label: "Perdidas" },
];

const columns: DataColumn<DealRow>[] = [
  { id: "number", header: "Número", className: "w-32 font-semibold tabular-nums", cell: (row) => row.number },
  {
    id: "title", header: "Título e cliente",
    cell: (row) => (
      <div className="min-w-0 max-w-[24rem]">
        <p className="font-medium truncate">{row.title}</p>
        <p className="text-xs text-muted-foreground truncate">{[row.customer?.name, row.seller].filter(Boolean).join(" · ")}</p>
      </div>
    ),
  },
  {
    id: "proposals", header: "Propostas",
    cell: (row) => (
      <div className="flex flex-wrap gap-1.5 max-w-[22rem]">
        {row.proposals.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs"><KindBadge kind={p.kind} /> <span className="tabular-nums">{p.number}</span></span>
        ))}
      </div>
    ),
  },
  {
    id: "status", header: "Situação", className: "w-48",
    cell: (row) => (
      <div className="flex flex-wrap items-center gap-1">
        <DealStatusBadge status={row.status} />
        {row.breach && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300 whitespace-nowrap">Revisar desconto</span>}
      </div>
    ),
  },
  {
    id: "total", header: "Total", align: "right", className: "w-40",
    cell: (row) => (
      <div>
        <p className="font-semibold tabular-nums">{money(row.total)}</p>
        {(row.discountTotal > 0 || (row.won > 0 && row.status !== "ganha")) && (
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            {row.discountTotal > 0 && `desconto conjunto ${money(row.discountTotal)}`}
            {row.discountTotal > 0 && row.won > 0 && row.status !== "ganha" && " · "}
            {row.won > 0 && row.status !== "ganha" && <span style={{ color: DEAL_STATUS.ganha.color }}>ganho {money(row.won)}</span>}
          </p>
        )}
      </div>
    ),
  },
];

/** Negociações: propostas do mesmo cliente agrupadas (serviço, locação, treinamento), cada uma com a sua NF. */
function DealsPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"" | DealStatus>("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const params = { ...(search.trim() ? { search: search.trim() } : {}) };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [DEALS_KEY, params],
    queryFn: () => commercialApi.get<{ rows: DealRow[] }>("deals", params),
    placeholderData: (previous) => previous,
  });
  if (!can(`view_${COMMERCIAL_ABILITY}`)) return null;
  const canCreate = can(`create_${COMMERCIAL_ABILITY}`);
  const rows = data ? data.rows.filter((row) => !status || row.status === status) : undefined;
  const count = (value: Filter) => (data?.rows ?? []).filter((row) => value === "todas" || row.status === value).length;
  const open = (id: number) => navigate({ to: "/comercial/negociacoes/$dealId", params: { dealId: String(id) } });

  return (
    <>
      <PageHeader title="Negociações" description="Propostas do mesmo cliente juntas (serviço, locação, treinamento). Cada uma continua com o seu contrato e a sua nota; aqui fica o total e o desconto pelo fechamento conjunto." />

      <ListCard>
        <StatusChips<Filter> value={status || "todas"} onChange={(value) => setStatus(value === "todas" ? "" : value)}
          options={FILTERS.map((filter) => ({ value: filter.value, label: filter.label, count: count(filter.value) }))} />
        <ListToolbar search={{ value: search, onChange: setSearch, placeholder: "Buscar por número ou título..." }}>
          {canCreate && <Button type="button" onClick={() => setCreating(true)}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Nova negociação</span></Button>}
        </ListToolbar>
        <DataTable rows={rows} columns={columns} getRowId={(row) => row.id} ariaLabel="Negociações" minWidth={960}
          loading={isLoading || isFetching} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
          onRowClick={(row) => open(row.id)}
          empty={data?.rows.length
            ? <EmptyState icon="search-x" title="Nenhuma negociação nesta situação." />
            : <EmptyState title="Nenhuma negociação ainda." description="Junte numa negociação as propostas de um cliente que pediu mais de uma coisa (por exemplo, serviço e locação em notas separadas)." />} />
      </ListCard>

      {creating && <NewDealDialog onClose={() => setCreating(false)} onCreated={(deal) => open(deal.id)} />}
    </>
  );
}

interface CustomerRow { id: number; name: string; corporateName: string | null; cnpj: string | null; place?: string | null }

/** Nova negociação: o cliente e um título. As propostas entram depois, na ficha. */
export function NewDealDialog({ onClose, onCreated, proposalIds }: { onClose: () => void; onCreated: (deal: Deal) => void; proposalIds?: number[] }) {
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const { data: customers } = useQuery({
    queryKey: ["dealCustomers", term.trim()],
    queryFn: () => commercialApi.get<CustomerRow[]>("proposals/customers", term.trim() ? { search: term.trim() } : undefined),
    enabled: !proposalIds?.length,
  });
  const { mutate, isPending } = useMutation({
    mutationFn: () => commercialApi.post<Deal>("deals", { ...(customer ? { customerId: customer.id } : {}), ...(proposalIds?.length ? { proposalIds } : {}), title: title.trim() || undefined }),
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ queryKey: [DEALS_KEY] });
      queryClient.invalidateQueries({ queryKey: ["commercialProposal"] });
      toast({ title: `${deal.number} criada`, variant: "success" });
      onCreated(deal); onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova negociação</DialogTitle>
          <DialogDescription>{proposalIds?.length ? "A negociação nasce com esta proposta e o cliente dela. As outras propostas do cliente entram pela ficha da negociação." : "Escolha o cliente. As propostas dele entram depois, pela ficha da negociação."}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); if (!proposalIds?.length && !customer) return setError("Escolha o cliente."); setError(""); mutate(); }}>
          {!proposalIds?.length && (
            <div className="grid gap-2">
              <Label htmlFor="dealCustomer">Cliente <span>*</span></Label>
              {customer ? (
                <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                  <span className="truncate">{customer.name}{customer.place ? ` · ${customer.place}` : ""}</span>
                  <button type="button" className="text-xs underline text-primary" onClick={() => setCustomer(null)}>Trocar</button>
                </div>
              ) : (
                <>
                  <Input id="dealCustomer" name="dealCustomer" value={term} onValueChange={(_, value) => setTerm(String(value))} placeholder="Nome, razão social ou CNPJ" icon="search" />
                  <ul className="max-h-56 overflow-y-auto rounded-md border divide-y text-sm">
                    {(customers ?? []).map((row) => (
                      <li key={row.id}><button type="button" className="w-full text-left px-3 py-2 hover:bg-muted" onClick={() => setCustomer(row)}>
                        <span className="font-medium">{row.name}</span>{row.place && <span className="text-muted-foreground"> · {row.place}</span>}
                      </button></li>
                    ))}
                    {customers && !customers.length && <li className="px-3 py-2 text-muted-foreground">Nenhum cliente encontrado.</li>}
                  </ul>
                </>
              )}
            </div>
          )}
          <div>
            <Label htmlFor="dealTitle">Título</Label>
            <Input id="dealTitle" name="dealTitle" value={title} maxLength={200} onValueChange={(_, value) => setTitle(String(value))} className="mt-1" placeholder="Opcional (ex.: Parada de manutenção 2027)" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Criando..." : "Criar negociação"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
