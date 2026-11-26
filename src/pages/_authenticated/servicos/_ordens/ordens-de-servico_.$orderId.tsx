import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import Icon from "@/components/general-components/Icon";
import { EntityBadge } from "@/components/general-components/EntitySelect";
import { cn } from "@/lib/utils";
import tailwindUtils from "@/utils/tailwind.utils";
import { dateBr, errorMessage } from "../../comercial/-shared/commercial";
import {
  ChecklistItem, MoveDialog, ORDERS_ABILITY, ORDERS_KEY, ORDER_KEY, ORDER_SHEET_KEY, Order, OrderStageBadge, OrderStatus, RDO_PERMISSION,
  isForward, moveLabel, nextStage, ordersApi,
} from "../-shared/orders";
import { OrderSheet, OrderSheetData } from "../-shared/sheet";
import { ProgressStrip, TIMELINE_KEY, Timeline } from "../-shared/timeline";
import { PublicLinkDialog } from "../-shared/public-link";
import { TEAM_OPTIONS_KEY } from "../-shared/team";
import { TEAM_DOCUMENTS_KEY } from "../../rh/-shared/team-documents";
import { OrderPurchases, PURCHASES_KEY, purchasesApi } from "../../suprimentos/-shared/purchases";
import { useBotContext } from "@/pages/_authenticated/bots/-shared/bot-chat";

export const Route = createFileRoute("/_authenticated/servicos/_ordens/ordens-de-servico_/$orderId")({
  component: OrderPage,
});

/** Abre a impressão numa aba nova, já com o diálogo de imprimir. */
export const printOrder = (orderId: number | string, withValues: boolean) =>
  window.open(`/os/${orderId}/imprimir?auto=1${withValues ? "&valores=1" : ""}`, "_blank", "noopener");

/**
 * A OS é um documento: no centro, a folha que a equipe recebe (a mesma da
 * impressão). Em volta, a operação: diário, materiais, equipe, arquivos,
 * resultado e histórico, cada um resumido num cartão que abre a sua tela.
 */
function OrderPage() {
  const { orderId } = Route.useParams();
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [moving, setMoving] = useState<OrderStatus | null>(null);
  const [sharing, setSharing] = useState(false);
  const [showValues, setShowValues] = useState(false);

  const { data: order, isLoading, error } = useQuery({ queryKey: [ORDER_KEY, orderId], queryFn: () => ordersApi.get<Order>(orderId) });
  const withValues = showValues && !!order?.canSeeValues;
  const { data: sheet } = useQuery({
    queryKey: [ORDER_SHEET_KEY, orderId, withValues], enabled: !!order,
    queryFn: () => ordersApi.get<OrderSheetData>(`${orderId}/document`, withValues ? { values: 1 } : {}),
    placeholderData: (previous) => previous,
  });
  const running = !!order && ["em_execucao", "concluida", "encerrada"].includes(order.status);
  const { data: timeline } = useQuery({ queryKey: [TIMELINE_KEY, orderId], enabled: running, queryFn: () => ordersApi.get<Timeline>(`${orderId}/timeline`) });
  const { data: purchases } = useQuery({ queryKey: [PURCHASES_KEY, "os", Number(orderId)], enabled: !!order, retry: false, queryFn: () => purchasesApi.get<OrderPurchases>(`service-order/${orderId}`) });
  useBotContext({ entity: "os", id: Number(orderId) || undefined, label: "OS", title: order ? `${order.number} · ${order.title}` : undefined });

  const apply = (result: Order) => {
    queryClient.setQueryData([ORDER_KEY, orderId], result);
    for (const key of [ORDERS_KEY, TEAM_OPTIONS_KEY, TEAM_DOCUMENTS_KEY, ORDER_SHEET_KEY, TIMELINE_KEY]) queryClient.invalidateQueries({ queryKey: [key] });
  };
  // a conferência grava a cada clique, direto na folha: é o que o encarregado faz no dia a dia
  const { mutate: saveChecklist, isPending: checking } = useMutation({
    mutationFn: (checklist: ChecklistItem[]) => ordersApi.put<Order>(orderId, { checklist }),
    onSuccess: apply,
    onError: (err) => toast({ title: "Não foi possível salvar a conferência", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`view_${ORDERS_ABILITY}`)) return null;
  if (error) return <div className="p-4"><p className="text-destructive font-medium">Erro: {errorMessage(error)}</p><Link to="/servicos/ordens-de-servico" className="underline text-sm">Voltar para as ordens de serviço</Link></div>;
  if (isLoading || !order) return <div className="grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-[70vh] w-full" /></div>;

  const canUpdate = can(`update_${ORDERS_ABILITY}`);
  const canRdo = can(RDO_PERMISSION);
  const locked = order.status === "cancelada" || order.status === "encerrada";
  const editable = canUpdate && !locked;
  const next = nextStage(order.status);
  const others = order.nextStatuses.filter((target) => target !== next);
  const today = timeline?.today;
  const todayDay = timeline?.days.find((day) => day.date === today);
  const missing = timeline?.days.filter((day) => day.state === "sem_rdo" && !day.weekend).length ?? 0;
  const waiting = purchases?.rows.filter((row) => row.status === "solicitado").length ?? 0;
  const pendingChecks = order.checklist.filter((item) => !item.done).length;
  const beforeStart = ["a_liberar", "a_mobilizar", "agendada"].includes(order.status);
  const canWriteRdo = canRdo && (order.status === "em_execucao" || order.status === "concluida");

  // pendências que pedem ação, no topo
  const pending: Array<{ text: string; to?: string; tone: "warn" | "danger" }> = [];
  if (beforeStart && pendingChecks > 0) pending.push({ text: `Mobilização: ${pendingChecks} item${pendingChecks === 1 ? "" : "s"} a conferir`, tone: "warn" });
  if (order.status === "em_execucao" && todayDay && todayDay.state === "sem_rdo") pending.push({ text: "RDO de hoje não lançado", to: "diario", tone: "danger" });
  if (missing > (todayDay?.state === "sem_rdo" ? 1 : 0)) pending.push({ text: `${missing} dia${missing === 1 ? "" : "s"} de obra sem RDO`, to: "diario", tone: "danger" });
  if (waiting > 0) pending.push({ text: `${waiting} pedido${waiting === 1 ? "" : "s"} de compra esperando aprovação`, to: "materiais", tone: "warn" });
  if (!order.customerOrder?.number && order.status === "a_liberar") pending.push({ text: "Esperando o pedido do cliente (o Comercial informa)", tone: "warn" });
  if (!order.plannedStart && beforeStart) pending.push({ text: "Sem data de início", tone: "warn" });

  return (
    <>
      {/* cabeçalho e ações */}
      <div className="no-print flex flex-col lg:flex-row lg:items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/servicos/ordens-de-servico" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Ordens de serviço</Link>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h1 className="text-xl font-bold tabular-nums">{order.number}</h1>
            <OrderStageBadge status={order.status} late={order.late} />
            <EntityBadge id={order.entityId} />
            {order.publicEnabled && <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground"><Icon name="eye" className="w-3 h-3" /> cliente acompanha</span>}
          </div>
          <p className="text-sm text-muted-foreground truncate">{order.customer?.name} · {order.title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canWriteRdo && !canUpdate && (
            <Button asChild><Link to="/servicos/ordens-de-servico/$orderId/rdo/$reportId" params={{ orderId, reportId: todayDay?.reports[0] ? String(todayDay.reports[0].id) : "novo" }}><Icon name="clipboard-pen" className="w-4 h-4 mr-1" /> {todayDay?.reports[0] ? "Abrir o RDO de hoje" : "Lançar o RDO de hoje"}</Link></Button>
          )}
          {canUpdate && next && <Button type="button" onClick={() => setMoving(next)}><Icon name="arrow-right" className="w-4 h-4 mr-1" /> {moveLabel(order.status, next)}</Button>}
          {editable && <Button asChild variant="outline"><Link to="/servicos/ordens-de-servico/$orderId/editar" params={{ orderId }}><Icon name="pencil" className="w-4 h-4 mr-1" /> Editar a OS</Link></Button>}
          {order.canSeeValues ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild><Button type="button" variant="outline" className="gap-1"><Icon name="printer" className="w-4 h-4" /> Imprimir <Icon name="chevron-down" className="w-3.5 h-3.5" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="gap-2" onSelect={() => printOrder(orderId, false)}><Icon name="file-text" className="w-3.5 h-3.5" /> Sem valores (para a equipe)</DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onSelect={() => printOrder(orderId, true)}><Icon name="badge-dollar-sign" className="w-3.5 h-3.5" /> Com valores (uso interno)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button type="button" variant="outline" onClick={() => printOrder(orderId, false)}><Icon name="printer" className="w-4 h-4 mr-1" /> Imprimir</Button>
          )}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild><Button type="button" variant="outline" aria-label="Mais ações"><Icon name="ellipsis" className="w-4 h-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2" onSelect={() => setSharing(true)}><Icon name="link" className="w-3.5 h-3.5" /> Link do cliente{order.publicEnabled ? " (ligado)" : ""}</DropdownMenuItem>
              {canUpdate && others.length > 0 && <><DropdownMenuSeparator /><DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Etapa</DropdownMenuLabel></>}
              {canUpdate && others.map((target) => (
                <DropdownMenuItem key={target} className="gap-2" onSelect={() => setMoving(target)}>
                  <Icon name={target === "cancelada" ? "ban" : isForward(order.status, target) ? "arrow-right" : "undo-2"} className="w-3.5 h-3.5" /> {moveLabel(order.status, target)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* faixa de situação */}
      {(timeline || pending.length > 0 || order.status === "cancelada") && (
        <div className="no-print mt-3 rounded-card border bg-card px-4 py-2.5 grid gap-1.5">
          {order.status === "cancelada" && <p className="text-sm text-muted-foreground">Ordem de serviço cancelada{order.statusNote ? `: ${order.statusNote}` : "."}</p>}
          {timeline && <ProgressStrip timeline={timeline} />}
          {pending.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Pendências">
              {pending.map((item) => {
                const chip = <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", item.tone === "danger" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200")}><Icon name="circle-alert" className="w-3 h-3" /> {item.text}</span>;
                return <li key={item.text}>{item.to ? <Link to="/servicos/ordens-de-servico/$orderId/$section" params={{ orderId, section: item.to }}>{chip}</Link> : chip}</li>;
              })}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4 grid xl:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
        {/* o documento */}
        <div className="min-w-0 grid gap-2">
          <div className="no-print flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Esta é a folha que a equipe recebe e que sai na impressão.{editable ? " Marque a mobilização direto nela." : ""}</span>
            {order.canSeeValues && (
              <label className="inline-flex items-center gap-2"><Switch checked={showValues} onCheckedChange={setShowValues} aria-label="Mostrar valores na folha" /> Mostrar valores</label>
            )}
          </div>
          {sheet ? (
            <OrderSheet data={sheet} checking={checking}
              onToggleCheck={editable ? (index) => saveChecklist(order.checklist.map((item, i) => (i === index ? { ...item, done: !item.done } : item))) : undefined} />
          ) : <Skeleton className="h-[70vh] w-full" />}
        </div>

        {/* a operação */}
        <aside className="no-print grid gap-2 content-start" aria-label="Operação da obra">
          <OpCard to="diario" orderId={orderId} icon="notebook-pen" title="Diário de obra (RDO)"
            line={!running ? "Começa quando a execução for iniciada" : todayDay ? `Hoje: ${todayDay.state === "sem_rdo" ? "sem RDO" : todayDay.state === "fechado" ? "RDO fechado" : todayDay.state === "parado" ? "parado" : "RDO em rascunho"}` : `${timeline?.summary.reports ?? 0} RDOs`}
            detail={running && timeline ? `${timeline.summary.reports} RDO${timeline.summary.reports === 1 ? "" : "s"} · cronograma, curva e estatísticas` : "Cronograma × RDO e estatísticas"}
            alert={running && missing > 0 ? `${missing} dia${missing === 1 ? "" : "s"} sem RDO` : undefined}
            action={canWriteRdo ? { label: todayDay?.reports[0] ? "Abrir hoje" : "Novo RDO", reportId: todayDay?.reports[0] ? String(todayDay.reports[0].id) : "novo" } : undefined} />
          <OpCard to="materiais" orderId={orderId} icon="package" title="Materiais e compras"
            line={purchases ? `${purchases.rows.length} pedido${purchases.rows.length === 1 ? "" : "s"} de compra` : "Compras e estoque da obra"}
            detail="Pedir material, acompanhar a compra e o que está na obra"
            alert={waiting > 0 ? `${waiting} esperando aprovação` : undefined} />
          <OpCard to="equipe" orderId={orderId} icon="users" title="Equipe e documentos"
            line={order.team.length ? `${order.team.length} pessoa${order.team.length === 1 ? "" : "s"} escalada${order.team.length === 1 ? "" : "s"}` : "Ninguém escalado"}
            detail="Documentos da equipe e pacote para a integração" />
          <OpCard to="arquivos" orderId={orderId} icon="folder" title="Arquivos da obra" line="ART, projetos, autorizações" />
          {order.canSeeCosts && <OpCard to="resultado" orderId={orderId} icon="chart-column" title="Resultado" line="Orçado × realizado × projeção" detail="Uso interno" />}
          <OpCard to="historico" orderId={orderId} icon="history" title="Histórico" line={order.events.length ? `Última: ${dateBr(order.events[order.events.length - 1].at.slice(0, 10))}` : "Sem eventos"} detail="Etapas e acompanhamento comercial" />

          <section className="rounded-card border bg-card p-3 text-sm grid gap-0.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pedido do cliente</p>
            {order.customerOrder?.number || order.customerOrder?.fileUrl ? (
              <>
                <p><b>{order.customerOrder.number || "sem número"}</b>{order.customerOrder.date ? <span className="text-muted-foreground"> · de {dateBr(order.customerOrder.date)}</span> : null}</p>
                {order.customerOrder.fileUrl && <a href={order.customerOrder.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1 underline text-xs"><Icon name="paperclip" className="w-3 h-3" /> {order.customerOrder.fileName || "Abrir o arquivo"}</a>}
              </>
            ) : <p className="text-amber-700 dark:text-amber-400">Ainda não chegou. Quem informa é o Comercial.</p>}
            {order.proposal && can("view_comercial") && <p className="mt-1 text-xs">Proposta <Link to="/comercial/propostas/$proposalId" params={{ proposalId: String(order.proposal.id) }} className="underline font-medium">{order.proposal.number}</Link></p>}
          </section>
        </aside>
      </div>

      {moving && <MoveDialog order={order} target={moving} onClose={() => setMoving(null)} onDone={apply} />}
      {sharing && <PublicLinkDialog orderId={order.id} orderNumber={order.number} canEdit={canUpdate} onClose={() => setSharing(false)} />}
    </>
  );
}

/** Cartão resumido de uma parte da operação: situação em uma linha e um alerta; abre a tela dela. */
function OpCard({ to, orderId, icon, title, line, detail, alert, action }: {
  to: string; orderId: string; icon: string; title: string; line: string; detail?: string; alert?: string; action?: { label: string; reportId: string };
}) {
  return (
    <div className={`relative rounded-card border bg-card p-3 hover:bg-muted/30 ${tailwindUtils.cardClickable}`}>
      <Link to="/servicos/ordens-de-servico/$orderId/$section" params={{ orderId, section: to }} className="flex gap-3 items-start after:absolute after:inset-0">
        <Icon name={icon} className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block text-sm">{line}</span>
          {detail && <span className="block text-xs text-muted-foreground">{detail}</span>}
          {alert && <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400"><Icon name="circle-alert" className="w-3 h-3" /> {alert}</span>}
        </span>
        <Icon name="chevron-right" className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
      </Link>
      {action && (
        <Button asChild size="sm" variant="outline" className="relative z-10 mt-2 h-7 w-full text-xs">
          <Link to="/servicos/ordens-de-servico/$orderId/rdo/$reportId" params={{ orderId, reportId: action.reportId }}><Icon name="plus" className="w-3 h-3 mr-1" /> {action.label}</Link>
        </Button>
      )}
    </div>
  );
}
