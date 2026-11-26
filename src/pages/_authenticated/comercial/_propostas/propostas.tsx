import { createFileRoute, useNavigate } from "@tanstack/react-router";
import UiStatusBadge from "@/components/general-components/StatusBadge";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Icon from "@/components/general-components/Icon";
import KanbanView, { KanbanColumn } from "@/components/general-components/KanbanView";
import Input from "@/components/general-components/Input";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import Select from "@/components/general-components/Select";
import { EntityBadge, EntityFilter } from "@/components/general-components/EntitySelect";
import SummaryCards, { SummaryCard } from "@/components/general-components/SummaryCards";
import { cn } from "@/lib/utils";
import { COMMERCIAL_ABILITY, commercialApi, dateBr, errorMessage, money } from "../-shared/commercial";
import { FollowUpChip } from "../-shared/activities";
import { ProposalPanelSheet } from "../-shared/proposal-panel";
import { downloadProposalPdf } from "../-shared/pdf";
import DecisionDialog from "./-DecisionDialog";
import ProposalRowActions, { ProposalRowAction, ProposalRowHandlers } from "./-ProposalRowActions";
import { proposalColumns } from "./-proposalColumns";
import {
  KIND_LABEL, KindBadge, PROPOSALS_KEY, Proposal, ProposalRow, ProposalStatus, StatusBadge,
} from "../-shared/proposals";

export const Route = createFileRoute("/_authenticated/comercial/_propostas/propostas")({
  component: ProposalsPage,
});

interface ListResponse { rows: ProposalRow[]; total: number; summary: Partial<Record<ProposalStatus, { count: number; total: number }>> }

const STATUS_OPTIONS: Array<{ id: ProposalStatus; name: string }> = [
  { id: "rascunho", name: "Rascunhos" }, { id: "enviada", name: "Enviadas" }, { id: "visualizada", name: "Visualizadas" },
  { id: "aceita", name: "Aceitas" }, { id: "recusada", name: "Recusadas" }, { id: "expirada", name: "Expiradas" }, { id: "cancelada", name: "Canceladas" },
];
/** Cor de cada situação no cabeçalho da coluna do kanban. */
const STATUS_COLOR: Record<string, string> = {
  rascunho: "#9ca3af", enviada: "#3b82f6", visualizada: "#6366f1", aceita: "#22c55e", recusada: "#ef4444", expirada: "#f59e0b", cancelada: "#6b7280",
};
/** Colunas do kanban (o KanbanView do sistema): uma para cada situação do filtro da lista, na mesma ordem. */
const COLUMNS: KanbanColumn[] = STATUS_OPTIONS.map(({ id, name }) => ({ id, name, value: id, color: STATUS_COLOR[id] }));
/** Filtro de situação da lista: uma situação ou "Em negociação" (enviadas + visualizadas). */
type StatusFilter = "" | ProposalStatus | "negociacao";
const NEGOTIATION: ProposalStatus[] = ["enviada", "visualizada"];
type View = "lista" | "kanban";
const VIEW_KEY = "worksafe.comercial.propostas.view";
const KANBAN_LIMIT = 100;
const LIMITS = [10, 20, 50, 100];

function ProposalsPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("");
  const [kind, setKind] = useState("");
  // CNPJ do grupo (só aparece com mais de um)
  const [entityId, setEntityId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  // arquivadas (tiradas da lista) só aparecem quando pedidas
  const [archived, setArchived] = useState(false);
  // refaz o quadro quando um cartão é arrastado (a situação não muda por arrasto)
  const [boardKey, setBoardKey] = useState(0);
  // a visão escolhida (lista ou kanban) fica guardada neste navegador
  const [view, setView] = useState<View>(() => { try { return localStorage.getItem(VIEW_KEY) === "kanban" ? "kanban" : "lista"; } catch { return "lista"; } });
  const changeView = (next: View) => { setView(next); setPage(0); try { localStorage.setItem(VIEW_KEY, next); } catch { /* sem armazenamento: vale só nesta visita */ } };
  const kanban = view === "kanban";

  // no kanban as colunas já são as situações: vêm todas de uma vez, sem paginação
  const params = kanban
    ? { page: 0, limit: KANBAN_LIMIT, ...(kind ? { kind } : {}), ...(entityId ? { entityId } : {}), ...(search.trim() ? { search: search.trim() } : {}), ...(archived ? { inactive: "true" } : {}) }
    : { page, limit, ...(status ? { status: status === "negociacao" ? NEGOTIATION.join(",") : status } : {}), ...(kind ? { kind } : {}), ...(entityId ? { entityId } : {}), ...(search.trim() ? { search: search.trim() } : {}), ...(archived ? { inactive: "true" } : {}) };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [PROPOSALS_KEY, params],
    queryFn: () => commercialApi.get<ListResponse>("proposals", params),
    placeholderData: (previous) => previous,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: [PROPOSALS_KEY] });
  const open = (id: number) => navigate({ to: "/comercial/propostas/$proposalId", params: { proposalId: String(id) } });

  const { mutate: act } = useMutation({
    mutationFn: ({ row, action }: { row: ProposalRow; action: ProposalRowAction }) => {
      if (action === "duplicate" || action === "revise") return commercialApi.post<Proposal>(`proposals/${row.id}/${action}`);
      if (action === "inactive" || action === "active") return commercialApi.patch<Proposal>(`proposals/${action}/${row.id}`);
      return commercialApi.patch<Proposal>(`proposals/status/${row.id}`, { status: action });
    },
    onSuccess: (result, { action }) => {
      refresh();
      if (action === "duplicate" || action === "revise") {
        toast({ title: action === "revise" ? `Revisão ${result.number} criada` : `Proposta ${result.number} criada`, variant: "success" });
        open(result.id);
      } else {
        toast({ title: action === "inactive" ? "Proposta arquivada" : action === "active" ? "Proposta de volta à lista" : "Proposta cancelada", variant: "success" });
      }
    },
    onError: (err) => toast({ title: "Não foi possível concluir", description: errorMessage(err), variant: "destructive" }),
  });

  const pdf = (row: ProposalRow) => {
    toast({ title: `Gerando o PDF de ${row.number}...` });
    downloadProposalPdf(row.id, row.customer.name).catch((err) => toast({ title: "Não foi possível gerar o PDF", description: errorMessage(err), variant: "destructive" }));
  };

  // enviar, aceite e recusa direto da lista e do kanban
  const [decision, setDecision] = useState<{ row: ProposalRow; kind: "aceita" | "recusada" } | null>(null);
  // painel lateral de acompanhamento (contatos e retornos) sem sair da lista
  const [following, setFollowing] = useState<ProposalRow | null>(null);
  const copyLink = async (source: Proposal) => {
    const url = source.publicUrl ?? (source.publicKey ? `${window.location.origin}/proposta/${source.publicKey}` : "");
    if (!url) return false;
    try { await navigator.clipboard.writeText(url); return true; } catch { return false; }
  };
  const { mutate: copyRowLink } = useMutation({
    mutationFn: (row: ProposalRow) => commercialApi.get<Proposal>(`proposals/${row.id}`),
    onSuccess: async (proposal) => {
      if (await copyLink(proposal)) toast({ title: "Link copiado", description: "Cole no e-mail ou no WhatsApp para o cliente.", variant: "success" });
      else toast({ title: "Não foi possível copiar", description: "Abra a proposta e copie o link no passo Enviar.", variant: "destructive" });
    },
    onError: (err) => toast({ title: "Não foi possível copiar o link", description: errorMessage(err), variant: "destructive" }),
  });
  const { mutate: changeStatus, isPending: changing } = useMutation({
    mutationFn: ({ row, ...body }: { row: ProposalRow; status: "enviada" | "aceita" | "recusada"; note?: string; notify?: boolean; customerOrderNumber?: string; customerOrderDate?: string }) =>
      commercialApi.patch<Proposal>(`proposals/status/${row.id}`, body),
    onSuccess: async (result, body) => {
      refresh(); setDecision(null);
      if (result.status !== "enviada") { toast({ title: `Proposta ${result.number} ${result.status === "aceita" ? "aceita" : "recusada"}`, variant: "success" }); return; }
      const copied = await copyLink(result);
      if (result.emailError) toast({ title: "Proposta enviada, mas o e-mail falhou", description: `${result.emailError} ${copied ? "O link foi copiado: mande por outro canal." : "Abra a proposta para copiar o link."}`, variant: "destructive" });
      else if (body.notify) toast({ title: "Proposta enviada", description: `O link foi enviado para ${result.draft.contactEmail}${copied ? " e também copiado" : ""}.`, variant: "success" });
      else toast({ title: "Link criado", description: copied ? "O link foi copiado: cole no e-mail ou no WhatsApp para o cliente." : "Abra a proposta para copiar o link.", variant: "success" });
    },
    // o que falta para enviar (parcelas, validade, e-mail do contato) vem na mensagem
    onError: (err) => toast({ title: "Não foi possível concluir", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`view_${COMMERCIAL_ABILITY}`)) return null;
  const canCreate = can(`create_${COMMERCIAL_ABILITY}`);
  /** Ações do menu ⋯ de uma proposta: as mesmas na linha da lista e no cartão do kanban. */
  const handlers: ProposalRowHandlers = {
    open, pdf,
    openPanel: setFollowing,
    copyLink: (row) => copyRowLink(row),
    send: (row, notify) => changeStatus({ row, status: "enviada", ...(notify ? { notify: true } : {}) }),
    decide: (row, kind) => setDecision({ row, kind }),
    act: (row, action) => act({ row, action }),
  };
  const summary = data?.summary ?? {};
  const allCount = Object.entries(summary).reduce((sum, [key, value]) => sum + (key === "substituida" ? 0 : value?.count ?? 0), 0);
  const negotiation = NEGOTIATION.reduce((acc, id) => ({ count: acc.count + (summary[id]?.count ?? 0), total: acc.total + (summary[id]?.total ?? 0) }), { count: 0, total: 0 });
  const cards: SummaryCard[] = [
    { view: "negociacao", label: "Em negociação", bucket: negotiation, tone: "text-primary", hint: "enviadas e visualizadas" },
    ...STATUS_OPTIONS.map(({ id, name }) => ({ view: id, label: name, bucket: { count: summary[id]?.count ?? 0, total: summary[id]?.total ?? 0 }, color: STATUS_COLOR[id] })),
  ];
  // clicar no cartão já marcado volta para todas as situações
  const pickStatus = (next: string) => { setStatus(next === status ? "" : (next as StatusFilter)); setPage(0); };
  const hasFilters = !!(search.trim() || kind || entityId || archived);

  return (
    <>
      <PageHeader title="Propostas" description="Propostas comerciais de serviços e de treinamentos para empresas." className="mb-0"
        actions={<>
          <div role="group" aria-label="Visualização" className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
            <Button variant={view === "lista" ? "default" : "ghost"} size="sm" onClick={() => changeView("lista")} aria-pressed={view === "lista"} className="h-7 gap-2">
              <Icon name="list" className="w-4 h-4" /> Lista
            </Button>
            <Button variant={view === "kanban" ? "default" : "ghost"} size="sm" onClick={() => changeView("kanban")} aria-pressed={view === "kanban"} className="h-7 gap-2">
              <Icon name="columns" className="w-4 h-4" /> Kanban
            </Button>
          </div>
          {canCreate && <Button onClick={() => navigate({ to: "/comercial/propostas/nova" })}><Icon name="plus" className="w-4 h-4 mr-1" /> Nova proposta</Button>}
        </>} />

      <section aria-labelledby="proposals-summary-title" className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2 min-h-7">
          <h2 id="proposals-summary-title" className="text-sm font-semibold">
            Situações <span className="font-normal text-muted-foreground">· {allCount} {allCount === 1 ? "proposta" : "propostas"}{archived ? " (com arquivadas)" : ""}</span>
          </h2>
          {!kanban && status && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => pickStatus(status)}>
              <Icon name="x" className="w-3 h-3" /> Mostrar todas as situações
            </Button>
          )}
        </div>
        <SummaryCards cards={cards} active={kanban ? undefined : status} onPick={kanban ? undefined : pickStatus} noun={["proposta", "propostas"]}
          ariaLabel="Resumo por situação" columns="grid-cols-2 md:grid-cols-4 2xl:grid-cols-8" className="mt-2 mb-0" />
        {kanban && <p className="mt-2 text-xs text-muted-foreground">No kanban cada situação é uma coluna. Para filtrar pelos cartões, use a visão em lista.</p>}
      </section>

      <div role="search" aria-label="Filtros" className="flex flex-col lg:flex-row lg:items-center gap-3 my-4 p-3 rounded-card border bg-card bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
          <Icon name="sliders-horizontal" className="w-4 h-4" /> Filtros
        </div>
        <div className="w-full lg:flex-1 lg:max-w-md">
          <Input name="search" value={search} onValueChange={(_, value) => { setSearch(String(value)); setPage(0); }}
            placeholder="Buscar por número, título ou cliente..." icon="search" />
        </div>
        <div className="w-full lg:w-56">
          <Select name="kind" state={kind} clearable placeholder="Todos os tipos" modal={false}
            options={Object.entries(KIND_LABEL).map(([id, name]) => ({ id, name }))}
            onChange={(_, value) => { setKind(String(value ?? "")); setPage(0); }} />
        </div>
        <EntityFilter className="w-full lg:w-56" value={entityId} onChange={(id) => { setEntityId(id); setPage(0); }} />
        <div className="flex items-center gap-2 shrink-0">
          <Checkbox id="showArchived" checked={archived} onCheckedChange={(checked) => { setArchived(checked === true); setPage(0); }} />
          <Label htmlFor="showArchived" className="cursor-pointer text-sm font-normal">Mostrar arquivadas</Label>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 w-fit lg:ml-auto" onClick={() => { setSearch(""); setKind(""); setEntityId(null); setArchived(false); setPage(0); }}>
            <Icon name="eraser" className="w-4 h-4" /> Limpar filtros
          </Button>
        )}
      </div>

      {kanban && !error && (
        <div className="p-2">
          <KanbanView key={boardKey} data={data?.rows ?? []} columns={COLUMNS} statusField="status" isLoading={isLoading} storageKey="worksafe.comercial.propostas.kanban.hidden" columnWidth={240}
            emptyMessage={search || kind || entityId ? "Nenhuma proposta com esses filtros." : "Nenhuma proposta ainda. Crie a primeira em \"Nova proposta\"."}
            onStatusChange={() => {
              // a situação de uma proposta muda dentro dela (enviar congela o documento, aceitar gera contrato)
              toast({ title: "A situação muda dentro da proposta", description: "Abra a proposta para enviar, registrar o aceite, a recusa ou cancelar." });
              setBoardKey((value) => value + 1);
            }}>
            {(row: ProposalRow) => (
              <div className={cn("p-3 space-y-3", row.inactiveAt && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <button type="button" className="flex-1 min-w-0 overflow-hidden text-left" onClick={() => open(row.id)}>
                    <p className="font-medium text-sm truncate">{row.customer.name}</p>
                    <p className="text-xs text-muted-foreground truncate tabular-nums">{row.number}</p>
                  </button>
                  <ProposalRowActions row={row} handlers={handlers} onCard />
                </div>
                <div className="flex flex-wrap gap-1">
                  <KindBadge kind={row.kind} />
                  <EntityBadge id={row.entityId} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon name="file-text" className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground truncate">{row.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="calendar" className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground truncate">{row.validUntil ? `Válida até ${dateBr(row.validUntil)}` : "Sem validade"}</p>
                  </div>
                  {row.seller && (
                    <div className="flex items-center gap-2">
                      <Icon name="user" className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground truncate">{row.seller}</p>
                    </div>
                  )}
                  <FollowUpChip followUp={row.followUp} />
                </div>
                <div className="pt-2 border-t flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold tabular-nums">{money(row.total)}</p>
                  {row.inactiveAt ? <UiStatusBadge tone="neutral" pulse={false}>Arquivada</UiStatusBadge> : row.expired && <StatusBadge status={row.status} expired />}
                </div>
              </div>
            )}
          </KanbanView>
        </div>
      )}
      {kanban && error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {kanban && data && data.total > KANBAN_LIMIT && (
        <p className="mt-3 text-xs text-muted-foreground">O kanban mostra as {KANBAN_LIMIT} propostas mais recentes de {data.total}. Use a busca, o tipo ou a visão em lista para chegar às demais.</p>
      )}

      {!kanban && (
        <ListCard>
          <DataTable rows={data?.rows} columns={proposalColumns} getRowId={(row) => row.id} ariaLabel="Propostas" minWidth={1000}
            loading={isLoading || isFetching} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
            onRowClick={(row) => open(row.id)}
            rowClassName={(row) => (row.inactiveAt ? "opacity-60" : undefined)}
            actions={(row) => <ProposalRowActions row={row} handlers={handlers} />}
            empty={search || status || kind || entityId
              ? <EmptyState icon="search-x" title="Nenhuma proposta com esses filtros." />
              : <EmptyState title="Nenhuma proposta ainda." description={'Crie a primeira em "Nova proposta".'}
                  action={canCreate && <Button size="sm" onClick={() => navigate({ to: "/comercial/propostas/nova" })}><Icon name="plus" className="w-4 h-4" /> Nova proposta</Button>} />} />
          <ListFooter total={data?.total ?? 0} page={page} limit={limit} limits={LIMITS}
            onPageChange={setPage} onLimitChange={(next) => { setLimit(next); setPage(0); }} />
        </ListCard>
      )}
      {(kanban || status === "") && (summary.substituida?.count ?? 0) > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {summary.substituida!.count} versão(ões) antiga(s) substituída(s) por revisão não aparecem aqui; abra a proposta para ver o histórico de versões.
        </p>
      )}

      <ProposalPanelSheet proposalId={following?.id ?? null} createdBy={following?.createdBy} onClose={() => setFollowing(null)} />

      {decision && (
        <DecisionDialog decision={decision.kind} number={decision.row.number} pending={changing} onClose={() => setDecision(null)}
          onConfirm={(note, extra) => changeStatus({ row: decision.row, status: decision.kind, note, ...extra })} />
      )}
    </>
  );
}

/** Dados mínimos para a proposta nascer como rascunho numerado; o resto é no editor. */
