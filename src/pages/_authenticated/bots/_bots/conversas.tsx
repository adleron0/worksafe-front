import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { Tip, errorMessage } from "../../comercial/-shared/commercial";
import { ActionCard } from "../-shared/action-card";
import { BotAvatar, BotStatus, STATUS_TEXT } from "../-shared/avatar";
import {
  Bot, Conversation, ConversationView, Markdown, Message, RISK_CLASS, RISK_LABEL, RunStep, STATUS_KEY, STATUS_LABEL, TOOL_LABEL, ago, aiApi, timeBr, useAiStatus, useBots, useTeam,
} from "../-shared/bots";
import api from "@/services/api";

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
  if (!wide) return <div className="flex h-full min-h-0 flex-col">{off}{pane}</div>;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {off}
      <div className="grid min-h-0 flex-1 grid-cols-[17rem_minmax(0,1fr)] gap-3">
        <aside className="flex min-h-0 min-w-0 flex-col gap-3">
          <BotPicker bots={bots!} current={bot} onPick={(id) => open(id)} />
          <div className="flex min-h-40 flex-1 flex-col overflow-hidden rounded-lg border bg-background">
            <ConversationList bot={bot} current={search.conversa} onPick={(id) => open(bot.id, id)} />
          </div>
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

function BotPicker({ bots, current, onPick }: { bots: Bot[]; current: Bot; onPick: (id: number) => void }) {
  const { data: team } = useTeam();
  return (
    <div className="grid max-h-[45%] shrink-0 grid-cols-1 gap-1.5 overflow-y-auto">
      {bots.map((bot) => (
        <button
          key={bot.id}
          type="button"
          onClick={() => onPick(bot.id)}
          className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-2 py-1.5 text-left transition-colors ${bot.id === current.id ? "border-primary bg-primary/5" : "bg-background hover:bg-muted"}`}
        >
          <BotAvatar look={bot.avatar} size={32} status={statusOfTeam(team, bot.id)?.status as BotStatus | undefined} />
          <span className="min-w-0">
            <span className="block text-sm font-medium leading-tight">{bot.persona}</span>
            <span className="line-clamp-1 text-xs text-muted-foreground">{bot.role}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function ConversationList({ bot, current, onPick, inSheet = false }: { bot: Bot; current?: number; onPick: (id: number | undefined) => void; inSheet?: boolean }) {
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
      <div className="min-h-0 flex-1 overflow-y-auto">
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

interface PaneProps { bot: Bot; wide: boolean; conversationId?: number; onPick: (id: number | undefined) => void; onBack: () => void; onCreated: (id: number) => void }

function ConversationPane({ bot, wide, conversationId, onPick, onBack, onCreated }: PaneProps) {
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
    }
    wasRunning.current = running;
  }, [running, bot.id, queryClient]);

  const send = useMutation({
    mutationFn: async (message: string) => {
      const id = conversationId ?? (await aiApi.post<Conversation>(`bots/${bot.id}/conversations`)).id;
      const form = new FormData();
      form.append("text", message);
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
    <section className={`flex h-full min-h-0 min-w-0 flex-col bg-background ${wide ? "rounded-lg border" : ""}`}>
      <header className="flex items-center gap-1 border-b px-1.5 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] sm:px-3">
        {!wide && (
          <Button type="button" variant="ghost" size="sm" className="h-10 w-10 shrink-0 p-0" aria-label="Voltar para a lista de bots" onClick={onBack}>
            <Icon name="arrow-left" className="h-5 w-5" />
          </Button>
        )}
        <button type="button" className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-muted" onClick={() => setSheet("sobre")}>
          <BotAvatar look={bot.avatar} size={36} status={running ? "trabalhando" : bot.providerReady ? undefined : "sem_chave"} />
          <span className="min-w-0">
            <span className="block truncate font-semibold leading-tight">{bot.persona}</span>
            <span className={`block truncate text-xs ${running ? "text-primary" : "text-muted-foreground"}`}>{subtitle}</span>
          </span>
        </button>
        {!wide && (
          <Button type="button" variant="ghost" size="sm" className="h-10 w-10 shrink-0 p-0" aria-label="Conversas anteriores" onClick={() => setSheet("conversas")}>
            <Icon name="history" className="h-5 w-5" />
          </Button>
        )}
        <Tip text="Nova conversa">
          <Button type="button" variant="ghost" size="sm" className="h-10 w-10 shrink-0 p-0" aria-label="Nova conversa" disabled={!conversationId} onClick={() => onPick(undefined)}>
            <Icon name="square-pen" className="h-5 w-5" />
          </Button>
        </Tip>
        <Tip text={`Sobre ${bot.persona}`}>
          <Button type="button" variant="ghost" size="sm" className="h-10 w-10 shrink-0 p-0" aria-label={`Sobre ${bot.persona}`} onClick={() => setSheet("sobre")}>
            <Icon name="info" className="h-5 w-5" />
          </Button>
        </Tip>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex min-h-full flex-col gap-3 sm:gap-4">
        {isLoading && <Skeleton className="h-24 w-full" />}
        {empty && <Welcome bot={bot} />}
        {data?.messages.map((message) => <MessageView key={`${message.role}-${message.id}`} message={message} actionsById={actionsById} bot={bot} />)}
        {running && data?.run && <LiveSteps steps={data.run.steps} bot={bot} />}
        {/* ações desta conversa que ainda não apareceram junto de um passo */}
        {data?.pendingActions.filter((action) => !data.messages.some((m) => m.role === "tool" && m.results.some((r) => r.pendingActionId === action.id))).map((action) => <ActionCard key={action.id} action={action} />)}
        </div>
        <div ref={bottom} />
      </div>

      <footer className="border-t px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3">
        {empty && bot.shortcuts.length > 0 && (
          <div className="-mx-2 mb-2 flex gap-1.5 overflow-x-auto px-2 [scrollbar-width:none] sm:-mx-3 sm:px-3">
            {bot.shortcuts.map((shortcut) => (
              <button
                key={shortcut.label}
                type="button"
                className="shrink-0 cursor-pointer rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted active:bg-muted"
                onClick={() => { setText(shortcut.prompt); document.getElementById("bot-message")?.focus(); }}
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
            id="bot-message"
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
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${bot.providerReady ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive"}`}>
            {bot.providerReady ? `${bot.providerLabel} · ${bot.model}` : "IA sem chave configurada"}
          </span>
        </div>
        <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">O que posso fazer por você</p>
        <div className="flex flex-wrap gap-1.5">
          {bot.capabilities.map((tool) => (
            <span key={tool.name} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${RISK_CLASS[tool.risk]}`}>{TOOL_LABEL[tool.name] ?? tool.title} · {RISK_LABEL[tool.risk]}</span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">"Com confirmação" só acontece depois que você desliza para confirmar. Os bots usam as suas permissões.</p>
        {bot.hiddenCount > 0 && <p className="mt-1 text-xs text-muted-foreground">{bot.hiddenCount} tarefa(s) ficam escondidas porque dependem de permissões que você não tem.</p>}
      </SheetContent>
    </Sheet>
  );
}

function Welcome({ bot }: { bot: Bot }) {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center py-4 text-center">
      <BotAvatar look={bot.avatar} size={80} />
      <p className="mt-3 text-lg font-semibold">Oi, eu sou {bot.persona}.</p>
      <p className="line-clamp-3 text-sm text-muted-foreground">{bot.description}</p>
      {bot.shortcuts.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Escreva o que precisa ou toque numa sugestão aqui embaixo.</p>}
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
          <p className="mt-1 text-right text-[10px] opacity-70">{timeBr(message.createdAt)}</p>
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

