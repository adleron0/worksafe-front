import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Pagination from "@/components/general-components/Pagination";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { COMMERCIAL_ABILITY, commercialApi, dateBr, errorMessage, money } from "../-shared/commercial";
import {
  CustomerOption, CustomerPicker, KIND_LABEL, PROPOSALS_KEY, Proposal, ProposalKind, ProposalRow, ProposalStatus, StatusBadge,
} from "../-shared/proposals";

export const Route = createFileRoute("/_authenticated/comercial/_propostas/propostas")({
  component: ProposalsPage,
});

interface ListResponse { rows: ProposalRow[]; total: number; summary: Partial<Record<ProposalStatus, { count: number; total: number }>> }

const FILTERS: Array<{ value: "" | ProposalStatus; label: string }> = [
  { value: "", label: "Todas" }, { value: "rascunho", label: "Rascunhos" }, { value: "enviada", label: "Enviadas" },
  { value: "aceita", label: "Aceitas" }, { value: "recusada", label: "Recusadas" }, { value: "expirada", label: "Expiradas" }, { value: "cancelada", label: "Canceladas" },
];
const LIMIT = 20;

function ProposalsPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"" | ProposalStatus>("");
  const [kind, setKind] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);

  const params = { page, limit: LIMIT, ...(status ? { status } : {}), ...(kind ? { kind } : {}), ...(search.trim() ? { search: search.trim() } : {}) };
  const { data, isLoading, error } = useQuery({
    queryKey: [PROPOSALS_KEY, params],
    queryFn: () => commercialApi.get<ListResponse>("proposals", params),
    placeholderData: (previous) => previous,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: [PROPOSALS_KEY] });
  const open = (id: number) => navigate({ to: "/comercial/propostas/$proposalId", params: { proposalId: String(id) } });

  const { mutate: act } = useMutation({
    mutationFn: ({ row, action }: { row: ProposalRow; action: "duplicate" | "revise" | "cancelada" | "inactive" }) => {
      if (action === "duplicate" || action === "revise") return commercialApi.post<Proposal>(`proposals/${row.id}/${action}`);
      if (action === "inactive") return commercialApi.patch<Proposal>(`proposals/inactive/${row.id}`);
      return commercialApi.patch<Proposal>(`proposals/status/${row.id}`, { status: action });
    },
    onSuccess: (result, { action }) => {
      refresh();
      if (action === "duplicate" || action === "revise") {
        toast({ title: action === "revise" ? `Revisão ${result.number} criada` : `Proposta ${result.number} criada`, variant: "success" });
        open(result.id);
      } else {
        toast({ title: action === "inactive" ? "Proposta inativada" : "Proposta cancelada", variant: "success" });
      }
    },
    onError: (err) => toast({ title: "Não foi possível concluir", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`view_${COMMERCIAL_ABILITY}`)) return null;
  const canCreate = can(`create_${COMMERCIAL_ABILITY}`);
  const canUpdate = can(`update_${COMMERCIAL_ABILITY}`);
  const summary = data?.summary ?? {};
  const allCount = Object.entries(summary).reduce((sum, [key, value]) => sum + (key === "substituida" ? 0 : value?.count ?? 0), 0);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Propostas</h1>
          <p className="text-sm text-muted-foreground">Propostas comerciais de serviços e de treinamentos para empresas.</p>
        </div>
        {canCreate && <Button onClick={() => setCreating(true)} className="shrink-0"><Icon name="plus" className="w-4 h-4 mr-1" /> Nova proposta</Button>}
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center gap-3 my-4 p-4 rounded-lg border">
        <div className="flex flex-wrap rounded-md border overflow-hidden w-fit" role="tablist" aria-label="Situação">
          {FILTERS.map((filter) => {
            const count = filter.value ? summary[filter.value]?.count ?? 0 : allCount;
            return (
              <button key={filter.value || "all"} type="button" role="tab" aria-selected={status === filter.value}
                onClick={() => { setStatus(filter.value); setPage(0); }}
                className={cn("px-3 py-1.5 text-sm", status === filter.value ? "bg-primary text-inverse-foreground" : "hover:bg-muted")}>
                {filter.label} <span className="opacity-70 tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="w-full xl:w-72">
          <Input name="search" value={search} onValueChange={(_, value) => { setSearch(String(value)); setPage(0); }}
            placeholder="Buscar por número, título ou cliente..." icon="search" />
        </div>
        <div className="w-full xl:w-56">
          <Select name="kind" state={kind} clearable placeholder="Todos os tipos" modal={false}
            options={Object.entries(KIND_LABEL).map(([id, name]) => ({ id, name }))}
            onChange={(_, value) => { setKind(String(value)); setPage(0); }} />
        </div>
        {summary.enviada && (
          <p className="xl:ml-auto text-sm text-muted-foreground">
            Em negociação: <b className="text-foreground tabular-nums">{money(summary.enviada.total + (summary.visualizada?.total ?? 0))}</b>
          </p>
        )}
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="hidden lg:flex items-center py-2 px-4 bg-primary font-semibold text-sm text-inverse-foreground">
          <div className="w-40">Número</div>
          <div className="flex-1">Cliente e título</div>
          <div className="w-40">Situação</div>
          <div className="w-28">Validade</div>
          <div className="w-36 text-right">Total</div>
          <div className="w-16 text-right">Ações</div>
        </div>
        {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 w-full my-1" />)}
        {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
        {!isLoading && !error && !data?.rows.length && (
          <p className="p-6 text-sm text-muted-foreground">
            {search || status || kind ? "Nenhuma proposta com esses filtros." : "Nenhuma proposta ainda. Crie a primeira em \"Nova proposta\"."}
          </p>
        )}
        {data?.rows.map((row) => (
          <div key={row.id} className={cn("relative flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-3 border-b last:border-b-0 text-sm hover:bg-muted/40", row.inactiveAt && "opacity-60")}>
            <div className="lg:w-40">
              <button type="button" className="font-semibold tabular-nums hover:underline text-left" onClick={() => open(row.id)}>{row.number}</button>
              <p className="text-xs text-muted-foreground">{KIND_LABEL[row.kind]}</p>
            </div>
            <div className="flex-1 min-w-0 pr-10 lg:pr-4">
              <p className="font-medium truncate">{row.customer.name}</p>
              <p className="text-xs text-muted-foreground truncate">{row.title}{row.seller ? ` · ${row.seller}` : ""}</p>
            </div>
            <div className="lg:w-40"><StatusBadge status={row.status} expired={row.expired} /></div>
            <div className="lg:w-28 text-muted-foreground"><span className="lg:hidden text-xs">Validade: </span>{dateBr(row.validUntil)}</div>
            <div className="lg:w-36 lg:text-right font-semibold tabular-nums">{money(row.total)}</div>
            <div className="absolute top-2 right-2 lg:static lg:w-16 flex justify-end">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button className="h-8 w-8 rounded-full p-0" variant="outline" size="sm" aria-label={`Ações de ${row.number}`}>
                    <Icon name="ellipsis-vertical" className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="gap-2" onSelect={() => open(row.id)}>
                    <Icon name={row.status === "rascunho" ? "pencil" : "eye"} className="w-3 h-3" /> {row.status === "rascunho" ? "Editar" : "Abrir"}
                  </DropdownMenuItem>
                  {canCreate && <DropdownMenuItem className="gap-2" onSelect={() => act({ row, action: "duplicate" })}><Icon name="copy" className="w-3 h-3" /> Duplicar</DropdownMenuItem>}
                  {canCreate && ["enviada", "visualizada", "recusada", "expirada"].includes(row.status) && (
                    <DropdownMenuItem className="gap-2" onSelect={() => act({ row, action: "revise" })}><Icon name="git-branch" className="w-3 h-3" /> Criar revisão</DropdownMenuItem>
                  )}
                  {canUpdate && ["rascunho", "enviada", "visualizada"].includes(row.status) && !row.inactiveAt && (
                    <DropdownMenuItem className="p-0" onSelect={(event) => event.preventDefault()}>
                      <ConfirmDialog title={`Cancelar ${row.number}?`} description="A proposta deixa de valer. Ela continua no histórico."
                        onConfirm={() => act({ row, action: "cancelada" })} titleBttn="Cancelar proposta" iconBttn="ban" />
                    </DropdownMenuItem>
                  )}
                  {can(`inactive_${COMMERCIAL_ABILITY}`) && ["rascunho", "cancelada", "recusada"].includes(row.status) && !row.inactiveAt && (
                    <DropdownMenuItem className="p-0" onSelect={(event) => event.preventDefault()}>
                      <ConfirmDialog title={`Inativar ${row.number}?`} description="Some da lista. Nada é apagado."
                        onConfirm={() => act({ row, action: "inactive" })} titleBttn="Inativar" iconBttn="power-off" />
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {data && data.total > LIMIT && (
        <div className="mt-4"><Pagination totalItems={data.total} itemsPerPage={LIMIT} currentPage={page} onPageChange={setPage} maxVisiblePages={5} /></div>
      )}
      {status === "" && (summary.substituida?.count ?? 0) > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {summary.substituida!.count} versão(ões) antiga(s) substituída(s) por revisão não aparecem aqui; abra a proposta para ver o histórico de versões.
        </p>
      )}

      {creating && <NewProposalDialog onClose={() => setCreating(false)} onCreated={(proposal) => { refresh(); open(proposal.id); }} />}
    </>
  );
}

/** Dados mínimos para a proposta nascer como rascunho numerado; o resto é no editor. */
function NewProposalDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (proposal: Proposal) => void }) {
  const [kind, setKind] = useState<ProposalKind>("servico");
  const [customer, setCustomer] = useState<CustomerOption | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const contact = customer?.contacts?.[0];
      return commercialApi.post<Proposal>("proposals", {
        kind, customerId: customer!.id, title,
        contactName: contact?.name, contactEmail: contact?.email ?? customer?.email, contactPhone: contact?.phone ?? customer?.phone,
      });
    },
    onSuccess: (proposal) => { toast({ title: `Proposta ${proposal.number} criada`, variant: "success" }); onCreated(proposal); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!customer) return setError("Escolha o cliente");
    if (title.trim().length < 2) return setError("Informe o título da proposta");
    setError(""); mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova proposta</DialogTitle>
          <DialogDescription>Ela nasce como rascunho, já numerada. Itens, valores e pagamento vêm na tela seguinte.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div>
            <Label>Tipo</Label>
            <div className="mt-1 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de proposta">
              {(Object.keys(KIND_LABEL) as ProposalKind[]).map((value) => (
                <button key={value} type="button" role="radio" aria-checked={kind === value} onClick={() => setKind(value)}
                  className={cn("rounded-md border px-2 py-2 text-sm", kind === value ? "bg-primary text-inverse-foreground border-primary" : "hover:bg-muted")}>
                  {KIND_LABEL[value]}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">O tipo só define as seções iniciais. Dá para misturar itens depois.</p>
          </div>
          <div>
            <Label>Cliente <span>*</span></Label>
            <div className="mt-1"><CustomerPicker value={customer?.id ?? null} onChange={setCustomer} modal /></div>
            <p className="text-xs text-muted-foreground mt-1">Não achou? Cadastre a empresa em Clientes e volte aqui.</p>
          </div>
          <div>
            <Label htmlFor="proposalTitle">Título <span>*</span></Label>
            <Input id="proposalTitle" name="title" value={title} maxLength={200} className="mt-1" placeholder="Ex.: Pintura industrial do tanque 3"
              onValueChange={(_, value) => setTitle(String(value))} />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Criando..." : "Criar e abrir"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

