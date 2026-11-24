import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { FormPageGrid, FormSection, SummaryRow } from "@/components/general-components/FormPage";
import { errorMessage } from "../../../comercial/-shared/commercial";
import { BotAvatar } from "../../-shared/avatar";
import { TEAM_KEY, aiApi } from "../../-shared/bots";
import { AGENDA_KEY, AgendaOptions, CHANNEL_LABEL, Frequency, Schedule, WEEKDAYS, WHEN_OPTIONS, whenText } from "./agenda";

/** Cadastro e edição de uma tarefa da agenda dos bots: quem faz, o quê, quando e onde entregar, em tela cheia. */
export default function TaskForm({ options, schedule, close }: { options: AgendaOptions; schedule: Schedule | null; close: () => void }) {
  const queryClient = useQueryClient();
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
  const refresh = () => { queryClient.invalidateQueries({ queryKey: [AGENDA_KEY] }); queryClient.invalidateQueries({ queryKey: [TEAM_KEY] }); };
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
    onSuccess: () => { refresh(); toast({ title: "Tarefa salva", variant: "success" }); close(); },
    onError: (err) => toast({ title: "Não foi possível salvar", description: errorMessage(err), variant: "destructive" }),
  });
  const whenOptions = isData ? WHEN_OPTIONS.filter((option) => option.id !== "event") : WHEN_OPTIONS;
  const when = draft.frequency === "once"
    ? `Uma vez${draft.runAt ? `, ${draft.runAt.slice(8, 10)}/${draft.runAt.slice(5, 7)}/${draft.runAt.slice(0, 4)} ${draft.runAt.slice(11, 16)}` : ""}`
    : whenText({ frequency: draft.frequency, time: draft.time, runAt: null, daysOfWeek: draft.daysOfWeek, dayOfWeek: null, dayOfMonth: Number(draft.dayOfMonth), everyHours: Number(draft.everyHours), eventLabel: event?.label ?? null });

  return (
    <div>
      <FormPageGrid aside={<>
        <section className="rounded-card border bg-card p-4 flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Resumo</p>
          <SummaryRow label="Quem faz">{isData ? "Relatório de dados" : bot?.persona ?? "—"}</SummaryRow>
          <SummaryRow label="Quando">{when}</SummaryRow>
          <SummaryRow label="Entrega">{draft.channels.map((channel) => CHANNEL_LABEL[channel] ?? channel).join(", ") || "—"}</SummaryRow>
          {schedule && <SummaryRow label="Situação">{schedule.active ? "Ativa" : "Pausada"}</SummaryRow>}
        </section>
        {!isData && <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">Envios, publicações, baixas e mudanças de etapa nunca acontecem sozinhos: ficam em Ações pendentes por 24 h esperando você. Cada execução usa a cota de IA.</p>}
        <div className="flex flex-col gap-2">
          <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
          <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
        </div>
      </>}>
        <FormSection title="Quem faz" description="Um dos assistentes (com IA) ou um relatório montado direto dos dados.">
          <div className="flex flex-wrap gap-2">
            {options.bots.map((item) => (
              <button key={item.id} type="button" onClick={() => set("who", String(item.id))} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-1.5 text-sm ${draft.who === String(item.id) ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
                <BotAvatar look={item.avatar} size={28} /> {item.persona}
              </button>
            ))}
            <button type="button" onClick={() => { set("who", "data"); if (draft.frequency === "event") set("frequency", "daily"); }} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-1.5 text-sm ${isData ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted"><Icon name="table" className="h-4 w-4" /></span> Relatório de dados
            </button>
          </div>
        </FormSection>

        <FormSection title="Tarefa" description="Ao salvar, você passa a ser o dono: a tarefa roda com as suas permissões.">
          <div className="sm:max-w-md"><Label htmlFor="taskName">Nome da tarefa</Label><Input id="taskName" name="taskName" className="mt-1" value={draft.name} maxLength={120} onValueChange={(_, value) => set("name", String(value))} placeholder="Ex.: Resumo do dia" /></div>
          {isData ? (
            <div className="sm:max-w-md">
              <Label>Relatório</Label>
              <Select name="taskReport" modal options={options.reports.map((report) => ({ id: report.key, name: report.name }))} state={draft.report} onChange={(_, value) => set("report", String(value))} />
              <p className="mt-1 text-xs text-muted-foreground">{options.reports.find((report) => report.key === draft.report)?.description}</p>
            </div>
          ) : (
            <div>
              <Label htmlFor="taskPrompt">O que {bot?.persona ?? "o assistente"} deve fazer</Label>
              <Textarea id="taskPrompt" className="mt-1 min-h-24" value={draft.prompt} onChange={(changeEvent) => set("prompt", changeEvent.target.value)} placeholder={draft.frequency === "event" ? "Ex.: Categorize a despesa pelo plano de contas e me avise se o valor estiver fora do normal." : "Ex.: Me mande o resumo do dia: atrasados, retornos de hoje e turmas da semana."} />
            </div>
          )}
        </FormSection>

        <FormSection title="Quando" description="No relógio ou quando algo acontece no sistema.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {whenOptions.map((option) => (
              <button key={option.id} type="button" onClick={() => set("frequency", option.id)} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${draft.frequency === option.id ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted"}`}>
                <Icon name={option.icon} className="h-4 w-4" /> {option.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {draft.frequency === "once" && <div className="sm:col-span-2 sm:max-w-xs"><Label htmlFor="taskRunAt">Data e hora (Brasília)</Label><input id="taskRunAt" type="datetime-local" className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={draft.runAt} onChange={(changeEvent) => set("runAt", changeEvent.target.value)} /></div>}
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
        </FormSection>

        <FormSection title="Entrega" description="Onde o resultado chega e quem recebe.">
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
          {(options.admin || !isData) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {options.admin && (
                <div>
                  <Label>Quem recebe</Label>
                  <Select name="taskRecipients" modal multiple options={options.users.map((user) => ({ id: String(user.id), name: user.name }))} state={draft.recipients} onChange={(_, value) => set("recipients", (Array.isArray(value) ? value : [value]).map(String))} placeholder="Só você" />
                </div>
              )}
              {!isData && (
                <div className="sm:max-w-[12rem]">
                  <Label>Máximo de execuções por dia</Label>
                  <Input name="taskMax" className="mt-1" value={draft.maxRunsPerDay} maxLength={2} onValueChange={(_, value) => set("maxRunsPerDay", String(value))} />
                </div>
              )}
            </div>
          )}
        </FormSection>
      </FormPageGrid>
    </div>
  );
}
