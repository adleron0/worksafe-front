import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tip } from "../../comercial/-shared/commercial";
import { BotAvatar } from "./avatar";
import { Bot, Conversation, aiApi, useBots } from "./bots";
import { ConversationPane, PageContextPayload } from "./conversation";
import { botOnPath, pageLabelFor, shortcutsFor } from "./pages";

/**
 * Bots nas páginas (plano: worksafe/bots-nas-paginas-planejamento).
 * - BotChatProvider: fica no layout, sobrevive à troca de página; guarda qual bot
 *   está aberto, a conversa de cada um, quem está trabalhando e quem terminou.
 * - BotDock: os rostinhos no topo (Header), à esquerda do "?".
 * - BotQuickChat: a janela flutuante (no celular quase tela cheia) e a bolha minimizada.
 * - useBotContext: a tela de detalhe diz qual registro está aberto ("esta proposta").
 */

export interface PageBot { id: number; key: string; persona: string; role: string; avatar: string; pages: string[]; allowed: boolean; permission: string }
export interface RecordContext { entity: string; id?: number; title?: string; label?: string }

type View = "open" | "min" | "closed";
interface ChatState {
  openBotId: number | null;
  view: View;
  /** conversa de cada bot: número, "nova" (pediu conversa nova) ou ainda não escolhida (usa a mais recente) */
  conversations: Record<number, number | "nova" | undefined>;
  running: Record<number, boolean>;
  /** terminou enquanto a janela não estava à vista */
  unread: Record<number, boolean>;
}

interface ChatApi extends ChatState {
  open: (botId: number) => void;
  minimize: () => void;
  close: () => void;
  setConversation: (botId: number, id: number | "nova" | undefined) => void;
  setRunning: (botId: number, running: boolean, persona: string) => void;
  record: RecordContext | null;
  setRecord: (record: RecordContext | null) => void;
}

const ChatContext = createContext<ChatApi | null>(null);
export const useBotChat = () => useContext(ChatContext);

const MOBILE = "(max-width: 639px)";
function useMobile() {
  return useSyncExternalStore(
    (notify) => { const query = window.matchMedia(MOBILE); query.addEventListener("change", notify); return () => query.removeEventListener("change", notify); },
    () => window.matchMedia(MOBILE).matches,
  );
}

/** A área de Bots já é a conversa: lá não aparecem rostinhos nem janela. */
const inBotsArea = (path: string) => path === "/bots" || path.startsWith("/bots/");

export const usePageBots = () => useQuery({ queryKey: ["aiPageBots"], staleTime: 5 * 60 * 1000, queryFn: () => aiApi.get<PageBot[]>("bots/pages") });

export function BotChatProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ChatState>({ openBotId: null, view: "closed", conversations: {}, running: {}, unread: {} });
  const [record, setRecord] = useState<RecordContext | null>(null);
  const viewRef = useRef(state);
  viewRef.current = state;

  const open = useCallback((botId: number) => setState((s) => ({ ...s, openBotId: botId, view: "open", unread: { ...s.unread, [botId]: false } })), []);
  const minimize = useCallback(() => setState((s) => ({ ...s, view: "min" })), []);
  const close = useCallback(() => setState((s) => ({ ...s, view: "closed" })), []);
  const setConversation = useCallback((botId: number, id: number | "nova" | undefined) => setState((s) => ({ ...s, conversations: { ...s.conversations, [botId]: id } })), []);
  const setRunning = useCallback((botId: number, running: boolean, persona: string) => {
    const before = viewRef.current;
    if (!!before.running[botId] === running) return;
    const visible = before.view === "open" && before.openBotId === botId;
    // terminou longe dos olhos: ponto verde no rosto e um aviso
    if (!running && !visible) toast({ title: `${persona} terminou`, description: "Toque no rosto lá em cima para ver a resposta.", variant: "success" });
    setState((s) => ({ ...s, running: { ...s.running, [botId]: running }, unread: !running && !visible ? { ...s.unread, [botId]: true } : s.unread }));
  }, []);

  const value = useMemo<ChatApi>(() => ({ ...state, open, minimize, close, setConversation, setRunning, record, setRecord }), [state, open, minimize, close, setConversation, setRunning, record]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/** A tela de detalhe avisa qual registro está aberto. Sai quando a tela sai. */
export function useBotContext(record: RecordContext | null | undefined) {
  const chat = useBotChat();
  const setRecord = chat?.setRecord;
  const key = record ? `${record.entity}|${record.id ?? ""}|${record.title ?? ""}|${record.label ?? ""}` : "";
  useEffect(() => {
    if (!setRecord) return;
    setRecord(key ? (record as RecordContext) : null);
    return () => setRecord(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setRecord, key]);
}

// ---------------------------------------------------------------- rostinhos no topo

const MAX_FACES = 3;

export function BotDock() {
  const chat = useBotChat();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const mobile = useMobile();
  const { data } = usePageBots();
  if (!chat || !data || inBotsArea(path)) return null;
  const here = data.filter((bot) => botOnPath(bot.pages, path));
  if (!here.length) return null;
  const limit = mobile ? 2 : MAX_FACES;
  // se passar do limite, quem pode usar vem primeiro
  const sorted = here.length > limit ? [...here].sort((a, b) => Number(b.allowed) - Number(a.allowed)) : here;
  const shown = sorted.slice(0, limit);
  const rest = sorted.slice(limit);

  return (
    <div className="flex items-center gap-2 sm:gap-3" aria-label="Bots desta página">
      <div className="group/dock flex items-center pl-1">
        {shown.map((bot, index) => <DockFace key={bot.id} bot={bot} first={index === 0} />)}
        {rest.length > 0 && (
          <DropdownMenu>
            <Tip text="Outros bots desta página">
              <DropdownMenuTrigger asChild>
                <button type="button" className="relative -ml-2 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground ring-2 ring-background transition-transform hover:z-10 hover:-translate-y-0.5 max-sm:h-7 max-sm:w-7" aria-label={`Mais ${rest.length} bots`}>
                  +{rest.length}
                </button>
              </DropdownMenuTrigger>
            </Tip>
            <DropdownMenuContent align="end" className="min-w-52">
              {rest.map((bot) => (
                <DropdownMenuItem key={bot.id} disabled={!bot.allowed} onSelect={() => bot.allowed && chat.open(bot.id)} className="gap-2">
                  <span className={bot.allowed ? "" : "grayscale opacity-50"}><BotAvatar look={bot.avatar} size={24} still /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{bot.persona}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{bot.allowed ? bot.role : `Sem acesso (${bot.permission})`}</span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <span className="h-6 w-px bg-border" aria-hidden />
    </div>
  );
}

function DockFace({ bot, first }: { bot: PageBot; first: boolean }) {
  const chat = useBotChat()!;
  const working = !!chat.running[bot.id];
  const done = !!chat.unread[bot.id];
  const active = chat.view === "open" && chat.openBotId === bot.id;
  const tip = !bot.allowed
    ? `${bot.persona} · ${bot.role} — você não tem acesso. Peça ao administrador a permissão "${bot.permission}".`
    : `${bot.persona} · ${bot.role}${working ? " — trabalhando..." : done ? " — terminou, toque para ver" : ""}`;
  return (
    <Tip text={tip}>
      {/* o botão bloqueado continua focável para o aviso aparecer, mas não abre nada */}
      <button
        type="button"
        aria-label={bot.allowed ? `Conversar com ${bot.persona}` : `${bot.persona}: sem acesso`}
        aria-disabled={!bot.allowed || undefined}
        onClick={() => {
          // bloqueado: no celular não há "passar o mouse", então o toque explica
          if (!bot.allowed) { toast({ title: `Sem acesso a ${bot.persona}`, description: `Peça ao administrador a permissão "${bot.permission}".` }); return; }
          if (active) chat.minimize(); else chat.open(bot.id);
        }}
        className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-background ring-2 transition-transform max-sm:h-7 max-sm:w-7 ${first ? "" : "-ml-2"} ${
          bot.allowed ? "cursor-pointer hover:z-10 hover:-translate-y-0.5 hover:scale-110 group-hover/dock:mx-0.5" : "cursor-not-allowed"
        } ${active ? "z-10 ring-primary" : working ? "ring-primary/60" : "ring-background"}`}
      >
        <span className={bot.allowed ? "" : "grayscale opacity-40"}>
          <BotAvatar look={bot.avatar} size={26} still={!working} status={working ? "trabalhando" : undefined} className="max-sm:scale-90" />
        </span>
        {!bot.allowed && <span className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-muted text-muted-foreground ring-2 ring-background"><LockGlyph /></span>}
        {done && !working && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" aria-label="Terminou" />}
      </button>
    </Tip>
  );
}

const LockGlyph = () => (
  <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
);

// ---------------------------------------------------------------- janela rápida

export function BotQuickChat() {
  const chat = useBotChat();
  const { can } = useVerify();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const mobile = useMobile();
  const { data: bots } = useBots(can("usar_bots"));
  if (!chat || !bots) return null;
  const hidden = inBotsArea(path);
  // abertas: a do bot escolhido; e qualquer outra que ainda esteja trabalhando (para saber quando termina)
  const mounted = bots.filter((bot) => (bot.id === chat.openBotId && chat.view !== "closed") || chat.running[bot.id]);
  const current = bots.find((bot) => bot.id === chat.openBotId);

  return (
    <>
      {mounted.map((bot) => {
        const visible = !hidden && chat.view === "open" && bot.id === chat.openBotId;
        return <QuickWindow key={bot.id} bot={bot} visible={visible} mobile={mobile} path={path} />;
      })}
      {!hidden && chat.view === "min" && current && (
        // aba encostada na lateral, na meia altura: não cobre os rodapés fixos (Salvar, Próximo) nem o conteúdo
        <Tip text={`Voltar para ${current.persona}`}>
          <button
            type="button"
            onClick={() => chat.open(current.id)}
            aria-label={`Abrir conversa com ${current.persona}`}
            className="fixed right-0 top-[55%] z-40 grid h-14 w-14 cursor-pointer place-items-center rounded-l-full border border-r-0 bg-background pl-1 shadow-lg transition-[width] hover:w-16 active:w-16"
          >
            <BotAvatar look={current.avatar} size={40} status={chat.running[current.id] ? "trabalhando" : undefined} still={!chat.running[current.id]} />
            {chat.unread[current.id] && <span className="absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-background" aria-label="Terminou" />}
          </button>
        </Tip>
      )}
    </>
  );
}

function QuickWindow({ bot, visible, mobile, path }: { bot: Bot; visible: boolean; mobile: boolean; path: string }) {
  const chat = useBotChat()!;
  const chosen = chat.conversations[bot.id];
  // sem escolha: continua a conversa mais recente com o bot (a mesma da área Bots)
  const { data: list } = useQuery({ queryKey: ["aiConversations", bot.id], enabled: chosen === undefined, queryFn: () => aiApi.get<Conversation[]>(`bots/${bot.id}/conversations`) });
  const conversationId = chosen === "nova" ? undefined : chosen ?? list?.[0]?.id;
  const ready = chosen !== undefined || !!list;
  const queryClient = useQueryClient();
  const record = chat.record;
  const recordRef = useRef(record);
  recordRef.current = record;
  const pathRef = useRef(path);
  pathRef.current = path;

  const pageContext = useCallback((): PageContextPayload | null => {
    const where = pathRef.current;
    const current = recordRef.current;
    const label = current?.label ?? pageLabelFor(where);
    if (!label) return null;
    return { label, path: where, ...(current ? { entity: current.entity, id: current.id, title: current.title } : {}) };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !document.querySelector("[role=dialog]:not([data-bot-window])")) chat.minimize(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, chat]);

  return (
    <div
      role="dialog"
      data-bot-window
      aria-label={`Conversa com ${bot.persona}`}
      aria-hidden={!visible || undefined}
      className={`fixed z-40 flex flex-col overflow-hidden border bg-background shadow-2xl ${visible ? "" : "hidden"} ${
        mobile
          ? "inset-x-1.5 top-[max(0.75rem,env(safe-area-inset-top))] bottom-[max(0.375rem,env(safe-area-inset-bottom))] rounded-2xl"
          : "right-4 bottom-4 h-[min(640px,calc(100dvh-6rem))] w-[400px] rounded-xl"
      }`}
    >
      {ready ? (
        <ConversationPane
          key={`${bot.id}-${conversationId ?? "nova"}`}
          variant="float"
          bot={bot}
          wide={!mobile}
          conversationId={conversationId}
          pageContext={pageContext}
          shortcuts={shortcutsFor(path, bot.key, record?.entity)}
          onPick={(id) => chat.setConversation(bot.id, id ?? "nova")}
          onBack={chat.minimize}
          onCreated={(id) => { chat.setConversation(bot.id, id); queryClient.invalidateQueries({ queryKey: ["aiConversations", bot.id] }); }}
          onMinimize={chat.minimize}
          onClose={chat.close}
          onRunChange={(running) => chat.setRunning(bot.id, running, bot.persona)}
        />
      ) : (
        <div className="grid flex-1 place-items-center"><BotAvatar look={bot.avatar} size={56} status="trabalhando" /></div>
      )}
    </div>
  );
}
