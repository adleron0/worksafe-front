import tailwindUtils from "@/utils/tailwind.utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import { cn } from "@/lib/utils";
import { COMMERCIAL_ABILITY, commercialApi, errorMessage, money } from "../-shared/commercial";
import { DEALS_KEY, DEAL_STATUS, Deal, DealRow, DealStatus, DealStatusBadge } from "../-shared/deals";
import { KindBadge } from "../-shared/proposals";

export const Route = createFileRoute("/_authenticated/comercial/_negociacoes/negociacoes")({
  component: DealsPage,
});

const FILTERS: Array<{ value: "" | DealStatus; label: string }> = [
  { value: "", label: "Todas" }, { value: "aberta", label: "Abertas" }, { value: "ganha", label: "Ganhas" }, { value: "parcial", label: "Parcialmente ganhas" }, { value: "perdida", label: "Perdidas" },
];

/** Negociações: propostas do mesmo cliente agrupadas (serviço, locação, treinamento), cada uma com a sua NF. */
function DealsPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"" | DealStatus>("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const params = { ...(search.trim() ? { search: search.trim() } : {}) };
  const { data, isLoading, error } = useQuery({
    queryKey: [DEALS_KEY, params],
    queryFn: () => commercialApi.get<{ rows: DealRow[] }>("deals", params),
    placeholderData: (previous) => previous,
  });
  if (!can(`view_${COMMERCIAL_ABILITY}`)) return null;
  const rows = (data?.rows ?? []).filter((row) => !status || row.status === status);
  const count = (value: "" | DealStatus) => (data?.rows ?? []).filter((row) => !value || row.status === value).length;
  const open = (id: number) => navigate({ to: "/comercial/negociacoes/$dealId", params: { dealId: String(id) } });

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Negociações</h1>
          <p className="text-sm text-muted-foreground">Propostas do mesmo cliente juntas (serviço, locação, treinamento). Cada uma continua com o seu contrato e a sua nota; aqui fica o total e o desconto pelo fechamento conjunto.</p>
        </div>
        {can(`create_${COMMERCIAL_ABILITY}`) && <Button type="button" onClick={() => setCreating(true)}><Icon name="plus" className="w-4 h-4 mr-1" /> Nova negociação</Button>}
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center gap-3 my-4 p-4 rounded-lg border">
        <div className="flex flex-wrap rounded-md border overflow-hidden w-fit" role="tablist" aria-label="Situação">
          {FILTERS.map((filter) => (
            <button key={filter.value || "all"} type="button" role="tab" aria-selected={status === filter.value} onClick={() => setStatus(filter.value)}
              className={cn("px-3 py-1.5 text-sm", status === filter.value ? "bg-primary text-inverse-foreground" : "hover:bg-muted")}>
              {filter.label} <span className="opacity-70 tabular-nums">{count(filter.value)}</span>
            </button>
          ))}
        </div>
        <div className="w-full xl:w-80">
          <Input name="search" value={search} onValueChange={(_, value) => setSearch(String(value))} placeholder="Buscar por número ou título..." icon="search" />
        </div>
      </div>

      {isLoading ? <Skeleton className="h-40 w-full" /> : error ? <p className="text-sm text-destructive">{errorMessage(error)}</p> : rows.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          {data?.rows.length ? "Nenhuma negociação nesta situação." : "Nenhuma negociação ainda. Junte numa negociação as propostas de um cliente que pediu mais de uma coisa (por exemplo, serviço e locação em notas separadas)."}
        </div>
      ) : (
        <ul className="grid gap-2">
          {rows.map((row) => (
            <li key={row.id}>
              <button type="button" onClick={() => open(row.id)} className={`w-full text-left rounded-lg border p-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-center hover:bg-card ${tailwindUtils.cardClickable}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold tabular-nums">{row.number}</span>
                    <DealStatusBadge status={row.status} />
                    {row.breach && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">Revisar desconto</span>}
                  </div>
                  <p className="text-sm truncate">{row.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{[row.customer?.name, row.seller].filter(Boolean).join(" · ")}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {row.proposals.map((p) => (
                      <span key={p.id} className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs"><KindBadge kind={p.kind} /> <span className="tabular-nums">{p.number}</span></span>
                    ))}
                  </div>
                </div>
                <div className="md:text-right text-sm">
                  <p className="text-lg font-bold tabular-nums">{money(row.total)}</p>
                  {row.discountTotal > 0 && <p className="text-xs text-muted-foreground">desconto conjunto {money(row.discountTotal)}</p>}
                  {row.won > 0 && row.status !== "ganha" && <p className="text-xs" style={{ color: DEAL_STATUS.ganha.color }}>ganho {money(row.won)}</p>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

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
