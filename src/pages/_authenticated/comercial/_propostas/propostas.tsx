import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Pagination from "@/components/general-components/Pagination";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { COMMERCIAL_ABILITY, commercialApi, dateBr, errorMessage, money } from "../-shared/commercial";
import {
  KIND_LABEL, PROPOSALS_KEY, Proposal, ProposalRow, ProposalStatus, StatusBadge,
} from "../-shared/proposals";

export const Route = createFileRoute("/_authenticated/comercial/_propostas/propostas")({
  component: ProposalsPage,
});

interface ListResponse { rows: ProposalRow[]; total: number; summary: Partial<Record<ProposalStatus, { count: number; total: number }>> }

const STATUS_OPTIONS: Array<{ id: ProposalStatus; name: string }> = [
  { id: "rascunho", name: "Rascunhos" }, { id: "enviada", name: "Enviadas" }, { id: "visualizada", name: "Visualizadas" },
  { id: "aceita", name: "Aceitas" }, { id: "recusada", name: "Recusadas" }, { id: "expirada", name: "Expiradas" }, { id: "cancelada", name: "Canceladas" },
];
/** Colunas do kanban: o caminho da proposta, com as que terminaram sem aceite juntas no fim. */
const COLUMNS: Array<{ key: string; title: string; statuses: ProposalStatus[]; hint: string }> = [
  { key: "rascunho", title: "Rascunho", statuses: ["rascunho"], hint: "Ainda sendo montadas" },
  { key: "enviada", title: "Enviadas", statuses: ["enviada", "visualizada"], hint: "Aguardando o cliente" },
  { key: "aceita", title: "Aceitas", statuses: ["aceita"], hint: "Viraram contrato" },
  { key: "encerrada", title: "Sem aceite", statuses: ["recusada", "expirada", "cancelada"], hint: "Recusadas, expiradas ou canceladas" },
];
type View = "lista" | "kanban";
const VIEW_KEY = "worksafe.comercial.propostas.view";
const KANBAN_LIMIT = 100;
const LIMIT = 20;

function ProposalsPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"" | ProposalStatus>("");
  const [kind, setKind] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  // a visão escolhida (lista ou kanban) fica guardada neste navegador
  const [view, setView] = useState<View>(() => { try { return localStorage.getItem(VIEW_KEY) === "kanban" ? "kanban" : "lista"; } catch { return "lista"; } });
  const changeView = (next: View) => { setView(next); setPage(0); try { localStorage.setItem(VIEW_KEY, next); } catch { /* sem armazenamento: vale só nesta visita */ } };
  const kanban = view === "kanban";

  // no kanban as colunas já são as situações: vêm todas de uma vez, sem paginação
  const params = kanban
    ? { page: 0, limit: KANBAN_LIMIT, ...(kind ? { kind } : {}), ...(search.trim() ? { search: search.trim() } : {}) }
    : { page, limit: LIMIT, ...(status ? { status } : {}), ...(kind ? { kind } : {}), ...(search.trim() ? { search: search.trim() } : {}) };
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
  /** Menu de ações de uma proposta: o mesmo na linha da lista e no cartão do kanban. */
  const rowMenu = (row: ProposalRow) => (
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
  );
  const summary = data?.summary ?? {};
  const allCount = Object.entries(summary).reduce((sum, [key, value]) => sum + (key === "substituida" ? 0 : value?.count ?? 0), 0);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Propostas</h1>
          <p className="text-sm text-muted-foreground">Propostas comerciais de serviços e de treinamentos para empresas.</p>
        </div>
        {canCreate && <Button onClick={() => navigate({ to: "/comercial/propostas/nova" })} className="shrink-0"><Icon name="plus" className="w-4 h-4 mr-1" /> Nova proposta</Button>}
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center gap-3 my-4 p-4 rounded-lg border">
        <div className="inline-flex w-fit rounded-md border overflow-hidden" role="radiogroup" aria-label="Forma de ver as propostas">
          {([["lista", "list", "Lista"], ["kanban", "columns-3", "Kanban"]] as const).map(([value, icon, label]) => (
            <button key={value} type="button" role="radio" aria-checked={view === value} onClick={() => changeView(value)}
              className={cn("flex items-center gap-1.5 px-3 h-9 text-sm border-l first:border-l-0", view === value ? "bg-primary text-inverse-foreground" : "hover:bg-muted")}>
              <Icon name={icon} className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
        {!kanban && (
          <div className="w-full xl:w-56">
            <Select name="status" state={status} clearable placeholder={`Todas as situações (${allCount})`} modal={false}
              options={STATUS_OPTIONS.map(({ id, name }) => ({ id, name: `${name} (${summary[id]?.count ?? 0})` }))}
              onChange={(_, value) => { setStatus((String(value ?? "") as "" | ProposalStatus)); setPage(0); }} />
          </div>
        )}
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

      {kanban && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 items-start">
          {COLUMNS.map((column) => {
            const rows = (data?.rows ?? []).filter((row) => column.statuses.includes(row.status));
            const count = column.statuses.reduce((sum, key) => sum + (summary[key]?.count ?? 0), 0);
            const total = column.statuses.reduce((sum, key) => sum + (summary[key]?.total ?? 0), 0);
            return (
              <section key={column.key} className="rounded-lg border bg-muted/30 min-w-0" aria-label={column.title}>
                <header className="px-3 py-2 border-b">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-sm font-semibold">{column.title} <span className="font-normal text-muted-foreground tabular-nums">{count}</span></h2>
                    <span className="text-xs font-medium tabular-nums">{money(total)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{column.hint}</p>
                </header>
                <div className="p-2 grid gap-2">
                  {isLoading && <Skeleton className="h-20 w-full" />}
                  {!isLoading && rows.length === 0 && <p className="px-1 py-3 text-xs text-muted-foreground text-center">Nenhuma proposta aqui.</p>}
                  {rows.map((row) => (
                    <article key={row.id} className={cn("relative rounded-md border bg-background p-3 text-sm shadow-xs hover:border-primary/60", row.inactiveAt && "opacity-60")}>
                      <button type="button" className="block w-full text-left pr-8" onClick={() => open(row.id)}>
                        <span className="block font-semibold tabular-nums">{row.number}</span>
                        <span className="block font-medium truncate">{row.customer.name}</span>
                        <span className="block text-xs text-muted-foreground truncate">{row.title}</span>
                      </button>
                      <div className="absolute top-2 right-2">{rowMenu(row)}</div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="font-semibold tabular-nums">{money(row.total)}</span>
                        {(column.statuses.length > 1 || row.expired) && <StatusBadge status={row.status} expired={row.expired} />}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground truncate">
                        {row.validUntil ? `Válida até ${dateBr(row.validUntil)}` : "Sem validade"}{row.seller ? ` · ${row.seller}` : ""}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {kanban && error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {kanban && data && data.total > KANBAN_LIMIT && (
        <p className="mt-3 text-xs text-muted-foreground">O kanban mostra as {KANBAN_LIMIT} propostas mais recentes de {data.total}. Use a busca, o tipo ou a visão em lista para chegar às demais.</p>
      )}

      {!kanban && <div className="rounded-lg border overflow-hidden">
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
              {rowMenu(row)}
            </div>
          </div>
        ))}
      </div>}

      {!kanban && data && data.total > LIMIT && (
        <div className="mt-4"><Pagination totalItems={data.total} itemsPerPage={LIMIT} currentPage={page} onPageChange={setPage} maxVisiblePages={5} /></div>
      )}
      {(kanban || status === "") && (summary.substituida?.count ?? 0) > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {summary.substituida!.count} versão(ões) antiga(s) substituída(s) por revisão não aparecem aqui; abra a proposta para ver o histórico de versões.
        </p>
      )}

    </>
  );
}

/** Dados mínimos para a proposta nascer como rascunho numerado; o resto é no editor. */
