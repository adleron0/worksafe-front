import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import StatusBadge, { StatusTone } from "@/components/general-components/StatusBadge";
import TagBadge from "@/components/general-components/TagBadge";
import { formatDocumento } from "@/utils/documento";
import { cn } from "@/lib/utils";
import { Tip, errorMessage } from "../../../comercial/-shared/commercial";
import { CHAT_KEY, ChannelLogo, ChannelPill, ContactAvatar, ConversationDetail, chatApi, contactHandle, contactName, useChatMeta, useLiveInterval } from "../../-shared/chat";

/**
 * Ficha do contato (lado direito da conversa; no celular, painel por cima):
 * quem é, o cliente vinculado com o que ele tem na empresa, o atendimento e o
 * "não quer receber".
 */

interface Summary {
  customer: { id: number; name: string; corporateName: string | null; cnpj: string | null; phone: string | null; email: string | null; place: string | null; active: boolean } | null;
  proposals?: { id: number; number: string; title: string | null; status: string; total: number; createdAt: string }[] | null;
  orders?: { id: number; number: string; title: string | null; status: string }[] | null;
  receivables?: { count: number; total: number; overdue: number; next: { value: number; dueDate: string | null; description: string | null } | null } | null;
  subscriptions?: { id: number; name: string; status: string; createdAt: string; class: { id: number; name: string; initialDate: string | null } | null }[] | null;
}
interface Found { id: number; name: string; corporateName: string | null; cnpj: string | null; phone: string | null; place: string | null }

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const shortDate = (value: string | null) => (value ? new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "");
const PROPOSAL: Record<string, { label: string; tone: StatusTone }> = {
  rascunho: { label: "Rascunho", tone: "neutral" }, enviada: { label: "Enviada", tone: "info" }, visualizada: { label: "Visualizada", tone: "info" },
  aceita: { label: "Aceita", tone: "success" }, recusada: { label: "Recusada", tone: "danger" }, expirada: { label: "Expirada", tone: "warning" },
  cancelada: { label: "Cancelada", tone: "neutral" }, substituida: { label: "Substituída", tone: "neutral" },
};
const ORDER: Record<string, string> = { a_liberar: "A liberar", a_mobilizar: "A mobilizar", agendada: "Agendada", em_execucao: "Em execução" };
const SUBSCRIPTION: Record<string, { label: string; tone: StatusTone }> = { pending: { label: "Pendente", tone: "warning" }, confirmed: { label: "Confirmada", tone: "success" }, declined: { label: "Recusada", tone: "danger" } };

export function PanelSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-b px-4 py-4">
      <div className="mb-2.5 flex items-center gap-2">
        <h3 className="flex-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1"><span className="text-xs text-muted-foreground">{label}</span>{children}</div>;
}

export default function ContactPanel({ id }: { id: number }) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const refetchInterval = useLiveInterval(3000, 45000);
  const conv = useQuery({ queryKey: [CHAT_KEY, "conversation", id], refetchInterval, queryFn: () => chatApi.get<ConversationDetail>(`conversations/${id}`) });
  const meta = useChatMeta();
  const data = conv.data;
  const canEdit = can("responder_conversas") || can("canais_conversas");

  const done = (out: ConversationDetail) => { queryClient.setQueryData([CHAT_KEY, "conversation", id], out); queryClient.invalidateQueries({ queryKey: [CHAT_KEY] }); };
  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => chatApi.patch<ConversationDetail>(`conversations/${id}`, body),
    onSuccess: done,
    onError: (err) => toast({ title: "Não deu certo", description: errorMessage(err), variant: "destructive" }),
  });
  const contact = useMutation({
    mutationFn: (body: Record<string, unknown>) => chatApi.patch<ConversationDetail>(`conversations/${id}/contact`, body),
    onSuccess: done,
    onError: (err) => toast({ title: "Não deu certo", description: errorMessage(err), variant: "destructive" }),
  });

  if (!data) return <aside className="border-l p-4"><Skeleton className="h-40" /></aside>;
  const name = contactName(data.contact);
  const handle = contactHandle(data.contact, data.channel.type);
  const copy = (value: string) => { navigator.clipboard?.writeText(value); toast({ title: "Copiado", variant: "success" }); };

  return (
    <aside className="scroll-fino flex min-h-0 flex-col overflow-y-auto border-l bg-muted/20">
      <div className="grid justify-items-center gap-2 border-b px-4 py-6 text-center">
        <ContactAvatar name={name} url={data.contact.avatarUrl} size={72} />
        <ContactName name={data.contact.name} fallback={name} editable={canEdit} saving={contact.isPending} onSave={(value) => contact.mutate({ name: value })} />
        {data.contact.pushName && data.contact.pushName !== name && <p className="-mt-1 truncate text-xs text-muted-foreground">{data.channel.type === "instagram" ? "No Instagram" : "No WhatsApp"}: {data.contact.pushName}</p>}
        <button type="button" onClick={() => copy(handle)} className="flex cursor-pointer items-center gap-1.5 rounded-full bg-background px-3 py-1 text-xs font-medium shadow-xs hover:bg-muted">
          <ChannelLogo type={data.channel.type} className="h-3.5 w-3.5" />{handle}<Icon name="copy" className="h-3 w-3 text-muted-foreground" />
        </button>
        {data.contact.optOut && <TagBadge icon="bell-off" color="#dc2626">não quer receber mensagens</TagBadge>}
      </div>

      <CustomerSection conv={data} canEdit={canEdit} onLink={(customerId) => contact.mutate({ customerId })} linking={contact.isPending} />

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
            <Select name="status" options={[{ id: "aberta", name: "Aberta" }, { id: "aguardando", name: "Aguardando o cliente" }, { id: "resolvida", name: "Resolvida" }]}
              state={data.status} onChange={(_, value) => value && value !== data.status && patch.mutate({ status: value })} />
          </Field>
        </div>
      </PanelSection>

      {canEdit && (
        <PanelSection title="Contato">
          <label className="flex items-start gap-3">
            <Switch checked={data.contact.optOut} disabled={contact.isPending} onCheckedChange={(checked) => contact.mutate({ optOut: checked })} className="mt-0.5" />
            <span className="text-sm">
              Não quer receber mensagens
              <span className="block text-xs text-muted-foreground">Trava os envios para este contato. Liga sozinho quando ele escreve "parar".</span>
            </span>
          </label>
        </PanelSection>
      )}
    </aside>
  );
}

/** Nome do contato: clica no lápis, edita e salva (Enter) ou cancela (Esc). */
function ContactName({ name, fallback, editable, saving, onSave }: { name: string | null; fallback: string; editable: boolean; saving: boolean; onSave: (value: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name ?? "");
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) setTimeout(() => box.current?.focus(), 0); }, [editing]);
  if (!editing) {
    return (
      <div className="flex min-w-0 max-w-full items-center gap-1">
        <p className="truncate font-semibold">{fallback}</p>
        {editable && (
          <Tip text="Mudar o nome do contato">
            <button type="button" onClick={() => { setValue(name ?? fallback); setEditing(true); }} aria-label="Mudar o nome" className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-muted">
              <Icon name="pencil" className="h-3.5 w-3.5" />
            </button>
          </Tip>
        )}
      </div>
    );
  }
  const save = () => { onSave(value.trim()); setEditing(false); };
  return (
    <div className="flex w-full max-w-60 items-center gap-1">
      <input ref={box} value={value} maxLength={160} onChange={(event) => setValue(event.target.value)} disabled={saving}
        onKeyDown={(event) => { if (event.key === "Enter") save(); if (event.key === "Escape") setEditing(false); }}
        className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-center text-sm font-semibold outline-none focus:border-primary" />
      <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={save} aria-label="Salvar nome"><Icon name="check" className="h-4 w-4 text-primary" /></Button>
    </div>
  );
}

function CustomerSection({ conv, canEdit, onLink, linking }: { conv: ConversationDetail; canEdit: boolean; onLink: (customerId: number | null) => void; linking: boolean }) {
  const { can } = useVerify();
  const navigate = useNavigate();
  const [unlinking, setUnlinking] = useState(false);
  const linkedId = conv.customer?.id ?? null;
  const summary = useQuery({ queryKey: [CHAT_KEY, "customer", conv.id, linkedId], enabled: !!linkedId, staleTime: 60000, queryFn: () => chatApi.get<Summary>(`conversations/${conv.id}/customer`) });
  const canSearch = canEdit && can("list_clientes");
  const canCreate = canEdit && can("create_clientes");
  const createNew = () => navigate({
    to: "/clientes/$customerId", params: { customerId: "novo" },
    search: { nome: conv.contact.name || (conv.channel.type === "instagram" ? undefined : conv.contact.pushName) || undefined, telefone: conv.contact.phone ? conv.contact.phone.replace(/^55/, "") : undefined, conversa: conv.id },
  });

  if (!linkedId) {
    return (
      <PanelSection title="Cliente">
        <div className="grid gap-2 rounded-xl border border-dashed bg-background/60 p-3 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5 font-medium text-foreground"><Icon name="link-2-off" className="h-3.5 w-3.5" />Sem cliente vinculado</p>
          <p>{conv.channel.type === "instagram" ? "No Instagram não vem telefone: vincule pela busca." : "O sistema liga sozinho quando o telefone bate com o de um cliente ou de um contato dele."}</p>
          {(canSearch || canCreate) && (
            <div className="mt-1 flex flex-wrap gap-2">
              {canSearch && <CustomerSearch onPick={(id) => onLink(id)} disabled={linking} />}
              {canCreate && <Button type="button" size="sm" variant="ghost" onClick={createNew}><Icon name="plus" className="mr-1.5 h-4 w-4" />Cadastrar</Button>}
            </div>
          )}
        </div>
      </PanelSection>
    );
  }

  const s = summary.data;
  return (
    <PanelSection title="Cliente" action={canEdit && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button size="sm" variant="ghost" className="-my-1 h-7 w-7 p-0" aria-label="Ações do cliente"><Icon name="ellipsis" className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canSearch && <CustomerSearch asMenu onPick={(id) => onLink(id)} disabled={linking} />}
          <DropdownMenuItem onSelect={() => setUnlinking(true)}><Icon name="unlink" className="mr-2 h-4 w-4" />Desvincular</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )}>
      <Link to="/clientes/$customerId" params={{ customerId: String(linkedId) }} className="flex items-center gap-3 rounded-xl border bg-background p-3 transition-colors hover:border-primary/40">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon name="building-2" className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{conv.customer!.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{s?.customer ? [s.customer.cnpj ? formatDocumento(s.customer.cnpj) : null, s.customer.place].filter(Boolean).join(" · ") || "Abrir a ficha do cliente" : "Abrir a ficha do cliente"}</span>
        </span>
        <Icon name="chevron-right" className="h-4 w-4 text-muted-foreground" />
      </Link>
      {summary.isLoading && <Skeleton className="mt-3 h-24" />}
      {s && (
        <div className="mt-3 grid gap-3">
          {s.receivables && s.receivables.count > 0 && (
            <div className={cn("rounded-xl border p-3", s.receivables.overdue ? "border-red-500/30 bg-red-500/5" : "bg-background")}>
              <p className="flex items-center gap-1.5 text-xs font-medium"><Icon name="wallet" className="h-3.5 w-3.5 text-muted-foreground" />A receber</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">{money(s.receivables.total)} <span className="text-xs font-normal text-muted-foreground">em {s.receivables.count} {s.receivables.count === 1 ? "conta" : "contas"}</span></p>
              {s.receivables.overdue > 0 && <p className="text-xs font-medium text-red-600">{s.receivables.overdue} {s.receivables.overdue === 1 ? "vencida" : "vencidas"}</p>}
              {s.receivables.next && <p className="text-xs text-muted-foreground">Próxima: {money(s.receivables.next.value)}{s.receivables.next.dueDate ? ` em ${shortDate(s.receivables.next.dueDate)}` : ""}</p>}
            </div>
          )}
          {s.proposals && (
            <MiniList icon="file-text" title="Propostas" empty="Nenhuma proposta ainda.">
              {s.proposals.map((p) => (
                <Link key={p.id} to="/comercial/propostas/$proposalId" params={{ proposalId: String(p.id) }} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted">
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{p.title || p.number}</span><span className="text-[11px] text-muted-foreground tabular-nums">{p.number} · {money(p.total)}</span></span>
                  <StatusBadge tone={PROPOSAL[p.status]?.tone ?? "neutral"} pulse={false}>{PROPOSAL[p.status]?.label ?? p.status}</StatusBadge>
                </Link>
              ))}
            </MiniList>
          )}
          {s.orders && s.orders.length > 0 && (
            <MiniList icon="clipboard-list" title="Ordens de serviço abertas">
              {s.orders.map((o) => (
                <div key={o.id} className="flex items-center gap-2 px-1.5 py-1">
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{o.title || o.number}</span><span className="text-[11px] text-muted-foreground">{o.number}</span></span>
                  <span className="text-[11px] text-muted-foreground">{ORDER[o.status] ?? o.status}</span>
                </div>
              ))}
            </MiniList>
          )}
          {s.subscriptions && s.subscriptions.length > 0 && (
            <MiniList icon="graduation-cap" title="Inscrições em turmas">
              {s.subscriptions.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 px-1.5 py-1">
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{sub.name}</span><span className="block truncate text-[11px] text-muted-foreground">{sub.class?.name ?? "Turma"}{sub.class?.initialDate ? ` · ${shortDate(sub.class.initialDate)}` : ""}</span></span>
                  <StatusBadge tone={SUBSCRIPTION[sub.status]?.tone ?? "neutral"} pulse={false}>{SUBSCRIPTION[sub.status]?.label ?? sub.status}</StatusBadge>
                </div>
              ))}
            </MiniList>
          )}
        </div>
      )}
      <ConfirmDialog open={unlinking} onOpenChange={setUnlinking} title="Desvincular o cliente?" description="A conversa continua; só deixa de mostrar o cliente aqui. Dá para vincular de novo depois."
        onConfirm={() => onLink(null)} />
    </PanelSection>
  );
}

function MiniList({ icon, title, empty, children }: { icon: string; title: string; empty?: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium"><Icon name={icon} className="h-3.5 w-3.5 text-muted-foreground" />{title}</p>
      {items.length ? <div className="grid">{children}</div> : <p className="px-1.5 text-xs text-muted-foreground">{empty}</p>}
    </div>
  );
}

/** Busca de cliente para vincular (nome, razão social, CPF/CNPJ ou telefone). */
function CustomerSearch({ onPick, disabled, asMenu }: { onPick: (id: number) => void; disabled?: boolean; asMenu?: boolean }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(term.trim()), 300); return () => clearTimeout(t); }, [term]);
  const list = useQuery({ queryKey: [CHAT_KEY, "customers", debounced], enabled: open, queryFn: () => chatApi.get<Found[]>("customers", { search: debounced || undefined }) });
  const trigger = asMenu
    ? <DropdownMenuItem onSelect={(event) => { event.preventDefault(); setOpen(true); }}><Icon name="replace" className="mr-2 h-4 w-4" />Trocar cliente</DropdownMenuItem>
    : <Button type="button" size="sm" variant="outline" disabled={disabled}><Icon name="link-2" className="mr-1.5 h-4 w-4" />Vincular</Button>;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <Input name="customerSearch" value={term} onValueChange={(_, value) => setTerm(String(value))} placeholder="Nome, CNPJ, CPF ou telefone" icon="search" className="h-9" autoFocus />
        <div className="scroll-fino mt-2 max-h-64 overflow-y-auto">
          {list.isLoading && <p className="px-2 py-3 text-xs text-muted-foreground">Buscando…</p>}
          {list.data?.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">Nenhum cliente encontrado.</p>}
          {list.data?.map((c) => (
            <button key={c.id} type="button" onClick={() => { onPick(c.id); setOpen(false); }}
              className="flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted">
              <Icon name="building-2" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{c.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{[c.cnpj ? formatDocumento(c.cnpj) : null, c.place].filter(Boolean).join(" · ")}</span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
