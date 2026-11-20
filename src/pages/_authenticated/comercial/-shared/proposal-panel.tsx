import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import { RecordFilesPanel } from "@/pages/_authenticated/arquivos/-shared/record-files";
import DecisionDialog, { DecisionExtra } from "../_propostas/-DecisionDialog";
import { ACTIVITIES_KEY, ACTIVITY_PERMISSION, ACTIVITY_TYPES, Activity, ActivityItem, ActivityList, dueLabel, useActivityDialogs, useActivityUsers } from "./activities";
import { COMMERCIAL_ABILITY, Tip, commercialApi, dateBr, errorMessage, money, todayIso } from "./commercial";
import { CONTRACT_KEY, Contract, ContractStatusBadge } from "./contracts";
import { EVENT_LABEL, KindBadge, PROPOSAL_KEY, PROPOSALS_KEY, Proposal, ProposalStatus, STATUS_LABEL, StatusBadge } from "./proposals";

/**
 * Painel da proposta: uma ficha rápida, aberta ao lado da lista (ou da
 * negociação, ou da agenda), para consultar e agir sem sair de onde se está.
 * Editar a proposta continua dentro dela; custos e margem não entram aqui.
 */
export function ProposalPanelSheet({ proposalId, createdBy, onClose }: { proposalId: number | null; createdBy?: string | null; onClose: () => void }) {
  return (
    <Sheet open={proposalId != null} onOpenChange={(value) => !value && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto p-4 sm:p-6">
        {proposalId != null && <ProposalPanel key={proposalId} proposalId={proposalId} createdBy={createdBy} />}
      </SheetContent>
    </Sheet>
  );
}

const OPEN: ProposalStatus[] = ["rascunho", "enviada", "visualizada"];
const STEPS: Array<{ id: ProposalStatus; label: string }> = [
  { id: "rascunho", label: "Rascunho" }, { id: "enviada", label: "Enviada" }, { id: "visualizada", label: "Vista pelo cliente" }, { id: "aceita", label: "Aceita" },
];
const TYPE_ICON = Object.fromEntries(ACTIVITY_TYPES.map((type) => [type.id, type.icon])) as Record<string, string>;
const EVENT_ICON: Record<string, string> = {
  enviada: "send", visualizada: "eye", aceita: "circle-check", recusada: "circle-x", cancelada: "ban", expirada: "calendar-x",
  revisada: "git-branch", email_enviado: "mail", codigo_enviado: "key-round",
};
const daysBetween = (from: string, to = todayIso()) => Math.round((new Date(`${to.slice(0, 10)}T12:00:00`).getTime() - new Date(`${from.slice(0, 10)}T12:00:00`).getTime()) / 86400000);
const sinceText = (date: string | null) => {
  if (!date) return "";
  const days = daysBetween(date);
  return days <= 0 ? "hoje" : days === 1 ? "há 1 dia" : `há ${days} dias`;
};
const dateTimeBr = (value: string) => new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const digits = (value?: string | null) => (value ?? "").replace(/\D/g, "");

function ProposalPanel({ proposalId, createdBy }: { proposalId: number; createdBy?: string | null }) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const canFollow = can(ACTIVITY_PERMISSION);
  const canUpdate = can(`update_${COMMERCIAL_ABILITY}`);
  const [tab, setTab] = useState("atividade");
  const [decision, setDecision] = useState<"aceita" | "recusada" | null>(null);

  const { data: proposal, isLoading, error } = useQuery({
    queryKey: [PROPOSAL_KEY, String(proposalId)],
    queryFn: () => commercialApi.get<Proposal>(`proposals/${proposalId}`),
  });
  const activityParams = { limit: 100, proposalId };
  const { data: activities } = useQuery({ queryKey: [ACTIVITIES_KEY, activityParams], queryFn: () => commercialApi.get<ActivityList>("activities", activityParams) });
  const users = useActivityUsers();
  const contactName = proposal?.draft.contactName ?? null;
  const { dialogs, register, schedule, edit, complete } = useActivityDialogs({ proposalId }, contactName);

  const { mutate: decide, isPending: deciding } = useMutation({
    mutationFn: ({ status, note, extra }: { status: "aceita" | "recusada"; note: string; extra?: DecisionExtra }) =>
      commercialApi.patch<Proposal>(`proposals/status/${proposalId}`, { status, note, ...(extra ?? {}) }),
    onSuccess: (result) => {
      queryClient.setQueryData([PROPOSAL_KEY, String(proposalId)], result);
      queryClient.invalidateQueries({ queryKey: [PROPOSALS_KEY] });
      setDecision(null);
      toast({ title: `Proposta ${result.number} ${result.status === "aceita" ? "aceita" : "recusada"}`, variant: "success" });
    },
    onError: (err) => toast({ title: "Não foi possível concluir", description: errorMessage(err), variant: "destructive" }),
  });

  const pending = useMemo(() => (activities?.rows ?? []).filter((row) => row.status === "pendente")
    .sort((a, b) => `${a.dueDate ?? "9"}${a.dueTime ?? "99"}`.localeCompare(`${b.dueDate ?? "9"}${b.dueTime ?? "99"}`)), [activities]);
  const done = useMemo(() => (activities?.rows ?? []).filter((row) => row.status === "feita"), [activities]);

  if (isLoading) return <div className="grid gap-3"><SheetTitle className="sr-only">Carregando a proposta</SheetTitle><Skeleton className="h-8 w-2/3" /><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (error || !proposal) return <><SheetTitle className="sr-only">Proposta</SheetTitle><p className="text-sm text-destructive">Não foi possível abrir a proposta: {errorMessage(error)}</p></>;

  const { status } = proposal;
  const open = OPEN.includes(status) && !proposal.inactiveAt;
  const sent = status === "enviada" || status === "visualizada";
  const next = pending[0] ?? null;
  const seller = users.find((user) => user.id === proposal.draft.sellerId)?.name ?? null;
  const phone = digits(proposal.draft.contactPhone);
  const whatsapp = phone.length >= 10
    ? `https://wa.me/${phone.length <= 11 ? `55${phone}` : phone}?text=${encodeURIComponent(`Olá${contactName ? `, ${contactName.split(" ")[0]}` : ""}! Segue a proposta ${proposal.number}${proposal.publicUrl ? `: ${proposal.publicUrl}` : "."}`)}`
    : null;
  const copyLink = async () => {
    if (!proposal.publicUrl) return;
    try { await navigator.clipboard.writeText(proposal.publicUrl); toast({ title: "Link copiado", description: "Cole no e-mail ou no WhatsApp para o cliente.", variant: "success" }); }
    catch { toast({ title: "Não foi possível copiar", variant: "destructive" }); }
  };
  const validUntil = proposal.draft.validUntil;
  const validDays = validUntil ? daysBetween(todayIso(), validUntil) : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <SheetHeader className="pr-6 space-y-1 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <SheetTitle className="text-xl tabular-nums">{proposal.number}</SheetTitle>
          <StatusBadge status={status} expired={proposal.expired} />
          <KindBadge kind={proposal.draft.kind} />
          <span className="ml-auto text-lg font-semibold tabular-nums">{money(proposal.calc.totals.total)}</span>
        </div>
        <SheetDescription className="text-sm">
          <span className="font-medium text-foreground">{proposal.customer.name}</span>
          {proposal.draft.title && proposal.draft.title !== "Nova proposta" ? ` · ${proposal.draft.title}` : ""}
          {proposal.deal && <> · <Link to="/comercial/negociacoes/$dealId" params={{ dealId: String(proposal.deal.id) }} className="underline">{proposal.deal.number}</Link></>}
        </SheetDescription>
      </SheetHeader>

      <StatusTrack proposal={proposal} />

      {open && (next ? (
        <div className={cn("rounded-lg border px-3 py-2 flex items-center gap-3 text-sm",
          next.overdue ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40" : next.today ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40" : "bg-muted/40")}>
          <Icon name={TYPE_ICON[next.type] ?? "calendar"} className="w-4 h-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Próximo retorno</p>
            <p className="font-medium truncate">
              <span className={cn(next.overdue && "text-red-600 dark:text-red-400")}>{next.overdue ? "Atrasado: " : ""}{next.dueDate ? dueLabel(next.dueDate, next.dueTime) : "sem data"}</span>
              {" · "}{next.subject}{next.contactName ? ` · ${next.contactName}` : ""}
            </p>
          </div>
          {canFollow && <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => complete(next)}><Icon name="check" className="w-4 h-4 mr-1" /> Concluir</Button>}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed px-3 py-2 flex items-center gap-3 text-sm">
          <Icon name="calendar-x" className="w-4 h-4 shrink-0 text-amber-600" />
          <p className="flex-1">Sem próximo retorno: marque quando falar de novo com o cliente, para a proposta não esfriar.</p>
          {canFollow && <Button type="button" size="sm" className="shrink-0" onClick={schedule}><Icon name="calendar-plus" className="w-4 h-4 mr-1" /> Agendar</Button>}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm"><Link to="/comercial/propostas/$proposalId" params={{ proposalId: String(proposal.id) }}><Icon name="external-link" className="w-4 h-4 mr-1" /> Abrir proposta</Link></Button>
        {proposal.publicUrl && <Button type="button" size="sm" variant="outline" onClick={copyLink}><Icon name="link" className="w-4 h-4 mr-1" /> Copiar link</Button>}
        {whatsapp && (
          <Tip text={`Conversar com ${contactName ?? "o contato"} no WhatsApp${proposal.publicUrl ? ", já com o link" : ""}`}>
            <Button asChild size="sm" variant="outline"><a href={whatsapp} target="_blank" rel="noopener noreferrer"><Icon name="message-circle" className="w-4 h-4 mr-1" /> WhatsApp</a></Button>
          </Tip>
        )}
        {sent && canUpdate && !proposal.inactiveAt && (<>
          <Button type="button" size="sm" variant="outline" onClick={() => setDecision("aceita")}><Icon name="check" className="w-4 h-4 mr-1" /> Registrar aceite</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setDecision("recusada")}>Registrar recusa</Button>
        </>)}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[13rem_minmax(0,1fr)] items-start">
        <aside className="grid gap-3 text-sm rounded-lg border p-3 md:sticky md:top-0" aria-label="Resumo da proposta">
          <Fact label="Contato">
            <p className="font-medium">{contactName ?? "—"}</p>
            {proposal.draft.contactEmail && <a href={`mailto:${proposal.draft.contactEmail}`} className="block truncate text-muted-foreground hover:underline">{proposal.draft.contactEmail}</a>}
            {proposal.draft.contactPhone && <a href={`tel:${phone}`} className="block text-muted-foreground hover:underline">{proposal.draft.contactPhone}</a>}
          </Fact>
          <Fact label="Vendedor"><p>{seller ?? "—"}</p></Fact>
          <Fact label="Validade">
            <p>{validUntil ? dateBr(validUntil) : "sem validade"}</p>
            {open && validDays != null && (
              <p className={cn("text-xs", validDays < 0 ? "text-red-600 dark:text-red-400" : validDays <= 5 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
                {validDays < 0 ? `venceu há ${-validDays} dia(s)` : validDays === 0 ? "vence hoje" : `faltam ${validDays} dia(s)`}
              </p>
            )}
          </Fact>
          <Fact label="Criada"><p>{dateBr(proposal.createdAt)}{createdBy ? ` · ${createdBy}` : ""}</p></Fact>
          {proposal.contract?.customerOrder?.number && <Fact label="Pedido do cliente"><p className="tabular-nums">{proposal.contract.customerOrder.number}</p></Fact>}
        </aside>

        <Tabs value={tab} onValueChange={setTab} className="min-w-0">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="atividade">Atividade</TabsTrigger>
            <TabsTrigger value="agenda">Agenda{pending.length ? ` (${pending.length})` : ""}</TabsTrigger>
            {proposal.versions.length > 1 && <TabsTrigger value="versoes">Versões ({proposal.versions.length})</TabsTrigger>}
            {proposal.contract && <TabsTrigger value="venda">Venda</TabsTrigger>}
            <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
          </TabsList>

          <TabsContent value="atividade" className="mt-3">
            {canFollow && <Button type="button" size="sm" variant="outline" onClick={register}><Icon name="message-square-plus" className="w-4 h-4 mr-1" /> Registrar contato</Button>}
            <Timeline proposal={proposal} done={done} createdBy={createdBy} />
          </TabsContent>

          <TabsContent value="agenda" className="mt-3">
            {canFollow && <Button type="button" size="sm" onClick={schedule}><Icon name="calendar-plus" className="w-4 h-4 mr-1" /> Agendar</Button>}
            {pending.length
              ? <ul className="mt-2">{pending.map((activity) => <ActivityItem key={activity.id} activity={activity} canEdit={canFollow} onComplete={complete} onEdit={edit} />)}</ul>
              : <p className="mt-3 text-sm text-muted-foreground">Nenhum retorno marcado.</p>}
          </TabsContent>

          {proposal.versions.length > 1 && (
            <TabsContent value="versoes" className="mt-3">
              <ul className="divide-y rounded-lg border">
                {[...proposal.versions].sort((a, b) => b.revision - a.revision).map((version) => (
                  <li key={version.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <Link to="/comercial/propostas/$proposalId" params={{ proposalId: String(version.id) }} className="font-medium tabular-nums hover:underline">{version.number}</Link>
                    {version.id === proposal.id && <span className="text-xs text-muted-foreground">(esta)</span>}
                    <StatusBadge status={version.status} />
                    <span className="ml-auto tabular-nums">{money(version.total)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">Proposta enviada só muda por revisão: a versão anterior fica como substituída.</p>
            </TabsContent>
          )}

          {proposal.contract && (
            <TabsContent value="venda" className="mt-3">
              {tab === "venda" && <SaleTab contractId={proposal.contract.id} />}
            </TabsContent>
          )}

          <TabsContent value="arquivos" className="mt-3">
            {tab === "arquivos" && <RecordFilesPanel entity="proposal" entityId={proposal.id} title="Arquivos da proposta" hint="Pedido do cliente, memoriais, fotos da visita. Quem vê a proposta vê os arquivos." />}
          </TabsContent>
        </Tabs>
      </div>

      {dialogs}
      {decision && (
        <DecisionDialog decision={decision} number={proposal.number} pending={deciding} onClose={() => setDecision(null)}
          onConfirm={(note, extra) => decide({ status: decision, note, extra })} />
      )}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

/** Rascunho → enviada → vista pelo cliente → aceita; recusa, validade vencida e cancelamento aparecem como fim. */
function StatusTrack({ proposal }: { proposal: Proposal }) {
  const { status } = proposal;
  const ended = !["rascunho", "enviada", "visualizada", "aceita"].includes(status);
  const reached = (id: ProposalStatus) => {
    if (id === "rascunho") return true;
    if (id === "enviada") return Boolean(proposal.sentAt);
    if (id === "visualizada") return Boolean(proposal.viewedAt);
    return status === "aceita";
  };
  const since = status === "aceita" || ended ? proposal.decidedAt ?? proposal.updatedAt : status === "visualizada" ? proposal.viewedAt : status === "enviada" ? proposal.sentAt : proposal.createdAt;
  const steps = ended ? [...STEPS.slice(0, 3), { id: status, label: STATUS_LABEL[status] }] : STEPS;
  return (
    <div>
      <ol className="flex items-center gap-1" aria-label="Situação da proposta">
        {steps.map((step, index) => {
          const isCurrent = step.id === status;
          const done = reached(step.id) || isCurrent;
          return (
            <li key={step.id} className="flex flex-1 items-center gap-1 min-w-0">
              <span className={cn("flex-1 truncate rounded-full px-2 py-1 text-center text-xs font-medium border",
                isCurrent ? (ended ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200" : "border-primary bg-primary text-white")
                  : done ? "border-primary/40 bg-primary/10 text-primary" : "border-dashed text-muted-foreground")}
                aria-current={isCurrent ? "step" : undefined}>
                {step.label}
              </span>
              {index < steps.length - 1 && <span className={cn("h-px w-2 shrink-0", done ? "bg-primary/50" : "bg-border")} />}
            </li>
          );
        })}
      </ol>
      {since && <p className="mt-1 text-xs text-muted-foreground">{STATUS_LABEL[status]} {sinceText(since)}{proposal.statusNote ? ` · ${proposal.statusNote}` : ""}</p>}
    </div>
  );
}

/** Uma linha do tempo só: o que aconteceu com a proposta (envio, abertura, aceite, revisão) e os contatos anotados. */
function Timeline({ proposal, done, createdBy }: { proposal: Proposal; done: Activity[]; createdBy?: string | null }) {
  const [all, setAll] = useState(false);
  const items = useMemo(() => {
    const list: Array<{ key: string; at: string; icon: string; title: string; detail?: string | null; tone?: string }> = [];
    for (const event of proposal.events) {
      const who = [event.name, event.role].filter(Boolean).join(", ");
      list.push({ key: `e${event.id}`, at: event.at, icon: EVENT_ICON[event.type] ?? "circle", title: EVENT_LABEL[event.type] ?? event.type,
        detail: [who, event.note].filter(Boolean).join(" · ") || null, tone: event.type === "aceita" ? "text-green-700 dark:text-green-400" : event.type === "recusada" ? "text-red-600 dark:text-red-400" : undefined });
    }
    for (const activity of done) {
      list.push({ key: `a${activity.id}`, at: activity.doneAt ?? activity.createdAt, icon: TYPE_ICON[activity.type] ?? "circle",
        title: `${activity.typeLabel}${activity.subject !== activity.typeLabel ? ` · ${activity.subject}` : ""}`,
        detail: [activity.contactName ? `com ${activity.contactName}` : null, activity.user, activity.result ?? activity.notes].filter(Boolean).join(" · ") || null });
    }
    list.push({ key: "criada", at: proposal.createdAt, icon: "file-plus", title: "Proposta criada", detail: createdBy ?? null });
    return list.sort((a, b) => b.at.localeCompare(a.at));
  }, [proposal, done, createdBy]);
  const shown = all ? items : items.slice(0, 8);
  return (
    <>
      <ol className="mt-3 relative border-l pl-4 grid gap-3">
        {shown.map((item) => (
          <li key={item.key} className="relative text-sm">
            <span className="absolute -left-[1.6rem] top-0 flex h-5 w-5 items-center justify-center rounded-full border bg-background text-muted-foreground">
              <Icon name={item.icon} className="w-3 h-3" />
            </span>
            <p className={cn("font-medium", item.tone)}>{item.title}</p>
            <p className="text-xs text-muted-foreground">{dateTimeBr(item.at)}</p>
            {item.detail && <p className="mt-0.5 text-muted-foreground break-words">{item.detail}</p>}
          </li>
        ))}
      </ol>
      {items.length > 8 && <Button type="button" variant="link" size="sm" className="px-0" onClick={() => setAll((v) => !v)}>{all ? "Mostrar menos" : `Mostrar tudo (${items.length})`}</Button>}
    </>
  );
}

/** A venda fechada pela proposta: contrato, destinos (OS, OL, turmas), boletins e, para quem vê o financeiro, faturado e recebido. */
function SaleTab({ contractId }: { contractId: number }) {
  const { can } = useVerify();
  const seeMoney = can("view_financeiro");
  const { data: contract, isLoading, error } = useQuery({
    queryKey: [CONTRACT_KEY, String(contractId)],
    queryFn: () => commercialApi.get<Contract>(`contracts/${contractId}`),
  });
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (error || !contract) return <p className="text-sm text-destructive">Não foi possível carregar a venda: {errorMessage(error)}</p>;
  const classes = [...contract.classes.flatMap((slot) => slot.classes), ...(contract.otherClasses ?? [])];
  const works = contract.works;
  const openBoletins = works?.measurements.filter((m) => !m.record).length ?? 0;
  return (
    <div className="grid gap-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/comercial/contratos/$contractId" params={{ contractId: String(contract.id) }} className="font-semibold tabular-nums hover:underline">{contract.number}</Link>
        <ContractStatusBadge status={contract.status} />
        <span className="text-muted-foreground">fechada em {dateBr(contract.acceptedAt)}</span>
        <span className="ml-auto font-semibold tabular-nums">{money(contract.value)}</span>
      </div>
      {seeMoney && (
        <div className="grid grid-cols-3 gap-2">
          {[["Faturado", contract.billed], ["Recebido", contract.received], [works ? "Saldo a medir" : "A faturar", works ? works.summary.balance : contract.toBill]].map(([label, value]) => (
            <div key={String(label)} className="rounded-md border px-2 py-1.5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-semibold tabular-nums">{money(Number(value))}</p>
            </div>
          ))}
        </div>
      )}
      {(contract.serviceOrder || contract.rentals?.length || classes.length > 0) && (
        <div className="grid gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Execução</p>
          {contract.serviceOrder && (
            <p><Icon name="hard-hat" className="w-3.5 h-3.5 inline mr-1" />
              <Link to="/servicos/ordens-de-servico/$orderId" params={{ orderId: String(contract.serviceOrder.id) }} className="underline">{contract.serviceOrder.number}</Link>
            </p>
          )}
          {contract.rentals?.map((rental) => (
            <p key={rental.id}><Icon name="truck" className="w-3.5 h-3.5 inline mr-1" />
              <Link to="/suprimentos/locacoes/$rentalId" params={{ rentalId: String(rental.id) }} className="underline">{rental.number}</Link>
            </p>
          ))}
          {classes.map((klass) => (
            <p key={klass.id}><Icon name="graduation-cap" className="w-3.5 h-3.5 inline mr-1" />
              <Link to="/treinamentos/turmas/$turmaId" params={{ turmaId: String(klass.id) }} className="underline">{klass.name}</Link>
              {klass.initialDate ? ` · ${dateBr(klass.initialDate)}` : ""}
            </p>
          ))}
          {contract.kind === "treinamento" && classes.length === 0 && <p className="text-muted-foreground">Nenhuma turma criada ainda: crie pela venda.</p>}
        </div>
      )}
      {works && (
        <p className="text-muted-foreground">
          Medição de obra: {works.measurements.length} boletim(ns){openBoletins ? `, ${openBoletins} sem nota` : ""}{seeMoney ? ` · medido ${money(works.summary.measured)}` : ""}.
        </p>
      )}
      {!contract.customerOrder?.number && <p className="text-muted-foreground">Sem o número do pedido do cliente: informe na venda.</p>}
    </div>
  );
}
