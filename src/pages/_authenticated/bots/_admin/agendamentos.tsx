import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { errorMessage } from "../../comercial/-shared/commercial";
import { aiApi, dateTimeBr } from "../-shared/bots";

interface Schedule {
  id: number; name: string; kind: "data" | "ai"; report: string | null; botId: number | null; prompt: string | null; frequency: "daily" | "weekly" | "monthly"; time: string;
  dayOfWeek: number | null; dayOfMonth: number | null; channels: string[]; recipients: number[]; active: boolean; lastRunAt: string | null; nextRunAt: string | null;
}
interface ScheduleOptions {
  schedules: Schedule[]; reports: Array<{ key: string; name: string; description: string }>;
  users: Array<{ id: number; name: string; hasPhone: boolean; hasEmail: boolean }>; bots: Array<{ id: number; name: string }>;
  channels: { system: boolean; email: boolean; whatsapp: boolean };
}

export const Route = createFileRoute("/_authenticated/bots/_admin/agendamentos")({
  component: SchedulesPage,
});

const KEY = "aiSchedules";
const FREQ: Record<Schedule["frequency"], string> = { daily: "Todo dia", weekly: "Toda semana", monthly: "Todo mês" };
const WEEKDAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const CHANNEL_LABEL: Record<string, string> = { system: "No sistema", email: "E-mail", whatsapp: "WhatsApp" };

/** Relatórios que saem sozinhos: de dados (sem IA, sem custo de modelo) ou pedidos a um bot. */
function SchedulesPage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: [KEY], enabled: can("update_bots"), queryFn: () => aiApi.get<ScheduleOptions>("schedules") });
  const [editing, setEditing] = useState<Schedule | "novo" | null>(null);
  const run = useMutation({
    mutationFn: (id: number) => aiApi.post<{ id: number; title: string }>(`schedules/${id}/run`),
    onSuccess: (report) => { queryClient.invalidateQueries({ queryKey: [KEY] }); toast({ title: "Relatório gerado", description: report.title, variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível gerar", description: errorMessage(err), variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => aiApi.patch(`schedules/${id}/remove`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [KEY] }); toast({ title: "Agendamento removido", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível remover", description: errorMessage(err), variant: "destructive" }),
  });
  if (!can("update_bots")) return null;
  const when = (row: Schedule) => `${FREQ[row.frequency]}${row.frequency === "weekly" && row.dayOfWeek ? ` (${WEEKDAYS[row.dayOfWeek - 1]})` : ""}${row.frequency === "monthly" && row.dayOfMonth ? ` (dia ${row.dayOfMonth})` : ""} às ${row.time}`;

  return (
    <div className="grid max-w-4xl gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Relatórios agendados</h1>
          <p className="text-sm text-muted-foreground">O relatório é montado com as permissões de quem salvou o agendamento e entregue no sistema, por e-mail ou por WhatsApp (só o aviso com o link). Relatórios de dados não usam IA.</p>
        </div>
        <Button type="button" onClick={() => setEditing("novo")}><Icon name="plus" className="mr-1 h-4 w-4" /> Novo agendamento</Button>
      </div>
      {error && <p className="text-destructive">Erro: {errorMessage(error)}</p>}
      {isLoading && <Skeleton className="h-32 w-full" />}
      {data && (!data.channels.email || !data.channels.whatsapp) && (
        <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {!data.channels.email && "E-mail não configurado no servidor (EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD). "}
          {!data.channels.whatsapp && "WhatsApp não configurado (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_TEMPLATE, um modelo de mensagem aprovado pela Meta). "}
          Esses canais ficam registrados como falha até a configuração.
        </p>
      )}
      {data && !data.schedules.length && <p className="rounded-lg border p-6 text-sm text-muted-foreground">Nenhum agendamento. Comece pela "Agenda do dia", que não usa IA.</p>}
      {data && data.schedules.length > 0 && (
        <div className="rounded-lg border">
          {data.schedules.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0">
              <Icon name={row.kind === "ai" ? "sparkles" : "table"} className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{row.name} {!row.active && <span className="text-xs font-normal text-muted-foreground">(pausado)</span>}</p>
                <p className="text-xs text-muted-foreground">{when(row)} · {row.channels.map((channel) => CHANNEL_LABEL[channel] ?? channel).join(", ")} · próximo: {dateTimeBr(row.nextRunAt)}</p>
              </div>
              <Button type="button" variant="outline" size="sm" disabled={run.isPending} onClick={() => run.mutate(row.id)}>Gerar agora</Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Editar ${row.name}`} onClick={() => setEditing(row)}><Icon name="pencil" className="h-4 w-4" /></Button>
              <ConfirmDialog title="Remover o agendamento?" description="Os relatórios já gerados continuam disponíveis." onConfirm={() => remove.mutate(row.id)}>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Remover ${row.name}`}><Icon name="trash-2" className="h-4 w-4" /></Button>
              </ConfirmDialog>
            </div>
          ))}
        </div>
      )}
      <Link to="/bots/relatorios" className="w-fit text-sm font-medium text-primary underline underline-offset-2">Ver relatórios gerados</Link>
      {editing && data && <ScheduleDialog options={data} schedule={editing === "novo" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ScheduleDialog({ options, schedule, onClose }: { options: ScheduleOptions; schedule: Schedule | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => ({
    name: schedule?.name ?? "Agenda do dia", kind: schedule?.kind ?? ("data" as Schedule["kind"]), report: schedule?.report ?? "agenda_do_dia",
    botId: schedule?.botId ? String(schedule.botId) : "", prompt: schedule?.prompt ?? "", frequency: schedule?.frequency ?? ("daily" as Schedule["frequency"]),
    time: schedule?.time ?? "07:00", dayOfWeek: String(schedule?.dayOfWeek ?? 1), dayOfMonth: String(schedule?.dayOfMonth ?? 1),
    channels: schedule?.channels ?? ["system"], recipients: (schedule?.recipients ?? []).map(String), active: schedule?.active ?? true,
  }));
  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const save = useMutation({
    mutationFn: () => {
      const body = { ...draft, botId: Number(draft.botId) || null, dayOfWeek: Number(draft.dayOfWeek), dayOfMonth: Number(draft.dayOfMonth), recipients: draft.recipients.map(Number) };
      return schedule ? aiApi.put(`schedules/${schedule.id}`, body) : aiApi.post("schedules", body);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [KEY] }); toast({ title: "Agendamento salvo", variant: "success" }); onClose(); },
    onError: (err) => toast({ title: "Não foi possível salvar", description: errorMessage(err), variant: "destructive" }),
  });
  const toggleChannel = (channel: string, on: boolean) => set("channels", on ? [...new Set([...draft.channels, channel])] : draft.channels.filter((item) => item !== channel));

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{schedule ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
          <DialogDescription>Ao salvar, você passa a ser o dono: o relatório é montado com as suas permissões.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div><Label htmlFor="schName">Nome</Label><Input id="schName" name="schName" className="mt-1" value={draft.name} maxLength={120} onValueChange={(_, value) => set("name", String(value))} /></div>
          <div>
            <Label>Tipo</Label>
            <Select name="schKind" modal options={[{ id: "data", name: "Relatório de dados (sem IA)" }, { id: "ai", name: "Pedido a um bot (usa IA)" }]} state={draft.kind} onChange={(_, value) => set("kind", String(value) as Schedule["kind"])} />
          </div>
          {draft.kind === "data" ? (
            <div>
              <Label>Relatório</Label>
              <Select name="schReport" modal options={options.reports.map((report) => ({ id: report.key, name: report.name }))} state={draft.report} onChange={(_, value) => set("report", String(value))} />
              <p className="mt-1 text-xs text-muted-foreground">{options.reports.find((report) => report.key === draft.report)?.description}</p>
            </div>
          ) : (
            <>
              <div><Label>Bot</Label><Select name="schBot" modal options={options.bots} state={draft.botId} onChange={(_, value) => set("botId", String(value))} placeholder="Escolha o bot" /></div>
              <div><Label htmlFor="schPrompt">Pedido</Label><Textarea id="schPrompt" className="mt-1 min-h-24" value={draft.prompt} onChange={(event) => set("prompt", event.target.value)} placeholder="Ex.: Faça o resumo da semana do comercial: funil, propostas paradas e retornos atrasados." /></div>
            </>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <div><Label>Frequência</Label><Select name="schFreq" modal options={Object.entries(FREQ).map(([id, name]) => ({ id, name }))} state={draft.frequency} onChange={(_, value) => set("frequency", String(value) as Schedule["frequency"])} /></div>
            {draft.frequency === "weekly" && <div><Label>Dia</Label><Select name="schDow" modal options={WEEKDAYS.map((name, index) => ({ id: String(index + 1), name }))} state={draft.dayOfWeek} onChange={(_, value) => set("dayOfWeek", String(value))} /></div>}
            {draft.frequency === "monthly" && <div><Label>Dia do mês</Label><Select name="schDom" modal options={Array.from({ length: 28 }, (_, index) => ({ id: String(index + 1), name: String(index + 1) }))} state={draft.dayOfMonth} onChange={(_, value) => set("dayOfMonth", String(value))} /></div>}
            <div><Label htmlFor="schTime">Horário</Label><Input id="schTime" name="schTime" className="mt-1" value={draft.time} maxLength={5} onValueChange={(_, value) => set("time", String(value))} placeholder="07:00" /></div>
          </div>
          <div>
            <Label>Canais</Label>
            <div className="mt-1 flex flex-wrap gap-4">
              {(["system", "email", "whatsapp"] as const).map((channel) => (
                <label key={channel} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={draft.channels.includes(channel)} onCheckedChange={(checked) => toggleChannel(channel, !!checked)} />
                  {CHANNEL_LABEL[channel]}{channel !== "system" && !options.channels[channel] ? " (não configurado)" : ""}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>Quem recebe</Label>
            <Select name="schRecipients" modal multiple options={options.users.map((user) => ({ id: String(user.id), name: `${user.name}${draft.channels.includes("whatsapp") && !user.hasPhone ? " (sem telefone)" : ""}` }))} state={draft.recipients} onChange={(_, value) => set("recipients", (Array.isArray(value) ? value : [value]).map(String))} placeholder="Escolha as pessoas" />
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={draft.active} onCheckedChange={(value) => set("active", value)} /> Ativo</label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
