import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { errorMessage } from "../../comercial/-shared/commercial";
import { BotAvatar } from "../-shared/avatar";
import { TEAM_KEY, aiApi, dateTimeBr } from "../-shared/bots";

type Frequency = "once" | "hourly" | "daily" | "weekly" | "monthly" | "event";
interface Schedule {
  id: number; name: string; kind: "data" | "ai"; report: string | null; botId: number | null; prompt: string | null; frequency: Frequency; time: string;
  dayOfWeek: number | null; dayOfMonth: number | null; daysOfWeek: number[]; everyHours: number | null; runAt: string | null;
  eventType: string | null; eventParams: Record<string, unknown>; eventLabel: string | null;
  channels: string[]; recipients: number[]; active: boolean; lastRunAt: string | null; nextRunAt: string | null;
  lastStatus: string | null; lastReportId: number | null; failures: number; pausedReason: string | null; maxRunsPerDay: number; owner: string | null; mine: boolean;
}
interface EventOption { key: string; label: string; description: string; params: Array<{ name: string; label: string; type: "number" | "text"; default?: number | string; options?: Array<{ id: string; name: string }> }> }
interface AgendaOptions {
  schedules: Schedule[]; reports: Array<{ key: string; name: string; description: string }>; events: EventOption[];
  users: Array<{ id: number; name: string; hasPhone: boolean; hasEmail: boolean }>;
  bots: Array<{ id: number; name: string; persona: string; role: string | null; avatar: string }>;
  channels: { system: boolean; email: boolean; whatsapp: boolean }; admin: boolean;
}

export const Route = createFileRoute("/_authenticated/bots/_bots/agenda")({
  component: AgendaPage,
});

const KEY = "aiAgenda";
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const WEEKDAYS_LONG = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
const CHANNEL_LABEL: Record<string, string> = { system: "No sistema", email: "E-mail", whatsapp: "WhatsApp" };
const WHEN_OPTIONS: Array<{ id: Frequency; label: string; icon: string }> = [
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

/** Agenda da equipe: tarefas dos assistentes no relógio ou disparadas por eventos do sistema. */
function AgendaPage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: [KEY], enabled: can("usar_bots"), queryFn: () => aiApi.get<AgendaOptions>("schedules") });
  const [editing, setEditing] = useState<Schedule | "novo" | null>(null);
  const refresh = () => { queryClient.invalidateQueries({ queryKey: [KEY] }); queryClient.invalidateQueries({ queryKey: [TEAM_KEY] }); };
  const fail = (title: string) => (err: unknown) => toast({ title, description: errorMessage(err), variant: "destructive" });
  const run = useMutation({ mutationFn: (id: number) => aiApi.post<{ id: number; title: string }>(`schedules/${id}/run`), onSuccess: (report) => { refresh(); toast({ title: "Tarefa executada", description: report.title, variant: "success" }); }, onError: fail("Não foi possível rodar") });
  const toggle = useMutation({ mutationFn: (row: Schedule) => aiApi.patch(`schedules/${row.id}/${row.active ? "pause" : "resume"}`), onSuccess: refresh, onError: fail("Não foi possível alterar") });
  const remove = useMutation({ mutationFn: (id: number) => aiApi.patch(`schedules/${id}/remove`), onSuccess: () => { refresh(); toast({ title: "Tarefa removida", variant: "success" }); }, onError: fail("Não foi possível remover") });

  const groups = useMemo(() => {
    if (!data) return [];
    const byBot = new Map<number | "data", Schedule[]>();
    for (const row of data.schedules) {
      const key = row.kind === "ai" && row.botId ? row.botId : "data";
      byBot.set(key, [...(byBot.get(key) ?? []), row]);
    }
    return [...byBot.entries()].map(([key, rows]) => ({ key, bot: key === "data" ? null : data.bots.find((bot) => bot.id === key) ?? null, rows }));
  }, [data]);

  if (!can("usar_bots")) return null;
  return (
    <div className="grid max-w-5xl gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Agenda da equipe</h1>
          <p className="text-sm text-muted-foreground">Tarefas que os assistentes fazem sozinhos: no horário marcado ou quando algo acontece no sistema. Rodam com as permissões de quem criou, e o que sai para fora continua esperando a sua confirmação. Dá para criar falando com eles: "toda segunda às 8h, me mande…".</p>
        </div>
        <Button type="button" onClick={() => setEditing("novo")}><Icon name="plus" className="mr-1 h-4 w-4" /> Nova tarefa</Button>
      </div>
      {error && <p className="text-destructive">Erro: {errorMessage(error)}</p>}
      {isLoading && <Skeleton className="h-40 w-full" />}
      {data && !data.schedules.length && (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <div className="mx-auto flex w-fit -space-x-3">{data.bots.slice(0, 4).map((bot) => <BotAvatar key={bot.id} look={bot.avatar} size={44} />)}</div>
          <p className="mt-3 font-medium">Ninguém tem tarefa agendada ainda</p>
          <p className="text-sm text-muted-foreground">Exemplos: "toda manhã, Helena manda o resumo do dia" ou "quando entrar despesa sem categoria, Otávio categoriza".</p>
          <Button type="button" className="mt-4" onClick={() => setEditing("novo")}>Criar a primeira</Button>
        </div>
      )}
      {groups.map((group) => (
        <section key={String(group.key)} className="rounded-2xl border bg-background">
          <header className="flex items-center gap-3 border-b px-4 py-3">
            {group.bot ? <BotAvatar look={group.bot.avatar} size={40} /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"><Icon name="table" className="h-5 w-5 text-muted-foreground" /></span>}
            <div>
              <p className="font-semibold leading-tight">{group.bot ? group.bot.persona : "Relatórios de dados"}</p>
              <p className="text-xs text-muted-foreground">{group.bot ? group.bot.role : "Montados direto dos dados, sem IA"}</p>
            </div>
          </header>
          {group.rows.map((row) => (
            <div key={row.id} className="flex flex-wrap items-start gap-3 border-b px-4 py-3 last:border-b-0">
              <Icon name={row.frequency === "event" ? "zap" : "clock"} className={`mt-0.5 h-4 w-4 ${row.frequency === "event" ? "text-amber-500" : "text-muted-foreground"}`} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{row.name} {!row.active && <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">pausada</span>}</p>
                <p className="text-xs text-muted-foreground">
                  {whenText(row)} · {row.channels.map((channel) => CHANNEL_LABEL[channel] ?? channel).join(", ")}
                  {row.active && row.frequency !== "event" && row.nextRunAt ? ` · próxima: ${dateTimeBr(row.nextRunAt)}` : ""}
                  {data?.admin && row.owner && !row.mine ? ` · de ${row.owner}` : ""}
                </p>
                {row.prompt && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">"{row.prompt}"</p>}
                {row.pausedReason && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{row.pausedReason}</p>}
                {row.lastRunAt && (
                  <p className="mt-1 text-xs">
                    <span className={row.lastStatus === "falhou" ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}>{row.lastStatus === "falhou" ? "Falhou" : "Feita"}</span>
                    <span className="text-muted-foreground"> {dateTimeBr(row.lastRunAt)}</span>
                    {row.lastReportId && <> · <Link to="/bots/relatorios/$reportId" params={{ reportId: String(row.lastReportId) }} className="text-primary underline underline-offset-2">ver resultado</Link></>}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="outline" size="sm" disabled={run.isPending} onClick={() => run.mutate(row.id)}><Icon name="play" className="mr-1 h-3.5 w-3.5" /> Rodar agora</Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={row.active ? "Pausar" : "Retomar"} onClick={() => toggle.mutate(row)}><Icon name={row.active ? "pause" : "play-circle"} className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Editar ${row.name}`} onClick={() => setEditing(row)}><Icon name="pencil" className="h-4 w-4" /></Button>
                <ConfirmDialog title="Remover a tarefa?" description="Os resultados já gerados continuam em Relatórios." onConfirm={() => remove.mutate(row.id)}>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Remover ${row.name}`}><Icon name="trash-2" className="h-4 w-4" /></Button>
                </ConfirmDialog>
              </div>
            </div>
          ))}
        </section>
      ))}
      {editing && data && <TaskDialog options={data} schedule={editing === "novo" ? null : editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

function TaskDialog({ options, schedule, onClose, onSaved }: { options: AgendaOptions; schedule: Schedule | null; onClose: () => void; onSaved: () => void }) {
  const nowPlusHour = new Date(Date.now() + 3600000 - 3 * 3600000).toISOString().slice(0, 16);
  const [draft, setDraft] = useState(() => ({
    who: schedule ? (schedule.kind === "data" ? "data" : String(schedule.botId)) : String(options.bots[0]?.id ?? "data"),
    name: schedule?.name ?? "", prompt: schedule?.prompt ?? "", report: schedule?.report ?? "agenda_do_dia",
    frequency: (schedule?.frequency ?? "daily") as Frequency, time: schedule?.time ?? "08:00",
    runAt: schedule?.runAt ? new Date(new Date(schedule.runAt).getTime() - 3 * 3600000).toISOString().slice(0, 16) : nowPlusHour,
    daysOfWeek: schedule?.daysOfWeek?.length ? schedule.daysOfWeek : [1], dayOfMonth: String(schedule?.dayOfMonth ?? 1), everyHours: String(schedule?.everyHours ?? 2),
    eventType: schedule?.eventType ?? options.events[0]?.key ?? "", eventParams: (schedule?.eventParams ?? {}) as Record<string, unknown>,
    channels: schedule?.channels ?? ["system"], recipients: (schedule?.recipients ?? []).map(String), maxRunsPerDay: String(schedule?.maxRunsPerDay ?? 12), active: schedule?.active ?? true,
  }));
  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const isData = draft.who === "data";
  const event = options.events.find((item) => item.key === draft.eventType);
  const bot = options.bots.find((item) => String(item.id) === draft.who);
  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: draft.name, kind: isData ? "data" : "ai", botId: isData ? null : Number(draft.who), prompt: draft.prompt, report: draft.report,
        frequency: draft.frequency, time: draft.time, runAt: draft.frequency === "once" ? `${draft.runAt}:00-03:00` : undefined,
        daysOfWeek: draft.daysOfWeek, dayOfMonth: Number(draft.dayOfMonth), everyHours: Number(draft.everyHours),
        eventType: draft.eventType, eventParams: draft.eventParams, channels: draft.channels, recipients: draft.recipients.map(Number),
        maxRunsPerDay: Number(draft.maxRunsPerDay), active: draft.active,
      };
      return schedule ? aiApi.put(`schedules/${schedule.id}`, body) : aiApi.post("schedules", body);
    },
    onSuccess: () => { onSaved(); toast({ title: "Tarefa salva", variant: "success" }); onClose(); },
    onError: (err) => toast({ title: "Não foi possível salvar", description: errorMessage(err), variant: "destructive" }),
  });
  const whenOptions = isData ? WHEN_OPTIONS.filter((option) => option.id !== "event") : WHEN_OPTIONS;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{schedule ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>Ao salvar, você passa a ser o dono: a tarefa roda com as suas permissões.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label>Quem faz</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {options.bots.map((item) => (
                <button key={item.id} type="button" onClick={() => set("who", String(item.id))} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-1.5 text-sm ${draft.who === String(item.id) ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
                  <BotAvatar look={item.avatar} size={28} /> {item.persona}
                </button>
              ))}
              <button type="button" onClick={() => { set("who", "data"); if (draft.frequency === "event") set("frequency", "daily"); }} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-1.5 text-sm ${isData ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted"><Icon name="table" className="h-4 w-4" /></span> Relatório de dados
              </button>
            </div>
          </div>
          <div><Label htmlFor="taskName">Nome da tarefa</Label><Input id="taskName" name="taskName" className="mt-1" value={draft.name} maxLength={120} onValueChange={(_, value) => set("name", String(value))} placeholder="Ex.: Resumo do dia" /></div>
          {isData ? (
            <div>
              <Label>Relatório</Label>
              <Select name="taskReport" modal options={options.reports.map((report) => ({ id: report.key, name: report.name }))} state={draft.report} onChange={(_, value) => set("report", String(value))} />
              <p className="mt-1 text-xs text-muted-foreground">{options.reports.find((report) => report.key === draft.report)?.description}</p>
            </div>
          ) : (
            <div>
              <Label htmlFor="taskPrompt">O que {bot?.persona ?? "o assistente"} deve fazer</Label>
              <Textarea id="taskPrompt" className="mt-1 min-h-24" value={draft.prompt} onChange={(event) => set("prompt", event.target.value)} placeholder={draft.frequency === "event" ? "Ex.: Categorize a despesa pelo plano de contas e me avise se o valor estiver fora do normal." : "Ex.: Me mande o resumo do dia: atrasados, retornos de hoje e turmas da semana."} />
            </div>
          )}
          <div>
            <Label>Quando</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {whenOptions.map((option) => (
                <button key={option.id} type="button" onClick={() => set("frequency", option.id)} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${draft.frequency === option.id ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted"}`}>
                  <Icon name={option.icon} className="h-4 w-4" /> {option.label}
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {draft.frequency === "once" && <div className="sm:col-span-2"><Label htmlFor="taskRunAt">Data e hora (Brasília)</Label><input id="taskRunAt" type="datetime-local" className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={draft.runAt} onChange={(event) => set("runAt", event.target.value)} /></div>}
              {draft.frequency === "hourly" && <div><Label>A cada</Label><Select name="taskEvery" modal options={[1, 2, 3, 4, 5].map((hours) => ({ id: String(hours), name: `${hours} hora(s)` }))} state={draft.everyHours} onChange={(_, value) => set("everyHours", String(value))} /></div>}
              {draft.frequency === "weekly" && (
                <div className="sm:col-span-2">
                  <Label>Dias</Label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((label, index) => {
                      const day = index + 1;
                      const on = draft.daysOfWeek.includes(day);
                      return <button key={day} type="button" onClick={() => set("daysOfWeek", on ? draft.daysOfWeek.filter((item) => item !== day) : [...draft.daysOfWeek, day].sort())} className={`h-9 w-11 cursor-pointer rounded-md border text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{label}</button>;
                    })}
                  </div>
                </div>
              )}
              {draft.frequency === "monthly" && <div><Label>Dia do mês</Label><Select name="taskDom" modal options={Array.from({ length: 28 }, (_, index) => ({ id: String(index + 1), name: String(index + 1) }))} state={draft.dayOfMonth} onChange={(_, value) => set("dayOfMonth", String(value))} /></div>}
              {["daily", "weekly", "monthly"].includes(draft.frequency) && <div><Label htmlFor="taskTime">Horário</Label><Input id="taskTime" name="taskTime" className="mt-1" value={draft.time} maxLength={5} onValueChange={(_, value) => set("time", String(value))} placeholder="08:00" /></div>}
              {draft.frequency === "event" && (
                <div className="sm:col-span-2 grid gap-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {options.events.map((item) => (
                      <button key={item.key} type="button" onClick={() => set("eventType", item.key)} className={`cursor-pointer rounded-lg border p-2.5 text-left ${draft.eventType === item.key ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : "hover:bg-muted"}`}>
                        <p className="flex items-center gap-1.5 text-sm font-medium"><Icon name="zap" className="h-3.5 w-3.5 text-amber-500" /> {item.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                      </button>
                    ))}
                  </div>
                  {event?.params.map((param) => (
                    <div key={param.name}>
                      <Label>{param.label}</Label>
                      {param.options
                        ? <Select name={`ev-${param.name}`} modal clearable options={param.options} state={String(draft.eventParams[param.name] ?? "")} onChange={(_, value) => set("eventParams", { ...draft.eventParams, [param.name]: value || undefined })} placeholder="Qualquer" />
                        : <Input name={`ev-${param.name}`} className="mt-1" value={String(draft.eventParams[param.name] ?? param.default ?? "")} onValueChange={(_, value) => set("eventParams", { ...draft.eventParams, [param.name]: param.type === "number" ? Number(value) || undefined : value })} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <Label>Onde entregar o resultado</Label>
            <div className="mt-1 flex flex-wrap gap-4">
              {(["system", "email", "whatsapp"] as const).map((channel) => (
                <label key={channel} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={draft.channels.includes(channel)} onCheckedChange={(checked) => set("channels", checked ? [...new Set([...draft.channels, channel])] : draft.channels.filter((item) => item !== channel))} />
                  {CHANNEL_LABEL[channel]}{channel !== "system" && !options.channels[channel] ? " (não configurado)" : ""}
                </label>
              ))}
            </div>
          </div>
          {options.admin && (
            <div>
              <Label>Quem recebe</Label>
              <Select name="taskRecipients" modal multiple options={options.users.map((user) => ({ id: String(user.id), name: user.name }))} state={draft.recipients} onChange={(_, value) => set("recipients", (Array.isArray(value) ? value : [value]).map(String))} placeholder="Só você" />
            </div>
          )}
          {!isData && (
            <div className="w-48">
              <Label>Máximo de execuções por dia</Label>
              <Input name="taskMax" className="mt-1" value={draft.maxRunsPerDay} maxLength={2} onValueChange={(_, value) => set("maxRunsPerDay", String(value))} />
            </div>
          )}
          {!isData && <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">Envios, publicações, baixas e mudanças de etapa nunca acontecem sozinhos: ficam em Ações pendentes por 24 h esperando você. Cada execução usa a cota de IA.</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
