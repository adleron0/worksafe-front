import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input as ShadInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { Tip, dateBr, errorMessage } from "../../comercial/-shared/commercial";
import { ACTIVITY_PERMISSION, ActivityPanel } from "../../comercial/-shared/activities";
import { formatCnpj } from "../../comercial/-shared/proposals";
import {
  ChecklistItem, MoveDialog, ORDERS_ABILITY, ORDERS_KEY, ORDER_KEY, ORDER_STAGES, ORDER_STATUS_LABEL, Order, OrderOptions, OrderStageBadge, OrderStatus, RDO_PERMISSION, ScopeItem, TeamMember,
  isForward, moveLabel, nextStage, ordersApi,
} from "../-shared/orders";
import { DiaryPanel } from "../-shared/reports";
import { TEAM_OPTIONS_KEY, TeamEditor } from "../-shared/team";
import { ResultPanel } from "../-shared/results";
import { OrderPurchasesPanel } from "../../suprimentos/-shared/purchases";

export const Route = createFileRoute("/_authenticated/servicos/_ordens/ordens-de-servico_/$orderId")({
  component: OrderPage,
});

const dateTime = (value: string) => new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const UNIT: Record<string, [string, string]> = { dia: ["dia", "dias"], semana: ["semana", "semanas"], mes: ["mês", "meses"] };
const quantityText = (item: ScopeItem) => {
  const quantity = Number.isInteger(item.quantity) ? String(item.quantity) : String(item.quantity).replace(".", ",");
  if (item.type === "mao_de_obra") return `${quantity} profissional${item.quantity === 1 ? "" : "is"}${item.workDays ? ` · ${item.workDays} dia${item.workDays === 1 ? "" : "s"}` : ""}`;
  return `${quantity}${item.unit ? ` ${item.unit}` : ""}`;
};
const EVENT_TEXT: Record<string, string> = { criada: "OS aberta", liberada: "Liberada", avancou: "Avançou", voltou: "Voltou", cancelada: "Cancelada" };

interface Agenda { plannedStart: string; plannedEnd: string; responsibleUserId: string; location: string; contactName: string; contactPhone: string; notes: string; team: TeamMember[] }
const agendaOf = (order: Order): Agenda => ({
  plannedStart: order.plannedStart ?? "", plannedEnd: order.plannedEnd ?? "", responsibleUserId: order.responsible ? String(order.responsible.id) : "",
  location: order.location ?? "", contactName: order.contactName ?? "", contactPhone: order.contactPhone ?? "", notes: order.notes ?? "", team: order.team,
});

function OrderPage() {
  const { orderId } = Route.useParams();
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [moving, setMoving] = useState<OrderStatus | null>(null);
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [newItem, setNewItem] = useState("");

  const { data: order, isLoading, error } = useQuery({ queryKey: [ORDER_KEY, orderId], queryFn: () => ordersApi.get<Order>(orderId) });
  const { data: options } = useQuery({ queryKey: ["serviceOrderOptions"], staleTime: 5 * 60 * 1000, queryFn: () => ordersApi.get<OrderOptions>("options") });
  useEffect(() => { if (order) setAgenda(agendaOf(order)); }, [order]);

  const apply = (result: Order) => {
    queryClient.setQueryData([ORDER_KEY, orderId], result);
    queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
    queryClient.invalidateQueries({ queryKey: [TEAM_OPTIONS_KEY] });
  };
  const fail = (title: string) => (err: unknown) => toast({ title, description: errorMessage(err), variant: "destructive" });
  const { mutate: saveAgenda, isPending: saving } = useMutation({
    mutationFn: (value: Agenda) => ordersApi.put<Order>(orderId, { ...value, plannedStart: value.plannedStart || null, plannedEnd: value.plannedEnd || null, responsibleUserId: value.responsibleUserId || null }),
    onSuccess: (result) => { apply(result); toast({ title: "Ordem de serviço salva", variant: "success" }); },
    onError: fail("Não foi possível salvar"),
  });
  // a conferência grava a cada clique: é o que o encarregado faz no dia a dia
  const { mutate: saveChecklist, isPending: checking } = useMutation({
    mutationFn: (checklist: ChecklistItem[]) => ordersApi.put<Order>(orderId, { checklist }),
    onSuccess: apply,
    onError: fail("Não foi possível salvar a conferência"),
  });

  if (!can(`view_${ORDERS_ABILITY}`)) return null;
  if (error) return <div className="p-4"><p className="text-destructive font-medium">Erro: {errorMessage(error)}</p><Link to="/servicos/ordens-de-servico" className="underline text-sm">Voltar para as ordens de serviço</Link></div>;
  if (isLoading || !order || !agenda) return <div className="grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;

  const canUpdate = can(`update_${ORDERS_ABILITY}`);
  const locked = order.status === "cancelada" || order.status === "encerrada";
  const editable = canUpdate && !locked;
  const next = nextStage(order.status);
  const others = order.nextStatuses.filter((target) => target !== next);
  const dirty = JSON.stringify(agenda) !== JSON.stringify(agendaOf(order));
  const set = <K extends keyof Agenda>(key: K, value: Agenda[K]) => setAgenda((current) => (current ? { ...current, [key]: value } : current));
  const stageIndex = ORDER_STAGES.findIndex((stage) => stage.id === order.status);
  const done = order.checklist.filter((item) => item.done).length;
  const unit = UNIT[order.schedule?.unit ?? "dia"];

  return (
    <>
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/servicos/ordens-de-servico" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Ordens de serviço</Link>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h1 className="text-xl font-bold tabular-nums">{order.number}</h1>
            <OrderStageBadge status={order.status} late={order.late} />
          </div>
          <p className="text-sm text-muted-foreground truncate">{order.customer?.name} · {order.title}</p>
        </div>
        {canUpdate && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {next && <Button type="button" onClick={() => setMoving(next)}><Icon name="arrow-right" className="w-4 h-4 mr-1" /> {moveLabel(order.status, next)}</Button>}
            {others.length > 0 && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="gap-1">Mais ações <Icon name="chevron-down" className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {others.map((target) => (
                    <DropdownMenuItem key={target} className="gap-2" onSelect={() => setMoving(target)}>
                      <Icon name={target === "cancelada" ? "ban" : isForward(order.status, target) ? "arrow-right" : "undo-2"} className="w-3 h-3" /> {moveLabel(order.status, target)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>

      {/* onde a OS está na esteira */}
      {order.status !== "cancelada" && (
        <ol className="my-4 flex flex-wrap items-center gap-x-1 gap-y-2 text-xs" aria-label="Etapas da ordem de serviço">
          {ORDER_STAGES.map((stage, index) => (
            <li key={stage.id} className="flex items-center gap-1">
              <Tip text={stage.hint}>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1", index === stageIndex ? "border-primary bg-primary/10 font-semibold text-foreground" : index < stageIndex ? "text-foreground" : "text-muted-foreground")}>
                  {index < stageIndex ? <Icon name="check" className="w-3 h-3 text-primary" /> : <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />} {stage.name}
                </span>
              </Tip>
              {index < ORDER_STAGES.length - 1 && <span className="w-4 border-t" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      )}
      {order.status === "cancelada" && <p className="my-4 rounded-md border px-3 py-2 text-sm text-muted-foreground">Ordem de serviço cancelada{order.statusNote ? `: ${order.statusNote}` : "."}</p>}
      {order.status === "a_liberar" && (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Esperando o pedido do cliente. Quando o Comercial informar o número na proposta aceita, esta OS segue sozinha para a mobilização.
        </p>
      )}

      <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <div className="grid gap-4 min-w-0">
          <section className="rounded-lg border p-4">
            <h2 className="font-semibold">O que foi vendido</h2>
            <p className="text-xs text-muted-foreground">O escopo veio da proposta aceita. Valores não aparecem aqui.</p>
            {order.description && <p className="mt-2 text-sm whitespace-pre-wrap">{order.description}</p>}
            {order.scope.length === 0 && <p className="mt-3 text-sm text-muted-foreground">A proposta não tinha itens de serviço.</p>}
            {order.scope.map((section) => (
              <div key={section.title} className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</p>
                <ul className="mt-1 divide-y text-sm">
                  {section.items.map((item, index) => (
                    <li key={index} className="py-1.5 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-x-4">
                      <span className="min-w-0 break-words">
                        {item.description}
                        {[item.night && "noturno", item.weekend && "fim de semana", item.travel && "com deslocamento", item.overtimeHours > 0 && `${item.overtimeHours} h extras`].filter(Boolean).length > 0 && (
                          <span className="text-xs text-muted-foreground"> · {[item.night && "noturno", item.weekend && "fim de semana", item.travel && "com deslocamento", item.overtimeHours > 0 && `${item.overtimeHours} h extras`].filter(Boolean).join(" · ")}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-muted-foreground tabular-nums">{quantityText(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          {/* com a obra andando, o diário vem primeiro: é o que se usa todo dia */}
          {(order.status === "em_execucao" || order.status === "concluida" || order.status === "encerrada") && <DiaryPanel orderId={order.id} canEdit={can(RDO_PERMISSION) && order.status !== "encerrada"} />}
          <OrderPurchasesPanel orderId={order.id} canRequest={!locked} />
          {order.canSeeCosts && <ResultPanel orderId={order.id} />}

          {order.schedule && order.schedule.steps.length > 0 && (
            <section className="rounded-lg border p-4">
              <h2 className="font-semibold">Cronograma planejado</h2>
              <p className="text-xs text-muted-foreground">Como foi combinado na proposta, contado a partir do início da obra.</p>
              <ul className="mt-2 divide-y text-sm">
                {order.schedule.steps.map((step, index) => (
                  <li key={index} className="py-1.5 flex items-baseline justify-between gap-4">
                    <span className="min-w-0 break-words">{step.title}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {unit[0]} {step.start}{step.duration > 1 ? ` a ${step.start + step.duration - 1}` : ""} · {step.duration} {step.duration === 1 ? unit[0] : unit[1]}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-lg border p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold">Mobilização</h2>
              <span className="text-xs text-muted-foreground tabular-nums">{done} de {order.checklist.length} conferidos</span>
            </div>
            <p className="text-xs text-muted-foreground">O que precisa estar pronto antes de a equipe sair. Marcar grava na hora.</p>
            <ul className="mt-2 divide-y">
              {order.checklist.map((item, index) => (
                <li key={item.id ?? index} className="py-2 flex items-start gap-2 text-sm">
                  <Checkbox id={`check-${index}`} className="mt-0.5" checked={item.done} disabled={!editable || checking}
                    onCheckedChange={(checked) => saveChecklist(order.checklist.map((current, i) => (i === index ? { ...current, done: checked === true } : current)))} />
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`check-${index}`} className={cn("cursor-pointer font-normal", item.done && "text-muted-foreground line-through")}>{item.title}</Label>
                    {item.done && item.doneAt && <p className="text-xs text-muted-foreground">{item.doneBy} · {dateTime(item.doneAt)}</p>}
                  </div>
                  {editable && (
                    <Tip text="Tirar da conferência">
                      <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" aria-label={`Remover ${item.title}`} disabled={checking}
                        onClick={() => saveChecklist(order.checklist.filter((_, i) => i !== index))}><Icon name="x" className="w-3 h-3" /></Button>
                    </Tip>
                  )}
                </li>
              ))}
            </ul>
            {editable && (
              <form className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (!newItem.trim()) return; saveChecklist([...order.checklist, { title: newItem.trim(), done: false }]); setNewItem(""); }}>
                <ShadInput value={newItem} maxLength={160} placeholder="Acrescentar um item a esta OS" onChange={(event) => setNewItem(event.target.value)} />
                <Button type="submit" variant="outline" disabled={!newItem.trim() || checking}><Icon name="plus" className="w-4 h-4 mr-1" /> Incluir</Button>
              </form>
            )}
          </section>

          {order.proposal && can("list_comercial") && <ActivityPanel proposalId={order.proposal.id} canEdit={can(ACTIVITY_PERMISSION)} defaultContact={order.contactName} />}

          <section className="rounded-lg border p-4">
            <h2 className="font-semibold">Histórico</h2>
            <ul className="mt-2 grid gap-2 text-sm">
              {order.events.map((event) => (
                <li key={event.id} className="border-l-2 pl-3">
                  <p><b>{EVENT_TEXT[event.type] ?? event.type}</b>{event.to ? <> para <b>{ORDER_STATUS_LABEL[event.to]}</b></> : null} <span className="text-muted-foreground">· {dateTime(event.at)}{event.user ? ` · ${event.user}` : ""}</span></p>
                  {event.note && <p className="text-muted-foreground">{event.note}</p>}
                </li>
              ))}
            </ul>
            {order.conclusionNotes && <p className="mt-3 text-sm"><span className="text-muted-foreground">Entrega: </span>{order.conclusionNotes}</p>}
          </section>
        </div>

        <aside className="grid gap-4">
          <section className="rounded-lg border p-4 grid gap-3">
            <div>
              <h2 className="font-semibold">Agenda e equipe</h2>
              {(order.startedAt || order.finishedAt) && (
                <p className="text-xs text-muted-foreground">Real: começou em {dateBr(order.startedAt)}{order.finishedAt ? ` e terminou em ${dateBr(order.finishedAt)}` : ""}.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Início previsto</Label>
                <CalendarPicker mode="single" name="plannedStart" className="mt-1 w-full" value={agenda.plannedStart} disabled={!editable} placeholder="A definir" fromYear={2024} toYear={2040}
                  onValueChange={(_, value) => set("plannedStart", String(value ?? ""))} /></div>
              <div><Label className="text-xs">Término previsto</Label>
                <CalendarPicker mode="single" name="plannedEnd" className="mt-1 w-full" value={agenda.plannedEnd} disabled={!editable} placeholder="A definir" fromYear={2024} toYear={2040}
                  onValueChange={(_, value) => set("plannedEnd", String(value ?? ""))} /></div>
            </div>
            <div><Label className="text-xs">Responsável</Label>
              <Select name="responsibleUserId" state={agenda.responsibleUserId} clearable disabled={!editable} placeholder="Ninguém definido" modal={false}
                options={(options?.users ?? []).map((user) => ({ id: String(user.id), name: user.name }))} onChange={(_, value) => set("responsibleUserId", String(value ?? ""))} /></div>
            <div>
              <Label className="text-xs">Equipe escalada</Label>
              <TeamEditor orderId={order.id} team={agenda.team} onChange={(team) => set("team", team)} editable={editable} from={agenda.plannedStart || order.startedAt || ""} to={agenda.plannedEnd || order.finishedAt || ""}
                users={options?.users ?? []} />
            </div>
            <div><Label htmlFor="orderLocation" className="text-xs">Local do serviço</Label>
              <ShadInput id="orderLocation" className="mt-1" maxLength={300} value={agenda.location} disabled={!editable} onChange={(event) => set("location", event.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="orderContact" className="text-xs">Contato no cliente</Label>
                <ShadInput id="orderContact" className="mt-1" maxLength={160} value={agenda.contactName} disabled={!editable} onChange={(event) => set("contactName", event.target.value)} /></div>
              <div><Label htmlFor="orderPhone" className="text-xs">Telefone</Label>
                <ShadInput id="orderPhone" className="mt-1" maxLength={60} value={agenda.contactPhone} disabled={!editable} onChange={(event) => set("contactPhone", event.target.value)} /></div>
            </div>
            <div><Label htmlFor="orderNotes" className="text-xs">Observações da operação</Label>
              <Textarea id="orderNotes" className="mt-1" rows={3} maxLength={5000} value={agenda.notes} disabled={!editable} onChange={(event) => set("notes", event.target.value)} /></div>
            {editable && <Button type="button" disabled={!dirty || saving} onClick={() => saveAgenda(agenda)}>{saving ? "Salvando..." : "Salvar"}</Button>}
          </section>

          <section className="rounded-lg border p-4 text-sm grid gap-1">
            <h2 className="font-semibold text-base">Pedido do cliente</h2>
            {order.customerOrder?.number || order.customerOrder?.fileUrl ? (
              <>
                <p><span className="text-muted-foreground">Número: </span><b>{order.customerOrder.number || "não informado"}</b>{order.customerOrder.date ? <span className="text-muted-foreground"> · de {dateBr(order.customerOrder.date)}</span> : null}</p>
                {order.customerOrder.fileUrl && <a href={order.customerOrder.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1 underline"><Icon name="paperclip" className="w-3.5 h-3.5" /> {order.customerOrder.fileName || "Abrir o arquivo"}</a>}
              </>
            ) : <p className="text-amber-700 dark:text-amber-400">Ainda não chegou. Quem informa é o Comercial, na proposta aceita.</p>}
          </section>

          <section className="rounded-lg border p-4 text-sm grid gap-1">
            <h2 className="font-semibold text-base">Cliente</h2>
            <p className="font-medium">{order.customer?.corporateName}</p>
            {order.customer?.cnpj && <p className="text-muted-foreground">CNPJ {formatCnpj(order.customer.cnpj)}</p>}
            <p className="text-muted-foreground">{[order.customer?.email, order.customer?.phone].filter(Boolean).join(" · ")}</p>
            {order.proposal && can("view_comercial") && (
              <p className="mt-2">Proposta <Link to="/comercial/propostas/$proposalId" params={{ proposalId: String(order.proposal.id) }} className="underline font-medium">{order.proposal.number}</Link></p>
            )}
          </section>

        </aside>
      </div>

      {moving && <MoveDialog order={order} target={moving} onClose={() => setMoving(null)} onDone={apply} />}
    </>
  );
}
