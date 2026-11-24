import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import StatusBadge, { StatusTone } from "@/components/general-components/StatusBadge";
import Select from "@/components/general-components/Select";
import { errorMessage } from "../../comercial/-shared/commercial";
import { BotAvatar } from "./avatar";
import { STATUS_LABEL, TeamMember, aiApi, dateTimeBr, timeBr } from "./bots";

interface ActivityRequest {
  id: number; at: string; endedAt: string | null; status: "running" | "done" | "error" | "stopped"; user: string; mine: boolean;
  origin: "bots" | "schedule"; title: string; ask: string; tools: number; error: string | null; conversationId: number | null;
}
interface ActivityTask {
  id: number; at: string; status: "ok" | "pending"; origin: "bots" | "schedule" | "mcp"; user: string; mine: boolean;
  tool: string; title: string; summary: string | null; conversationId: number | null;
}
interface BotActivity { days: number; seesAll: boolean; requests: ActivityRequest[]; tasks: ActivityTask[] }

const PERIODS = [{ id: "1", name: "Hoje" }, { id: "7", name: "Últimos 7 dias" }, { id: "30", name: "Últimos 30 dias" }];
const REQUEST_STATUS: Record<ActivityRequest["status"], { label: string; tone: StatusTone }> = {
  running: { label: "trabalhando", tone: "success" },
  done: { label: "respondido", tone: "neutral" },
  error: { label: "falhou", tone: "danger" },
  stopped: { label: "interrompido", tone: "neutral" },
};
const ORIGIN: Record<string, string> = { bots: "conversa", schedule: "agenda", mcp: "app de IA" };

const sameDay = (value: string) => new Date(value).toDateString() === new Date().toDateString();
const when = (value: string) => (sameDay(value) ? timeBr(value) : dateTimeBr(value));

/** Painel lateral com os pedidos feitos a um assistente e as tarefas que ele fez, com quem pediu. */
export function MemberActivity({ member, tab, onClose }: { member: TeamMember; tab: "pedidos" | "tarefas"; onClose: () => void }) {
  const [current, setCurrent] = useState(tab);
  const [days, setDays] = useState("1");
  const { data, isLoading, error } = useQuery({
    queryKey: ["aiBotActivity", member.id, days],
    refetchInterval: 10000,
    queryFn: () => aiApi.get<BotActivity>(`team/${member.id}/activity?dias=${days}`),
  });
  const people = data ? new Set([...data.requests.map((item) => item.user), ...data.tasks.map((item) => item.user)]).size : 0;

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b p-4 text-left">
          <div className="flex items-center gap-3">
            <BotAvatar look={member.avatar} size={44} />
            <div className="min-w-0">
              <SheetTitle>{member.persona}</SheetTitle>
              <SheetDescription>{data?.seesAll ? `Pedidos de toda a equipe${people ? ` · ${people} ${people === 1 ? "pessoa" : "pessoas"}` : ""}` : "Os seus pedidos"}</SheetDescription>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex rounded-lg bg-muted p-0.5 text-sm">
              {(["pedidos", "tarefas"] as const).map((key) => (
                <button key={key} type="button" onClick={() => setCurrent(key)} className={`cursor-pointer rounded-md px-3 py-1 ${current === key ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}>
                  {key === "pedidos" ? "Pedidos" : "Tarefas"}{data ? ` (${key === "pedidos" ? data.requests.length : data.tasks.length})` : ""}
                </button>
              ))}
            </div>
            <div className="ml-auto w-44"><Select name="activityDays" modal options={PERIODS} state={days} onChange={(_, value) => setDays(String(value))} /></div>
          </div>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
          {error && <p className="text-sm text-destructive">Erro: {errorMessage(error)}</p>}
          {isLoading && <div className="grid gap-2">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-16" />)}</div>}
          {data && current === "pedidos" && (
            data.requests.length ? (
              <ol className="grid gap-2">
                {data.requests.map((item) => (
                  <li key={item.id} className="min-w-0 rounded-xl border p-3">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className={`flex items-center gap-1 font-medium ${item.mine ? "text-primary" : ""}`}><Icon name={item.origin === "schedule" ? "calendar-clock" : "user-round"} className="h-3.5 w-3.5" />{item.origin === "schedule" ? `Agenda de ${item.mine ? "você" : item.user}` : item.user}</span>
                      <span className="text-muted-foreground">{when(item.at)}</span>
                      <StatusBadge className="ml-auto" tone={REQUEST_STATUS[item.status].tone} pulse={item.status === "running"}>{REQUEST_STATUS[item.status].label}</StatusBadge>
                    </div>
                    <p className="mt-1.5 line-clamp-3 whitespace-pre-line break-words text-sm">{item.ask || item.title}</p>
                    <div className="mt-1.5 flex min-w-0 items-center gap-3 text-xs text-muted-foreground">
                      {item.tools > 0 && <span className="shrink-0 whitespace-nowrap">{item.tools} {item.tools === 1 ? "tarefa" : "tarefas"}</span>}
                      {item.error && <span className="min-w-0 flex-1 truncate text-destructive">{item.error}</span>}
                      {item.conversationId && <Link to="/bots/conversas" search={{ bot: member.id, conversa: item.conversationId }} className="ml-auto shrink-0 whitespace-nowrap text-primary underline underline-offset-2">abrir conversa</Link>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : <Empty text={days === "1" ? "Nenhum pedido hoje." : "Nenhum pedido no período."} />
          )}
          {data && current === "tarefas" && (
            data.tasks.length ? (
              <ol className="grid gap-2">
                {data.tasks.map((item) => (
                  <li key={item.id} className="flex min-w-0 gap-2.5 rounded-xl border p-3">
                    <Icon name={item.status === "pending" ? "shield-alert" : "check"} className={`mt-0.5 h-4 w-4 shrink-0 ${item.status === "pending" ? "text-amber-500" : "text-emerald-600"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.summary && !/^\s*[[{]/.test(item.summary) && <p className="mt-0.5 line-clamp-2 break-words text-xs text-muted-foreground">{item.summary}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pedido por <span className={item.mine ? "font-medium text-primary" : "font-medium text-foreground"}>{item.user}</span> · {ORIGIN[item.origin] ?? item.origin} · {when(item.at)}
                        {item.status === "pending" && <> · <span className="text-amber-700 dark:text-amber-400">{STATUS_LABEL.pending}</span></>}
                        {item.conversationId && <> · <Link to="/bots/conversas" search={{ bot: member.id, conversa: item.conversationId }} className="text-primary underline underline-offset-2">conversa</Link></>}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : <Empty text={days === "1" ? "Nenhuma tarefa hoje." : "Nenhuma tarefa no período."} />
          )}
          {data && !data.seesAll && <p className="mt-4 text-xs text-muted-foreground">Você vê só os seus pedidos. Para ver os de toda a equipe, é preciso a permissão "Ver os pedidos e tarefas de todas as pessoas aos bots".</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</p>;
}
