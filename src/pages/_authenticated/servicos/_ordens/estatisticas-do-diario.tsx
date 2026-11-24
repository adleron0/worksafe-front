import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import DataTable, { DataColumn } from "@/components/general-components/DataTable";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { Tip, dateBr, decimal, errorMessage, todayIso } from "../../comercial/-shared/commercial";
import { ORDERS_ABILITY, OrderList, ordersApi } from "../-shared/orders";
import { CONDITION_OPTIONS, OCCURRENCE_OPTIONS, WEATHER_OPTIONS, hoursText, reportsApi } from "../-shared/reports";

export const Route = createFileRoute("/_authenticated/servicos/_ordens/estatisticas-do-diario")({
  component: DiaryStatsPage,
  validateSearch: (search: Record<string, unknown>): { os?: number } => (Number(search.os) > 0 ? { os: Number(search.os) } : {}),
});

interface Stats {
  period: { from: string; to: string }; orderId: number | null; reports: number; drafts: number; days: number; orders: number; stoppedDays: number;
  people: { presences: number; distinct: number; averagePerDay: number };
  hours: { normal: number; overtime: number; lost: number; perPresence: number };
  times: { reports: number; averageStart: string | null; averageEnd: string | null; averageSpan: number | null; earliestStart: string | null; latestEnd: string | null };
  earlyLeaves: { count: number; rate: number; reasons: Array<{ reason: string; count: number }> };
  weather: { start: Record<string, number>; end: Record<string, number>; changed: number };
  conditions: { start: Record<string, number>; end: Record<string, number> };
  occurrences: Array<{ type: string; count: number; hoursLost: number }>;
  byPerson: Array<{ name: string; role: string; days: number; hours: number; overtime: number; earlyLeaves: number }>;
  byRole: Array<{ role: string; presences: number; hours: number; overtime: number }>;
  byOrder: Array<{ id: number; number: string; title: string; customer: string; days: number; presences: number; hours: number; overtime: number; hoursLost: number; earlyLeaves: number }>;
  byDay: Array<{ date: string; people: number; hours: number; overtime: number; hoursLost: number }>;
}

const daysAgo = (days: number) => { const date = new Date(`${todayIso()}T12:00:00`); date.setDate(date.getDate() - days); return date.toISOString().slice(0, 10); };
const OCCURRENCE_NAME = Object.fromEntries(OCCURRENCE_OPTIONS.map((option) => [option.id, option.name]));

function Card({ title, value, detail, alert }: { title: string; value: string; detail?: string; alert?: boolean }) {
  return (
    <div className="rounded-card border bg-card p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className={cn("text-xl font-semibold tabular-nums", alert && "text-red-600 dark:text-red-400")}>{value}</p>
      {detail && <p className="text-xs text-muted-foreground tabular-nums">{detail}</p>}
    </div>
  );
}
function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border bg-card p-4">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}
/** Linhas com barra proporcional ao maior valor: a distribuição salta aos olhos sem gráfico. */
function Bars({ rows, empty }: { rows: Array<{ label: string; value: number; detail: string; icon?: string }>; empty: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (!rows.some((row) => row.value > 0)) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="grid gap-2">
      {rows.filter((row) => row.value > 0).map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate inline-flex items-center gap-1.5">{row.icon && <Icon name={row.icon} className="w-3.5 h-3.5 text-muted-foreground" />}{row.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{row.detail}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${(row.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
const tally = (options: Array<{ id: string; name: string; icon?: string }>, counts: Record<string, number>) => [
  ...options.map((option) => ({ label: option.name, value: counts[option.id] ?? 0, detail: `${counts[option.id] ?? 0} RDO`, icon: option.icon })),
  { label: "Sem registro", value: counts.sem_registro ?? 0, detail: `${counts.sem_registro ?? 0} RDO` },
];

type PersonStats = Stats["byPerson"][number];
type OrderStats = Stats["byOrder"][number];
const dash = <span className="text-muted-foreground">—</span>;
const PERSON_COLUMNS: DataColumn<PersonStats>[] = [
  { id: "name", header: "Pessoa", cell: (person) => <span><span className="font-medium">{person.name}</span>{person.role && <span className="text-xs text-muted-foreground"> · {person.role}</span>}</span> },
  { id: "days", header: "Dias", align: "right", cell: (person) => <span className="tabular-nums">{person.days}</span> },
  { id: "hours", header: "Horas", align: "right", cell: (person) => <span className="tabular-nums whitespace-nowrap">{hoursText(person.hours)}</span> },
  { id: "overtime", header: "Extras", align: "right", cell: (person) => <span className="tabular-nums whitespace-nowrap text-muted-foreground">{person.overtime ? hoursText(person.overtime) : "—"}</span> },
  { id: "early", header: "Saiu antes", align: "right", cell: (person) => <span className={cn("tabular-nums", person.earlyLeaves > 0 ? "font-semibold text-red-600 dark:text-red-400" : "text-muted-foreground")}>{person.earlyLeaves || "—"}</span> },
];
const ORDER_COLUMNS: DataColumn<OrderStats>[] = [
  {
    id: "order", header: "Obra",
    cell: (order) => (
      <div className="min-w-0 max-w-[16rem]">
        <p className="font-medium truncate">{order.customer}</p>
        <p className="text-xs text-muted-foreground tabular-nums truncate">{order.number}</p>
      </div>
    ),
  },
  { id: "days", header: "Dias", align: "right", cell: (order) => <span className="tabular-nums">{order.days}</span> },
  {
    id: "hours", header: "Horas", align: "right",
    cell: (order) => (
      <div className="tabular-nums whitespace-nowrap">
        {hoursText(order.hours)}
        {order.overtime > 0 && <p className="text-xs text-muted-foreground">+ {hoursText(order.overtime)} extras</p>}
      </div>
    ),
  },
  { id: "lost", header: "Paradas", align: "right", cell: (order) => (order.hoursLost ? <span className="tabular-nums whitespace-nowrap">{hoursText(order.hoursLost)}</span> : dash) },
  { id: "early", header: "Saiu antes", align: "right", cell: (order) => (order.earlyLeaves ? <span className="tabular-nums font-semibold text-red-600 dark:text-red-400">{order.earlyLeaves}</span> : dash) },
];

/** Estatísticas do diário: o que os RDOs de um período dizem sobre jornada, equipe, clima e paradas. */
function DiaryStatsPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(todayIso());
  const [orderId, setOrderId] = useState(search.os ? String(search.os) : "");
  const allowed = can(`view_${ORDERS_ABILITY}`);
  const params = { from, to, ...(orderId ? { orderId } : {}) };
  const { data, isLoading, error } = useQuery({
    queryKey: ["serviceReportStats", params], enabled: allowed && Boolean(from && to),
    queryFn: () => reportsApi.get<Stats>("service-reports/stats", params), placeholderData: (previous) => previous,
  });
  const { data: orders } = useQuery({ queryKey: ["serviceOrdersForStats"], enabled: allowed, staleTime: 5 * 60 * 1000, queryFn: () => ordersApi.get<OrderList>("", { limit: 200 }) });
  if (!allowed) return null;
  const maxDay = Math.max(1, ...(data?.byDay ?? []).map((day) => day.hours + day.overtime));

  return (
    <>
      <PageHeader title="Estatísticas do diário de obra" description="O que os RDOs do período dizem: jornada, presenças e horas, saídas antecipadas, clima, condição da frente de trabalho e paradas." />

      <div className="flex flex-col xl:flex-row xl:items-end gap-3 mb-4 p-4 rounded-card border bg-card">
        <div className="w-full xl:w-44"><p className="text-xs text-muted-foreground mb-1">De</p>
          <CalendarPicker mode="single" name="statsFrom" className="w-full" value={from} fromYear={2024} toYear={2040} onValueChange={(_, value) => setFrom(String(value ?? "") || from)} /></div>
        <div className="w-full xl:w-44"><p className="text-xs text-muted-foreground mb-1">Até</p>
          <CalendarPicker mode="single" name="statsTo" className="w-full" value={to} fromYear={2024} toYear={2040} onValueChange={(_, value) => setTo(String(value ?? "") || to)} /></div>
        <div className="w-full xl:w-96"><p className="text-xs text-muted-foreground mb-1">Obra</p>
          <Select name="statsOrder" state={orderId} clearable placeholder="Todas as obras" modal={false}
            options={(orders?.rows ?? []).map((order) => ({ id: String(order.id), name: `${order.number} · ${order.customer.name}` }))} onChange={(_, value) => setOrderId(String(value ?? ""))} /></div>
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {isLoading && <Skeleton className="h-40 w-full" />}
      {data && data.reports === 0 && <p className="rounded-lg border p-6 text-sm text-muted-foreground">Nenhum RDO neste período{orderId ? " para esta obra" : ""}.</p>}

      {data && data.reports > 0 && (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card title="RDOs no período" value={String(data.reports)} detail={`${data.days} dia${data.days === 1 ? "" : "s"} · ${data.orders} obra${data.orders === 1 ? "" : "s"}${data.drafts ? ` · ${data.drafts} em rascunho` : ""}`} />
            <Card title="Horas trabalhadas" value={hoursText(data.hours.normal + data.hours.overtime)} detail={`${hoursText(data.hours.overtime)} extras · ${hoursText(data.hours.perPresence)} por pessoa por dia`} />
            <Card title="Jornada média" value={data.times.averageSpan === null ? "—" : hoursText(data.times.averageSpan)}
              detail={data.times.averageStart ? `entrada ${data.times.averageStart} · saída ${data.times.averageEnd}` : "sem RDO com hora de entrada e saída"} />
            <Card title="Equipe média por dia" value={decimal(data.people.averagePerDay, 1)} detail={`${data.people.presences} presenças · ${data.people.distinct} pessoa${data.people.distinct === 1 ? "" : "s"}`} />
            <Card title="Saídas antecipadas" value={String(data.earlyLeaves.count)} detail={`${decimal(data.earlyLeaves.rate, 1)}% das presenças`} alert={data.earlyLeaves.count > 0} />
            <Card title="Dias parados" value={String(data.stoppedDays)} detail="clima impraticável, frente sem condição ou paralisação" alert={data.stoppedDays > 0} />
            <Card title="Horas paradas" value={hoursText(data.hours.lost)} detail="somadas das ocorrências" alert={data.hours.lost > 0} />
            <Card title="Entrada mais cedo e saída mais tarde" value={data.times.earliestStart ? `${data.times.earliestStart} – ${data.times.latestEnd}` : "—"} detail={`${data.times.reports} RDO com as duas horas`} />
          </div>

          <Block title="Horas por dia" hint="Cada barra é um dia com RDO: horas normais e extras de toda a equipe.">
            <div className="flex items-end gap-1 h-32 overflow-x-auto">
              {data.byDay.map((day) => (
                <Tip key={day.date} text={`${dateBr(day.date)}: ${day.people} pessoa${day.people === 1 ? "" : "s"}, ${hoursText(day.hours)}${day.overtime ? ` + ${hoursText(day.overtime)} extras` : ""}${day.hoursLost ? `, ${hoursText(day.hoursLost)} paradas` : ""}`}>
                  <div className="flex-1 min-w-[10px] max-w-10 h-full flex flex-col justify-end" aria-label={`${dateBr(day.date)}: ${hoursText(day.hours + day.overtime)}`}>
                    <div className="bg-amber-400 rounded-t-sm" style={{ height: `${(day.overtime / maxDay) * 100}%` }} />
                    <div className={cn("bg-primary", day.overtime === 0 && "rounded-t-sm", day.hours + day.overtime === 0 && "bg-muted h-1")} style={{ height: day.hours + day.overtime === 0 ? undefined : `${(day.hours / maxDay) * 100}%` }} />
                  </div>
                </Tip>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground tabular-nums"><span>{dateBr(data.byDay[0]?.date)}</span><span>{dateBr(data.byDay[data.byDay.length - 1]?.date)}</span></div>
            <p className="mt-1 text-xs text-muted-foreground"><span className="inline-block w-2 h-2 rounded-sm bg-primary mr-1" />normais <span className="inline-block w-2 h-2 rounded-sm bg-amber-400 ml-3 mr-1" />extras</p>
          </Block>

          <div className="grid gap-4 xl:grid-cols-2">
            <Block title="Por pessoa" hint="Dias trabalhados, horas e quantas vezes saiu antes.">
              <DataTable rows={data.byPerson} columns={PERSON_COLUMNS} getRowId={(person) => person.name} ariaLabel="Por pessoa" minWidth={420} />
            </Block>
            <div className="grid gap-4 content-start">
              <Block title="Por função"><Bars empty="Sem horas lançadas." rows={data.byRole.map((role) => ({ label: role.role, value: role.hours + role.overtime, detail: `${hoursText(role.hours)}${role.overtime ? ` + ${hoursText(role.overtime)} extras` : ""} · ${role.presences} presença${role.presences === 1 ? "" : "s"}` }))} /></Block>
              <Block title="Motivos de saída antecipada"><Bars empty="Ninguém saiu antes no período." rows={data.earlyLeaves.reasons.map((reason) => ({ label: reason.reason, value: reason.count, detail: `${reason.count}×` }))} /></Block>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Block title="Clima na entrada"><Bars empty="Sem registro." rows={tally(WEATHER_OPTIONS, data.weather.start)} /></Block>
            <Block title="Clima na saída" hint={data.weather.changed ? `Mudou durante o dia em ${data.weather.changed} RDO.` : undefined}><Bars empty="Sem registro." rows={tally(WEATHER_OPTIONS, data.weather.end)} /></Block>
            <Block title="Condição na entrada"><Bars empty="Sem registro." rows={tally(CONDITION_OPTIONS, data.conditions.start)} /></Block>
            <Block title="Condição na saída"><Bars empty="Sem registro." rows={tally(CONDITION_OPTIONS, data.conditions.end)} /></Block>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Block title="Ocorrências"><Bars empty="Nenhuma ocorrência no período." rows={data.occurrences.map((item) => ({ label: OCCURRENCE_NAME[item.type] ?? item.type, value: item.count, detail: `${item.count}×${item.hoursLost ? ` · ${hoursText(item.hoursLost)} paradas` : ""}` }))} /></Block>
            {!orderId && (
              <Block title="Por obra">
                <DataTable rows={data.byOrder} columns={ORDER_COLUMNS} getRowId={(order) => order.id} ariaLabel="Por obra" minWidth={480}
                  onRowClick={(order) => navigate({ to: "/servicos/ordens-de-servico/$orderId", params: { orderId: String(order.id) } })} />
              </Block>
            )}
          </div>
        </div>
      )}
    </>
  );
}
