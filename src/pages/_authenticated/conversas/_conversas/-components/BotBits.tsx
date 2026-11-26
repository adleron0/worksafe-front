import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { BotAvatar } from "../../../bots/-shared/avatar";
import { Tip, errorMessage } from "../../../comercial/-shared/commercial";
import { CHAT_KEY, ChatBotLite, ConversationDetail, chatApi, useChatMeta } from "../../-shared/chat";

/**
 * Bots na conversa: o rascunho sugerido (enviar, usar para editar, descartar),
 * o botão "pedir sugestão", o aviso de bot atendendo (com Retomar) e o
 * "Passar para bot".
 */

const botName = (bot: ChatBotLite | null | undefined) => bot?.persona ?? bot?.name ?? "O bot";

function useRefresh(id: number) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [CHAT_KEY, "conversation", id] });
}

/** Rascunho do bot em cima da caixa de texto. */
export function SuggestionCard({ conv, onUse, onSend, sending }: { conv: ConversationDetail; onUse: (text: string, id: number) => void; onSend: (text: string, id: number) => void; sending: boolean }) {
  const refresh = useRefresh(conv.id);
  const discard = useMutation({
    mutationFn: (id: number) => chatApi.post(`conversations/${conv.id}/suggestion/${id}/discard`),
    onSuccess: refresh,
    onError: (err) => toast({ title: "Não deu certo", description: errorMessage(err), variant: "destructive" }),
  });
  const s = conv.suggestion;
  if (!s) return null;
  return (
    <div className="mb-2 overflow-hidden rounded-xl border border-primary/25 bg-primary/5">
      <div className="flex items-center gap-2 px-3 pt-2">
        <BotAvatar look={s.bot?.avatar ?? null} size={20} still />
        <p className="flex-1 truncate text-[11px] font-medium text-primary">Sugestão de {botName(s.bot)}</p>
        <Tip text="Descartar a sugestão">
          <button type="button" onClick={() => discard.mutate(s.id)} disabled={discard.isPending} aria-label="Descartar a sugestão" className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-background">
            <Icon name="x" className="h-3.5 w-3.5" />
          </button>
        </Tip>
      </div>
      <p className="max-h-32 overflow-y-auto px-3 py-1.5 text-sm whitespace-pre-wrap">{s.text}</p>
      <div className="flex flex-wrap items-center gap-2 border-t border-primary/15 px-3 py-1.5">
        <Button type="button" size="sm" className="h-7" disabled={sending} onClick={() => onSend(s.text, s.id)}><Icon name="send-horizontal" className="mr-1.5 h-3.5 w-3.5" />Enviar assim</Button>
        <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => onUse(s.text, s.id)}><Icon name="pencil-line" className="mr-1.5 h-3.5 w-3.5" />Editar antes</Button>
        <span className="ml-auto hidden text-[11px] text-muted-foreground sm:inline">Confira antes: o bot pode errar.</span>
      </div>
    </div>
  );
}

/** Botão do compositor: pede um rascunho ao bot agora. */
export function AskSuggestion({ conv }: { conv: ConversationDetail }) {
  const refresh = useRefresh(conv.id);
  const ask = useMutation({
    mutationFn: () => chatApi.post(`conversations/${conv.id}/suggestion`, {}),
    onSuccess: refresh,
    onError: (err) => toast({ title: "O bot não sugeriu nada", description: errorMessage(err), variant: "destructive" }),
  });
  if (!conv.channel.defaultBotId && !conv.bot) return null;
  return (
    <Tip text="Pedir ao bot um rascunho de resposta">
      <Button type="button" variant="ghost" className="hidden h-11 w-9 shrink-0 rounded-full p-0 text-muted-foreground sm:inline-flex" onClick={() => ask.mutate()} disabled={ask.isPending} aria-label="Pedir sugestão ao bot">
        <Icon name={ask.isPending ? "loader-circle" : "sparkles"} className={ask.isPending ? "h-5 w-5 animate-spin" : "h-5 w-5"} />
      </Button>
    </Tip>
  );
}

/** Faixa "o bot está atendendo" com o botão Retomar. */
export function BotBanner({ conv, canReply }: { conv: ConversationDetail; canReply: boolean }) {
  const refresh = useRefresh(conv.id);
  const queryClient = useQueryClient();
  const takeBack = useMutation({
    mutationFn: () => chatApi.delete(`conversations/${conv.id}/bot`),
    onSuccess: () => { refresh(); queryClient.invalidateQueries({ queryKey: [CHAT_KEY] }); toast({ title: "Você assumiu a conversa", variant: "success" }); },
    onError: (err) => toast({ title: "Não deu certo", description: errorMessage(err), variant: "destructive" }),
  });
  if (!conv.bot) return null;
  return (
    <div className="mb-2 flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2">
      <BotAvatar look={conv.bot.avatar} size={24} />
      <p className="min-w-0 flex-1 text-xs"><span className="font-medium">{botName(conv.bot)}</span> está atendendo esta conversa. Se você responder, o bot para.</p>
      {canReply && <Button type="button" size="sm" variant="outline" className="h-7 shrink-0" disabled={takeBack.isPending} onClick={() => takeBack.mutate()}>Retomar</Button>}
    </div>
  );
}

/** "Passar para bot": escolhe o bot (o do número vem marcado). */
export function HandToBotDialog({ conv, onClose }: { conv: ConversationDetail; onClose: () => void }) {
  const meta = useChatMeta();
  const queryClient = useQueryClient();
  const [botId, setBotId] = useState(conv.channel.defaultBotId ? String(conv.channel.defaultBotId) : "");
  const hand = useMutation({
    mutationFn: () => chatApi.post(`conversations/${conv.id}/bot`, { botId: Number(botId) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [CHAT_KEY] }); toast({ title: "Conversa passada para o bot", variant: "success" }); onClose(); },
    onError: (err) => toast({ title: "Não deu certo", description: errorMessage(err), variant: "destructive" }),
  });
  const bots = meta.data?.bots ?? [];
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Passar para bot</DialogTitle>
          <DialogDescription>O bot atende só esta conversa e passa para a equipe quando o cliente pedir uma pessoa, falar de dinheiro ou ele não souber. Você retoma quando quiser.</DialogDescription>
        </DialogHeader>
        <div><Label>Bot</Label>
          <Select name="handBot" modal state={botId} placeholder="Escolha o bot" options={bots.map((b) => ({ id: String(b.id), name: `${b.persona ?? b.name}${b.role ? ` · ${b.role}` : ""}` }))}
            onChange={(_, value) => setBotId(String(value ?? ""))} /></div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" disabled={!botId || hand.isPending} onClick={() => hand.mutate()}>{hand.isPending ? "Passando..." : "Passar para o bot"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
