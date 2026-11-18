import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { Tip, errorMessage } from "../../comercial/-shared/commercial";
import { ActionCard } from "../-shared/action-card";
import { BotAvatar, BotStatus } from "../-shared/avatar";
import {
  Bot, Conversation, ConversationView, Markdown, Message, RISK_CLASS, RISK_LABEL, RunStep, STATUS_KEY, STATUS_LABEL, TOOL_LABEL, aiApi, timeBr, useAiStatus, useBots, useTeam,
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

/** Área de Bots: escolher o bot, as conversas dele e conversar. */
function BotsPage() {
  const { can } = useVerify();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/bots/conversas" });
  const { data: bots, isLoading, error } = useBots(can("usar_bots"));
  const { data: status } = useAiStatus();
  const bot = bots?.find((item) => item.id === search.bot) ?? bots?.[0];

  if (!can("usar_bots")) return <p className="p-4 text-sm text-muted-foreground">Você ainda não tem acesso aos bots. Peça ao administrador a permissão "usar_bots".</p>;

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Conversas</h1>
          <p className="text-sm text-muted-foreground">Converse com a equipe de assistentes. Eles usam as suas permissões, e o que sai para fora só acontece quando você confirma.</p>
        </div>
        {status && !status.enabled && <span className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">Os bots estão desligados no momento</span>}
      </div>
      {error && <p className="text-destructive">Erro: {errorMessage(error)}</p>}
      {isLoading && <Skeleton className="h-64 w-full" />}
      {bots && !bots.length && <p className="rounded-lg border p-6 text-sm text-muted-foreground">Nenhum bot liberado para você. Cada bot tem a sua permissão (por exemplo, "usar_bot_comercial"): peça ao administrador.</p>}
      {bot && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="flex min-w-0 flex-col gap-3 lg:min-h-0">
            <BotPicker bots={bots!} current={bot} onPick={(id) => navigate({ search: { bot: id } })} />
            <ConversationList bot={bot} current={search.conversa} onPick={(id) => navigate({ search: { bot: bot.id, conversa: id } })} />
          </aside>
          <ConversationPane key={`${bot.id}-${search.conversa ?? "nova"}`} bot={bot} conversationId={search.conversa} onCreated={(id) => navigate({ search: { bot: bot.id, conversa: id }, replace: true })} />
        </div>
      )}
    </div>
  );
}

function BotPicker({ bots, current, onPick }: { bots: Bot[]; current: Bot; onPick: (id: number) => void }) {
  const { data: team } = useTeam();
  const statusOf = (id: number) => team?.members.find((member) => member.id === id)?.status as BotStatus | undefined;
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:grid lg:grid-cols-1 lg:overflow-visible lg:px-0 lg:pb-0">
      {bots.map((bot) => (
        <button
          key={bot.id}
          type="button"
          onClick={() => onPick(bot.id)}
          className={`flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border px-2 py-1.5 text-left transition-colors ${bot.id === current.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
        >
          <BotAvatar look={bot.avatar} size={36} status={statusOf(bot.id)} />
          <span className="min-w-0">
            <span className="block text-sm font-medium leading-tight">{bot.persona}</span>
            <span className="hidden text-xs text-muted-foreground lg:line-clamp-1">{bot.role}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function ConversationList({ bot, current, onPick }: { bot: Bot; current?: number; onPick: (id: number | undefined) => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["aiConversations", bot.id], queryFn: () => aiApi.get<Conversation[]>(`bots/${bot.id}/conversations`) });
  const archive = useMutation({
    mutationFn: (id: number) => aiApi.patch(`conversations/${id}/archive`),
    onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: ["aiConversations", bot.id] }); if (id === current) onPick(undefined); },
    onError: (error) => toast({ title: "Não foi possível arquivar", description: errorMessage(error), variant: "destructive" }),
  });
  return (
    <div className="flex max-h-48 min-h-32 flex-1 flex-col rounded-lg border lg:max-h-none lg:min-h-48">
      <div className="flex items-center justify-between border-b p-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conversas</span>
        <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => onPick(undefined)}><Icon name="plus" className="mr-1 h-3.5 w-3.5" /> Nova</Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <Skeleton className="m-2 h-16" />}
        {data && !data.length && <p className="p-3 text-xs text-muted-foreground">Nenhuma conversa ainda.</p>}
        {data?.map((conversation) => (
          <div key={conversation.id} className={`group flex items-center gap-1 border-b px-2 last:border-b-0 ${conversation.id === current ? "bg-primary/5" : "hover:bg-muted"}`}>
            <button type="button" className="min-w-0 flex-1 cursor-pointer py-2 text-left" onClick={() => onPick(conversation.id)}>
              <span className="block truncate text-sm">{conversation.title}</span>
              <span className="block text-[11px] text-muted-foreground">{new Date(conversation.lastMessageAt).toLocaleDateString("pt-BR")}</span>
            </button>
            <ConfirmDialog title="Arquivar a conversa?" description="Ela sai da lista. O registro do que o bot fez continua na auditoria." onConfirm={() => archive.mutate(conversation.id)}>
              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0 opacity-0 group-hover:opacity-100" aria-label="Arquivar conversa"><Icon name="archive" className="h-3.5 w-3.5" /></Button>
            </ConfirmDialog>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- a conversa

function ConversationPane({ bot, conversationId, onCreated }: { bot: Bot; conversationId?: number; onCreated: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["aiConversation", conversationId],
    enabled: !!conversationId,
    queryFn: () => aiApi.get<ConversationView>(`conversations/${conversationId}`),
    refetchInterval: (query) => (query.state.data?.run?.status === "running" ? 1000 : false),
  });
  const running = data?.run?.status === "running";

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [data?.messages.length, data?.run?.steps.length, data?.pendingActions.length]);
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

  return (
    <section className="flex h-[70dvh] min-h-[28rem] min-w-0 flex-col rounded-lg border bg-background lg:h-auto">
      <header className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
        <BotAvatar look={bot.avatar} size={36} status={running ? "trabalhando" : undefined} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">{bot.persona} <span className="text-xs font-normal text-muted-foreground">· {bot.role}</span></p>
          <p className="truncate text-xs text-muted-foreground">{data?.title && conversationId ? data.title : bot.description}</p>
        </div>
        <Tip text={`Modelo: ${bot.providerLabel} · ${bot.model}`}>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${bot.providerReady ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive"}`}>{bot.providerReady ? bot.model : "IA sem chave configurada"}</span>
        </Tip>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {isLoading && <Skeleton className="h-24 w-full" />}
        {empty && <Welcome bot={bot} onPick={(prompt) => { setText(prompt); }} />}
        {data?.messages.map((message) => <MessageView key={`${message.role}-${message.id}`} message={message} actionsById={actionsById} bot={bot} />)}
        {running && data?.run && <LiveSteps steps={data.run.steps} bot={bot} />}
        {/* ações desta conversa que ainda não apareceram junto de um passo */}
        {data?.pendingActions.filter((action) => !data.messages.some((m) => m.role === "tool" && m.results.some((r) => r.pendingActionId === action.id))).map((action) => <ActionCard key={action.id} action={action} />)}
        <div ref={bottom} />
      </div>

      <footer className="border-t p-3">
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <span key={index} className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                <Icon name={file.type === "application/pdf" ? "file-text" : "image"} className="h-3.5 w-3.5" /> {file.name}
                <button type="button" className="cursor-pointer" aria-label={`Tirar ${file.name}`} onClick={() => setFiles(files.filter((_, n) => n !== index))}><Icon name="x" className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" multiple className="hidden" onChange={(event) => {
            const picked = Array.from(event.target.files ?? []);
            const limit = (file: File) => (file.type === "application/pdf" ? 10 : 5) * 1024 * 1024;
            const tooBig = picked.find((file) => file.size > limit(file));
            if (tooBig) toast({ title: "Arquivo grande demais", description: `${tooBig.name} passa de ${tooBig.type === "application/pdf" ? "10" : "5"} MB`, variant: "destructive" });
            setFiles([...files, ...picked.filter((file) => file.size <= limit(file))].slice(0, 3));
            event.target.value = "";
          }} />
          <Tip text="Anexar imagem ou PDF (extrato, nota, foto de pedido...)">
            <Button type="button" variant="outline" size="sm" className="h-10 w-10 shrink-0 p-0" aria-label="Anexar imagem ou PDF" onClick={() => fileInput.current?.click()}><Icon name="paperclip" className="h-4 w-4" /></Button>
          </Tip>
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }}
            placeholder={running ? `${bot.persona} está trabalhando...` : `Peça para ${bot.persona}... (Enter envia, Shift+Enter quebra a linha)`}
            className="max-h-40 min-h-10 flex-1 resize-none"
            rows={1}
            disabled={send.isPending}
          />
          {running ? (
            <Button type="button" variant="outline" className="h-10 shrink-0" onClick={() => stop.mutate()} disabled={stop.isPending}><Icon name="square" className="mr-1 h-4 w-4" /> Parar</Button>
          ) : (
            <Button type="button" className="h-10 shrink-0" onClick={() => submit()} disabled={send.isPending || (!text.trim() && !files.length)}><Icon name="send-horizontal" className="mr-1 h-4 w-4" /> Enviar</Button>
          )}
        </div>
      </footer>
    </section>
  );
}

function Welcome({ bot, onPick }: { bot: Bot; onPick: (prompt: string) => void }) {
  return (
    <div className="mx-auto max-w-2xl py-6 text-center">
      <BotAvatar look={bot.avatar} size={96} className="mx-auto" />
      <p className="mt-3 text-lg font-semibold">Oi, eu sou {bot.persona}.</p>
      <p className="text-sm text-muted-foreground">{bot.role}. {bot.description}</p>
      {bot.shortcuts.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {bot.shortcuts.map((shortcut) => (
            <Button key={shortcut.label} type="button" variant="outline" size="sm" onClick={() => onPick(shortcut.prompt)}>{shortcut.label}</Button>
          ))}
        </div>
      )}
      <div className="mt-6 text-left">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">O que posso fazer por você</p>
        <div className="flex flex-wrap gap-1.5">
          {bot.capabilities.map((tool) => (
            <span key={tool.name} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${RISK_CLASS[tool.risk]}`}>{TOOL_LABEL[tool.name] ?? tool.title} · {RISK_LABEL[tool.risk]}</span>
          ))}
        </div>
        {bot.hiddenCount > 0 && <p className="mt-2 text-xs text-muted-foreground">{bot.hiddenCount} tarefa(s) ficam escondidas porque dependem de permissões que você não tem.</p>}
      </div>
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
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
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
      <BotAvatar look={bot.avatar} size={28} />
      <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-muted/60 px-3 py-2">
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

