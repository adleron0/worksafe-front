import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import { errorMessage } from "../../comercial/-shared/commercial";
import { BotAvatar, STATUS_TEXT } from "../-shared/avatar";
import { MemberActivity } from "../-shared/member-activity";
import { TeamActivity, TeamMember, ago, dateTimeBr, useAiStatus, useTeam } from "../-shared/bots";

export const Route = createFileRoute("/_authenticated/bots/_bots/equipe")({
  component: TeamPage,
});

const STATUS_CHIP: Record<TeamMember["status"], string> = {
  trabalhando: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  aguardando: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  disponivel: "bg-muted text-muted-foreground",
  sem_chave: "bg-destructive/10 text-destructive",
};
const ACTIVITY_ICON: Record<string, string> = { ok: "check", pending: "shield-alert", refused: "circle-slash", denied: "lock", error: "triangle-alert" };

/** A equipe de bots como funcionários: quem está trabalhando, quem espera você e o que fizeram hoje. */
function TeamPage() {
  const { can } = useVerify();
  const { data, isLoading, error } = useTeam(can("usar_bots"));
  const { data: status } = useAiStatus();
  if (!can("usar_bots")) return <p className="p-4 text-sm text-muted-foreground">Você ainda não tem acesso aos bots. Peça ao administrador a permissão "usar_bots".</p>;
  const members = data?.members ?? [];
  const working = members.filter((member) => member.status === "trabalhando").length;
  const waiting = members.reduce((sum, member) => sum + member.pendingForMe, 0);
  const actions = members.reduce((sum, member) => sum + member.today.actions, 0);

  return (
    <div className="grid gap-5">
      {/* topo */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 via-background to-background p-6">
        <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 gap-1 lg:flex">
          {members.slice(0, 6).map((member) => (
            <BotAvatar key={member.id} look={member.avatar} size={60} status={member.status} />
          ))}
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Equipe de assistentes</p>
        <h1 className="mt-1 text-2xl font-bold">Quem está com você hoje</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">Cada assistente cuida de uma área, usa as suas permissões e só faz o que sai para fora depois que você confirma.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-medium text-emerald-700 dark:text-emerald-300">{working} trabalhando agora</span>
          <Link to="/bots/acoes" className={`rounded-full px-3 py-1 font-medium ${waiting ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}>{waiting} esperando você</Link>
          <span className="rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground">{actions} tarefas hoje</span>
          {status && !status.enabled && <span className="rounded-full bg-destructive/10 px-3 py-1 font-medium text-destructive">Bots desligados</span>}
        </div>
      </div>

      {error && <p className="text-destructive">Erro: {errorMessage(error)}</p>}
      {isLoading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-56" />)}</div>}
      {data && !members.length && <p className="rounded-lg border p-6 text-sm text-muted-foreground">Nenhum assistente liberado para você. Cada um tem a sua permissão (por exemplo, "usar_bot_comercial"): peça ao administrador.</p>}

      {data && members.length > 0 && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid content-start gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {members.map((member) => <MemberCard key={member.id} member={member} />)}
          </div>
          <ActivityFeed activity={data.activity} />
        </div>
      )}
    </div>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  const task = member.working.mine?.title
    ? `Trabalhando no seu pedido: "${member.working.mine.title}"`
    : member.working.people > 0
      ? `Atendendo ${member.working.people} ${member.working.people === 1 ? "pessoa" : "pessoas"}`
      : member.pendingForMe > 0
        ? `${member.pendingForMe} ${member.pendingForMe === 1 ? "ação espera" : "ações esperam"} a sua confirmação`
        : member.lastActivityAt ? `Última atividade ${ago(member.lastActivityAt)}` : "Ainda não trabalhou";
  const [open, setOpen] = useState<"pedidos" | "tarefas" | null>(null);
  return (
    <div className="group flex flex-col rounded-2xl border bg-background p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <BotAvatar look={member.avatar} size={64} status={member.status} />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold leading-tight">{member.persona}</p>
          <p className="text-xs text-muted-foreground">{member.role}</p>
          <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CHIP[member.status]}`}>{STATUS_TEXT[member.status]}</span>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted-foreground">{task}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <button type="button" onClick={() => setOpen("pedidos")} className="cursor-pointer rounded-lg bg-muted/60 py-2 transition-colors hover:bg-muted" aria-label={`Ver pedidos de hoje para ${member.persona}`}><p className="text-lg font-semibold leading-none">{member.today.conversations}</p><p className="mt-1 text-[11px] text-muted-foreground">pedidos hoje</p></button>
        <button type="button" onClick={() => setOpen("tarefas")} className="cursor-pointer rounded-lg bg-muted/60 py-2 transition-colors hover:bg-muted" aria-label={`Ver tarefas de hoje de ${member.persona}`}><p className="text-lg font-semibold leading-none">{member.today.actions}</p><p className="mt-1 text-[11px] text-muted-foreground">tarefas hoje</p></button>
      </div>
      <Link to="/bots/agenda" className="mt-3 flex items-center gap-2 rounded-lg border border-dashed px-2.5 py-2 text-xs hover:bg-muted">
        <Icon name="calendar-clock" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">
          {member.agenda?.next
            ? <>Próxima: <strong className="font-medium">{member.agenda.next.name}</strong>{member.agenda.next.at ? ` · ${dateTimeBr(member.agenda.next.at)}` : ""}</>
            : member.agenda?.count ? `${member.agenda.count} ${member.agenda.count === 1 ? "tarefa agendada" : "tarefas agendadas"}` : <span className="text-muted-foreground">Sem tarefas agendadas</span>}
        </span>
        {member.agenda?.watching ? <span className="flex shrink-0 items-center gap-0.5 text-amber-600 dark:text-amber-400"><Icon name="zap" className="h-3 w-3" />{member.agenda.watching}</span> : null}
      </Link>
      <div className="mt-4 flex gap-2">
        <Button asChild size="sm" className="flex-1">
          <Link to="/bots/conversas" search={{ bot: member.id, conversa: member.working.mine?.conversationId ?? member.lastConversation?.id }}>
            <Icon name="message-circle" className="mr-1 h-4 w-4" /> {member.lastConversation || member.working.mine ? "Continuar" : "Conversar"}
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" aria-label={`Nova conversa com ${member.persona}`}>
          <Link to="/bots/conversas" search={{ bot: member.id }}><Icon name="plus" className="h-4 w-4" /></Link>
        </Button>
      </div>
      {open && <MemberActivity member={member} tab={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ActivityFeed({ activity }: { activity: TeamActivity[] }) {
  return (
    <aside className="rounded-2xl border bg-background p-4">
      <p className="text-sm font-semibold">O que a equipe fez</p>
      {!activity.length && <p className="mt-3 text-sm text-muted-foreground">Nada ainda. Comece uma conversa.</p>}
      <ol className="mt-3 space-y-3">
        {activity.map((item) => (
          <li key={item.id} className="flex gap-2.5 text-sm">
            <BotAvatar look={item.avatar} size={28} />
            <div className="min-w-0 flex-1">
              <p className="leading-snug"><span className="font-medium">{item.persona ?? "Assistente"}</span> <span className="text-muted-foreground">{item.title.toLowerCase()}</span></p>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Icon name={ACTIVITY_ICON[item.status] ?? "dot"} className="h-3 w-3" />
                {ago(item.at)}{item.user ? ` · para ${item.user}` : ""}{item.origin === "mcp" ? " · pelo app de IA" : item.origin === "schedule" ? " · agendado" : ""}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
