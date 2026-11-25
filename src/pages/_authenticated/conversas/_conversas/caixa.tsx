import { useEffect, useMemo, useRef, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import TagBadge from "@/components/general-components/TagBadge";
import { cn } from "@/lib/utils";
import { Tip, errorMessage } from "../../comercial/-shared/commercial";
import {
  Box, CHAT_KEY, ChatMessage, ConversationDetail, ConversationItem, ConversationList, PAGES, TICK_LABEL,
  ChannelPill, ContactAvatar, MessageTicks, WhatsAppLogo, chatApi, contactName, dayLabel, formatPhone, timeBr, useChannels, useChatMeta, useMedia, when,
} from "../-shared/chat";

interface Search { conversa?: number; caixa?: Box; numero?: number }

export const Route = createFileRoute("/_authenticated/conversas/_conversas/caixa")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    conversa: Number(search.conversa) > 0 ? Number(search.conversa) : undefined,
    caixa: ["minhas", "sem_dono", "nao_lidas", "resolvidas"].includes(String(search.caixa)) ? (search.caixa as Box) : undefined,
    numero: Number(search.numero) > 0 ? Number(search.numero) : undefined,
  }),
  component: Inbox,
});

const LIST_MS = 4000;
const CHAT_MS = 3000;
const BOXES: { key: Box; label: string; icon: string }[] = [
  { key: "abertas", label: "Abertas", icon: "inbox" },
  { key: "minhas", label: "Minhas", icon: "user-round" },
  { key: "sem_dono", label: "Sem dono", icon: "user-round-x" },
  { key: "nao_lidas", label: "Não lidas", icon: "mail" },
  { key: "resolvidas", label: "Resolvidas", icon: "circle-check" },
];

/** Conversas → Caixa de entrada: lista, conversa e ficha do contato. */
function Inbox() {
  const { can } = useVerify();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/conversas/caixa" });
  const wide = useMedia("(min-width: 1024px)");
  const xl = useMedia("(min-width: 1440px)");
  const [panel, setPanel] = useState(true);
  const channels = useChannels(true, 30000);
  const box = search.caixa ?? "abertas";
  const open = (conversa?: number) => navigate({ search: (prev) => ({ ...prev, conversa }) });

  if (channels.isLoading) return <Skeleton className="h-full min-h-96 rounded-card" />;
  if (channels.data && !channels.data.length) return <NoChannels manage={can("canais_conversas")} />;

  const list = <ConversationListPane box={box} channelId={search.numero} current={search.conversa} onPick={open}
    onBox={(caixa) => navigate({ search: (prev) => ({ ...prev, caixa: caixa === "abertas" ? undefined : caixa }) })}
    onChannel={(numero) => navigate({ search: (prev) => ({ ...prev, numero }) })} />;

  if (!wide) {
    if (search.conversa) return <MobileChat id={search.conversa} onBack={() => open(undefined)} />;
    return <div className="flex h-full min-h-0 flex-col bg-background">{list}</div>;
  }

  const showPanel = panel && xl;
  return (
    <div className={cn("grid h-full min-h-0 overflow-hidden rounded-card border bg-background shadow-xs", showPanel ? "grid-cols-[22rem_minmax(0,1fr)_20rem]" : "grid-cols-[22rem_minmax(0,1fr)]")}>
      <aside className="flex min-h-0 min-w-0 flex-col border-r">{list}</aside>
      {search.conversa
        ? <ChatPane key={search.conversa} id={search.conversa} wide onBack={() => open(undefined)} panel={showPanel} onPanel={xl ? () => setPanel((v) => !v) : undefined} />
        : <EmptyChat />}
      {showPanel && search.conversa && <ContactPanel id={search.conversa} />}
      {showPanel && !search.conversa && <aside className="border-l bg-muted/20" />}
    </div>
  );
}

/** Celular: conversa em tela cheia; a ficha do contato abre num painel por cima. */
function MobileChat({ id, onBack }: { id: number; onBack: () => void }) {
  const [sheet, setSheet] = useState(false);
  return (
    <>
      <ChatPane key={id} id={id} wide={false} onBack={onBack} panel={false} onPanel={() => setSheet(true)} />
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="right" className="flex w-[88vw] max-w-sm flex-col p-0">
          <SheetTitle className="sr-only">Ficha do contato</SheetTitle>
          <ContactPanel id={id} />
        </SheetContent>
      </Sheet>
    </>
  );
}

function NoChannels({ manage }: { manage: boolean }) {
  return (
    <div className="grid h-full place-items-center rounded-card border bg-card p-6">
      <div className="grid max-w-md justify-items-center gap-4 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-muted"><WhatsAppLogo className="h-9 w-9" /></span>
        <div>
          <h1 className="text-lg font-semibold">Nenhum número conectado ainda</h1>
          <p className="mt-1 text-sm text-muted-foreground">Conecte um WhatsApp da empresa e as conversas com os clientes aparecem aqui.</p>
        </div>
        {manage && <Button asChild><Link to={PAGES.newChannel}><Icon name="plus" className="mr-1.5 h-4 w-4" />Conectar um número</Link></Button>}
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <section className="chat-wallpaper grid place-items-center p-6 text-center">
      <div className="grid justify-items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-background shadow-sm"><Icon name="messages-square" className="h-6 w-6 text-primary" /></span>
        <div>
          <p className="font-medium">Escolha uma conversa</p>
          <p className="text-sm text-muted-foreground">As mensagens novas aparecem no topo da lista, em tempo real.</p>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-2 text-[11px] text-muted-foreground">
          <kbd className="rounded border bg-background px-1.5 py-0.5">Enter</kbd> envia
          <kbd className="rounded border bg-background px-1.5 py-0.5">Shift + Enter</kbd> quebra a linha
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- lista

function ConversationListPane({ box, channelId, current, onPick, onBox, onChannel }: {
  box: Box; channelId?: number; current?: number; onPick: (id: number) => void; onBox: (box: Box) => void; onChannel: (id?: number) => void;
}) {
  const { can } = useVerify();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [starting, setStarting] = useState(false);
  const channels = useChannels(true, 30000);
  useEffect(() => { const timer = setTimeout(() => setTerm(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  const list = useQuery({
    queryKey: [CHAT_KEY, "list", box, channelId ?? null, term],
    refetchInterval: LIST_MS,
    placeholderData: keepPreviousData,
    queryFn: () => chatApi.get<ConversationList>("conversations", { box, channelId, search: term || undefined }),
  });
  const counts = list.data?.counts;
  const many = (channels.data?.length ?? 0) > 1;
  const down = channels.data?.filter((c) => c.status !== "conectado") ?? [];

  return (
    <>
      <div className="grid gap-3 border-b p-3">
        <div className="flex items-center gap-2">
          <h1 className="mr-auto text-lg font-bold">Conversas</h1>
          {list.isFetching && !list.isLoading && <Icon name="loader-circle" className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <Tip text={box === "resolvidas" ? "Voltar às abertas" : "Ver resolvidas"}>
            <Button size="sm" variant={box === "resolvidas" ? "default" : "outline"} className="h-8 w-8 p-0" aria-label="Resolvidas" onClick={() => onBox(box === "resolvidas" ? "abertas" : "resolvidas")}><Icon name="archive" className="h-4 w-4" /></Button>
          </Tip>
          {can("responder_conversas") && (
            <Tip text="Começar uma conversa com um número">
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setStarting(true)} aria-label="Nova conversa"><Icon name="square-pen" className="h-4 w-4" /></Button>
            </Tip>
          )}
          {can("canais_conversas") && (
            <Tip text="Números conectados">
              <Button asChild size="sm" variant="outline" className="h-8 w-8 p-0"><Link to={PAGES.channels} aria-label="Números"><Icon name="smartphone" className="h-4 w-4" /></Link></Button>
            </Tip>
          )}
        </div>
        <div className="flex gap-2">
          <Input name="busca" value={search} onValueChange={(_, value) => setSearch(String(value))} placeholder="Buscar conversa" icon="search" className="h-9 min-w-0 flex-1" />
          {many && <ChannelFilter channels={channels.data!} value={channelId} onChange={onChannel} />}
        </div>
        {box === "resolvidas" ? (
          <div className="flex h-8 items-center gap-2 rounded-lg bg-muted px-2.5 text-xs">
            <Icon name="archive" className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="mr-auto font-medium">Conversas resolvidas</span>
            <button type="button" onClick={() => onBox("abertas")} className="cursor-pointer font-medium text-primary hover:underline">Voltar às abertas</button>
          </div>
        ) : (
          <div className="@container"><div role="tablist" className="grid grid-cols-4 gap-0.5 rounded-lg bg-muted p-0.5">
            {BOXES.filter((item) => item.key !== "resolvidas").map((item) => {
              const count = counts?.[item.key as Exclude<Box, "resolvidas">];
              const on = box === item.key;
              return (
                <button key={item.key} type="button" role="tab" aria-selected={on} onClick={() => onBox(item.key)}
                  className={cn("flex h-7 min-w-0 cursor-pointer items-center justify-center rounded-md px-0.5 text-xs font-medium transition-colors", on ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}>
                  <span className="truncate">{item.label}</span>
                  {!!count && (
                    <span className={cn("ml-0.5 hidden shrink-0 text-[10px] font-semibold tabular-nums @xs:inline",
                      item.key === "nao_lidas" ? "rounded-full bg-primary px-1 leading-4 text-primary-foreground" : on ? "text-muted-foreground" : "text-muted-foreground/70")}>{count > 99 ? "99+" : count}</span>
                  )}
                  {!!count && item.key === "nao_lidas" && <span className="ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary @xs:hidden" />}
                </button>
              );
            })}
          </div></div>
        )}
      </div>

      {down.length > 0 && (
        <Link to={PAGES.channels} className="flex items-center gap-2 border-b bg-amber-500/8 px-3 py-2 text-xs text-amber-800 hover:bg-amber-500/12 dark:text-amber-300">
          <Icon name="wifi-off" className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{down.length === 1 ? `${down[0].name} está desconectado` : `${down.length} números desconectados`}</span>
          <Icon name="chevron-right" className="h-3.5 w-3.5" />
        </Link>
      )}

      <div className="scroll-fino min-h-0 flex-1 overflow-y-auto">
        {list.isLoading && <div className="grid gap-2 p-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>}
        {list.error && <p className="p-4 text-sm text-destructive">{errorMessage(list.error)}</p>}
        {list.data && !list.data.items.length && (
          <div className="grid justify-items-center gap-2 px-6 py-12 text-center">
            <Icon name={term ? "search-x" : box === "resolvidas" ? "archive" : "party-popper"} className="h-7 w-7 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">{term ? "Nada encontrado com essa busca." : box === "abertas" ? "Nenhuma conversa aberta. Tudo em dia!" : box === "minhas" ? "Nenhuma conversa com você agora." : box === "sem_dono" ? "Todas as conversas têm alguém cuidando." : box === "nao_lidas" ? "Nenhuma mensagem esperando leitura." : "Nenhuma conversa resolvida ainda."}</p>
          </div>
        )}
        {list.data?.items.map((conv) => <ConversationRow key={conv.id} conv={conv} active={conv.id === current} showChannel={many} onClick={() => onPick(conv.id)} />)}
      </div>
      <StartDialog open={starting} onOpenChange={setStarting} onStarted={(id) => { setStarting(false); onPick(id); }} />
    </>
  );
}

function ConversationRow({ conv, active, showChannel, onClick }: { conv: ConversationItem; active: boolean; showChannel: boolean; onClick: () => void }) {
  const name = contactName(conv.contact);
  const unread = conv.unread > 0;
  return (
    <button type="button" onClick={onClick}
      className={cn("relative flex w-full cursor-pointer items-start gap-3 px-3 py-3 text-left transition-colors", active ? "bg-primary/8" : "hover:bg-muted/60 active:bg-muted")}>
      {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-primary" />}
      <ContactAvatar name={name} url={conv.contact.avatarUrl} size={44} color={showChannel ? conv.channel.color : null} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={cn("truncate text-[14px]", unread ? "font-bold" : "font-semibold")}>{name}</span>
          <span className={cn("ml-auto shrink-0 text-[11px] tabular-nums", unread ? "font-semibold text-primary" : "text-muted-foreground")}>{when(conv.lastMessageAt)}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          {conv.lastDirection === "out" && <Icon name="reply" className="h-3 w-3 shrink-0 -scale-x-100 text-muted-foreground" />}
          <span className={cn("min-w-0 flex-1 truncate text-[13px]", unread ? "font-medium text-foreground" : "text-muted-foreground")}>{conv.lastMessagePreview ?? "Sem mensagens"}</span>
          {unread && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{conv.unread > 99 ? "99+" : conv.unread}</span>}
        </span>
        <span className="mt-1.5 flex items-center gap-1.5">
          {conv.customer && <span className="inline-flex min-w-0 items-center gap-1 truncate text-[11px] text-muted-foreground"><Icon name="building-2" className="h-3 w-3 shrink-0" /><span className="truncate">{conv.customer.name}</span></span>}
          {!conv.customer && conv.contact.isNew && <span className="text-[11px] text-muted-foreground">Contato novo</span>}
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {conv.assignedUser
              ? <Tip text={`Com ${conv.assignedUser.name}`}><span><ContactAvatar name={conv.assignedUser.name} url={conv.assignedUser.imageUrl} size={18} /></span></Tip>
              : conv.status !== "resolvida" && <span className="rounded-full bg-amber-500/12 px-1.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">sem dono</span>}
          </span>
        </span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------- nova conversa

function StartDialog({ open, onOpenChange, onStarted }: { open: boolean; onOpenChange: (open: boolean) => void; onStarted: (id: number) => void }) {
  const channels = useChannels(open, false);
  const connected = (channels.data ?? []).filter((c) => c.status === "conectado");
  const [channelId, setChannelId] = useState("");
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [confirmNew, setConfirmNew] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (open) { setPhone(""); setText(""); setError(""); setChannelId(connected.length === 1 ? String(connected[0].id) : ""); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useMutation({
    mutationFn: (confirmed: boolean) => chatApi.post<{ id: number }>("conversations", { channelId: Number(channelId), phone, text: text.trim() || undefined, confirmedNew: confirmed }),
    onSuccess: (out) => onStarted(out.id),
    onError: (err: unknown) => {
      const data = (err as { response?: { status?: number; data?: { code?: string } } }).response;
      if (data?.status === 409 && data.data?.code === "confirm_new") setConfirmNew(true);
      else setError(errorMessage(err));
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova conversa</DialogTitle>
            <DialogDescription>Para falar com quem pediu contato. Para proteger o número, o sistema limita quantas pessoas novas recebem mensagem por dia.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {connected.length > 1 && (
              <div className="grid gap-1">
                <label className="text-xs font-medium">Enviar pelo número</label>
                <Select name="channel" modal options={connected.map((c) => ({ id: String(c.id), name: c.name }))} state={channelId} placeholder="Escolha o número" onChange={(_, value) => setChannelId(String(value))} />
              </div>
            )}
            <div className="grid gap-1">
              <label htmlFor="start-phone" className="text-xs font-medium">Celular do cliente</label>
              <Input id="start-phone" name="phone" format="phone" value={phone} placeholder="(11) 91234-5678" onValueChange={(_, value) => setPhone(String(value))} />
            </div>
            <div className="grid gap-1">
              <label htmlFor="start-text" className="text-xs font-medium">Primeira mensagem <span className="font-normal text-muted-foreground">(sem link)</span></label>
              <Textarea id="start-text" value={text} onChange={(event) => setText(event.target.value)} className="min-h-24" placeholder="Olá, aqui é da WorkSafe. Você pediu um contato sobre…" />
            </div>
            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button disabled={start.isPending || !channelId || phone.replace(/\D/g, "").length < 10} onClick={() => { setError(""); start.mutate(false); }}>
                {start.isPending ? <Icon name="loader-circle" className="mr-1.5 h-4 w-4 animate-spin" /> : <Icon name="send-horizontal" className="mr-1.5 h-4 w-4" />}{text.trim() ? "Enviar" : "Abrir conversa"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={confirmNew} onOpenChange={setConfirmNew} title="Essa pessoa pediu o contato?"
        description="Ela nunca falou com este número. Mandar mensagem para quem não pediu é o que mais leva o WhatsApp a bloquear. Conta no limite de contatos novos do dia."
        onConfirm={() => start.mutate(true)} />
    </>
  );
}

// ---------------------------------------------------------------- a conversa

function useConversation(id: number) {
  return useQuery({ queryKey: [CHAT_KEY, "conversation", id], refetchInterval: CHAT_MS, queryFn: () => chatApi.get<ConversationDetail>(`conversations/${id}`) });
}

function ChatPane({ id, wide, onBack, panel, onPanel }: { id: number; wide: boolean; onBack: () => void; panel: boolean; onPanel?: () => void }) {
  const { can } = useVerify();
  const { user } = useVerifyUser();
  const queryClient = useQueryClient();
  const conv = useConversation(id);
  const data = conv.data;
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const lastCount = useRef(0);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [CHAT_KEY] });
  const read = useMutation({ mutationFn: () => chatApi.post(`conversations/${id}/read`), onSuccess: invalidate });
  useEffect(() => { if (data?.unread && !read.isPending) read.mutate(); }, [data?.unread]); // eslint-disable-line react-hooks/exhaustive-deps

  // rola para o fim ao abrir e quando chega mensagem (se a pessoa já estava no fim)
  useEffect(() => {
    const box = scroller.current;
    const count = data?.messages.length ?? 0;
    if (box && count !== lastCount.current && (stick.current || lastCount.current === 0)) requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
    lastCount.current = count;
  }, [data?.messages.length]);

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => chatApi.patch<ConversationDetail>(`conversations/${id}`, body),
    onSuccess: (out) => { queryClient.setQueryData([CHAT_KEY, "conversation", id], out); invalidate(); },
    onError: (err) => toast({ title: "Não deu certo", description: errorMessage(err), variant: "destructive" }),
  });

  const name = data ? contactName(data.contact) : "";
  const mine = !!data?.assignedUser && data.assignedUser.id === user;
  const resolved = data?.status === "resolvida";

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col bg-background">
      <header className="flex items-center gap-2 border-b px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-3">
        {!wide && <Button variant="ghost" size="sm" className="h-10 w-10 shrink-0 p-0" aria-label="Voltar" onClick={onBack}><Icon name="arrow-left" className="h-5 w-5" /></Button>}
        {data ? <ContactAvatar name={name} url={data.contact.avatarUrl} size={38} /> : <Skeleton className="h-[38px] w-[38px] rounded-full" />}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-semibold">{name || " "}</p>
          <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            {data && <>{formatPhone(data.contact.phone)}<span className="text-border">•</span><span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: data.channel.color ?? "#149E5E" }} />{data.channel.name}</span></>}
          </p>
        </div>
        {data && can("responder_conversas") && !mine && !resolved && (
          <Button size="sm" variant="outline" className="hidden sm:inline-flex" disabled={patch.isPending} onClick={() => patch.mutate({ assignedUserId: "me" })}>
            <Icon name="hand" className="mr-1.5 h-4 w-4" />Assumir
          </Button>
        )}
        {data && <TransferMenu conv={data} onChange={(body) => patch.mutate(body)} />}
        {data && (resolved
          ? <Button size="sm" variant="outline" disabled={patch.isPending} onClick={() => patch.mutate({ status: "aberta" })}><Icon name="rotate-ccw" className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Reabrir</span></Button>
          : <Button size="sm" disabled={patch.isPending} onClick={() => patch.mutate({ status: "resolvida" })}><Icon name="check" className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Resolver</span></Button>)}
        {onPanel && (
          <Tip text={panel ? "Esconder a ficha do contato" : "Mostrar a ficha do contato"}>
            <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={onPanel} aria-label="Ficha do contato"><Icon name={panel ? "panel-right-close" : "panel-right-open"} className="h-4 w-4" /></Button>
          </Tip>
        )}
      </header>

      <div ref={scroller} onScroll={(event) => { const el = event.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
        className="chat-wallpaper scroll-fino min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6">
        <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end gap-1">
          {conv.isLoading && <div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className={cn("h-12 w-2/3 rounded-2xl", i % 2 && "ml-auto")} />)}</div>}
          {conv.error && <p className="text-sm text-destructive">{errorMessage(conv.error)}</p>}
          {data?.messages.map((message, index) => {
            const prev = data.messages[index - 1];
            const newDay = !prev || new Date(prev.sentAt).toDateString() !== new Date(message.sentAt).toDateString();
            const grouped = !!prev && !newDay && prev.direction === message.direction && message.direction !== "note" && new Date(message.sentAt).getTime() - new Date(prev.sentAt).getTime() < 5 * 60000;
            return (
              <div key={message.id} className={cn(!grouped && index > 0 && "mt-2")}>
                {newDay && <p className="sticky top-0 z-10 mx-auto my-2 w-fit rounded-full border bg-background/90 px-3 py-0.5 text-[11px] font-medium capitalize text-muted-foreground shadow-xs backdrop-blur">{dayLabel(message.sentAt)}</p>}
                <Bubble message={message} conversationId={id} grouped={grouped} />
              </div>
            );
          })}
        </div>
      </div>

      {data && <Composer conv={data} />}
    </section>
  );
}

function useVerifyUser() {
  const { user } = useAuth();
  return { user: Number(user?.sub ?? 0) };
}

function TransferMenu({ conv, onChange }: { conv: ConversationDetail; onChange: (body: Record<string, unknown>) => void }) {
  const meta = useChatMeta();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tip text="Transferir: setor ou pessoa">
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="h-9 w-9 p-0" aria-label="Transferir"><Icon name="arrow-right-left" className="h-4 w-4" /></Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Setor</div>
        <div className="grid p-1">
          {meta.data?.sectors.map((sector) => (
            <button key={sector.id} type="button" onClick={() => { onChange({ sector: sector.id }); setOpen(false); }}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">
              <Icon name="building-2" className="h-3.5 w-3.5 text-muted-foreground" />{sector.name}
              {conv.sector === sector.id && <Icon name="check" className="ml-auto h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
        <div className="border-y px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pessoa</div>
        <div className="scroll-fino grid max-h-56 overflow-y-auto p-1">
          {conv.assignedUser && (
            <button type="button" onClick={() => { onChange({ assignedUserId: null }); setOpen(false); }} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted">
              <Icon name="user-round-x" className="h-4 w-4" />Deixar sem dono
            </button>
          )}
          {meta.data?.users.map((user) => (
            <button key={user.id} type="button" onClick={() => { onChange({ assignedUserId: user.id }); setOpen(false); }}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">
              <ContactAvatar name={user.name} url={user.imageUrl} size={22} /><span className="truncate">{user.name}</span>
              {conv.assignedUser?.id === user.id && <Icon name="check" className="ml-auto h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const MEDIA_ICON: Record<string, string> = { image: "image", audio: "mic", video: "video", document: "file-text", sticker: "sticker", location: "map-pin", contact: "contact-round", other: "message-square" };
const MEDIA_LABEL: Record<string, string> = { image: "Foto", audio: "Áudio", video: "Vídeo", document: "Documento", sticker: "Figurinha", location: "Localização", contact: "Contato", other: "Mensagem" };

function Bubble({ message, conversationId, grouped }: { message: ChatMessage; conversationId: number; grouped: boolean }) {
  const queryClient = useQueryClient();
  const retry = useMutation({
    mutationFn: () => chatApi.post(`conversations/${conversationId}/messages/${message.id}/retry`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAT_KEY] }),
    onError: (err) => toast({ title: "Não foi possível reenviar", description: errorMessage(err), variant: "destructive" }),
  });

  if (message.direction === "note" && message.type === "event") {
    return (
      <p className="mx-auto my-1 flex w-fit max-w-[90%] items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-[11px] text-muted-foreground shadow-xs">
        <Icon name="info" className="h-3 w-3" />{message.text}{message.sentBy ? ` · ${message.sentBy}` : ""} · {timeBr(message.sentAt)}
      </p>
    );
  }
  if (message.direction === "note") {
    return (
      <div className="mx-auto my-1 w-full max-w-md rounded-xl border border-amber-500/30 bg-amber-50 px-3 py-2 text-[13px] shadow-xs dark:bg-amber-500/10">
        <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300"><Icon name="sticky-note" className="h-3 w-3" />Nota interna{message.sentBy ? ` · ${message.sentBy}` : ""} <span className="ml-auto font-normal">{timeBr(message.sentAt)}</span></p>
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
      </div>
    );
  }

  const out = message.direction === "out";
  const media = message.type !== "text";
  return (
    <div className={cn("flex", out ? "justify-end" : "justify-start")}>
      <div className={cn("group relative max-w-[85%] px-3 py-1.5 text-[14px] leading-snug shadow-xs sm:max-w-[70%]",
        out ? "rounded-2xl rounded-br-md bg-primary-soft text-foreground" : "rounded-2xl rounded-bl-md bg-background",
        grouped && (out ? "rounded-br-2xl" : "rounded-bl-2xl"),
        message.status === "failed" && "ring-1 ring-red-400")}>
        {media && (
          <span className="mb-1 flex items-center gap-2 rounded-lg bg-foreground/5 px-2 py-1.5 text-xs text-muted-foreground">
            <Icon name={MEDIA_ICON[message.type] ?? "paperclip"} className="h-4 w-4" />
            {(message.media?.fileName as string) || MEDIA_LABEL[message.type] || "Anexo"}
            {message.type === "audio" && typeof message.media?.seconds === "number" && <span className="tabular-nums">{Math.floor(Number(message.media.seconds) / 60)}:{String(Number(message.media.seconds) % 60).padStart(2, "0")}</span>}
            <span className="ml-auto text-[10px] opacity-70">abre no celular</span>
          </span>
        )}
        {message.text && <span className="whitespace-pre-wrap break-words">{message.text}</span>}
        <span className="float-right mt-1 ml-2 flex translate-y-0.5 items-center gap-1 text-[10px] text-muted-foreground">
          {out && message.sentBy && <span className="hidden max-w-24 truncate group-hover:inline">{message.sentBy}</span>}
          {timeBr(message.sentAt)}
          {out && <Tip text={message.error ?? TICK_LABEL[message.status]}><span><MessageTicks status={message.status} /></span></Tip>}
        </span>
        {message.status === "failed" && (
          <button type="button" disabled={retry.isPending} onClick={() => retry.mutate()} className="mt-1 flex cursor-pointer items-center gap-1 text-[11px] font-medium text-red-600 hover:underline">
            <Icon name="rotate-ccw" className="h-3 w-3" />Não enviada · tentar de novo
          </button>
        )}
      </div>
    </div>
  );
}

function Composer({ conv }: { conv: ConversationDetail }) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [text, setText] = useState("");
  const [confirmNew, setConfirmNew] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const canReply = can("responder_conversas");
  const blocked = conv.contact.optOut ? "Este cliente pediu para não receber mais mensagens." : conv.channel.status === "banido" ? "Este número foi bloqueado pelo WhatsApp." : conv.channel.status !== "conectado" ? "O número desta conversa está desconectado." : !canReply ? "Você pode ler, mas não responder (falta a permissão \"responder_conversas\")." : "";
  const isNote = mode === "note";

  const send = useMutation({
    mutationFn: ({ body, confirmed }: { body: string; confirmed?: boolean }) => isNote
      ? chatApi.post(`conversations/${conv.id}/notes`, { text: body })
      : chatApi.post(`conversations/${conv.id}/messages`, { text: body, confirmedNew: confirmed }),
    onSuccess: () => { setText(""); queryClient.invalidateQueries({ queryKey: [CHAT_KEY] }); area.current?.focus(); },
    onError: (err: unknown) => {
      const res = (err as { response?: { status?: number; data?: { code?: string } } }).response;
      if (res?.status === 409 && res.data?.code === "confirm_new") return setConfirmNew(true);
      toast({ title: isNote ? "Não foi possível salvar a nota" : "Não foi possível enviar", description: errorMessage(err), variant: "destructive" });
    },
  });
  const submit = () => { const body = text.trim(); if (body && !send.isPending && (isNote || !blocked)) send.mutate({ body }); };
  const placeholder = isNote ? "Nota interna: só a equipe vê" : `Mensagem para ${contactName(conv.contact)}`;
  const firstLink = useMemo(() => !isNote && conv.contact.isNew && /(https?:\/\/|www\.)/i.test(text), [isNote, conv.contact.isNew, text]);

  return (
    <footer className={cn("border-t px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-colors sm:px-4", isNote && "bg-amber-50/70 dark:bg-amber-500/5")}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-1.5 flex items-center gap-1">
          {([["reply", "message-circle", "Responder"], ["note", "sticky-note", "Nota interna"]] as const).map(([key, icon, label]) => (
            <button key={key} type="button" onClick={() => { setMode(key); area.current?.focus(); }}
              className={cn("flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors", mode === key ? (key === "note" ? "bg-amber-500/15 text-amber-800 dark:text-amber-300" : "bg-primary/10 text-primary") : "text-muted-foreground hover:bg-muted")}>
              <Icon name={icon} className="h-3.5 w-3.5" />{label}
            </button>
          ))}
          {!isNote && conv.channel.botMode === "sugere" && <span className="ml-auto hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex"><Icon name="sparkles" className="h-3 w-3" />sugestões do bot chegam na fase dos bots</span>}
        </div>
        {!isNote && blocked ? (
          <p className="flex items-start gap-2 rounded-xl bg-muted px-3 py-2.5 text-xs text-muted-foreground">
            <Icon name="lock" className="mt-0.5 h-3.5 w-3.5 shrink-0" />{blocked}
            {conv.channel.status !== "conectado" && can("canais_conversas") && <Link to={PAGES.channels} className="ml-auto shrink-0 font-medium text-primary hover:underline">Ver números</Link>}
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <Textarea ref={area} value={text} onChange={(event) => setText(event.target.value)} rows={1}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }}
              placeholder={placeholder} disabled={send.isPending}
              className={cn("field-sizing-content max-h-40 min-h-11 flex-1 resize-none rounded-2xl py-2.5 text-base sm:text-sm", isNote && "border-amber-500/40 bg-background")} />
            <Button type="button" onClick={submit} disabled={send.isPending || !text.trim()} aria-label={isNote ? "Salvar nota" : "Enviar"}
              className={cn("h-11 w-11 shrink-0 rounded-full p-0", isNote && "bg-amber-500 text-white hover:bg-amber-600")}>
              <Icon name={send.isPending ? "loader-circle" : isNote ? "check" : "send-horizontal"} className={cn("h-5 w-5", send.isPending && "animate-spin")} />
            </Button>
          </div>
        )}
        {firstLink && <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300"><Icon name="triangle-alert" className="h-3 w-3" />Esta pessoa ainda não respondeu: mande sem link por enquanto.</p>}
      </div>
      <ConfirmDialog open={confirmNew} onOpenChange={setConfirmNew} title="Essa pessoa pediu o contato?"
        description="Ela nunca escreveu para este número. Mandar mensagem para quem não pediu é o que mais leva o WhatsApp a bloquear."
        onConfirm={() => send.mutate({ body: text.trim(), confirmed: true })} />
    </footer>
  );
}

// ---------------------------------------------------------------- ficha do contato

function ContactPanel({ id }: { id: number }) {
  const conv = useConversation(id);
  const meta = useChatMeta();
  const queryClient = useQueryClient();
  const data = conv.data;
  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => chatApi.patch<ConversationDetail>(`conversations/${id}`, body),
    onSuccess: (out) => { queryClient.setQueryData([CHAT_KEY, "conversation", id], out); queryClient.invalidateQueries({ queryKey: [CHAT_KEY, "list"] }); },
    onError: (err) => toast({ title: "Não deu certo", description: errorMessage(err), variant: "destructive" }),
  });
  if (!data) return <aside className="border-l p-4"><Skeleton className="h-40" /></aside>;
  const name = contactName(data.contact);
  const copy = (value: string) => { navigator.clipboard?.writeText(value); toast({ title: "Copiado", variant: "success" }); };

  return (
    <aside className="scroll-fino flex min-h-0 flex-col overflow-y-auto border-l bg-muted/20">
      <div className="grid justify-items-center gap-2 border-b px-4 py-6 text-center">
        <ContactAvatar name={name} url={data.contact.avatarUrl} size={72} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          {data.contact.pushName && data.contact.pushName !== name && <p className="truncate text-xs text-muted-foreground">No WhatsApp: {data.contact.pushName}</p>}
        </div>
        <button type="button" onClick={() => copy(formatPhone(data.contact.phone))} className="flex cursor-pointer items-center gap-1.5 rounded-full bg-background px-3 py-1 text-xs font-medium shadow-xs hover:bg-muted">
          <WhatsAppLogo className="h-3.5 w-3.5" />{formatPhone(data.contact.phone)}<Icon name="copy" className="h-3 w-3 text-muted-foreground" />
        </button>
        {data.contact.optOut && <TagBadge icon="bell-off" color="#dc2626">pediu para não receber</TagBadge>}
      </div>

      <PanelSection title="Cliente">
        {data.customer ? (
          <Link to="/clientes/$customerId" params={{ customerId: String(data.customer.id) }} className="flex items-center gap-3 rounded-xl border bg-background p-3 transition-colors hover:border-primary/40">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Icon name="building-2" className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{data.customer.name}</span><span className="text-xs text-muted-foreground">Abrir a ficha do cliente</span></span>
            <Icon name="chevron-right" className="h-4 w-4 text-muted-foreground" />
          </Link>
        ) : (
          <div className="rounded-xl border border-dashed bg-background/60 p-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5 font-medium text-foreground"><Icon name="link-2-off" className="h-3.5 w-3.5" />Sem cliente vinculado</p>
            <p className="mt-1">O sistema liga sozinho quando o telefone bate com o cadastro de um cliente ou de um contato dele.</p>
          </div>
        )}
      </PanelSection>

      <PanelSection title="Atendimento">
        <div className="grid gap-3">
          <Field label="Número"><ChannelPill channel={data.channel} /></Field>
          <Field label="Setor">
            <Select name="sector" options={meta.data?.sectors ?? []} state={data.sector ?? ""} placeholder="Sem setor" onChange={(_, value) => patch.mutate({ sector: value || null })} />
          </Field>
          <Field label="Responsável">
            <Select name="owner" searchable clearable options={(meta.data?.users ?? []).map((u) => ({ id: String(u.id), name: u.name }))} state={data.assignedUser ? String(data.assignedUser.id) : ""} placeholder="Sem dono"
              onChange={(_, value) => patch.mutate({ assignedUserId: value ? Number(value) : null })} />
          </Field>
          <Field label="Situação">
            <div className="flex rounded-lg border bg-background p-0.5 text-xs font-medium">
              {([["aberta", "Aberta"], ["aguardando", "Aguardando"], ["resolvida", "Resolvida"]] as const).map(([key, label]) => (
                <button key={key} type="button" onClick={() => patch.mutate({ status: key })}
                  className={cn("flex-1 cursor-pointer rounded-md px-2 py-1.5 transition-colors", data.status === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{label}</button>
              ))}
            </div>
          </Field>
        </div>
      </PanelSection>
    </aside>
  );
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b px-4 py-4">
      <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1"><span className="text-xs text-muted-foreground">{label}</span>{children}</div>;
}

/** Filtro por número: um botão compacto ao lado da busca, sem rolagem lateral. */
function ChannelFilter({ channels, value, onChange }: { channels: { id: number; name: string; color?: string | null; status: string }[]; value?: number; onChange: (id?: number) => void }) {
  const [open, setOpen] = useState(false);
  const current = channels.find((c) => c.id === value);
  const pick = (id?: number) => { onChange(id); setOpen(false); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tip text={current ? `Só ${current.name}` : "Filtrar por número"}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" aria-label="Filtrar por número" className={cn("h-9 shrink-0 gap-1.5 px-2.5", current && "border-primary/50")}>
            {current ? <span className="h-2 w-2 rounded-full" style={{ background: current.color ?? "#149E5E" }} /> : <Icon name="smartphone" className="h-4 w-4" />}
            <span className="hidden max-w-24 truncate text-xs sm:inline">{current ? current.name : "Todos"}</span>
            <Icon name="chevron-down" className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent align="end" className="w-60 p-1">
        <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Mostrar conversas de</p>
        {[{ id: undefined as number | undefined, name: "Todos os números", color: null as string | null, status: "conectado" }, ...channels].map((c) => {
          const on = c.id === value;
          return (
            <button key={c.id ?? "all"} type="button" onClick={() => pick(c.id)}
              className={cn("flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted", on && "bg-muted font-medium")}>
              {c.id === undefined ? <Icon name="layers" className="h-3.5 w-3.5 text-muted-foreground" /> : <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color ?? "#149E5E" }} />}
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              {c.id !== undefined && c.status !== "conectado" && <Icon name="wifi-off" className="h-3.5 w-3.5 text-amber-600" />}
              {on && <Icon name="check" className="h-3.5 w-3.5 text-primary" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
