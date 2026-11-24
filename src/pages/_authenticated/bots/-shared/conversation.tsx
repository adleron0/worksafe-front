import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import StatusBadge from "@/components/general-components/StatusBadge";
import TagBadge from "@/components/general-components/TagBadge";
import { Tip, errorMessage } from "../../comercial/-shared/commercial";
import { ActionCard } from "./action-card";
import { BotAvatar } from "./avatar";
import {
  Bot, Conversation, ConversationView, Markdown, Message, RISK_COLOR, RISK_ICON, RISK_LABEL, RunStep, STATUS_KEY, STATUS_LABEL, TOOL_LABEL, aiApi, timeBr,
} from "./bots";
import api from "@/services/api";
import type { Shortcut } from "./pages";

/** Onde a pessoa está (vai junto da mensagem da janela rápida). */
export interface PageContextPayload { label: string; path: string; entity?: string; id?: number; title?: string }

/** Depois que o bot grava algo, as telas abertas (listas, fichas) buscam de novo. As consultas dos bots ficam de fora. */
export const refreshScreens = (queryClient: ReturnType<typeof useQueryClient>) =>
  queryClient.invalidateQueries({ predicate: (query) => !String(query.queryKey[0] ?? "").startsWith("ai") });


/**
 * A conversa com um bot: usada na área Bots (tela inteira) e na janela rápida
 * dos bots nas páginas (variant "float"), sempre com as mesmas conversas.
 */
export function ConversationList({ bot, current, onPick, inSheet = false }: { bot: Bot; current?: number; onPick: (id: number | undefined) => void; inSheet?: boolean }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["aiConversations", bot.id], queryFn: () => aiApi.get<Conversation[]>(`bots/${bot.id}/conversations`) });
  const archive = useMutation({
    mutationFn: (id: number) => aiApi.patch(`conversations/${id}/archive`),
    onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: ["aiConversations", bot.id] }); if (id === current) onPick(undefined); },
    onError: (error) => toast({ title: "Não foi possível arquivar", description: errorMessage(error), variant: "destructive" }),
  });
  return (
    <>
      <div className={`flex items-center justify-between gap-2 border-b p-2 ${inSheet ? "py-3 pr-12 pl-3" : ""}`}>
        {inSheet ? <span className="truncate font-semibold">Conversas com {bot.persona}</span> : <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conversas</span>}
        <Button type="button" size="sm" variant="outline" className={inSheet ? "h-8 shrink-0" : "h-7"} onClick={() => onPick(undefined)}><Icon name="plus" className="mr-1 h-3.5 w-3.5" /> Nova</Button>
      </div>
      <div className="scroll-fino min-h-0 flex-1 overflow-y-auto">
        {isLoading && <Skeleton className="m-2 h-16" />}
        {data && !data.length && <p className="p-3 text-xs text-muted-foreground">Nenhuma conversa ainda.</p>}
        {data?.map((conversation) => (
          <div key={conversation.id} className={`group flex items-center gap-1 border-b last:border-b-0 ${inSheet ? "px-3" : "px-2"} ${conversation.id === current ? "bg-primary/5" : "hover:bg-muted"}`}>
            <button type="button" className="min-w-0 flex-1 cursor-pointer py-2.5 text-left" onClick={() => onPick(conversation.id)}>
              <span className="block truncate text-sm">{conversation.title}</span>
              <span className="block text-[11px] text-muted-foreground">{new Date(conversation.lastMessageAt).toLocaleDateString("pt-BR")}</span>
            </button>
            <ConfirmDialog title="Arquivar a conversa?" description="Ela sai da lista. O registro do que o bot fez continua na auditoria." onConfirm={() => archive.mutate(conversation.id)}>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0 text-muted-foreground lg:opacity-0 lg:group-hover:opacity-100" aria-label="Arquivar conversa"><Icon name="archive" className="h-3.5 w-3.5" /></Button>
            </ConfirmDialog>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- a conversa

export interface PaneProps {
  bot: Bot; wide: boolean; conversationId?: number; onPick: (id: number | undefined) => void; onBack: () => void; onCreated: (id: number) => void;
  /** "float" = janela rápida dos bots nas páginas */
  variant?: "page" | "float";
  /** tela e registro abertos, lidos na hora de enviar */
  pageContext?: () => PageContextPayload | null;
  /** atalhos da tela (janela rápida); na área Bots valem os do bot */
  shortcuts?: Shortcut[];
  onMinimize?: () => void;
  onClose?: () => void;
  /** avisa quando o bot começa/termina de trabalhar nesta conversa */
  onRunChange?: (running: boolean) => void;
}

export function ConversationPane({ bot, wide, conversationId, onPick, onBack, onCreated, variant = "page", pageContext, shortcuts, onMinimize, onClose, onRunChange }: PaneProps) {
  const float = variant === "float";
  const inputId = float ? "bot-quick-message" : "bot-message";
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sheet, setSheet] = useState<"sobre" | "conversas" | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["aiConversation", conversationId],
    enabled: !!conversationId,
    queryFn: () => aiApi.get<ConversationView>(`conversations/${conversationId}`),
    refetchInterval: (query) => (query.state.data?.run?.status === "running" ? 1000 : false),
  });
  const running = data?.run?.status === "running";

  // desce até a última mensagem (de novo no quadro seguinte, quando cartões e tabelas já têm altura)
  useEffect(() => {
    const down = () => { const box = bottom.current?.parentElement; if (box) box.scrollTop = box.scrollHeight; };
    down();
    const frame = requestAnimationFrame(down);
    return () => cancelAnimationFrame(frame);
  }, [data?.messages.length, data?.run?.steps.length, data?.pendingActions.length]);
  // quando termina, atualiza a lista (título) e o contador de ações
  const wasRunning = useRef(false);
  useEffect(() => {
    if (wasRunning.current && !running) {
      queryClient.invalidateQueries({ queryKey: ["aiConversations", bot.id] });
      queryClient.invalidateQueries({ queryKey: [STATUS_KEY] });
      // o bot pode ter criado um rascunho: a lista que está aberta atrás já mostra
      refreshScreens(queryClient);
    }
    wasRunning.current = running;
  }, [running, bot.id, queryClient]);
  const runChange = useRef(onRunChange);
  runChange.current = onRunChange;
  useEffect(() => { runChange.current?.(running); }, [running]);

  const send = useMutation({
    mutationFn: async (message: string) => {
      const id = conversationId ?? (await aiApi.post<Conversation>(`bots/${bot.id}/conversations`)).id;
      const form = new FormData();
      form.append("text", message);
      const page = pageContext?.();
      if (page) form.append("page", JSON.stringify(page));
      for (const file of files) form.append("files", file);
      await api.post(`ai/conversations/${id}/messages`, form);
      return id;
    },
    onSuccess: (id) => {
      setText(""); setFiles([]);
      if (!conversationId) onCreated(id);
      queryClient.invalidateQueries({ queryKey: ["aiConversation", id] });
      queryClient.invalidateQueries({ queryKey: ["aiConversations", bot.id] });
    },
    onError: (error) => toast({ title: "Não foi possível enviar", description: errorMessage(error), variant: "destructive" }),
  });
  const stop = useMutation({
    mutationFn: () => aiApi.patch(`runs/${data!.run!.id}/stop`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["aiConversation", conversationId] }),
  });
  const submit = (value = text) => {
    const message = value.trim();
    if ((!message && !files.length) || send.isPending || running) return;
    send.mutate(message);
  };
  const actionsById = useMemo(() => new Map((data?.pendingActions ?? []).map((action) => [action.id, action])), [data?.pendingActions]);
  const empty = !conversationId || (data && !data.messages.length);
  const subtitle = running ? `${bot.persona} está trabalhando...` : conversationId && data?.title ? data.title : bot.role;

  return (
    <section className={`flex h-full min-h-0 min-w-0 flex-col bg-background ${wide && !float ? "rounded-lg border" : ""}`}>
      <header className={`flex items-center gap-1 border-b px-1.5 py-1.5 sm:px-3 ${float ? "sm:px-2" : "pt-[max(0.375rem,env(safe-area-inset-top))]"}`}>
        {!wide && !float && (
          <Button type="button" variant="ghost" size="sm" className="h-10 w-10 shrink-0 p-0" aria-label="Voltar para a lista de bots" onClick={onBack}>
            <Icon name="arrow-left" className="h-5 w-5" />
          </Button>
        )}
        <button type="button" className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-muted" onClick={() => setSheet("sobre")}>
          <BotAvatar look={bot.avatar} size={float ? 32 : 36} status={running ? "trabalhando" : bot.providerReady ? undefined : "sem_chave"} />
          <span className="min-w-0">
            <span className="block truncate font-semibold leading-tight">{bot.persona}</span>
            <span className={`block truncate text-xs ${running ? "text-primary" : "text-muted-foreground"}`}>{subtitle}</span>
          </span>
        </button>
        {(!wide || float) && (
          <Tip text="Conversas anteriores">
            <Button type="button" variant="ghost" size="sm" className={`${float ? "h-9 w-9" : "h-10 w-10"} shrink-0 p-0`} aria-label="Conversas anteriores" onClick={() => setSheet("conversas")}>
              <Icon name="history" className="h-5 w-5" />
            </Button>
          </Tip>
        )}
        <Tip text="Nova conversa">
          <Button type="button" variant="ghost" size="sm" className={`${float ? "h-9 w-9" : "h-10 w-10"} shrink-0 p-0`} aria-label="Nova conversa" disabled={!conversationId} onClick={() => onPick(undefined)}>
            <Icon name="square-pen" className="h-5 w-5" />
          </Button>
        </Tip>
        {float ? (
          <>
            <Tip text="Abrir na área de Bots">
              <Button asChild type="button" variant="ghost" size="sm" className="h-9 w-9 shrink-0 p-0 max-sm:hidden" aria-label="Abrir na área de Bots">
                <Link to="/bots/conversas" search={{ bot: bot.id, conversa: conversationId }} onClick={onClose}><Icon name="maximize-2" className="h-4 w-4" /></Link>
              </Button>
            </Tip>
            <Tip text="Minimizar (continua trabalhando)">
              <Button type="button" variant="ghost" size="sm" className="h-9 w-9 shrink-0 p-0" aria-label="Minimizar" onClick={onMinimize}><Icon name="minus" className="h-5 w-5" /></Button>
            </Tip>
            <Tip text="Fechar">
              <Button type="button" variant="ghost" size="sm" className="h-9 w-9 shrink-0 p-0" aria-label="Fechar" onClick={onClose}><Icon name="x" className="h-5 w-5" /></Button>
            </Tip>
          </>
        ) : (
        <Tip text={`Sobre ${bot.persona}`}>
          <Button type="button" variant="ghost" size="sm" className="h-10 w-10 shrink-0 p-0" aria-label={`Sobre ${bot.persona}`} onClick={() => setSheet("sobre")}>
            <Icon name="info" className="h-5 w-5" />
          </Button>
        </Tip>
        )}
      </header>

      <div className="scroll-fino min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex min-h-full flex-col gap-3 sm:gap-4">
        {isLoading && <Skeleton className="h-24 w-full" />}
        {empty && <Welcome bot={bot} compact={float} hasShortcuts={(shortcuts ?? bot.shortcuts).length > 0} />}
        {data?.messages.map((message) => <MessageView key={`${message.role}-${message.id}`} message={message} actionsById={actionsById} bot={bot} />)}
        {running && data?.run && <LiveSteps steps={data.run.steps} bot={bot} />}
        {/* ações desta conversa que ainda não apareceram junto de um passo */}
        {data?.pendingActions.filter((action) => !data.messages.some((m) => m.role === "tool" && m.results.some((r) => r.pendingActionId === action.id))).map((action) => <ActionCard key={action.id} action={action} />)}
        </div>
        <div ref={bottom} />
      </div>

      <footer className="border-t px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3">
        {(float ? !text && !running && !!shortcuts?.length : empty && bot.shortcuts.length > 0) && (
          <div className="-mx-2 mb-2 flex gap-1.5 scroll-oculto overflow-x-auto px-2 sm:-mx-3 sm:px-3">
            {(float ? shortcuts ?? [] : bot.shortcuts).map((shortcut) => (
              <button
                key={shortcut.label}
                type="button"
                className="shrink-0 cursor-pointer rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted active:bg-muted"
                onClick={() => { setText(shortcut.prompt); document.getElementById(inputId)?.focus(); }}
              >
                {shortcut.label}
              </button>
            ))}
          </div>
        )}
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <span key={index} className="flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                <Icon name={file.type === "application/pdf" ? "file-text" : "image"} className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{file.name}</span>
                <button type="button" className="cursor-pointer" aria-label={`Tirar ${file.name}`} onClick={() => setFiles(files.filter((_, n) => n !== index))}><Icon name="x" className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-end gap-1.5">
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" multiple className="hidden" onChange={(event) => {
            const picked = Array.from(event.target.files ?? []);
            const limit = (file: File) => (file.type === "application/pdf" ? 10 : 5) * 1024 * 1024;
            const tooBig = picked.find((file) => file.size > limit(file));
            if (tooBig) toast({ title: "Arquivo grande demais", description: `${tooBig.name} passa de ${tooBig.type === "application/pdf" ? "10" : "5"} MB`, variant: "destructive" });
            setFiles([...files, ...picked.filter((file) => file.size <= limit(file))].slice(0, 3));
            event.target.value = "";
          }} />
          <Tip text="Anexar imagem ou PDF (extrato, nota, foto de pedido...)">
            <Button type="button" variant="ghost" size="sm" className="h-10 w-10 shrink-0 rounded-full p-0 text-muted-foreground" aria-label="Anexar imagem ou PDF" onClick={() => fileInput.current?.click()}><Icon name="paperclip" className="h-5 w-5" /></Button>
          </Tip>
          <Textarea
            id={inputId}
            value={text}
            onChange={(event) => setText(event.target.value)}
            // no desktop Enter envia; no celular Enter quebra a linha e quem envia é o botão
            onKeyDown={(event) => { if (wide && event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }}
            placeholder={running ? `${bot.persona} está trabalhando...` : wide ? `Peça para ${bot.persona}... (Enter envia)` : `Mensagem para ${bot.persona}`}
            className="field-sizing-content max-h-36 min-h-10 flex-1 resize-none rounded-2xl py-2 text-base sm:text-sm"
            rows={1}
            disabled={send.isPending}
          />
          {running ? (
            <Button type="button" variant="outline" className="h-10 shrink-0 rounded-full px-3" onClick={() => stop.mutate()} disabled={stop.isPending} aria-label="Parar"><Icon name="square" className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Parar</span></Button>
          ) : (
            <Button type="button" className="h-10 shrink-0 rounded-full px-3" onClick={() => submit()} disabled={send.isPending || (!text.trim() && !files.length)} aria-label="Enviar"><Icon name="send-horizontal" className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Enviar</span></Button>
          )}
        </div>
      </footer>

      <Sheet open={sheet === "conversas"} onOpenChange={(value) => setSheet(value ? "conversas" : null)}>
        <SheetContent side="left" className="flex w-[85%] flex-col gap-0 p-0 pt-[env(safe-area-inset-top)]">
          <SheetTitle className="sr-only">Conversas com {bot.persona}</SheetTitle>
          <SheetDescription className="sr-only">Escolha uma conversa anterior ou comece uma nova.</SheetDescription>
          <ConversationList inSheet bot={bot} current={conversationId} onPick={(id) => { setSheet(null); onPick(id); }} />
        </SheetContent>
      </Sheet>
      <AboutSheet bot={bot} wide={wide} open={sheet === "sobre"} onOpenChange={(value) => setSheet(value ? "sobre" : null)} />
    </section>
  );
}

/** Quem é o bot, o modelo e o que ele sabe fazer: fica atrás de um toque, fora da conversa. */
function AboutSheet({ bot, wide, open, onOpenChange }: { bot: Bot; wide: boolean; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={wide ? "right" : "bottom"} className={`overflow-y-auto p-4 ${wide ? "w-full sm:max-w-md" : "max-h-[85dvh] rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"}`}>
        <SheetHeader className="items-center pr-0 text-center sm:text-center">
          <BotAvatar look={bot.avatar} size={72} />
          <SheetTitle>{bot.persona}</SheetTitle>
          <SheetDescription>{bot.role}. {bot.description}</SheetDescription>
        </SheetHeader>
        <div className="mt-3 flex justify-center">
          {bot.providerReady
            ? <TagBadge icon="cpu" size="md">{`${bot.providerLabel} · ${bot.model}`}</TagBadge>
            : <StatusBadge tone="danger">IA sem chave configurada</StatusBadge>}
        </div>
        <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">O que posso fazer por você</p>
        <div className="flex flex-wrap gap-1.5">
          {bot.capabilities.map((tool) => (
            <TagBadge key={tool.name} icon={RISK_ICON[tool.risk]} color={RISK_COLOR[tool.risk]}>{TOOL_LABEL[tool.name] ?? tool.title} · {RISK_LABEL[tool.risk]}</TagBadge>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">"Com confirmação" só acontece depois que você desliza para confirmar. Os bots usam as suas permissões.</p>
        {bot.hiddenCount > 0 && <p className="mt-1 text-xs text-muted-foreground">{bot.hiddenCount} tarefa(s) ficam escondidas porque dependem de permissões que você não tem.</p>}
      </SheetContent>
    </Sheet>
  );
}

function Welcome({ bot, compact = false, hasShortcuts }: { bot: Bot; compact?: boolean; hasShortcuts: boolean }) {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center py-4 text-center">
      <BotAvatar look={bot.avatar} size={compact ? 64 : 80} />
      <p className="mt-3 text-lg font-semibold">Oi, eu sou {bot.persona}.</p>
      <p className="line-clamp-3 text-sm text-muted-foreground">{bot.description}</p>
      {hasShortcuts && <p className="mt-3 text-xs text-muted-foreground">Escreva o que precisa ou toque numa sugestão aqui embaixo.</p>}
    </div>
  );
}

function MessageView({ message, actionsById, bot }: { message: Message; actionsById: Map<number, ConversationView["pendingActions"][number]>; bot: Bot }) {
  if (message.role === "tool") {
    return (
      <div className="space-y-2">
        {message.results.map((result, index) => {
          const action = result.pendingActionId ? actionsById.get(result.pendingActionId) : undefined;
          if (action) return <ActionCard key={index} action={action} />;
          if (result.handoff) {
            const handoff = result.handoff;
            return (
              <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                <Icon name="arrow-right-left" className="h-4 w-4 text-primary" />
                <span className="flex-1">Conversa passada para {handoff.persona}, já com o resumo.</span>
                <Button asChild size="sm"><Link to="/bots/conversas" search={{ bot: handoff.botId, conversa: handoff.conversationId }}>Abrir conversa com {handoff.persona}</Link></Button>
              </div>
            );
          }
          if (result.status === "ok") return null;
          return <p key={index} className="text-xs text-muted-foreground"><Icon name="info" className="mr-1 inline h-3.5 w-3.5" />{result.name}: {STATUS_LABEL[result.status] ?? result.status}</p>;
        })}
      </div>
    );
  }
  if (message.role === "notice") {
    return <p className="mx-auto w-fit max-w-full rounded-md bg-muted px-3 py-1.5 text-center text-xs text-muted-foreground">{message.text}</p>;
  }
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="min-w-0 max-w-[85%] break-words rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
          {message.attachments.length > 0 && <p className="mb-1 text-xs opacity-80"><Icon name="paperclip" className="mr-1 inline h-3 w-3" />{message.attachments.map((item) => item.name).join(", ")}</p>}
          <p className="whitespace-pre-wrap">{message.text}</p>
          <p className="mt-1 flex items-center justify-end gap-1.5 text-[10px] opacity-70">
            {message.page && (
              <Tip text={`Enviada de ${message.page.label}${message.page.title ? `: ${message.page.title}` : ""}`}>
                <Link to={message.page.path} className="flex min-w-0 items-center gap-0.5 underline-offset-2 hover:underline"><Icon name="map-pin" className="h-3 w-3 shrink-0" /><span className="max-w-40 truncate">{message.page.title ?? message.page.label}</span></Link>
              </Tip>
            )}
            <span>{timeBr(message.createdAt)}</span>
          </p>
        </div>
      </div>
    );
  }
  // assistente: só o texto (as chamadas de ferramenta aparecem como passos)
  if (!message.text && message.toolCalls.length) {
    return <p className="text-xs text-muted-foreground"><Icon name="wand-sparkles" className="mr-1 inline h-3.5 w-3.5" />{message.toolCalls.map((call) => call.title).join(" · ")}</p>;
  }
  return (
    <div className="flex items-end gap-2">
      <span className="hidden shrink-0 sm:block"><BotAvatar look={bot.avatar} size={28} /></span>
      <div className="min-w-0 max-w-[94%] sm:max-w-[88%] break-words rounded-2xl rounded-bl-sm bg-muted/60 px-3 py-2">
        <Markdown text={message.text} />
        {message.toolCalls.length > 0 && <p className="mt-1 text-[11px] text-muted-foreground">{message.toolCalls.map((call) => call.title).join(" · ")}</p>}
      </div>
    </div>
  );
}

function LiveSteps({ steps, bot }: { steps: RunStep[]; bot: Bot }) {
  return (
    <div className="space-y-1 rounded-lg border border-dashed p-3 text-xs">
      <p className="flex items-center gap-2 font-medium"><BotAvatar look={bot.avatar} size={22} status="trabalhando" /> {bot.persona} está trabalhando...</p>
      {steps.map((step, index) => (
        <p key={index} className="flex items-center gap-2 text-muted-foreground">
          <Icon name={step.status === "running" ? "loader" : step.status === "ok" ? "check" : step.status === "pending" ? "shield-alert" : "x"} className={`h-3.5 w-3.5 ${step.status === "running" ? "animate-spin" : ""}`} />
          {step.label}{step.status !== "running" && step.status !== "ok" ? ` (${STATUS_LABEL[step.status] ?? step.status})` : ""}
        </p>
      ))}
    </div>
  );
}

