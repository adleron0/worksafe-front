import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Tip, dateBr } from "../../comercial/-shared/commercial";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import { DiarySummary } from "./reports";
import { dateShort } from "./sheet";

/** Cronograma × RDO (espelha `GET service-orders/:id/timeline`). */
export type DayState = "fechado" | "rascunho" | "devolvido" | "sem_rdo" | "parado" | "futuro";
export interface TimelineDay { date: string; state: DayState; weekend: boolean; reports: Array<{ id: number; status: string; returned: boolean }>; weather: string | null }
export interface TimelineStep { step: number; title: string; start: number; duration: number; details: string | null; from: string | null; to: string | null; percent: number; plannedPercent: number | null; baseline: { from: string | null; to: string | null } | null }
export interface Timeline {
  start: string | null; end: string | null; today: string; unit: string; replanned: boolean; done: number | null;
  days: TimelineDay[]; curve: Array<{ date: string; planned: number | null; done: number | null }>;
  projection: { date: string | null; delayDays: number | null; ratePerDay: number | null };
  steps: TimelineStep[]; summary: DiarySummary;
}
export const TIMELINE_KEY = "serviceOrderTimeline";

const pct = (value: number | null | undefined) => (value === null || value === undefined ? "—" : `${String(Math.round(value)).replace(".", ",")}%`);
const DAY_MS = 86400000;
const dayIndex = (start: string, date: string) => Math.round((new Date(`${date}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / DAY_MS);

/** Atrás do previsto: mais de 5 pontos abaixo. */
export const behind = (done: number | null | undefined, planned: number | null | undefined) => done !== null && done !== undefined && planned !== null && planned !== undefined && done + 5 < planned;

/** Faixa de situação: avanço × previsto, projeção de término. */
export function ProgressStrip({ timeline, compact }: { timeline: Timeline; compact?: boolean }) {
  const planned = timeline.curve.filter((point) => point.done !== null).at(-1)?.planned ?? null;
  const late = behind(timeline.done, planned);
  const { projection } = timeline;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-sm", compact && "text-xs")}>
      <span className="inline-flex items-center gap-2">
        <span className="font-semibold tabular-nums">Avanço {pct(timeline.done)}</span>
        <span className="relative h-2 w-28 rounded-full bg-muted overflow-hidden" aria-hidden="true">
          <span className={cn("absolute inset-y-0 left-0 rounded-full", late ? "bg-red-500" : "bg-primary")} style={{ width: `${Math.min(100, timeline.done ?? 0)}%` }} />
          {planned !== null && <span className="absolute inset-y-0 w-0.5 bg-foreground/70" style={{ left: `calc(${Math.min(100, planned)}% - 1px)` }} />}
        </span>
        <span className="text-muted-foreground tabular-nums">previsto {pct(planned)}</span>
        {late && <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium"><Icon name="triangle-alert" className="w-3.5 h-3.5" /> abaixo do previsto</span>}
      </span>
      {projection.date && (
        <span className="text-muted-foreground">
          Término previsto {timeline.end ? dateBr(timeline.end) : "—"} → <span className={cn("font-medium", (projection.delayDays ?? 0) > 0 ? "text-red-600 dark:text-red-400" : "text-foreground")}>projeção {dateBr(projection.date)}</span>
          {(projection.delayDays ?? 0) > 0 ? ` (${projection.delayDays} dia${projection.delayDays === 1 ? "" : "s"} de atraso)` : (projection.delayDays ?? 0) < 0 ? " (adiantada)" : ""}
        </span>
      )}
    </div>
  );
}

/** Cronograma em barras: planejado (cinza), feito por cima, linha de base tracejada quando replanejado e a linha do "hoje". */
export function GanttChart({ timeline }: { timeline: Timeline }) {
  const days = timeline.days;
  if (!timeline.start || days.length === 0 || timeline.steps.length === 0) return <p className="text-sm text-muted-foreground">A proposta não tinha cronograma. Inclua as etapas em "Editar a OS" para acompanhar o avanço.</p>;
  const total = days.length;
  const at = (date: string | null) => (date ? (Math.min(total, Math.max(0, dayIndex(timeline.start!, date))) / total) * 100 : 0);
  const width = (from: string | null, to: string | null) => (from && to ? ((dayIndex(from, to) + 1) / total) * 100 : 0);
  const todayLeft = timeline.today >= timeline.start && dayIndex(timeline.start, timeline.today) < total ? ((dayIndex(timeline.start, timeline.today) + 0.5) / total) * 100 : null;
  // no máximo uns 5 rótulos de data, para não encavalar no celular
  const every = Math.max(1, Math.ceil(total / 5));
  const ticks = days.filter((_, index) => index % every === 0 && (total - 1 - index >= every / 2 || index === 0));
  return (
    <div className="grid gap-1.5" role="table" aria-label="Cronograma planejado e feito por etapa">
      <div className="grid grid-cols-[minmax(80px,32%)_1fr_40px] sm:grid-cols-[minmax(110px,180px)_1fr_44px] gap-2 text-[11px] text-muted-foreground" role="row">
        <span role="columnheader">Etapa</span>
        <div className="relative h-4" role="columnheader">
          {ticks.map((day) => <span key={day.date} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${((dayIndex(timeline.start!, day.date) + 0.5) / total) * 100}%` }}>{dateShort(day.date)}</span>)}
        </div>
        <span className="text-right" role="columnheader">Feito</span>
      </div>
      {timeline.steps.map((step) => {
        const late = behind(step.percent, step.plannedPercent);
        return (
          <div key={step.step} className="grid grid-cols-[minmax(80px,32%)_1fr_40px] sm:grid-cols-[minmax(110px,180px)_1fr_44px] gap-2 items-center text-sm" role="row">
            <Tip text={`${step.title}: ${dateBr(step.from)} a ${dateBr(step.to)}${step.plannedPercent !== null ? ` · previsto hoje ${pct(step.plannedPercent)}` : ""}${step.baseline ? ` · na proposta: ${dateBr(step.baseline.from)} a ${dateBr(step.baseline.to)}` : ""}`}>
              <span className="truncate" role="cell">{step.title}</span>
            </Tip>
            <div className="relative h-5 rounded bg-muted/50" role="cell">
              {step.baseline && <span className="absolute top-0.5 bottom-0.5 rounded border border-dashed border-muted-foreground/70" style={{ left: `${at(step.baseline.from)}%`, width: `${width(step.baseline.from, step.baseline.to)}%` }} aria-hidden="true" />}
              <span className="absolute top-1 bottom-1 rounded bg-muted-foreground/30" style={{ left: `${at(step.from)}%`, width: `${width(step.from, step.to)}%` }} aria-hidden="true" />
              {step.percent > 0 && <span className={cn("absolute top-1 bottom-1 rounded", late ? "bg-red-500" : "bg-primary")} style={{ left: `${at(step.from)}%`, width: `${(width(step.from, step.to) * Math.min(100, step.percent)) / 100}%` }} aria-hidden="true" />}
              {todayLeft !== null && <span className="absolute -top-0.5 -bottom-0.5 w-px bg-foreground" style={{ left: `${todayLeft}%` }} aria-hidden="true" />}
            </div>
            <span className={cn("text-right tabular-nums font-medium", late && "text-red-600 dark:text-red-400")} role="cell">{step.percent}%</span>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground mt-1">
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-4 rounded-sm bg-muted-foreground/30" /> planejado</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-4 rounded-sm bg-primary" /> feito</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-4 rounded-sm bg-red-500" /> feito, abaixo do previsto</span>
        {timeline.replanned && <span className="inline-flex items-center gap-1"><span className="h-2.5 w-4 rounded-sm border border-dashed border-muted-foreground" /> como estava na proposta</span>}
        <span className="inline-flex items-center gap-1"><span className="h-3 w-px bg-foreground" /> hoje</span>
      </div>
    </div>
  );
}

const DAY_STYLE: Record<DayState, { label: string; className: string; icon?: string }> = {
  fechado: { label: "RDO fechado", className: "bg-primary text-primary-foreground" },
  rascunho: { label: "RDO em rascunho", className: "bg-amber-300 text-amber-950 dark:bg-amber-500" },
  devolvido: { label: "RDO devolvido", className: "bg-orange-500 text-white", icon: "undo-2" },
  parado: { label: "Parado (chuva, frente impedida ou paralisação)", className: "bg-slate-600 text-white dark:bg-slate-400 dark:text-slate-950", icon: "pause" },
  sem_rdo: { label: "Sem RDO", className: "bg-background border-2 border-red-500 text-red-600 dark:text-red-400", icon: "x" },
  futuro: { label: "Ainda não chegou", className: "bg-muted text-muted-foreground" },
};

const CLIENT_EMPTY = { label: "Sem relatório publicado", className: "bg-background border text-muted-foreground" };

/** Calendário da obra: cada dia com a situação do RDO; o buraco (sem RDO) aparece. Clicar abre o RDO. */
export function DayCalendar({ timeline, orderId }: { timeline: Pick<Timeline, "days" | "today">; orderId?: number }) {
  // sem orderId é a página do cliente: dia sem relatório publicado é neutro (rascunho não aparece para ele)
  const styleOf = (state: DayState): { label: string; className: string; icon?: string } => (!orderId && state === "sem_rdo" ? CLIENT_EMPTY : DAY_STYLE[state]);
  if (timeline.days.length === 0) return <p className="text-sm text-muted-foreground">O calendário aparece quando a obra tem data de início.</p>;
  const missing = timeline.days.filter((day) => day.state === "sem_rdo" && !day.weekend).length;
  return (
    <div>
      <ul className="flex flex-wrap gap-1" aria-label="Dias da obra">
        {timeline.days.map((day) => {
          const style = styleOf(day.state);
          const label = `${dateBr(day.date)}${day.weekend ? " (fim de semana)" : ""}: ${style.label}`;
          const box = (
            <span className={cn("h-8 w-8 rounded text-[11px] font-medium tabular-nums flex items-center justify-center", style.className, day.weekend && day.state !== "fechado" && "opacity-50", day.date === timeline.today && "ring-2 ring-offset-1 ring-foreground")}>
              {style.icon && day.state !== "futuro" ? <Icon name={style.icon} className="w-3.5 h-3.5" aria-hidden="true" /> : day.date.slice(8, 10)}
            </span>
          );
          return (
            <li key={day.date}>
              <Tip text={label}>
                {!orderId ? <span aria-label={label}>{box}</span> : day.reports[0]
                  ? <Link to="/servicos/ordens-de-servico/$orderId/rdo/$reportId" params={{ orderId: String(orderId), reportId: String(day.reports[0].id) }} aria-label={label}>{box}</Link>
                  : day.state === "sem_rdo"
                    ? <Link to="/servicos/ordens-de-servico/$orderId/rdo/$reportId" params={{ orderId: String(orderId), reportId: "novo" }} search={{ date: day.date }} aria-label={`${label} — lançar`}>{box}</Link>
                    : <span aria-label={label}>{box}</span>}
              </Tip>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground mt-2">
        {(orderId ? ["fechado", "rascunho", "devolvido", "parado", "sem_rdo", "futuro"] as DayState[] : ["fechado", "parado", "sem_rdo", "futuro"] as DayState[]).map((state) => (
          <span key={state} className="inline-flex items-center gap-1"><span className={cn("h-3 w-3 rounded-sm", styleOf(state).className)} /> {styleOf(state).label}</span>
        ))}
      </div>
      {missing > 0 && orderId && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{missing} dia{missing === 1 ? "" : "s"} útil{missing === 1 ? "" : "eis"} de obra sem RDO. Clique no dia para lançar.</p>}
    </div>
  );
}

/** Curva previsto × feito (%), com cursor que mostra o dia. Uma escala só, 0 a 100%. */
export function ProgressCurve({ timeline }: { timeline: Timeline }) {
  const [hover, setHover] = useState<number | null>(null);
  const points = timeline.curve;
  if (points.length < 2) return <p className="text-sm text-muted-foreground">A curva aparece a partir do segundo dia de obra.</p>;
  const W = 640, H = 200, L = 34, R = 64, T = 10, B = 24;
  const x = (index: number) => L + (index / (points.length - 1)) * (W - L - R);
  const y = (value: number) => T + (1 - value / 100) * (H - T - B);
  const path = (key: "planned" | "done"): string => points
    .flatMap((point, index) => (point[key] === null ? [] : [`${x(index)},${y(point[key]!)}`]))
    .map((point, index) => `${index === 0 ? "M" : "L"}${point}`).join("");
  const lastDone = points.reduce((last, point, index) => (point.done !== null ? index : last), -1);
  const current = hover !== null ? points[hover] : null;
  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Curva do avanço previsto e feito, em porcentagem"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(event) => {
          const box = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((event.clientX - box.left) / box.width) * W;
          setHover(Math.max(0, Math.min(points.length - 1, Math.round(((px - L) / (W - L - R)) * (points.length - 1)))));
        }}>
        {[0, 50, 100].map((tick) => (
          <g key={tick} className="text-muted-foreground">
            <line x1={L} x2={W - R} y1={y(tick)} y2={y(tick)} stroke="currentColor" strokeOpacity={0.18} />
            <text x={L - 6} y={y(tick) + 4} textAnchor="end" fontSize="10" fill="currentColor">{tick}%</text>
          </g>
        ))}
        <text x={L} y={H - 6} fontSize="10" className="fill-muted-foreground">{dateShort(points[0].date)}</text>
        <text x={W - R} y={H - 6} fontSize="10" textAnchor="end" className="fill-muted-foreground">{dateShort(points[points.length - 1].date)}</text>
        <path d={path("planned")} fill="none" className="stroke-muted-foreground" strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" />
        <path d={path("done")} fill="none" className="stroke-primary" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {/* rótulos diretos no fim de cada linha */}
        {points[points.length - 1].planned !== null && <text x={W - R + 6} y={y(points[points.length - 1].planned!) + 4} fontSize="10" className="fill-muted-foreground">previsto</text>}
        {lastDone >= 0 && <>
          <circle cx={x(lastDone)} cy={y(points[lastDone].done!)} r={4} className="fill-primary stroke-background" strokeWidth={2} />
          <text x={x(lastDone) + 8} y={y(points[lastDone].done!) - 6} fontSize="10" className="fill-foreground" fontWeight={600}>feito {pct(points[lastDone].done)}</text>
        </>}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="stroke-foreground" strokeOpacity={0.4} />}
        {hover !== null && current?.done !== null && current?.done !== undefined && <circle cx={x(hover)} cy={y(current.done)} r={4} className="fill-primary stroke-background" strokeWidth={2} />}
      </svg>
      {current && (
        <div className="pointer-events-none absolute top-1 right-1 rounded-md border bg-popover px-2 py-1 text-xs shadow-sm">
          <div className="font-medium">{dateBr(current.date)}</div>
          <div className="text-muted-foreground">Previsto <span className="tabular-nums text-foreground">{pct(current.planned)}</span></div>
          <div className="text-muted-foreground">Feito <span className="tabular-nums text-foreground">{pct(current.done)}</span></div>
        </div>
      )}
      <figcaption className="sr-only">
        {points.filter((point) => point.done !== null).map((point) => `${dateBr(point.date)}: previsto ${pct(point.planned)}, feito ${pct(point.done)}`).join("; ")}
      </figcaption>
    </figure>
  );
}
