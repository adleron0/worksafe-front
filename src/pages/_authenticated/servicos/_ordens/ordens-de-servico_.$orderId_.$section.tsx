import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import { errorMessage } from "../../comercial/-shared/commercial";
import { ACTIVITY_PERMISSION, ActivityPanel } from "../../comercial/-shared/activities";
import { ORDERS_ABILITY, ORDER_KEY, ORDER_STATUS_LABEL, Order, OrderStageBadge, RDO_PERMISSION, ordersApi } from "../-shared/orders";
import { DiaryPanel } from "../-shared/reports";
import { ResultPanel } from "../-shared/results";
import { DayCalendar, GanttChart, ProgressCurve, ProgressStrip, TIMELINE_KEY, Timeline } from "../-shared/timeline";
import { OrderMaterials } from "../-shared/materials";
import { TeamDocumentsPanel } from "../../rh/-shared/team-documents";
import { RecordFilesPanel } from "../../arquivos/-shared/record-files";

export const Route = createFileRoute("/_authenticated/servicos/_ordens/ordens-de-servico_/$orderId_/$section")({
  component: OrderSectionPage,
});

const SECTIONS: Array<{ id: string; name: string; icon: string }> = [
  { id: "diario", name: "Diário", icon: "notebook-pen" },
  { id: "materiais", name: "Materiais", icon: "package" },
  { id: "equipe", name: "Equipe", icon: "users" },
  { id: "arquivos", name: "Arquivos", icon: "folder" },
  { id: "resultado", name: "Resultado", icon: "chart-column" },
  { id: "historico", name: "Histórico", icon: "history" },
];
const EVENT_TEXT: Record<string, string> = { criada: "OS aberta", liberada: "Liberada", avancou: "Avançou", voltou: "Voltou", cancelada: "Cancelada" };
const dateTime = (value: string) => new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** Uma parte da operação da OS, em tela própria, com a navegação entre as partes. */
function OrderSectionPage() {
  const { orderId, section } = Route.useParams();
  const { can } = useVerify();
  const { data: order, isLoading, error } = useQuery({ queryKey: [ORDER_KEY, orderId], queryFn: () => ordersApi.get<Order>(orderId) });

  if (!can(`view_${ORDERS_ABILITY}`)) return null;
  if (error) return <div className="p-4"><p className="text-destructive font-medium">Erro: {errorMessage(error)}</p><Link to="/servicos/ordens-de-servico" className="underline text-sm">Voltar para as ordens de serviço</Link></div>;
  if (isLoading || !order) return <div className="grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-64 w-full" /></div>;

  const locked = order.status === "cancelada" || order.status === "encerrada";
  const visible = SECTIONS.filter((item) => item.id !== "resultado" || order.canSeeCosts);
  const current = visible.find((item) => item.id === section) ?? null;

  return (
    <div className="grid gap-4">
      <div>
        <Link to="/servicos/ordens-de-servico/$orderId" params={{ orderId }} className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Voltar para a OS {order.number}</Link>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <h1 className="text-xl font-bold">{current?.name ?? "OS"} · <span className="tabular-nums">{order.number}</span></h1>
          <OrderStageBadge status={order.status} late={order.late} />
        </div>
        <p className="text-sm text-muted-foreground truncate">{order.customer?.name} · {order.title}</p>
      </div>

      <nav className="-mx-1 overflow-x-auto" aria-label="Partes da OS">
        <ul className="flex gap-1 px-1 min-w-max border-b">
          <li><Link to="/servicos/ordens-de-servico/$orderId" params={{ orderId }} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground"><Icon name="file-text" className="w-4 h-4" /> Documento</Link></li>
          {visible.map((item) => (
            <li key={item.id}>
              <Link to="/servicos/ordens-de-servico/$orderId/$section" params={{ orderId, section: item.id }} aria-current={item.id === section ? "page" : undefined}
                className={cn("inline-flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px", item.id === section ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                <Icon name={item.icon} className="w-4 h-4" /> {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {!current && <p className="text-sm text-muted-foreground">Parte não encontrada. Escolha uma acima.</p>}
      {section === "diario" && <DiarySection order={order} />}
      {section === "materiais" && <OrderMaterials orderId={order.id} orderNumber={order.number} locked={locked} />}
      {section === "equipe" && <TeamSection order={order} />}
      {section === "arquivos" && <RecordFilesPanel entity="service_order" entityId={order.id} title="Arquivos da obra" hint="ART, projetos, autorizações e o que mais for desta ordem de serviço. Quem vê a OS vê os arquivos." />}
      {section === "resultado" && order.canSeeCosts && <ResultPanel orderId={order.id} />}
      {section === "historico" && <HistorySection order={order} />}
    </div>
  );
}

/** Cronograma × RDO: o planejado encontra o realizado. Depois, o diário com as horas e a lista de RDOs. */
function DiarySection({ order }: { order: Order }) {
  const { can } = useVerify();
  const running = ["em_execucao", "concluida", "encerrada"].includes(order.status);
  const { data: timeline, isLoading } = useQuery({ queryKey: [TIMELINE_KEY, String(order.id)], enabled: running, queryFn: () => ordersApi.get<Timeline>(`${order.id}/timeline`) });
  if (!running) return (
    <section className="rounded-card border bg-card p-4 text-sm text-muted-foreground">
      O diário começa quando a execução for iniciada (a OS está em "{ORDER_STATUS_LABEL[order.status]}"). O cronograma planejado já está na folha da OS.
    </section>
  );
  return (
    <>
      {isLoading && <Skeleton className="h-48 w-full" />}
      {timeline && (
        <>
          <section className="rounded-card border bg-card p-4 grid gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">Cronograma × realizado</h2>
                <p className="text-xs text-muted-foreground">Barras do cronograma{timeline.replanned ? " vigente (o da proposta aparece tracejado)" : ""} com o avanço informado nos RDOs.</p>
              </div>
              {can(`update_${ORDERS_ABILITY}`) && order.status !== "encerrada" && <Button asChild size="sm" variant="outline"><Link to="/servicos/ordens-de-servico/$orderId/editar" params={{ orderId: String(order.id) }} hash="cronograma"><Icon name="calendar-range" className="w-3.5 h-3.5 mr-1" /> Replanejar</Link></Button>}
            </div>
            <ProgressStrip timeline={timeline} />
            <GanttChart timeline={timeline} />
          </section>
          <div className="grid lg:grid-cols-2 gap-4">
            <section className="rounded-card border bg-card p-4">
              <h2 className="font-semibold">Dias da obra</h2>
              <p className="text-xs text-muted-foreground mb-3">Cada dia com a situação do RDO. Dia sem RDO é o que mais atrapalha as estatísticas.</p>
              <DayCalendar timeline={timeline} orderId={order.id} />
            </section>
            <section className="rounded-card border bg-card p-4">
              <h2 className="font-semibold">Previsto × feito</h2>
              <p className="text-xs text-muted-foreground mb-2">Avanço acumulado da obra, dia a dia.</p>
              <ProgressCurve timeline={timeline} />
            </section>
          </div>
        </>
      )}
      <DiaryPanel orderId={order.id} canEdit={can(RDO_PERMISSION) && order.status !== "encerrada"} />
    </>
  );
}

function TeamSection({ order }: { order: Order }) {
  const { can } = useVerify();
  return (
    <>
      <section className="rounded-card border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Equipe escalada</h2>
          {can(`update_${ORDERS_ABILITY}`) && order.status !== "encerrada" && order.status !== "cancelada" && <Button asChild size="sm" variant="outline"><Link to="/servicos/ordens-de-servico/$orderId/editar" params={{ orderId: String(order.id) }} hash="equipe"><Icon name="pencil" className="w-3.5 h-3.5 mr-1" /> Alterar a equipe</Link></Button>}
        </div>
        {order.team.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Ninguém escalado ainda.</p> : (
          <ul className="mt-2 divide-y text-sm">
            {order.team.map((member, index) => (
              <li key={index} className="py-1.5 flex flex-wrap items-center gap-x-3">
                <span className="font-medium">{member.name}</span>
                <span className="text-muted-foreground">{member.role}</span>
                {(member.from || member.to) && <span className="text-xs text-muted-foreground tabular-nums">{member.from?.split("-").reverse().join("/") ?? "…"} a {member.to?.split("-").reverse().join("/") ?? "…"}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <TeamDocumentsPanel orderId={order.id} orderNumber={order.number} />
    </>
  );
}

function HistorySection({ order }: { order: Order }) {
  const { can } = useVerify();
  return (
    <>
      <section className="rounded-card border bg-card p-4">
        <h2 className="font-semibold">Etapas da OS</h2>
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
      {order.proposal && can("list_comercial") && <ActivityPanel proposalId={order.proposal.id} canEdit={can(ACTIVITY_PERMISSION)} defaultContact={order.contactName} />}
    </>
  );
}
