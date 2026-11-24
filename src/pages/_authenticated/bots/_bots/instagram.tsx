import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { Tip, errorMessage } from "../../comercial/-shared/commercial";
import { BotAvatar } from "../-shared/avatar";
import { Bot, aiApi, ago, dateTimeBr, timeBr, useBots } from "../-shared/bots";
import {
  IG_CONVERSATIONS_KEY, IgConversation, IgConversationItem, IgConversations, IgMessage, IgPost, InstagramLogo, MAX_DM_BYTES,
} from "../-shared/instagram";

type Tab = "mensagens" | "comentarios";
interface Search { conversa?: string; aba?: Tab }
interface Connectors { instagram: { configured: boolean; account: { username: string | null; status: "connected" | "expired" } | null } }

export const Route = createFileRoute("/_authenticated/bots/_bots/instagram")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    conversa: typeof search.conversa === "string" && search.conversa ? search.conversa : typeof search.conversa === "number" ? String(search.conversa) : undefined,
    aba: search.aba === "comentarios" ? "comentarios" : undefined,
  }),
  component: InstagramInbox,
});

const REFRESH_MS = 20 * 1000;
const MAX_COMMENT = 2200;

/** Tela larga (desktop): lista e conversa lado a lado. Abaixo disso, uma tela de cada vez. */
const WIDE = "(min-width: 1024px)";
function useWide() {
  return useSyncExternalStore(
    (notify) => { const query = window.matchMedia(WIDE); query.addEventListener("change", notify); return () => query.removeEventListener("change", notify); },
    () => window.matchMedia(WIDE).matches,
  );
}

const bytes = (text: string) => new TextEncoder().encode(text).length;
/** "fecha em 5 h" / "fecha em 20 min" */
function closesIn(until: string | null) {
  if (!until) return "";
  const minutes = Math.max(0, Math.round((new Date(until).getTime() - Date.now()) / 60000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h`;
}
/** Hora se for hoje; senão a data curta. */
function when(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString() ? timeBr(value) : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function Initials({ name, size = 44 }: { name: string | null; size?: number }) {
  const clean = (name ?? "").replace(/^@/, "");
  const letters = clean ? clean.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || clean.slice(0, 1).toUpperCase() : "?";
  let hash = 0;
  for (const char of clean) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, hsl(${hash} 55% 50%), hsl(${(hash + 40) % 360} 60% 40%))` }}>
      {letters}
    </span>
  );
}

function WindowBadge({ conv }: { conv: Pick<IgConversationItem, "canReply" | "replyUntil"> }) {
  if (!conv.replyUntil) return null;
  return conv.canReply
    ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">janela de resposta fecha em {closesIn(conv.replyUntil)}</span>
    : <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">fora da janela de 24h</span>;
}

/** Bots → Instagram: Direct e comentários da conta da empresa. */
function InstagramInbox() {
  const { can } = useVerify();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/bots/instagram" });
  const wide = useWide();
  const tab: Tab = search.aba ?? "mensagens";
  const allowed = can("instagram_mensagens_bots");
  const connectors = useQuery({ queryKey: ["aiConnectors"], enabled: allowed, queryFn: () => aiApi.get<Connectors>("connectors") });
  const account = connectors.data?.instagram.account;

  const toConnectors = can("conectores_bots") || can("instagram_bots")
    ? <Button asChild size="sm" variant="outline"><Link to="/bots/conectores" search={{ instagram: undefined, motivo: undefined }}><Icon name="cable" className="mr-1 h-4 w-4" /> Ir para Conectores</Link></Button>
    : null;
  const notice = (title: string, text: string, link = true) => (
    <div className="m-3 grid max-w-xl justify-items-start gap-3 rounded-xl border bg-background p-5 lg:m-0">
      <InstagramLogo />
      <div><p className="font-semibold">{title}</p><p className="text-sm text-muted-foreground">{text}</p></div>
      {link && toConnectors}
    </div>
  );

  if (!allowed) return notice("Sem acesso às mensagens do Instagram", "Para ver e responder o Direct e os comentários da empresa, peça ao administrador a permissão \"instagram_mensagens_bots\".", false);
  if (connectors.isLoading) return <Skeleton className="m-3 h-64 lg:m-0" />;
  if (connectors.error) return <p className="p-3 text-sm text-destructive">Erro: {errorMessage(connectors.error)}</p>;
  if (!account) return notice("O Instagram ainda não está conectado", toConnectors ? "Conecte a conta da empresa em Bots → Conectores. Depois disso, as mensagens e os comentários aparecem aqui." : "Peça para quem administra os bots conectar a conta da empresa em Bots → Conectores.");
  if (account.status !== "connected") return notice("A conexão com o Instagram expirou", "Conecte de novo em Bots → Conectores para voltar a ler e responder as mensagens.");

  const setTab = (next: Tab) => navigate({ search: { aba: next === "comentarios" ? "comentarios" : undefined } });
  const openConversation = (id?: string) => navigate({ search: { conversa: id } });
  const chatOnly = !wide && tab === "mensagens" && !!search.conversa;

  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <InstagramLogo className="h-8 w-8" />
      <div className="mr-auto min-w-0">
        <h1 className="text-lg font-bold leading-tight">Instagram</h1>
        <p className="truncate text-xs text-muted-foreground">@{account.username}</p>
      </div>
      <div className="flex rounded-lg border bg-background p-0.5 text-xs font-medium">
        {(["mensagens", "comentarios"] as const).map((key) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`cursor-pointer rounded-md px-3 py-1.5 ${tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            {key === "mensagens" ? "Mensagens" : "Comentários"}
          </button>
        ))}
      </div>
    </div>
  );

  if (tab === "comentarios") {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 lg:overflow-visible lg:p-0">
        {header}
        <Comments />
      </div>
    );
  }

  if (chatOnly) return <ConversationPane key={search.conversa} id={search.conversa!} wide={false} onBack={() => openConversation(undefined)} />;

  if (!wide) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3">
        {header}
        <div className="overflow-hidden rounded-xl border bg-background"><ConversationList current={undefined} onPick={openConversation} /></div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {header}
      <div className="grid min-h-0 flex-1 grid-cols-[20rem_minmax(0,1fr)] gap-3">
        <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-background">
          <ConversationList current={search.conversa} onPick={openConversation} />
        </aside>
        {search.conversa
          ? <ConversationPane key={search.conversa} id={search.conversa} wide onBack={() => openConversation(undefined)} />
          : (
            <section className="grid place-items-center rounded-lg border bg-background p-6 text-center text-sm text-muted-foreground">
              <div className="grid justify-items-center gap-2"><Icon name="messages-square" className="h-8 w-8" />Escolha uma conversa para ler e responder.</div>
            </section>
          )}
      </div>
    </div>
  );
}

function SyncError({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return (
    <Tip text={text}>
      <p className="flex items-center gap-1 truncate px-3 py-1 text-[11px] text-muted-foreground"><Icon name="cloud-off" className="h-3 w-3 shrink-0" /> Não foi possível buscar as novidades na Meta agora: mostrando o que já estava gravado.</p>
    </Tip>
  );
}

// ---------------------------------------------------------------- lista de conversas

function ConversationList({ current, onPick }: { current?: string; onPick: (id: string) => void }) {
  const synced = useRef(false);
  const list = useQuery({
    queryKey: [IG_CONVERSATIONS_KEY, "list"],
    refetchInterval: REFRESH_MS,
    retry: false,
    queryFn: async () => {
      // sincroniza com a Meta na abertura; depois, só o que o webhook gravou
      const out = await aiApi.get<IgConversations>("instagram/conversations", synced.current ? undefined : { sync: 1 });
      synced.current = true;
      return out;
    },
  });

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Direct</span>
        {list.isFetching && <Icon name="loader-circle" className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>
      <SyncError text={list.data?.syncError} />
      <div className="scroll-fino min-h-0 flex-1 overflow-y-auto">
        {list.isLoading && <Skeleton className="m-2 h-16" />}
        {list.error && <ReadError error={list.error} />}
        {list.data && !list.data.conversations.length && <p className="p-4 text-sm text-muted-foreground">Nenhuma mensagem no Direct ainda.</p>}
        {list.data?.conversations.map((conv) => (
          <button key={conv.id} type="button" onClick={() => onPick(conv.id)} className={`flex w-full cursor-pointer items-center gap-3 border-b px-3 py-2.5 text-left last:border-b-0 ${conv.id === current ? "bg-primary/5" : "hover:bg-muted active:bg-muted"}`}>
            <Initials name={conv.username} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className={`truncate ${conv.unread ? "font-bold" : "font-semibold"}`}>{conv.username ? `@${conv.username}` : "Cliente do Instagram"}</span>
                <span className={`ml-auto shrink-0 text-[11px] ${conv.unread ? "font-semibold text-primary" : "text-muted-foreground"}`}>{when(conv.lastMessage.sentAt)}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className={`min-w-0 flex-1 truncate text-xs ${conv.unread ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {conv.lastMessage.direction === "out" ? "Você: " : ""}{conv.lastMessage.text || (conv.lastMessage.hasAttachments ? "[anexo]" : "")}
                </span>
                {conv.unread > 0 && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label={`${conv.unread} não lida(s)`} />}
              </span>
              <span className="mt-1 block"><WindowBadge conv={conv} /></span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function ReadError({ error }: { error: unknown }) {
  const { can } = useVerify();
  const message = errorMessage(error);
  return (
    <div className="grid gap-2 p-4 text-sm">
      <p className="text-destructive">{message}</p>
      {/Conectores/.test(message) && can("conectores_bots") && <Link to="/bots/conectores" search={{ instagram: undefined, motivo: undefined }} className="font-medium text-primary underline-offset-2 hover:underline">Abrir Conectores</Link>}
    </div>
  );
}

// ---------------------------------------------------------------- a conversa

function ConversationPane({ id, wide, onBack }: { id: string; wide: boolean; onBack: () => void }) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const synced = useRef(false);
  const { data: bots } = useBots(can("usar_bots"));
  const conv = useQuery({
    queryKey: [IG_CONVERSATIONS_KEY, "conversation", id],
    refetchInterval: REFRESH_MS,
    retry: false,
    queryFn: async () => {
      const out = await aiApi.get<IgConversation>(`instagram/conversations/${encodeURIComponent(id)}`, synced.current ? undefined : { sync: 1 });
      synced.current = true;
      return out;
    },
  });
  const data = conv.data;

  // marca como lida ao abrir (e quando chegar mensagem nova com ela aberta)
  const unread = data?.messages.filter((message) => message.direction === "in" && !message.readAt).length ?? 0;
  const markRead = useMutation({
    mutationFn: () => aiApi.post(`instagram/conversations/${encodeURIComponent(id)}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [IG_CONVERSATIONS_KEY] }),
  });
  useEffect(() => { if (unread > 0 && !markRead.isPending) markRead.mutate(); }, [unread]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const down = () => { const box = bottom.current?.parentElement; if (box) box.scrollTop = box.scrollHeight; };
    down();
    const frame = requestAnimationFrame(down);
    return () => cancelAnimationFrame(frame);
  }, [data?.messages.length]);

  const send = useMutation({
    mutationFn: (message: string) => aiApi.post(`instagram/conversations/${encodeURIComponent(id)}/reply`, { text: message }),
    onSuccess: () => { setText(""); queryClient.invalidateQueries({ queryKey: [IG_CONVERSATIONS_KEY] }); },
    onError: (error) => toast({ title: "Não foi possível enviar", description: errorMessage(error), variant: "destructive" }),
  });
  const size = bytes(text.trim());
  const tooLong = size > MAX_DM_BYTES;
  const canReply = !!data?.canReply;
  const submit = () => { const message = text.trim(); if (message && !tooLong && canReply && !send.isPending) send.mutate(message); };

  // a resposta do bot que veio logo depois de uma mensagem marcada "auto_replied" foi automática
  const automatic = useMemo(() => {
    const ids = new Set<number>();
    let pending = false;
    for (const message of data?.messages ?? []) {
      if (message.direction === "in") pending = message.status === "auto_replied";
      else if (pending && message.repliedByBotId) { ids.add(message.id); pending = false; }
    }
    return ids;
  }, [data?.messages]);
  const botsById = useMemo(() => new Map((bots ?? []).map((bot) => [bot.id, bot])), [bots]);
  const name = data?.username ? `@${data.username}` : "Cliente do Instagram";

  return (
    <section className={`flex h-full min-h-0 min-w-0 flex-col bg-background ${wide ? "rounded-lg border" : ""}`}>
      <header className="flex items-center gap-2 border-b px-1.5 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] sm:px-3">
        {!wide && (
          <Button type="button" variant="ghost" size="sm" className="h-10 w-10 shrink-0 p-0" aria-label="Voltar para as conversas" onClick={onBack}>
            <Icon name="arrow-left" className="h-5 w-5" />
          </Button>
        )}
        <Initials name={data?.username ?? null} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold leading-tight">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {data?.lastInboundAt ? `Última mensagem do cliente ${ago(data.lastInboundAt)}` : "Direct do Instagram"}
          </span>
        </span>
        {data && <span className="hidden sm:block"><WindowBadge conv={data} /></span>}
        {data?.username && (
          <Tip text="Abrir o perfil no Instagram">
            <Button asChild variant="ghost" size="sm" className="h-10 w-10 shrink-0 p-0">
              <a href={`https://instagram.com/${data.username}`} target="_blank" rel="noreferrer" aria-label="Abrir o perfil no Instagram"><Icon name="external-link" className="h-4 w-4" /></a>
            </Button>
          </Tip>
        )}
      </header>
      <SyncError text={data?.syncError} />

      <div className="scroll-fino min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
        <div className="flex min-h-full flex-col justify-end gap-2">
          {conv.isLoading && <Skeleton className="h-24 w-full" />}
          {conv.error && <ReadError error={conv.error} />}
          {data?.messages.map((message, index) => {
            const previous = data.messages[index - 1];
            const newDay = !previous || new Date(previous.sentAt).toDateString() !== new Date(message.sentAt).toDateString();
            return (
              <div key={message.id} className="grid gap-2">
                {newDay && <p className="mx-auto rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">{new Date(message.sentAt).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}</p>}
                <Bubble message={message} bot={message.repliedByBotId ? botsById.get(message.repliedByBotId) : undefined} automatic={automatic.has(message.id)} />
              </div>
            );
          })}
        </div>
        <div ref={bottom} />
      </div>

      <footer className="border-t px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3">
        {data && !canReply ? (
          <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Icon name="clock" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            A Meta só deixa responder pelo sistema até 24 horas depois da última mensagem do cliente{data.lastInboundAt ? ` (foi em ${dateTimeBr(data.lastInboundAt)})` : ""}. Responda pelo app do Instagram ou espere o cliente escrever de novo.
          </p>
        ) : (
          <>
            <div className="flex items-end gap-1.5">
              <Textarea
                id="ig-message"
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => { if (wide && event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }}
                placeholder={wide ? `Responder ${name}... (Enter envia)` : `Responder ${name}`}
                className="field-sizing-content max-h-36 min-h-10 flex-1 resize-none rounded-2xl py-2 text-base sm:text-sm"
                rows={1}
                disabled={!data || send.isPending}
              />
              <Button type="button" className="h-10 shrink-0 rounded-full px-3" onClick={submit} disabled={!data || send.isPending || !text.trim() || tooLong} aria-label="Enviar">
                <Icon name={send.isPending ? "loader-circle" : "send-horizontal"} className={`h-4 w-4 sm:mr-1 ${send.isPending ? "animate-spin" : ""}`} /><span className="hidden sm:inline">Enviar</span>
              </Button>
            </div>
            <p className={`mt-1 flex justify-between gap-2 px-2 text-[11px] ${tooLong ? "text-destructive" : "text-muted-foreground"}`}>
              <span className="truncate">{data?.replyUntil ? `Pode responder até ${dateTimeBr(data.replyUntil)}` : ""}</span>
              <span className="shrink-0">{size}/{MAX_DM_BYTES}{tooLong ? " · encurte o texto" : ""}</span>
            </p>
          </>
        )}
      </footer>
    </section>
  );
}

const AUTO_NOTE: Record<string, string> = { auto_skipped: "Resposta automática não respondeu", auto_error: "A resposta automática falhou" };

function Bubble({ message, bot, automatic }: { message: IgMessage; bot?: Bot; automatic: boolean }) {
  const attachments = (message.attachments ?? []).length > 0 && (
    <div className="mb-1 flex flex-wrap gap-1.5">
      {message.attachments.map((item, index) => (item.type === "image" && item.url
        ? <a key={index} href={item.url} target="_blank" rel="noreferrer"><img src={item.url} alt="Imagem enviada" className="max-h-48 rounded-lg object-cover" /></a>
        : item.url
          ? <a key={index} href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs underline"><Icon name="paperclip" className="h-3 w-3" /> Anexo ({item.type})</a>
          : <span key={index} className="flex items-center gap-1 text-xs opacity-80"><Icon name="paperclip" className="h-3 w-3" /> Anexo ({item.type})</span>))}
    </div>
  );

  if (message.direction === "in") {
    return (
      <div className="flex flex-col items-start gap-1">
        <div className="min-w-0 max-w-[85%] break-words rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm">
          {attachments}
          {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
          <p className="mt-1 text-[10px] text-muted-foreground">{timeBr(message.sentAt)}</p>
        </div>
        {AUTO_NOTE[message.status] && message.note && (
          <Tip text={message.note}>
            <p className="flex max-w-[85%] items-center gap-1 truncate pl-1 text-[11px] text-muted-foreground"><Icon name="bot" className="h-3 w-3 shrink-0" /> {AUTO_NOTE[message.status]}: {message.note}</p>
          </Tip>
        )}
      </div>
    );
  }

  const by = message.repliedByBotId
    ? <span className="flex items-center gap-1">{bot ? <BotAvatar look={bot.avatar} size={16} still /> : <Icon name="bot" className="h-3 w-3" />}{bot?.persona ?? "Bot"}{automatic ? " · automático" : ""}</span>
    : message.repliedByUserId ? <span>Pela equipe no sistema</span>
      : message.origin !== "system" ? <span>Pelo app do Instagram</span> : null;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className={`min-w-0 max-w-[85%] break-words rounded-2xl rounded-br-sm px-3 py-2 text-sm ${message.status === "failed" ? "bg-destructive/15 text-foreground" : "bg-primary text-primary-foreground"}`}>
        {attachments}
        {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
        <p className="mt-1 text-right text-[10px] opacity-70">{timeBr(message.sentAt)}</p>
      </div>
      {by && <p className={`flex items-center gap-1 pr-1 text-[11px] ${automatic ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>{by}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- comentários

function Comments() {
  const queryClient = useQueryClient();
  const comments = useQuery({ queryKey: [IG_CONVERSATIONS_KEY, "comments"], retry: false, refetchInterval: 60 * 1000, queryFn: () => aiApi.get<{ posts: IgPost[] }>("instagram/comments") });
  const refresh = () => queryClient.invalidateQueries({ queryKey: [IG_CONVERSATIONS_KEY, "comments"] });

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <p className="mr-auto text-xs text-muted-foreground">Comentários dos posts mais recentes que têm comentário.</p>
        <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={comments.isFetching}>
          <Icon name="refresh-cw" className={`mr-1 h-3.5 w-3.5 ${comments.isFetching ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>
      {comments.isLoading && <Skeleton className="h-40 w-full" />}
      {comments.error && <div className="rounded-xl border bg-background"><ReadError error={comments.error} /></div>}
      {comments.data && !comments.data.posts.length && <p className="rounded-xl border bg-background p-6 text-center text-sm text-muted-foreground">Nenhum comentário nos posts recentes.</p>}
      {comments.data?.posts.map((post) => (
        <div key={post.id} className="overflow-hidden rounded-xl border bg-background">
          <div className="flex items-start gap-3 border-b bg-muted/30 px-4 py-3">
            <Icon name="image" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm">{post.caption || "Post sem legenda"}</p>
              <p className="text-[11px] text-muted-foreground">{post.timestamp ? dateTimeBr(post.timestamp) : ""}{post.timestamp ? " · " : ""}{post.comments.length} comentário(s)</p>
            </div>
            {post.permalink && <a href={post.permalink} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-medium text-primary underline-offset-2 hover:underline">Ver no Instagram</a>}
          </div>
          {post.comments.map((comment) => <CommentRow key={comment.id} comment={comment} onDone={refresh} />)}
        </div>
      ))}
    </div>
  );
}

function CommentRow({ comment, onDone }: { comment: IgPost["comments"][number]; onDone: () => void }) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");
  const reply = useMutation({
    mutationFn: () => aiApi.post(`instagram/comments/${comment.id}/reply`, { text: text.trim() }),
    onSuccess: () => { setText(""); setReplying(false); onDone(); toast({ title: "Resposta publicada", variant: "success" }); },
    onError: (error) => toast({ title: "Não foi possível responder", description: errorMessage(error), variant: "destructive" }),
  });
  const hide = useMutation({
    mutationFn: (value: boolean) => aiApi.post(`instagram/comments/${comment.id}/hide`, { hide: value }),
    onSuccess: (_, value) => { onDone(); toast({ title: value ? "Comentário ocultado" : "Comentário visível de novo", variant: "success" }); },
    onError: (error) => toast({ title: "Não foi possível alterar", description: errorMessage(error), variant: "destructive" }),
  });

  return (
    <div className={`border-b px-4 py-3 last:border-b-0 ${comment.hidden ? "bg-muted/40" : ""}`}>
      <div className="flex items-start gap-3">
        <Initials name={comment.username} size={32} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{comment.username ? `@${comment.username}` : "Alguém"}</span>
            <span className="text-[11px] text-muted-foreground">{comment.timestamp ? ago(comment.timestamp) : ""}</span>
            {comment.hidden && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">oculto</span>}
          </p>
          <p className={`whitespace-pre-wrap break-words text-sm ${comment.hidden ? "text-muted-foreground" : ""}`}>{comment.text}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setReplying((open) => !open)}><Icon name="reply" className="mr-1 h-3.5 w-3.5" /> Responder</Button>
            {comment.hidden ? (
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={hide.isPending} onClick={() => hide.mutate(false)}><Icon name="eye" className="mr-1 h-3.5 w-3.5" /> Mostrar</Button>
            ) : (
              <ConfirmDialog title="Ocultar este comentário?" description="Ele some para os outros visitantes do post. Quem comentou e os amigos dele continuam vendo. Dá para mostrar de novo depois." onConfirm={() => hide.mutate(true)}>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" disabled={hide.isPending}><Icon name="eye-off" className="mr-1 h-3.5 w-3.5" /> Ocultar</Button>
              </ConfirmDialog>
            )}
          </div>
          {comment.replies.length > 0 && (
            <div className="mt-2 grid gap-2 border-l-2 pl-3">
              {comment.replies.map((item) => (
                <div key={item.id} className="text-sm">
                  <span className="font-semibold">{item.username ? `@${item.username}` : "Alguém"}</span>{" "}
                  <span className="text-[11px] text-muted-foreground">{item.timestamp ? ago(item.timestamp) : ""}</span>
                  <p className="whitespace-pre-wrap break-words">{item.text}</p>
                </div>
              ))}
            </div>
          )}
          {replying && (
            <div className="mt-2 grid gap-1.5">
              <Textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={MAX_COMMENT} placeholder={`Responder ${comment.username ? `@${comment.username}` : "o comentário"}`} className="min-h-16 text-sm" autoFocus />
              <div className="flex items-center gap-2">
                <span className="mr-auto text-[11px] text-muted-foreground">{text.length}/{MAX_COMMENT} · a resposta sai pública no post</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setReplying(false); setText(""); }}>Cancelar</Button>
                <Button type="button" size="sm" onClick={() => reply.mutate()} disabled={!text.trim() || reply.isPending}>{reply.isPending ? "Enviando…" : "Responder"}</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
