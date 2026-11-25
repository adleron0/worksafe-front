import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import { CHAT_KEY, ContactAvatar, PAGES, chatApi, setChatLive } from "./chat";

/**
 * Tempo real das Conversas: um fluxo de eventos (SSE) aberto enquanto a pessoa
 * está no sistema. Cada evento só diz "mudou"; a tela busca de novo o que está
 * aberta. Mensagem nova de cliente toca um som curto e mostra um aviso no canto
 * (menos quando a conversa já está aberta na frente da pessoa).
 * Se o fluxo cair, as telas voltam a atualizar sozinhas a cada poucos segundos.
 */

interface LiveEvent { kind: "message" | "status" | "conversation" | "channel"; channelId: number | null; conversationId: number | null; inbound: boolean; contactName: string | null; preview: string | null }
interface Notice { key: number; conversationId: number; name: string; preview: string }

const SOUND_KEY = "ws-chat-sound";
export function soundOn() {
  try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch { return true; }
}
const soundListeners = new Set<() => void>();
export function setSound(on: boolean) {
  try { localStorage.setItem(SOUND_KEY, on ? "on" : "off"); } catch { /* sem armazenamento */ }
  soundListeners.forEach((fn) => fn());
}
export const useChatSound = () => useSyncExternalStore((fn) => { soundListeners.add(fn); return () => soundListeners.delete(fn); }, soundOn);

/** "Pop": bolha curta e suave (sem arquivo de som). */
function ding() {
  if (!soundOn()) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const t = ctx.currentTime + 0.02;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.06);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
    setTimeout(() => void ctx.close(), 500);
  } catch { /* navegador sem áudio */ }
}

const streamUrl = (ticket: string) => `${String(import.meta.env.VITE_BASE_URL ?? "").replace(/\/+$/, "")}/chat/stream?ticket=${ticket}`;

// ---------------------------------------------------------------- componente

/** Fica no layout do sistema: abre o fluxo e mostra os avisos. */
export function ChatLive() {
  const { can } = useVerify();
  const allowed = can("view_conversas") || can("todas_conversas") || can("canais_conversas");
  return allowed ? <LiveStream /> : null;
}

function LiveStream() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const here = useRef({ path: location.pathname, conversa: 0 });
  here.current = { path: location.pathname, conversa: Number((location.search as { conversa?: number }).conversa ?? 0) };
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    let source: EventSource | null = null;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let wait = 3000;
    let pending: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      if (pending) return;
      pending = setTimeout(() => { pending = null; void queryClient.invalidateQueries({ queryKey: [CHAT_KEY] }); }, 250);
    };

    const onEvent = (raw: MessageEvent) => {
      let event: LiveEvent;
      try { event = JSON.parse(raw.data); } catch { return; }
      refresh();
      if (event.kind !== "message" || !event.inbound || !event.conversationId) return;
      const open = here.current.path === PAGES.inbox && here.current.conversa === event.conversationId && document.visibilityState === "visible";
      if (open) return;
      ding();
      const notice = { key: Date.now() + Math.random(), conversationId: event.conversationId, name: event.contactName || "Cliente", preview: event.preview || "Mensagem nova" };
      setNotices((list) => [...list.filter((n) => n.conversationId !== notice.conversationId), notice].slice(-3));
      setTimeout(() => setNotices((list) => list.filter((n) => n.key !== notice.key)), 7000);
    };

    const connect = async () => {
      if (stopped) return;
      try {
        const { ticket } = await chatApi.post<{ ticket: string }>("stream/ticket");
        if (stopped) return;
        source = new EventSource(streamUrl(ticket));
        source.addEventListener("ready", () => { wait = 3000; setChatLive(true); refresh(); });
        source.addEventListener("chat", onEvent as EventListener);
        source.onerror = () => {
          // o ticket vale uma vez: fecha e pede outro
          source?.close();
          source = null;
          setChatLive(false);
          schedule();
        };
      } catch {
        setChatLive(false);
        schedule();
      }
    };
    const schedule = () => {
      if (stopped || retry) return;
      retry = setTimeout(() => { retry = null; void connect(); }, wait);
      wait = Math.min(wait * 2, 60000);
    };
    const onVisible = () => { if (document.visibilityState === "visible" && !source && !retry) void connect(); };

    void connect();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (retry) clearTimeout(retry);
      if (pending) clearTimeout(pending);
      source?.close();
      setChatLive(false);
    };
  }, [queryClient]);

  if (!notices.length) return null;
  return (
    <div className="pointer-events-none fixed top-[4.5rem] right-4 z-60 grid w-[min(22rem,calc(100vw-2rem))] gap-2" aria-live="polite">
      {notices.map((notice) => (
        <div key={notice.key} className="pointer-events-auto flex items-start gap-3 rounded-card border bg-background p-3 shadow-lg">
          <button type="button" className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left"
            onClick={() => { setNotices((list) => list.filter((n) => n.key !== notice.key)); void navigate({ to: PAGES.inbox, search: { conversa: notice.conversationId } }); }}>
            <ContactAvatar name={notice.name} size={36} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-primary"><Icon name="message-circle" className="h-3 w-3" />Mensagem nova</span>
              <span className="block truncate text-sm font-semibold">{notice.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{notice.preview}</span>
            </span>
          </button>
          <button type="button" aria-label="Fechar aviso" onClick={() => setNotices((list) => list.filter((n) => n.key !== notice.key))}
            className={cn("grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-muted")}>
            <Icon name="x" className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
