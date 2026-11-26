import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import Icon from "@/components/general-components/Icon";
import StatusBadge, { StatusTone } from "@/components/general-components/StatusBadge";
import { cn } from "@/lib/utils";

/** Conversas: tipos (espelham a API), chamadas e pedaços de tela reaproveitados. */

export const CHAT_KEY = "chat";
export const PAGES = { inbox: "/conversas/caixa", channels: "/conversas/numeros", newChannel: "/conversas/numeros/novo" } as const;

export const chatApi = {
  get: async <T,>(path: string, params?: Record<string, unknown>) => (await api.get<T>(`chat/${path}`, { params })).data,
  post: async <T,>(path: string, body?: unknown) => (await api.post<T>(`chat/${path}`, body ?? {})).data,
  put: async <T,>(path: string, body?: unknown) => (await api.put<T>(`chat/${path}`, body ?? {})).data,
  patch: async <T,>(path: string, body?: unknown) => (await api.patch<T>(`chat/${path}`, body ?? {})).data,
  delete: async <T,>(path: string) => (await api.delete<T>(`chat/${path}`)).data,
};

export type ChannelStatus = "desconectado" | "aguardando" | "conectado" | "caiu" | "banido";
export type BotMode = "desligado" | "sugere" | "triagem" | "atende";
export interface ChatSettings {
  limites: { novosPorDia: number; porMinuto: number; porHora: number; porDia: number };
  intervalo: { min: number; max: number };
  horario: { enabled: boolean; dias: number[]; inicio: string; fim: string; mensagemFora: string };
  /** o que o bot do número pode fazer */
  bot?: { instrucoes: string; foraDoHorario: boolean; limitePorConversa: number };
  /** nome de quem respondeu na frente de cada mensagem enviada pelo sistema */
  assinatura: { enabled: boolean; formato: "primeiro" | "completo" };
}
export interface Channel {
  id: number; type: "whatsapp" | "instagram"; name: string; color: string | null; sector: string | null; defaultBotId: number | null; botMode: BotMode;
  phone: string | null; profileName: string | null; status: ChannelStatus; statusReason: string | null; statusAt: string | null; connectedAt: string | null;
  settings: ChatSettings; memberIds: number[]; termsOk: boolean; historyDays: number;
  stats?: { sentToday: number; newToday: number; open: number; unread: number };
  /** aproveitamento dos rascunhos do bot nos últimos 30 dias */
  botStats?: { total: number; enviada: number; editada: number; descartada: number; ignorada: number } | null;
}
export interface ChatMeta {
  sectors: { id: string; name: string }[];
  botModes: { id: BotMode; name: string; description: string }[];
  terms: { version: string; title: string; intro: string; riscos: string[]; protecoes: string[]; boasPraticas: string[]; aceite: string };
  defaults: ChatSettings;
  bots: { id: number; name: string; persona: string | null; role: string | null; avatar: string | null; key: string }[];
  users: { id: number; name: string; imageUrl: string | null }[];
  tagColors: string[];
  serverReady: boolean;
}
export type ConversationStatus = "aberta" | "aguardando" | "resolvida";
export interface ConversationItem {
  id: number; status: ConversationStatus; sector: string | null; unread: number; lastMessageAt: string | null; lastMessagePreview: string | null; lastDirection: "in" | "out" | null;
  channel: { id: number; name: string; color: string | null; type: string };
  contact: { id: number; name: string | null; pushName: string | null; phone: string | null; avatarUrl: string | null; optOut: boolean; isNew: boolean };
  customer: { id: number; name: string } | null;
  assignedUser: { id: number; name: string; imageUrl: string | null } | null;
  tags: ChatTag[];
}
export interface ChatTag { id: number; name: string; color: string; conversations?: number }
export interface QuickReply { id: number; shortcut: string; title: string; text: string; sector: string | null; uses: number }
export type Box = "abertas" | "minhas" | "sem_dono" | "nao_lidas" | "resolvidas";
export interface ConversationList { items: ConversationItem[]; counts: Record<Exclude<Box, "resolvidas">, number> }
export type MessageStatus = "queued" | "sending" | "sent" | "delivered" | "read" | "failed" | "received";
export interface ChatMedia {
  url?: string | null; mimetype?: string | null; fileName?: string | null; size?: number | null; seconds?: number | null; ptt?: boolean;
  /** pending (baixando) | ok | failed | too_big */
  state?: string; lat?: number; lng?: number;
}
export interface ChatMessage {
  id: number; direction: "in" | "out" | "note"; type: string; text: string; media: ChatMedia | null; status: MessageStatus; error: string | null;
  origin: string; sentAt: string; sentBy: string | null;
}
export interface ConversationDetail extends ConversationItem {
  channel: ConversationItem["channel"] & { status: ChannelStatus; phone: string | null; sector: string | null; botMode: BotMode; defaultBotId?: number | null };
  messages: ChatMessage[];
  hasMore: boolean;
  /** Instagram: até quando dá para responder (24 h depois da última mensagem do cliente) */
  replyUntil: string | null;
  /** como as minhas mensagens saem assinadas neste número (null = sem assinatura) */
  signature: string | null;
  /** bot atendendo esta conversa (passar para bot / modo atende) */
  bot?: ChatBotLite | null;
  /** rascunho do bot esperando alguém enviar, editar ou descartar */
  suggestion?: { id: number; text: string; createdAt: string; bot: ChatBotLite | null } | null;
}
export interface ChatBotLite { id: number; name: string; persona: string | null; avatar: string | null }

// ---------------------------------------------------------------- tempo real (estado)

let liveOn = false;
const liveListeners = new Set<() => void>();
export const setChatLive = (value: boolean) => { if (liveOn !== value) { liveOn = value; liveListeners.forEach((fn) => fn()); } };
/** true enquanto o tempo real (SSE) está ligado: as telas atualizam com menos frequência. */
export const useChatLive = () => useSyncExternalStore((fn) => { liveListeners.add(fn); return () => liveListeners.delete(fn); }, () => liveOn);
/** Intervalo de atualização: devagar com o tempo real ligado, rápido sem ele. */
export const useLiveInterval = (fallbackMs: number, liveMs = 60000) => (useChatLive() ? liveMs : fallbackMs);

export const useQuickReplies = (enabled = true) => useQuery({ queryKey: [CHAT_KEY, "replies"], enabled, staleTime: 60000, queryFn: () => chatApi.get<QuickReply[]>("quick-replies") });
export const useChatTags = (enabled = true) => useQuery({ queryKey: [CHAT_KEY, "tags"], enabled, staleTime: 60000, queryFn: () => chatApi.get<ChatTag[]>("tags") });

/** Etiqueta pequena: bolinha na cor + nome. */
export function TagChip({ tag, className, onRemove }: { tag: Pick<ChatTag, "name" | "color">; className?: string; onRemove?: () => void }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1 rounded-full border bg-background px-1.5 py-px text-[10px] font-medium text-muted-foreground", className)}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tag.color }} />
      <span className="truncate">{tag.name}</span>
      {onRemove && <button type="button" onClick={onRemove} aria-label={`Tirar ${tag.name}`} className="-mr-0.5 cursor-pointer rounded-full hover:text-foreground"><Icon name="x" className="h-2.5 w-2.5" /></button>}
    </span>
  );
}

/** Troca as variáveis da resposta rápida pelos dados da conversa. */
export function fillReply(text: string, vars: { nome?: string | null; empresa?: string | null; atendente?: string | null }) {
  const nome = (vars.nome ?? "").trim();
  const looksLikeName = !!nome && !/^[+\d\s()-]+$/.test(nome) && !nome.startsWith("@");
  const first = looksLikeName ? nome.split(/\s+/)[0] : "";
  return text
    .replace(/\{primeiro_nome\}/gi, first)
    .replace(/\{nome\}/gi, looksLikeName ? nome : "")
    .replace(/\{empresa\}/gi, (vars.empresa ?? "").trim())
    .replace(/\{atendente\}/gi, (vars.atendente ?? "").trim().split(/\s+/)[0] ?? "")
    .replace(/ +([!?.,])/g, "$1").replace(/ {2,}/g, " ");
}

export const useChatMeta = (enabled = true) => useQuery({ queryKey: [CHAT_KEY, "meta"], enabled, staleTime: 5 * 60 * 1000, queryFn: () => chatApi.get<ChatMeta>("meta") });
export const useChannels = (enabled = true, refetchInterval: number | false = 15000) =>
  useQuery({ queryKey: [CHAT_KEY, "channels"], enabled, refetchInterval, queryFn: () => chatApi.get<Channel[]>("channels") });
/** Conversas com mensagem não lida (contador do menu). */
export function useChatUnread(enabled = true) {
  const refetchInterval = useLiveInterval(20000, 120000);
  const { data } = useQuery({ queryKey: [CHAT_KEY, "unread"], enabled, refetchInterval, retry: false, queryFn: () => chatApi.get<{ conversations: number }>("unread") });
  return data?.conversations ?? 0;
}

/** Tela larga (desktop): três colunas. Abaixo disso, uma tela de cada vez. */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (notify) => { const list = window.matchMedia(query); list.addEventListener("change", notify); return () => list.removeEventListener("change", notify); },
    () => window.matchMedia(query).matches,
  );
}

// ---------------------------------------------------------------- formatação

/** 5511912345678 → (11) 91234-5678 */
export function formatPhone(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return value ? `+${digits}` : "";
}
export const contactName = (contact: Pick<ConversationItem["contact"], "name" | "pushName" | "phone">) => contact.name || contact.pushName || formatPhone(contact.phone) || "Contato";
export const timeBr = (value: string) => new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
/** Hora se for hoje, "ontem", dia da semana nesta semana, senão a data curta. */
export function when(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();
  const days = Math.floor((new Date(today.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86400000);
  if (days <= 0) return timeBr(value);
  if (days === 1) return "ontem";
  if (days < 7) return date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
export function dayLabel(value: string) {
  const date = new Date(value);
  const days = Math.floor((new Date(new Date().toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86400000);
  if (days <= 0) return "Hoje";
  if (days === 1) return "Ontem";
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

// ---------------------------------------------------------------- pedaços de tela

export function ContactAvatar({ name, url, size = 44, color, className }: { name: string | null; url?: string | null; size?: number; color?: string | null; className?: string }) {
  const clean = (name ?? "").replace(/[^\p{L}\p{N} ]/gu, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (parts[0] ?? "?").slice(0, 2);
  let hash = 0;
  for (const char of clean) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return (
    <span className={cn("relative inline-grid shrink-0", className)} style={{ width: size, height: size }}>
      {url
        ? <img src={url} alt="" className="h-full w-full rounded-full object-cover" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} />
        : (
          <span className="grid h-full w-full place-items-center rounded-full font-semibold text-white select-none" style={{ fontSize: size * 0.36, background: `linear-gradient(135deg, hsl(${hash} 45% 52%), hsl(${(hash + 35) % 360} 50% 40%))` }}>
            {letters.toUpperCase()}
          </span>
        )}
      {color && <span className="absolute -right-0.5 -bottom-0.5 rounded-full ring-2 ring-background" style={{ width: Math.max(10, size * 0.28), height: Math.max(10, size * 0.28), background: color }} />}
    </span>
  );
}

/** Ícone do WhatsApp (marca), na cor oficial. */
export function WhatsAppLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#25D366" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Z" />
      <path fill="#fff" d="M17.3 14.6c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.3.2-.6.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.4.1-.6l.5-.5.3-.5v-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.5 13.5 0 0 0 5.2 4.6c1.9.8 2.6.9 3.5.7a3 3 0 0 0 2-1.4 2.4 2.4 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3Z" />
    </svg>
  );
}

/** Ícone do Instagram (marca). */
export function InstagramLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="ws-ig" cx="30%" cy="107%" r="150%">
          <stop offset="0" stopColor="#fdf497" /><stop offset=".05" stopColor="#fdf497" /><stop offset=".45" stopColor="#fd5949" /><stop offset=".6" stopColor="#d6249f" /><stop offset=".9" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ws-ig)" />
      <rect x="6.5" y="6.5" width="11" height="11" rx="5.5" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="17.3" cy="6.8" r="1.1" fill="#fff" />
    </svg>
  );
}

/** Logo do canal pelo tipo. */
export const ChannelLogo = ({ type, className }: { type?: string | null; className?: string }) => (type === "instagram" ? <InstagramLogo className={className} /> : <WhatsAppLogo className={className} />);

/** Telefone ou @usuário, conforme o canal. */
export const contactHandle = (contact: { phone: string | null; pushName: string | null }, type?: string | null) => (type === "instagram" ? contact.pushName ?? "Instagram" : formatPhone(contact.phone));

const STATUS: Record<ChannelStatus, { tone: StatusTone; label: string; pulse: boolean }> = {
  conectado: { tone: "success", label: "Conectado", pulse: true },
  aguardando: { tone: "warning", label: "Aguardando conexão", pulse: true },
  caiu: { tone: "warning", label: "Conexão caiu", pulse: true },
  banido: { tone: "danger", label: "Bloqueado", pulse: false },
  desconectado: { tone: "neutral", label: "Desconectado", pulse: false },
};
export const ChannelStatusBadge = ({ status }: { status: ChannelStatus }) => <StatusBadge tone={STATUS[status].tone} pulse={STATUS[status].pulse}>{STATUS[status].label}</StatusBadge>;

/** Selo do número na conversa: bolinha na cor do canal + nome. */
export function ChannelPill({ channel, className }: { channel: { name: string; color: string | null }; className?: string }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground", className)}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: channel.color ?? "#149E5E" }} />
      <span className="truncate">{channel.name}</span>
    </span>
  );
}

/** ✓ enviada · ✓✓ entregue · ✓✓ azul lida · relógio na fila · ! falhou */
export function MessageTicks({ status, className }: { status: MessageStatus; className?: string }) {
  if (status === "queued" || status === "sending") return <Icon name="clock-3" className={cn("h-3.5 w-3.5 opacity-70", className)} />;
  if (status === "failed") return <Icon name="circle-alert" className={cn("h-3.5 w-3.5 text-red-500", className)} />;
  if (status === "sent") return <Icon name="check" className={cn("h-3.5 w-3.5 opacity-70", className)} />;
  if (status === "delivered") return <Icon name="check-check" className={cn("h-3.5 w-3.5 opacity-70", className)} />;
  if (status === "read") return <Icon name="check-check" className={cn("h-3.5 w-3.5 text-sky-500", className)} />;
  return null;
}

export const TICK_LABEL: Partial<Record<MessageStatus, string>> = {
  queued: "Na fila: sai em instantes, no ritmo do número", sending: "Enviando…", sent: "Enviada", delivered: "Entregue", read: "Lida", failed: "Não foi enviada",
};

export const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
