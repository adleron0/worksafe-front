import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import useVerify from "@/hooks/use-verify";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import { Tip, errorMessage } from "../../comercial/-shared/commercial";
import { BotAvatar, BotStatus, STATUS_TEXT } from "../-shared/avatar";
import { Bot, ago, useAiStatus, useBots, useTeam } from "../-shared/bots";
import { ConversationList, ConversationPane } from "../-shared/conversation";

interface Search { bot?: number; conversa?: number }

export const Route = createFileRoute("/_authenticated/bots/_bots/conversas")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    bot: Number(search.bot) > 0 ? Number(search.bot) : undefined,
    conversa: Number(search.conversa) > 0 ? Number(search.conversa) : undefined,
  }),
  component: BotsPage,
});

/** Tela larga (desktop): lista e conversa lado a lado. Abaixo disso, uma tela de cada vez, como app de mensagens. */
const WIDE = "(min-width: 1024px)";
function useWide() {
  return useSyncExternalStore(
    (notify) => { const query = window.matchMedia(WIDE); query.addEventListener("change", notify); return () => query.removeEventListener("change", notify); },
    () => window.matchMedia(WIDE).matches,
  );
}

/**
 * Área de Bots: escolher o bot, as conversas dele e conversar.
 * No celular: lista de bots → conversa em tela cheia (o layout esconde
 * cabeçalho, breadcrumb e rodapé). No desktop: lista ao lado da conversa.
 */
function BotsPage() {
  const { can } = useVerify();
  const search = Route.useSearch();
  const wide = useWide();
  const navigate = useNavigate({ from: "/bots/conversas" });
  const { data: bots, isLoading, error } = useBots(can("usar_bots"));
  const { data: status } = useAiStatus();
  const bot = bots?.find((item) => item.id === search.bot) ?? (wide ? bots?.[0] : undefined);
  const open = (botId: number, conversa?: number) => navigate({ search: { bot: botId, conversa } });

  if (!can("usar_bots")) return <p className="p-4 text-sm text-muted-foreground">Você ainda não tem acesso aos bots. Peça ao administrador a permissão "usar_bots".</p>;

  const off = status && !status.enabled && <p className="rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">Os bots estão desligados no momento.</p>;
  const problems = (
    <>
      {error && <p className="text-destructive">Erro: {errorMessage(error)}</p>}
      {isLoading && <Skeleton className="h-64 w-full" />}
      {bots && !bots.length && <p className="rounded-lg border p-6 text-sm text-muted-foreground">Nenhum bot liberado para você. Cada bot tem a sua permissão (por exemplo, "usar_bot_comercial"): peça ao administrador.</p>}
    </>
  );

  // celular / tablet, sem bot escolhido: a lista
  if (!wide && !bot) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold">Conversar</h1>
          {!!status?.pendingActions && (
            <Link to="/bots/acoes" className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <Icon name="shield-alert" className="h-3.5 w-3.5" /> {status.pendingActions} esperando você
            </Link>
          )}
        </div>
        {off}
        {problems}
        {bots && bots.length > 0 && <BotList bots={bots} onPick={(id) => open(id)} />}
      </div>
    );
  }

  if (!bot) return <div className="grid gap-3">{off}{problems}</div>;

  const pane = (
    <ConversationPane
      key={`${bot.id}-${search.conversa ?? "nova"}`}
      bot={bot}
      wide={wide}
      conversationId={search.conversa}
      onPick={(id) => open(bot.id, id)}
      onBack={() => navigate({ search: {} })}
      onCreated={(id) => navigate({ search: { bot: bot.id, conversa: id }, replace: true })}
    />
  );
  const rail = (className: string) => <BotRail bots={bots!} current={bot} onPick={(id) => open(id)} className={className} />;
  if (!wide) {
    return (
      <div className="flex h-full min-h-0">
        {rail("border-r pt-[max(0.375rem,env(safe-area-inset-top))]")}
        <div className="flex min-w-0 flex-1 flex-col">{off}{pane}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {off}
      <div className="grid min-h-0 flex-1 grid-cols-[auto_15rem_minmax(0,1fr)] gap-3">
        {rail("rounded-lg border")}
        <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-background">
          <ConversationList bot={bot} current={search.conversa} onPick={(id) => open(bot.id, id)} />
        </aside>
        {pane}
      </div>
    </div>
  );
}

const statusOfTeam = (team: ReturnType<typeof useTeam>["data"], id: number) => team?.members.find((member) => member.id === id);

/** Celular: um bot por linha, como a lista de um app de mensagens. */
function BotList({ bots, onPick }: { bots: Bot[]; onPick: (id: number) => void }) {
  const { data: team } = useTeam();
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      {bots.map((bot) => {
        const member = statusOfTeam(team, bot.id);
        const status = member?.status as BotStatus | undefined;
        const busy = status === "trabalhando" || status === "aguardando";
        return (
          <button key={bot.id} type="button" onClick={() => onPick(bot.id)} className="flex w-full cursor-pointer items-center gap-3 border-b px-3 py-2.5 text-left last:border-b-0 active:bg-muted">
            <BotAvatar look={bot.avatar} size={44} status={status} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="truncate font-semibold">{bot.persona}</span>
                {member?.lastConversation && <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{ago(member.lastConversation.at)}</span>}
              </span>
              <span className={`block truncate text-xs ${busy ? "font-medium text-primary" : "text-muted-foreground"}`}>
                {busy && status ? STATUS_TEXT[status] : member?.lastConversation?.title ?? bot.role}
              </span>
            </span>
            {!!member?.pendingForMe && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">{member.pendingForMe}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Trilho fino com os rostos dos bots, para trocar de um para outro sem sair da conversa. */
function BotRail({ bots, current, onPick, className = "" }: { bots: Bot[]; current: Bot; onPick: (id: number) => void; className?: string }) {
  const { data: team } = useTeam();
  return (
    <nav aria-label="Bots" className={`scroll-oculto flex w-10 shrink-0 flex-col items-center gap-1 overflow-y-auto bg-background py-1.5 ${className}`}>
      {bots.map((bot) => {
        const member = statusOfTeam(team, bot.id);
        const active = bot.id === current.id;
        return (
          <Tip key={bot.id} text={`${bot.persona} · ${bot.role}`}>
            <button
              type="button"
              aria-label={`Conversar com ${bot.persona}`}
              aria-current={active ? "true" : undefined}
              onClick={() => onPick(bot.id)}
              className={`relative grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg transition-colors ${active ? "bg-primary/15 ring-[1.5px] ring-primary" : "hover:bg-muted active:bg-muted"}`}
            >
              <BotAvatar look={bot.avatar} size={24} status={member?.status as BotStatus | undefined} still={!active} />
              {!!member?.pendingForMe && <span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-amber-500 px-0.5 text-[9px] font-bold text-white">{member.pendingForMe}</span>}
            </button>
          </Tip>
        );
      })}
    </nav>
  );
}
