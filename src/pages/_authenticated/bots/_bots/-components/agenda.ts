import { dateTimeBr } from "../../-shared/bots";

/** Agenda da equipe: tipos (espelham a API), textos e chave de cache, usados pela lista e pela tela da tarefa. */
export type Frequency = "once" | "hourly" | "daily" | "weekly" | "monthly" | "event";
export interface Schedule {
  id: number; name: string; kind: "data" | "ai"; report: string | null; botId: number | null; prompt: string | null; frequency: Frequency; time: string;
  dayOfWeek: number | null; dayOfMonth: number | null; daysOfWeek: number[]; everyHours: number | null; runAt: string | null;
  eventType: string | null; eventParams: Record<string, unknown>; eventLabel: string | null;
  channels: string[]; recipients: number[]; active: boolean; lastRunAt: string | null; nextRunAt: string | null;
  lastStatus: string | null; lastReportId: number | null; failures: number; pausedReason: string | null; maxRunsPerDay: number; owner: string | null; mine: boolean;
}
export interface EventOption { key: string; label: string; description: string; params: Array<{ name: string; label: string; type: "number" | "text"; default?: number | string; options?: Array<{ id: string; name: string }> }> }
export interface AgendaOptions {
  schedules: Schedule[]; reports: Array<{ key: string; name: string; description: string }>; events: EventOption[];
  users: Array<{ id: number; name: string; hasPhone: boolean; hasEmail: boolean }>;
  bots: Array<{ id: number; name: string; persona: string; role: string | null; avatar: string }>;
  channels: { system: boolean; email: boolean; whatsapp: boolean }; admin: boolean;
}

export const AGENDA_KEY = "aiAgenda";
export const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const WEEKDAYS_LONG = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
export const CHANNEL_LABEL: Record<string, string> = { system: "No sistema", email: "E-mail", whatsapp: "WhatsApp" };
export const WHEN_OPTIONS: Array<{ id: Frequency; label: string; icon: string }> = [
  { id: "once", label: "Uma vez", icon: "calendar-check" },
  { id: "hourly", label: "A cada X horas", icon: "timer" },
  { id: "daily", label: "Todo dia", icon: "sun" },
  { id: "weekly", label: "Dias da semana", icon: "calendar-days" },
  { id: "monthly", label: "Todo mês", icon: "calendar-range" },
  { id: "event", label: "Quando acontecer…", icon: "zap" },
];

export function whenText(row: Pick<Schedule, "frequency" | "time" | "runAt" | "daysOfWeek" | "dayOfWeek" | "dayOfMonth" | "everyHours" | "eventLabel">) {
  switch (row.frequency) {
    case "once": return row.runAt ? `Uma vez, ${dateTimeBr(row.runAt)}` : "Uma vez";
    case "hourly": return `A cada ${row.everyHours ?? 2} h, das 8h às 18h (dias úteis)`;
    case "daily": return `Todo dia às ${row.time}`;
    case "weekly": return `${(row.daysOfWeek?.length ? row.daysOfWeek : [row.dayOfWeek ?? 1]).map((day) => WEEKDAYS_LONG[day - 1]).join(", ")} às ${row.time}`;
    case "monthly": return `Todo dia ${row.dayOfMonth} às ${row.time}`;
    case "event": return `Quando: ${row.eventLabel?.toLowerCase() ?? "evento"}`;
  }
}
