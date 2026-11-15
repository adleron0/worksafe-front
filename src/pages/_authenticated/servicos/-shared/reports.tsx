import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input as ShadInput } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import { dateBr, errorMessage, money } from "../../comercial/-shared/commercial";
import { OrderStatus } from "./orders";

/** RDO — relatório diário de obra: tipos (espelham a API), rótulos e o painel do diário na OS. */
/** `in`/`out` só vêm preenchidos quando a pessoa entrou ou saiu em hora diferente da do dia. */
/** `employeeId` e `professionalId`: pessoa e função do cadastro; sem eles é pessoa avulsa e a função vale pelo texto. */
export interface CrewMember { name: string; role: string; hours: number; overtime: number; in?: string | null; out?: string | null; leaveReason?: string | null; employeeId?: number | null; professionalId?: number | null }
export interface StepProgress { step: number; title: string; percent: number }
export interface Occurrence { type: string; description: string; hoursLost: number }
export interface Photo { url: string; caption: string }
export interface ReportOrder { id: number; number: string; status: OrderStatus; title: string; customer: { id: number; name: string } | null; startedAt: string | null; finishedAt: string | null; location: string | null }
export interface Report {
  id: number | null; date: string; shift: string; weather: string; status: "rascunho" | "fechado"; editable: boolean;
  startTime: string | null; endTime: string | null; breakMinutes: number; weatherEnd: string | null;
  startCondition: string | null; endCondition: string | null; startNote: string | null; endNote: string | null;
  crew: CrewMember[]; activities: string | null; progress: StepProgress[]; occurrences: Occurrence[]; equipment: string | null; photos: Photo[]; notes: string | null;
  createdBy: string | null; closedAt: string | null; closedBy: string | null; order: ReportOrder; roles: string[]; roleOptions?: Array<{ name: string; professionalId: number | null }>; hoursPerDay?: number;
}
export interface ReportRow {
  id: number; orderId: number; date: string; shift: string; shiftLabel: string; weather: string; status: "rascunho" | "fechado";
  people: number; hours: number; overtime: number; activities: string | null; occurrences: number; photos: number; createdBy: string | null;
  startTime: string | null; endTime: string | null; earlyLeaves: number;
}
export interface DiarySummary {
  reports: number; days: number; drafts: number; lastDate: string | null;
  hours: { rows: Array<{ role: string; hours: number; overtime: number; budgetHours: number; budgetOvertime: number; matched: boolean }>; total: number; overtime: number; budget: number; budgetOvertime: number };
  progress: { done: number | null; planned: number | null; steps: StepProgress[] };
  stoppedDays: number; hoursLost: number;
  labor: { cost: number; budget: number; withoutCost: string[] } | null;
}
export interface Diary { order: ReportOrder; canWrite: boolean; rows: ReportRow[]; summary: DiarySummary }
export interface RecentReports {
  today: string;
  running: Array<{ id: number; number: string; title: string; status: OrderStatus; customer: string; startedAt: string | null; plannedEnd: string | null; location: string | null; todayReports: Array<{ id: number; status: string; shift: string }> }>;
  rows: Array<ReportRow & { order: { id: number; number: string; title: string; customer: string } | null }>;
}

export const DIARY_KEY = "serviceDiary";
export const REPORT_KEY = "serviceReport";
export const RECENT_REPORTS_KEY = "serviceReportsRecent";

/** Rotas do RDO recebem JSON (o helper padrão envia multipart). */
export const reportsApi = {
  get: async <T,>(path: string, params?: Record<string, unknown>) => (await api.get<T>(path, { params })).data,
  post: async <T,>(path: string, body?: unknown) => (await api.post<T>(path, body ?? {})).data,
  put: async <T,>(path: string, body?: unknown) => (await api.put<T>(path, body ?? {})).data,
  patch: async <T,>(path: string, body?: unknown) => (await api.patch<T>(path, body ?? {})).data,
  delete: async <T,>(path: string) => (await api.delete<T>(path)).data,
};

export const SHIFT_OPTIONS = [{ id: "integral", name: "Dia inteiro" }, { id: "manha", name: "Manhã" }, { id: "tarde", name: "Tarde" }, { id: "noite", name: "Noite" }];
export const WEATHER_OPTIONS = [
  { id: "bom", name: "Bom", icon: "sun" }, { id: "nublado", name: "Nublado", icon: "cloud" }, { id: "chuva", name: "Chuva", icon: "cloud-rain" }, { id: "impraticavel", name: "Impraticável", icon: "cloud-lightning" },
];
/** Condição da frente de trabalho na entrada e na saída. */
export const CONDITION_OPTIONS = [
  { id: "normal", name: "Normal", icon: "circle-check" }, { id: "restricao", name: "Com restrição", icon: "triangle-alert" }, { id: "impedido", name: "Sem condição", icon: "ban" },
];
export const OCCURRENCE_OPTIONS = [
  { id: "paralisacao", name: "Paralisação" }, { id: "pendencia_cliente", name: "Pendência do cliente" }, { id: "quase_acidente", name: "Quase acidente" }, { id: "acidente", name: "Acidente" }, { id: "outro", name: "Outra" },
];
const WEATHER_ICON = Object.fromEntries(WEATHER_OPTIONS.map((option) => [option.id, option.icon]));
/** "HH:MM" válido. */
export const isTime = (value?: string | null) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value ?? "");
const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
/** Minutos entre a entrada e a saída; no turno da noite a saída pode ser no dia seguinte. */
export function spanMinutes(start: string, end: string, overnight: boolean): number {
  const span = minutesOf(end) - minutesOf(start);
  return span <= 0 && overnight ? span + 1440 : span;
}
/**
 * Horas de uma pessoa a partir da entrada e da saída: desconta o intervalo de
 * quem ficou mais de 6 horas e separa o que passa da jornada como hora extra.
 */
export function workedHours(start: string, end: string, breakMinutes: number, hoursPerDay: number, overnight: boolean): { hours: number; overtime: number } | null {
  if (!isTime(start) || !isTime(end)) return null;
  const span = spanMinutes(start, end, overnight);
  if (span <= 0) return null;
  const worked = Math.max(0, span - (span > 360 ? breakMinutes : 0)) / 60;
  const round = (value: number) => Math.round(value * 100) / 100;
  return { hours: round(Math.min(worked, hoursPerDay)), overtime: round(Math.max(0, worked - hoursPerDay)) };
}
export const hoursText = (value: number) => `${String(Math.round(value * 100) / 100).replace(".", ",")} h`;

/** Hora de agora, "HH:MM", no relógio de quem está preenchendo. */
export const nowTime = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });

/**
 * Campo de hora digitada (07:30), com o botão "Agora" para quem preenche na
 * obra. Aceita só números e põe os dois-pontos sozinho; ao sair do campo,
 * "7" vira 07:00 e "730" vira 07:30.
 */
export function TimeField({ id, value, onChange, disabled, ariaLabel, now = true, className }: {
  id?: string; value: string; onChange: (value: string) => void; disabled?: boolean; ariaLabel?: string; now?: boolean; className?: string;
}) {
  const typed = (raw: string) => { const digits = raw.replace(/\D/g, "").slice(0, 4); return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`; };
  const settle = () => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return;
    const full = digits.length <= 2 ? `${digits.padStart(2, "0")}00` : digits.length === 3 ? `0${digits}` : digits;
    const out = `${full.slice(0, 2)}:${full.slice(2, 4)}`;
    if (out !== value) onChange(out);
  };
  return (
    <div className={cn("flex gap-2", className)}>
      <ShadInput id={id} aria-label={ariaLabel} className={cn("text-center tabular-nums", value && !isTime(value) && "border-red-500")} inputMode="numeric" placeholder="00:00" maxLength={5}
        value={value} disabled={disabled} onChange={(event) => onChange(typed(event.target.value))} onBlur={settle} />
      {now && !disabled && <Button type="button" variant="outline" className="shrink-0" onClick={() => onChange(nowTime())}><Icon name="clock" className="w-4 h-4 mr-1" /> Agora</Button>}
    </div>
  );
}

/** Barra de "feito de um total", que fica vermelha quando passa do orçado. */
function Meter({ value, total, label, detail }: { value: number; total: number; label: string; detail: string }) {
  const ratio = total > 0 ? value / total : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm"><span className="min-w-0 truncate">{label}</span><span className="shrink-0 tabular-nums text-muted-foreground">{detail}</span></div>
      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full", ratio > 1 ? "bg-red-500" : "bg-primary")} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
      </div>
    </div>
  );
}

export function ReportStatusBadge({ status }: { status: string }) {
  return status === "fechado"
    ? <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-200 whitespace-nowrap">Fechado</span>
    : <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200 whitespace-nowrap">Rascunho</span>;
}

/** Uma linha de RDO, igual no diário da OS e na tela do encarregado. */
export function ReportLine({ row, orderId, context }: { row: ReportRow; orderId: number; context?: string }) {
  return (
    <li>
      <Link to="/servicos/ordens-de-servico/$orderId/rdo/$reportId" params={{ orderId: String(orderId), reportId: String(row.id) }}
        className="flex items-start gap-3 py-2.5 text-sm hover:bg-muted/40 -mx-2 px-2 rounded-md">
        <Icon name={WEATHER_ICON[row.weather] ?? "sun"} className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{dateBr(row.date)}{row.shift !== "integral" ? ` · ${row.shiftLabel}` : ""} <ReportStatusBadge status={row.status} /></p>
          {context && <p className="text-xs text-muted-foreground truncate">{context}</p>}
          <p className="text-xs text-muted-foreground">
            {row.startTime ? `${row.startTime}${row.endTime ? ` às ${row.endTime}` : " (sem saída)"} · ` : ""}
            {row.people} {row.people === 1 ? "pessoa" : "pessoas"} · {hoursText(row.hours)}{row.overtime > 0 ? ` + ${hoursText(row.overtime)} extras` : ""}
            {row.earlyLeaves > 0 ? ` · ${row.earlyLeaves} saiu${row.earlyLeaves === 1 ? "" : "ram"} antes` : ""}
            {row.occurrences > 0 ? ` · ${row.occurrences} ocorrência${row.occurrences === 1 ? "" : "s"}` : ""}{row.photos > 0 ? ` · ${row.photos} foto${row.photos === 1 ? "" : "s"}` : ""}
            {row.createdBy ? ` · ${row.createdBy}` : ""}
          </p>
          {row.activities && <p className="mt-0.5 text-muted-foreground line-clamp-2">{row.activities}</p>}
        </div>
        <Icon name="chevron-right" className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

/** Diário de obra dentro da OS: o que os RDOs dizem (avanço, horas, custo) e a lista deles. */
export function DiaryPanel({ orderId, canEdit }: { orderId: number; canEdit: boolean }) {
  const { data, isLoading, error } = useQuery({ queryKey: [DIARY_KEY, String(orderId)], queryFn: () => reportsApi.get<Diary>(`service-orders/${orderId}/reports`) });
  const summary = data?.summary;
  return (
    <section className="rounded-lg border p-4" aria-label="Diário de obra">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Diário de obra (RDO)</h2>
          <p className="text-xs text-muted-foreground">
            Um relatório por dia de obra. Dele saem o avanço e as horas trabalhadas.{" "}
            {summary && summary.reports > 0 && <Link to="/servicos/estatisticas-do-diario" search={{ os: orderId }} className="underline hover:text-foreground">Ver as estatísticas desta obra</Link>}
          </p>
        </div>
        {canEdit && data?.canWrite && (
          <Button asChild size="sm" className="shrink-0">
            <Link to="/servicos/ordens-de-servico/$orderId/rdo/$reportId" params={{ orderId: String(orderId), reportId: "novo" }}><Icon name="plus" className="w-4 h-4 mr-1" /> Novo RDO</Link>
          </Button>
        )}
      </div>
      {isLoading && <Skeleton className="h-20 w-full mt-3" />}
      {error && <p className="mt-3 text-sm text-destructive">Erro: {errorMessage(error)}</p>}
      {data && !data.canWrite && data.rows.length === 0 && <p className="mt-3 text-sm text-muted-foreground">O diário começa quando a execução da OS é iniciada.</p>}
      {data && data.canWrite && data.rows.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Nenhum RDO ainda. Lance o do primeiro dia de obra.</p>}

      {summary && summary.reports > 0 && (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 content-start">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Avanço</p>
            {summary.progress.done === null
              ? <p className="text-sm text-muted-foreground">A proposta não tinha cronograma: o avanço não é medido.</p>
              : (
                <>
                  <Meter value={summary.progress.done} total={100} label="Feito" detail={`${String(summary.progress.done).replace(".", ",")}%${summary.progress.planned !== null ? ` · previsto ${String(Math.round(summary.progress.planned)).replace(".", ",")}%` : ""}`} />
                  {summary.progress.planned !== null && summary.progress.done + 5 < summary.progress.planned && (
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">Abaixo do previsto para hoje.</p>
                  )}
                  <ul className="grid gap-0.5 text-xs text-muted-foreground">
                    {summary.progress.steps.map((step) => <li key={step.step} className="flex justify-between gap-3"><span className="truncate">{step.title}</span><span className="tabular-nums">{step.percent}%</span></li>)}
                  </ul>
                </>
              )}
            <p className="text-xs text-muted-foreground">
              {summary.days} dia{summary.days === 1 ? "" : "s"} com RDO{summary.stoppedDays > 0 ? ` · ${summary.stoppedDays} com paralisação` : ""}{summary.hoursLost > 0 ? ` · ${hoursText(summary.hoursLost)} paradas` : ""}
              {summary.drafts > 0 ? ` · ${summary.drafts} ainda em rascunho` : ""}
            </p>
          </div>
          <div className="grid gap-2 content-start">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Horas trabalhadas</p>
            {summary.hours.rows.map((row) => (
              <Meter key={row.role} value={row.hours} total={row.budgetHours} label={row.role}
                detail={row.matched ? `${hoursText(row.hours)} de ${hoursText(row.budgetHours)}${row.overtime > 0 ? ` · +${hoursText(row.overtime)} extras` : ""}` : `${hoursText(row.hours)} · fora do orçamento`} />
            ))}
            {summary.labor && (
              <div className="mt-1 rounded-md bg-muted/50 p-2 text-sm">
                <div className="flex justify-between gap-3"><span>Mão de obra realizada</span><b className="tabular-nums">{money(summary.labor.cost)}</b></div>
                <div className="flex justify-between gap-3 text-muted-foreground"><span>Orçada na proposta</span><span className="tabular-nums">{money(summary.labor.budget)}</span></div>
                {summary.labor.withoutCost.length > 0 && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Sem custo hora (função fora do orçamento): {summary.labor.withoutCost.join(", ")}. Essas horas não entram no valor.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {data && data.rows.length > 0 && (
        <ul className="mt-3 divide-y border-t">{data.rows.map((row) => <ReportLine key={row.id} row={row} orderId={orderId} />)}</ul>
      )}
    </section>
  );
}
