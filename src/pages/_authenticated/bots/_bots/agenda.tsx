import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { errorMessage } from "../../comercial/-shared/commercial";
import { BotAvatar } from "../-shared/avatar";
import { TEAM_KEY, aiApi, dateTimeBr } from "../-shared/bots";
import { AGENDA_KEY as KEY, AgendaOptions, CHANNEL_LABEL, Schedule, whenText } from "./-components/agenda";

export const Route = createFileRoute("/_authenticated/bots/_bots/agenda")({
  component: AgendaPage,
});

/** Agenda da equipe: tarefas dos assistentes no relógio ou disparadas por eventos do sistema. */
function AgendaPage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: [KEY], enabled: can("usar_bots"), queryFn: () => aiApi.get<AgendaOptions>("schedules") });
  const navigate = useNavigate();
  const openNew = () => navigate({ to: "/bots/agenda/nova" });
  const editRow = (row: Schedule) => navigate({ to: "/bots/agenda/$scheduleId", params: { scheduleId: String(row.id) } });
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
  const canSchedule = can("agendar_bots");
  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">Agenda da equipe</h1>
          <p className="text-sm text-muted-foreground max-sm:line-clamp-2">Tarefas que os assistentes fazem sozinhos: no horário marcado ou quando algo acontece no sistema. Rodam com as permissões de quem criou, e o que sai para fora continua esperando a sua confirmação. Dá para criar falando com eles: "toda segunda às 8h, me mande…".</p>
        </div>
        {canSchedule && <Button type="button" className="shrink-0" onClick={openNew}><Icon name="plus" className="mr-1 h-4 w-4" /> Nova<span className="hidden sm:inline">&nbsp;tarefa</span></Button>}
      </div>
      {error && <p className="text-destructive">Erro: {errorMessage(error)}</p>}
      {isLoading && <Skeleton className="h-40 w-full" />}
      {data && !data.schedules.length && (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <div className="mx-auto flex w-fit -space-x-3">{data.bots.slice(0, 4).map((bot) => <BotAvatar key={bot.id} look={bot.avatar} size={44} />)}</div>
          <p className="mt-3 font-medium">Ninguém tem tarefa agendada ainda</p>
          <p className="text-sm text-muted-foreground">Exemplos: "toda manhã, Helena manda o resumo do dia" ou "quando entrar despesa sem categoria, Otávio categoriza".</p>
          {canSchedule ? <Button type="button" className="mt-4" onClick={openNew}>Criar a primeira</Button> : <p className="mt-3 text-xs text-muted-foreground">Para agendar, é preciso a permissão "Agendar tarefas para os bots".</p>}
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
              <div className="min-w-0 flex-1 basis-56">
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
              {canSchedule && <div className="ml-7 flex shrink-0 gap-1 sm:ml-0">
                <Button type="button" variant="outline" size="sm" disabled={run.isPending} onClick={() => run.mutate(row.id)}><Icon name="play" className="mr-1 h-3.5 w-3.5" /> Rodar agora</Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={row.active ? "Pausar" : "Retomar"} onClick={() => toggle.mutate(row)}><Icon name={row.active ? "pause" : "play-circle"} className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Editar ${row.name}`} onClick={() => editRow(row)}><Icon name="pencil" className="h-4 w-4" /></Button>
                <ConfirmDialog title="Remover a tarefa?" description="Os resultados já gerados continuam em Relatórios." onConfirm={() => remove.mutate(row.id)}>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Remover ${row.name}`}><Icon name="trash-2" className="h-4 w-4" /></Button>
                </ConfirmDialog>
              </div>}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
