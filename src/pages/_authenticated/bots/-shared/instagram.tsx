import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import Icon from "@/components/general-components/Icon";
import NumberInput from "@/components/general-components/Number";
import Select from "@/components/general-components/Select";
import { errorMessage } from "../../comercial/-shared/commercial";
import { aiApi } from "./bots";

/** Instagram: tipos que espelham a API (Ai_Connector.settings e a caixa do Direct) e o painel de limites. */

export type InstagramMode = "confirmar" | "automatico";
export interface SendingAction { enabled: boolean; mode: InstagramMode; limitePorDia: number }
export interface InstagramSettings {
  post: SendingAction;
  story: SendingAction;
  ler_mensagens: { enabled: boolean };
  responder_mensagens: SendingAction & { horario: { inicio: string; fim: string; diasUteis: boolean }; instrucoes: string };
  comentarios: SendingAction;
}

export interface IgConversationItem {
  id: string; username: string | null;
  lastMessage: { text: string; direction: "in" | "out"; sentAt: string; status: string; hasAttachments: boolean };
  unread: number; lastInboundAt: string | null; replyUntil: string | null; canReply: boolean;
}
export interface IgConversations { conversations: IgConversationItem[]; syncError: string | null }
export interface IgMessage {
  id: number; direction: "in" | "out"; text: string; attachments: Array<{ type: string; url: string | null }>; sentAt: string; readAt: string | null;
  origin: string; status: string; note: string | null; repliedByBotId: number | null; repliedByUserId: number | null;
}
export interface IgConversation { id: string; username: string | null; lastInboundAt: string | null; replyUntil: string | null; canReply: boolean; messages: IgMessage[]; syncError: string | null }
export interface IgComment { id: string; text: string; username: string | null; timestamp: string | null; hidden: boolean; replies: Array<{ id: string; text: string; username: string | null; timestamp: string | null }> }
export interface IgPost { id: string; caption: string | null; permalink: string | null; timestamp: string | null; comments: IgComment[] }

export const IG_SETTINGS_KEY = "instagramSettings";
export const IG_CONVERSATIONS_KEY = "instagramConversations";
export const META_PUBLISH_CAP = 100;
export const MAX_DM_BYTES = 1000;

export function InstagramLogo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl text-white ${className}`} style={{ background: "linear-gradient(45deg,#f9ce34,#ee2a7b 50%,#6228d7)" }}>
      <Icon name="instagram" className="h-1/2 w-1/2" />
    </span>
  );
}

/** Não lidas do Direct, para o menu (sem sincronizar com a Meta: só o que já está gravado). */
export function useInstagramUnread(enabled: boolean) {
  const query = useQuery({
    queryKey: [IG_CONVERSATIONS_KEY, "menu"],
    enabled,
    refetchInterval: 60 * 1000,
    retry: false,
    queryFn: () => aiApi.get<IgConversations>("instagram/conversations"),
  });
  return query.data?.conversations.reduce((sum, conv) => sum + (conv.unread > 0 ? 1 : 0), 0) ?? 0;
}

// ---------------------------------------------------------------- painel de limites

const TIMES = Array.from({ length: 48 }, (_, index) => {
  const value = `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`;
  return { id: value, name: value };
});
const ROWS: Array<{ key: keyof InstagramSettings; icon: string; label: string; help: string; max?: number; unit?: string }> = [
  { key: "post", icon: "square", label: "Publicar posts", help: "Posts no feed e carrosséis.", max: META_PUBLISH_CAP, unit: "posts" },
  { key: "story", icon: "smartphone", label: "Publicar stories", help: "Stories com imagem pronta.", max: META_PUBLISH_CAP, unit: "stories" },
  { key: "ler_mensagens", icon: "inbox", label: "Ler mensagens", help: "Os bots e a caixa do Instagram leem o Direct da empresa." },
  { key: "responder_mensagens", icon: "message-circle-reply", label: "Responder mensagens", help: "Respostas no Direct (só até 24 horas depois da última mensagem do cliente, regra da Meta). Quem responde sozinho é o bot do Instagram, configurado em Conversas → Números.", max: 1000, unit: "respostas" },
  { key: "comentarios", icon: "message-square-text", label: "Comentários", help: "Ler, responder e ocultar comentários dos posts.", max: 1000, unit: "respostas" },
];
const AUTO_TEXT: Partial<Record<keyof InstagramSettings, string>> = {
  post: "No automático o bot publica sem mostrar o cartão de confirmação.",
  story: "No automático o bot publica o story sem mostrar o cartão de confirmação.",
  responder_mensagens: "No automático, quando um bot ou o Claude (MCP) usa a ferramenta de responder no Direct, a resposta sai sem cartão dentro do horário abaixo.",
  comentarios: "No automático o bot responde e oculta comentários sem mostrar o cartão de confirmação.",
};

/** "O que os bots podem fazer" no Instagram: liga/desliga, modo e limite por ação. Só com a conta conectada e conectores_bots. */
export function InstagramRules() {
  const queryClient = useQueryClient();
  const saved = useQuery({ queryKey: [IG_SETTINGS_KEY], queryFn: () => aiApi.get<InstagramSettings>("connectors/instagram/settings") });
  const [draft, setDraft] = useState<InstagramSettings | null>(null);
  useEffect(() => { if (saved.data) setDraft(structuredClone(saved.data)); }, [saved.data]);
  const save = useMutation({
    mutationFn: (body: InstagramSettings) => aiApi.put<InstagramSettings>("connectors/instagram/settings", body),
    onSuccess: (out) => { queryClient.setQueryData([IG_SETTINGS_KEY], out); toast({ title: "Configurações do Instagram salvas", variant: "success" }); },
    onError: (error) => toast({ title: "Não foi possível salvar", description: errorMessage(error), variant: "destructive" }),
  });
  const dirty = useMemo(() => !!draft && !!saved.data && JSON.stringify(draft) !== JSON.stringify(saved.data), [draft, saved.data]);

  if (saved.error) return <p className="mt-4 text-sm text-destructive">Erro ao carregar as configurações: {errorMessage(saved.error)}</p>;
  if (!draft) return <Skeleton className="mt-4 h-48 w-full" />;

  const set = <K extends keyof InstagramSettings>(key: K, patch: Partial<InstagramSettings[K]>) => setDraft((current) => (current ? { ...current, [key]: { ...current[key], ...patch } } : current));
  const reply = draft.responder_mensagens;
  const publishSum = draft.post.limitePorDia + draft.story.limitePorDia;
  const overCap = publishSum > META_PUBLISH_CAP;
  const badHours = reply.horario.inicio >= reply.horario.fim;

  return (
    <div className="mt-4 rounded-xl border">
      <div className="border-b px-4 py-3">
        <p className="font-semibold">O que os bots podem fazer</p>
        <p className="text-xs text-muted-foreground">Vale para a Nina, para os outros bots e para o Claude conectado pelo MCP. O limite do dia conta no horário de Brasília.</p>
      </div>
      {ROWS.map((row) => {
        const value = draft[row.key] as Partial<SendingAction> & { enabled: boolean };
        const sending = row.key !== "ler_mensagens";
        return (
          <div key={row.key} className="border-b px-4 py-3 last:border-b-0">
            <div className="flex items-start gap-3">
              <Icon name={row.icon} className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{row.label}</p>
                <p className="text-xs text-muted-foreground">{row.help}</p>
              </div>
              <Switch checked={value.enabled} onCheckedChange={(checked) => set(row.key, { enabled: checked } as never)} aria-label={`${row.label}: ${value.enabled ? "ligado" : "desligado"}`} />
            </div>
            {sending && value.enabled && (
              <div className="mt-3 grid gap-3 pl-7">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex rounded-lg border p-0.5 text-xs font-medium">
                    {(["confirmar", "automatico"] as const).map((mode) => (
                      <button key={mode} type="button" onClick={() => set(row.key, { mode } as never)} className={`cursor-pointer rounded-md px-3 py-1.5 ${value.mode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                        {mode === "confirmar" ? "Pedir confirmação" : "Automático"}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Até</span>
                    <NumberInput name={`${row.key}-limite`} min={0} max={row.max} value={value.limitePorDia ?? 0} onValueChange={(_, number) => set(row.key, { limitePorDia: Math.round(Number(number) || 0) } as never)} className="w-32" inputClassName="h-8 text-center" buttonClassName="h-8 w-8" />
                    <span>{row.unit} por dia</span>
                  </div>
                </div>
                {value.mode === "automatico" && <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300"><Icon name="zap" className="mt-0.5 h-3.5 w-3.5 shrink-0" />{AUTO_TEXT[row.key]}</p>}
                {row.key === "responder_mensagens" && reply.mode === "automatico" && (
                  <div className="grid gap-3 rounded-lg bg-muted/50 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Sem cartão das</span>
                      <div className="w-24"><Select name="inicio" options={TIMES} state={reply.horario.inicio} onChange={(_, time) => set("responder_mensagens", { horario: { ...reply.horario, inicio: String(time) } })} /></div>
                      <span className="text-muted-foreground">às</span>
                      <div className="w-24"><Select name="fim" options={TIMES} state={reply.horario.fim} onChange={(_, time) => set("responder_mensagens", { horario: { ...reply.horario, fim: String(time) } })} /></div>
                      <label className="ml-1 flex cursor-pointer items-center gap-2">
                        <Checkbox checked={reply.horario.diasUteis} onCheckedChange={(checked) => set("responder_mensagens", { horario: { ...reply.horario, diasUteis: checked === true } })} />
                        <span>só dias úteis</span>
                      </label>
                    </div>
                    {badHours && <p className="text-xs text-destructive">O início precisa ser antes do fim.</p>}
                    <p className="text-xs text-muted-foreground">Fora desse horário a ferramenta volta a pedir confirmação.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-3 border-t bg-muted/30 px-4 py-3">
        <p className={`mr-auto text-xs ${overCap ? "font-medium text-destructive" : "text-muted-foreground"}`}>
          {overCap ? `A Meta aceita no máximo ${META_PUBLISH_CAP} publicações por dia: posts + stories somam ${publishSum}.` : `Posts + stories: ${publishSum} de ${META_PUBLISH_CAP} por dia (teto da Meta).`}
        </p>
        {dirty && <Button type="button" variant="ghost" size="sm" onClick={() => saved.data && setDraft(structuredClone(saved.data))}>Desfazer</Button>}
        <Button type="button" size="sm" onClick={() => save.mutate(draft)} disabled={!dirty || save.isPending || overCap || badHours}>
          <Icon name={save.isPending ? "loader-circle" : "check"} className={`mr-1 h-4 w-4 ${save.isPending ? "animate-spin" : ""}`} /> {save.isPending ? "Salvando…" : dirty ? "Salvar" : "Salvo"}
        </Button>
      </div>
    </div>
  );
}
