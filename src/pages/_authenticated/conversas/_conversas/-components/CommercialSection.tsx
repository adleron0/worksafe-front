import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input as ShadInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import StatusBadge from "@/components/general-components/StatusBadge";
import { cn } from "@/lib/utils";
import { Tip, errorMessage } from "../../../comercial/-shared/commercial";
import { ACTIVITIES_KEY, ACTIVITY_TYPES, ActivityType, NextFields, NextState, TIME_OPTIONS, dueLabel, emptyNext, nextPayload } from "../../../comercial/-shared/activities";
import { CHAT_KEY, ConversationDetail, chatApi } from "../../-shared/chat";
import { PanelSection } from "./ContactPanel";

/**
 * Ações comerciais na ficha da conversa: negociação ligada, retornos e
 * contatos registrados, e atalhos para proposta e inscrição em turma.
 * Também o "Enviar link" do compositor (turma, proposta, negociação).
 */

interface CommercialInfo {
  deals: { current: { id: number; number: string; title: string; status: string; statusLabel: string; total: number; publicUrl: string | null } | null; options: { id: number; number: string; title: string }[] } | null;
  activities: { id: number; type: ActivityType; subject: string; dueDate: string | null; dueTime: string | null; doneAt: string | null; fromHere: boolean; overdue: boolean; today: boolean }[] | null;
}
export interface ChatLinks {
  classes: { id: number; name: string; initialDate: string | null; finalDate: string | null; open: boolean; price: number | null; url: string | null }[];
  proposals: { id: number; number: string; title: string; status: string; total: number; url: string | null }[];
  deal: { id: number; number: string; title: string; url: string | null } | null;
}

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
/** Dia de uma data pura ("2026-12-04", sem fuso). */
const dayBr = (value: string | null) => (value ? new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }) : "");
/** Dia de um instante (no fuso de quem vê). */
const whenBr = (value: string) => new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const TYPE_ICON = Object.fromEntries(ACTIVITY_TYPES.map((t) => [t.id, t.icon])) as Record<ActivityType, string>;
const DEAL_TONE: Record<string, "neutral" | "info" | "success" | "danger" | "warning"> = { aberta: "info", ganha: "success", perdida: "danger", parcial: "warning" };

export function useChatLinks(id: number, enabled: boolean) {
  return useQuery({ queryKey: [CHAT_KEY, "links", id], enabled, staleTime: 30000, queryFn: () => chatApi.get<ChatLinks>(`conversations/${id}/links`) });
}

export default function CommercialSection({ conv }: { conv: ConversationDetail }) {
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<null | "contato" | "retorno" | "negociacao" | "turma">(null);
  const canSee = can("list_comercial") || can("update_acompanhamento");
  const canActivity = can("update_acompanhamento");
  const canDeal = can("create_comercial");
  const canSubscribe = can("create_treinamentos");
  const customerId = conv.customer?.id ?? null;
  const info = useQuery({ queryKey: [CHAT_KEY, "commercial", conv.id, customerId], enabled: canSee, queryFn: () => chatApi.get<CommercialInfo>(`conversations/${conv.id}/commercial`) });
  const refresh = () => { queryClient.invalidateQueries({ queryKey: [CHAT_KEY, "commercial", conv.id] }); queryClient.invalidateQueries({ queryKey: [CHAT_KEY, "links", conv.id] }); queryClient.invalidateQueries({ queryKey: [ACTIVITIES_KEY] }); };
  const link = useMutation({
    mutationFn: (dealId: number | null) => chatApi.put(`conversations/${conv.id}/deal`, { dealId }),
    onSuccess: refresh,
    onError: (err) => toast({ title: "Não deu certo", description: errorMessage(err), variant: "destructive" }),
  });

  if (!canSee && !canDeal && !canSubscribe) return null;
  const contactLabel = conv.contact.name || (conv.channel.type === "instagram" ? null : conv.contact.pushName) || undefined;
  const phone = conv.contact.phone ? conv.contact.phone.replace(/^55/, "") : undefined;

  const shortcuts = (
    <div className="flex flex-wrap gap-2">
      {canDeal && customerId && (
        <Button type="button" size="sm" variant="outline" onClick={() => navigate({ to: "/comercial/propostas/nova", search: { cliente: customerId, conversa: conv.id } })}>
          <Icon name="file-plus-2" className="mr-1.5 h-4 w-4" />Proposta
        </Button>
      )}
      {canSubscribe && (
        <Button type="button" size="sm" variant="outline" onClick={() => setDialog("turma")}>
          <Icon name="graduation-cap" className="mr-1.5 h-4 w-4" />Inscrever em turma
        </Button>
      )}
    </div>
  );

  if (!customerId) {
    return (
      <PanelSection title="Comercial">
        <p className="mb-2.5 text-xs text-muted-foreground">Vincule um cliente para registrar contatos, agendar retorno e abrir negociação.</p>
        {canSubscribe && shortcuts}
        {dialog === "turma" && <ClassDialog conv={conv} name={contactLabel} phone={phone} onClose={() => setDialog(null)} />}
      </PanelSection>
    );
  }

  const deal = info.data?.deals;
  const pending = (info.data?.activities ?? []).filter((a) => !a.doneAt);
  const done = (info.data?.activities ?? []).filter((a) => a.doneAt && a.fromHere).slice(0, 3);

  return (
    <PanelSection title="Comercial">
      {info.isLoading && <Skeleton className="h-20" />}
      <div className="grid gap-3">
        {deal && (
          deal.current ? (
            <div className="flex items-center gap-2 rounded-xl border bg-background p-2.5">
              <Link to="/comercial/negociacoes/$dealId" params={{ dealId: String(deal.current.id) }} className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon name="handshake" className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{deal.current.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground tabular-nums">{deal.current.number}{deal.current.total ? ` · ${money(deal.current.total)}` : ""}</span>
                </span>
                <StatusBadge tone={DEAL_TONE[deal.current.status] ?? "neutral"} pulse={false}>{deal.current.statusLabel}</StatusBadge>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label="Ações da negociação"><Icon name="ellipsis" className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {deal.options.filter((d) => d.id !== deal.current!.id).map((d) => (
                    <DropdownMenuItem key={d.id} onSelect={() => link.mutate(d.id)}><Icon name="arrow-left-right" className="mr-2 h-4 w-4" />Trocar por {d.number}</DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onSelect={() => link.mutate(null)}><Icon name="unlink" className="mr-2 h-4 w-4" />Soltar da conversa</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="grid gap-2 rounded-xl border border-dashed bg-background/60 p-2.5">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon name="handshake" className="h-3.5 w-3.5" />Sem negociação ligada</p>
              <div className="flex flex-wrap items-center gap-2">
                {canDeal && <Button type="button" size="sm" onClick={() => setDialog("negociacao")}><Icon name="plus" className="mr-1.5 h-4 w-4" />Abrir negociação</Button>}
                {deal.options.length > 0 && (
                  <div className="min-w-40 flex-1">
                    <Select name="deal" options={deal.options.map((d) => ({ id: String(d.id), name: `${d.number} · ${d.title}` }))} state="" placeholder="Ligar a uma existente"
                      onChange={(_, value) => value && link.mutate(Number(value))} />
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {info.data?.activities && (
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <p className="flex flex-1 items-center gap-1.5 text-xs font-medium"><Icon name="calendar-clock" className="h-3.5 w-3.5 text-muted-foreground" />Retornos e contatos</p>
              <Link to="/comercial/acompanhamento" className="text-[11px] font-medium text-primary hover:underline">Agenda</Link>
            </div>
            {pending.length === 0 && done.length === 0 && <p className="px-1.5 text-xs text-muted-foreground">Nada marcado para este cliente.</p>}
            <div className="grid">
              {[...pending, ...done].map((a) => (
                <div key={a.id} className="flex items-center gap-2 px-1.5 py-1">
                  <Icon name={a.doneAt ? "check" : TYPE_ICON[a.type] ?? "calendar"} className={cn("h-3.5 w-3.5 shrink-0", a.doneAt ? "text-primary" : "text-muted-foreground")} />
                  <span className="min-w-0 flex-1 truncate text-xs">{a.subject}</span>
                  {a.doneAt
                    ? <span className="shrink-0 text-[11px] text-muted-foreground">feito {whenBr(a.doneAt)}</span>
                    : a.dueDate && <StatusBadge tone={a.overdue ? "danger" : a.today ? "warning" : "info"} pulse={false}>{a.overdue ? "Atrasado " : ""}{dueLabel(a.dueDate, a.dueTime)}</StatusBadge>}
                </div>
              ))}
            </div>
          </div>
        )}

        {canActivity && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setDialog("contato")}><Icon name="notebook-pen" className="mr-1.5 h-4 w-4" />Registrar contato</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setDialog("retorno")}><Icon name="alarm-clock" className="mr-1.5 h-4 w-4" />Agendar retorno</Button>
          </div>
        )}
        {shortcuts}
      </div>

      {dialog === "contato" && <ContactDialog conv={conv} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog === "retorno" && <ReturnDialog conv={conv} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog === "negociacao" && <DealDialog conv={conv} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog === "turma" && <ClassDialog conv={conv} name={contactLabel} phone={phone} onClose={() => setDialog(null)} />}
    </PanelSection>
  );
}

function useAction(path: string, onDone: () => void, onClose: () => void, message: string) {
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => chatApi.post(path, body),
    onSuccess: () => { onDone(); toast({ title: message, variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  return { ...mutation, error, setError };
}

/** Registrar o contato desta conversa no acompanhamento do cliente. */
function ContactDialog({ conv, onClose, onDone }: { conv: ConversationDetail; onClose: () => void; onDone: () => void }) {
  const [result, setResult] = useState("");
  const [excerpt, setExcerpt] = useState(true);
  const [next, setNext] = useState<NextState>(emptyNext);
  const action = useAction(`conversations/${conv.id}/activity`, onDone, onClose, "Contato registrado no acompanhamento");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (next.on && !next.dueDate) return action.setError("Escolha o dia do próximo retorno, ou desmarque a opção.");
    action.setError("");
    action.mutate({ result, excerpt, next: nextPayload(next) });
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar contato</DialogTitle>
          <DialogDescription>Fica no acompanhamento de {conv.customer?.name}{conv.channel.type === "instagram" ? " como conversa pelo Instagram" : " como conversa pelo WhatsApp"}.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div><Label htmlFor="chatResult">O que ficou combinado</Label>
            <Textarea id="chatResult" className="mt-1" rows={3} maxLength={2000} value={result} onChange={(event) => setResult(event.target.value)} placeholder="Ex.: vai mandar as medidas do galpão até amanhã" autoFocus /></div>
          <label className="flex items-start gap-2.5 text-sm">
            <Checkbox checked={excerpt} onCheckedChange={(checked) => setExcerpt(checked === true)} className="mt-0.5" />
            <span>Guardar as últimas mensagens junto<span className="block text-xs text-muted-foreground">As 15 mais recentes, como texto, para quem abrir o registro depois.</span></span>
          </label>
          <NextFields next={next} onChange={setNext} />
          {action.error && <p className="text-sm text-red-500">{action.error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={action.isPending}>{action.isPending ? "Salvando..." : "Registrar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Marcar um retorno na agenda do comercial. */
function ReturnDialog({ conv, onClose, onDone }: { conv: ConversationDetail; onClose: () => void; onDone: () => void }) {
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [type, setType] = useState<ActivityType>(conv.channel.type === "instagram" ? "tarefa" : "whatsapp");
  const [subject, setSubject] = useState("");
  const action = useAction(`conversations/${conv.id}/return`, onDone, onClose, "Retorno agendado");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!dueDate) return action.setError("Escolha o dia do retorno.");
    action.setError("");
    action.mutate({ dueDate, dueTime: dueTime || null, type, subject });
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agendar retorno</DialogTitle>
          <DialogDescription>Aparece na agenda do comercial e aqui na conversa.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Dia</Label>
              <CalendarPicker mode="single" name="chatDueDate" className="w-full" value={dueDate} placeholder="Escolha o dia" fromYear={2024} toYear={2040} onValueChange={(_, value) => setDueDate(String(value ?? ""))} /></div>
            <div><Label>Hora (opcional)</Label>
              <Select name="chatDueTime" state={dueTime} modal clearable placeholder="Sem hora" options={TIME_OPTIONS} onChange={(_, value) => setDueTime(String(value ?? ""))} /></div>
            <div><Label>Como</Label>
              <Select name="chatType" state={type} modal options={ACTIVITY_TYPES.filter((t) => t.id !== "nota")} onChange={(_, value) => setType(String(value) as ActivityType)} /></div>
            <div><Label htmlFor="chatSubject">Assunto</Label>
              <ShadInput id="chatSubject" className="mt-1" maxLength={200} value={subject} placeholder="Retornar a conversa" onChange={(event) => setSubject(event.target.value)} /></div>
          </div>
          {action.error && <p className="text-sm text-red-500">{action.error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={action.isPending}>{action.isPending ? "Salvando..." : "Agendar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Abrir uma negociação para o cliente, já ligada à conversa. */
function DealDialog({ conv, onClose, onDone }: { conv: ConversationDetail; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState(true);
  const action = useAction(`conversations/${conv.id}/deal`, onDone, onClose, "Negociação aberta");
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Abrir negociação</DialogTitle>
          <DialogDescription>Para {conv.customer?.name}. Depois é só ligar as propostas a ela no Comercial.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); action.setError(""); action.mutate({ title, excerpt }); }}>
          <div><Label htmlFor="chatDealTitle">Título</Label>
            <ShadInput id="chatDealTitle" className="mt-1" maxLength={200} value={title} placeholder={`Negociação ${conv.customer?.name ?? ""}`} onChange={(event) => setTitle(event.target.value)} autoFocus /></div>
          <label className="flex items-start gap-2.5 text-sm">
            <Checkbox checked={excerpt} onCheckedChange={(checked) => setExcerpt(checked === true)} className="mt-0.5" />
            <span>Guardar o começo da conversa nas observações<span className="block text-xs text-muted-foreground">As 10 mensagens mais recentes.</span></span>
          </label>
          {action.error && <p className="text-sm text-red-500">{action.error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={action.isPending}>{action.isPending ? "Abrindo..." : "Abrir negociação"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Escolher a turma e ir para a inscrição com nome e telefone do contato. */
function ClassDialog({ conv, name, phone, onClose }: { conv: ConversationDetail; name?: string; phone?: string; onClose: () => void }) {
  const navigate = useNavigate();
  const links = useChatLinks(conv.id, true);
  const [classId, setClassId] = useState("");
  const classes = links.data?.classes ?? [];
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Inscrever em turma</DialogTitle>
          <DialogDescription>Abre a inscrição com o nome e o telefone do contato. Ao salvar, volta para a conversa.</DialogDescription>
        </DialogHeader>
        {links.isLoading ? <Skeleton className="h-10" /> : classes.length ? (
          <div><Label>Turma</Label>
            <Select name="chatClass" modal searchable state={classId} placeholder="Escolha a turma"
              options={classes.map((c) => ({ id: String(c.id), name: `${c.name}${c.initialDate ? ` · ${dayBr(c.initialDate)}` : ""}${c.open ? "" : " (fechada)"}` }))}
              onChange={(_, value) => setClassId(String(value ?? ""))} /></div>
        ) : <p className="text-sm text-muted-foreground">Nenhuma turma com data daqui para frente.</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" disabled={!classId} onClick={() => navigate({ to: "/treinamentos/inscricoes/nova", search: { turma: classId, nome: name, telefone: phone, conversa: conv.id } })}>Continuar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Botão do compositor: escolhe um link e coloca na mensagem. */
export function LinkPicker({ conv, onPick }: { conv: ConversationDetail; onPick: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const links = useChatLinks(conv.id, open);
  const data = links.data;
  const classes = (data?.classes ?? []).filter((c) => c.url);
  const proposals = (data?.proposals ?? []).filter((p) => p.url);
  const empty = data && !classes.length && !proposals.length && !data.deal?.url;
  const pick = (text: string) => { onPick(text); setOpen(false); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tip text="Mandar um link (turma, proposta, negociação)">
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" className="hidden h-11 w-9 shrink-0 rounded-full p-0 text-muted-foreground sm:inline-flex" aria-label="Mandar um link">
            <Icon name="link" className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent align="start" side="top" className="w-80 p-0">
        <p className="border-b px-3 py-2 text-xs font-medium">Mandar um link</p>
        <div className="scroll-fino max-h-80 overflow-y-auto py-1">
          {links.isLoading && <div className="p-3"><Skeleton className="h-16" /></div>}
          {empty && <p className="px-3 py-3 text-xs text-muted-foreground">Nada para mandar: turmas com inscrição aberta no site, propostas enviadas e o link da negociação aparecem aqui.</p>}
          {data?.deal?.url && (
            <LinkGroup title="Negociação">
              <LinkRow icon="handshake" title={data.deal.title} sub={data.deal.number} onClick={() => pick(`Suas propostas: ${data.deal!.url}`)} />
            </LinkGroup>
          )}
          {proposals.length > 0 && (
            <LinkGroup title="Propostas">
              {proposals.map((p) => <LinkRow key={p.id} icon="file-text" title={p.title} sub={`${p.number} · ${money(p.total)}`} onClick={() => pick(`Proposta ${p.number}: ${p.url}`)} />)}
            </LinkGroup>
          )}
          {classes.length > 0 && (
            <LinkGroup title="Turmas com inscrição aberta">
              {classes.map((c) => <LinkRow key={c.id} icon="graduation-cap" title={c.name} sub={[c.initialDate ? dayBr(c.initialDate) : null, c.price ? money(c.price) : null].filter(Boolean).join(" · ")} onClick={() => pick(`${c.name}${c.initialDate ? ` (${dayBr(c.initialDate)})` : ""}: ${c.url}`)} />)}
            </LinkGroup>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LinkGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="py-1"><p className="px-3 pb-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{title}</p>{children}</div>;
}
function LinkRow({ icon, title, sub, onClick }: { icon: string; title: string; sub?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-1.5 text-left hover:bg-muted">
      <Icon name={icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1"><span className="block truncate text-sm">{title}</span>{sub && <span className="block truncate text-[11px] text-muted-foreground tabular-nums">{sub}</span>}</span>
    </button>
  );
}
