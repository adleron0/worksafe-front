import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input as ShadInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { Tip, commercialApi, dateBr, errorMessage, todayIso } from "./commercial";
import { PROPOSALS_KEY } from "./proposals";

/**
 * Acompanhamento: os contatos com o cliente (o que já aconteceu) e os retornos
 * marcados (o que falta fazer). Usado dentro da proposta e na agenda do Comercial.
 */
export type ActivityType = "ligacao" | "whatsapp" | "email" | "reuniao" | "visita" | "tarefa" | "nota";
export interface Activity {
  id: number; type: ActivityType; typeLabel: string; subject: string; notes: string | null; contactName: string | null;
  dueDate: string | null; dueTime: string | null; doneAt: string | null; result: string | null;
  status: "pendente" | "feita" | "cancelada"; overdue: boolean; today: boolean;
  userId: number | null; user: string | null; customer: { id: number; name: string };
  proposal: { id: number; number: string; title: string; status: string } | null; createdAt: string;
}
export interface ActivityList { rows: Activity[]; total: number; summary: { overdue: number; today: number; upcoming: number; done: number } }
/** O que a lista de propostas traz de cada uma: o próximo retorno e o último contato. */
export interface FollowUp {
  next: { id: number; type: ActivityType; subject: string; dueDate: string; dueTime: string | null; overdue: boolean; today: boolean } | null;
  pending: number; lastAt: string | null;
}

export const ACTIVITIES_KEY = "commercialActivities";
export const ACTIVITY_TYPES: Array<{ id: ActivityType; name: string; icon: string }> = [
  { id: "ligacao", name: "Ligação", icon: "phone" }, { id: "whatsapp", name: "WhatsApp", icon: "message-circle" }, { id: "email", name: "E-mail", icon: "mail" },
  { id: "reuniao", name: "Reunião", icon: "users" }, { id: "visita", name: "Visita", icon: "map-pin" }, { id: "tarefa", name: "Tarefa", icon: "square-check" },
  { id: "nota", name: "Anotação", icon: "sticky-note" },
];
const TYPE_ICON = Object.fromEntries(ACTIVITY_TYPES.map((type) => [type.id, type.icon])) as Record<ActivityType, string>;
/** Horas de meia em meia, do começo ao fim do dia de trabalho. */
const TIME_OPTIONS = Array.from({ length: 30 }, (_, index) => {
  const time = `${String(6 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`;
  return { id: time, name: time };
});

const dateTimeBr = (value: string) => new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
/** "hoje", "amanhã", "ontem" ou a data, com a hora quando houver. */
export function dueLabel(dueDate: string, dueTime?: string | null) {
  const days = Math.round((new Date(`${dueDate}T12:00:00`).getTime() - new Date(`${todayIso()}T12:00:00`).getTime()) / 86400000);
  const day = days === 0 ? "hoje" : days === 1 ? "amanhã" : days === -1 ? "ontem" : dateBr(dueDate);
  return dueTime ? `${day} às ${dueTime}` : day;
}

/** Etiqueta do próximo retorno, para a linha da lista e o cartão do kanban. */
export function FollowUpChip({ followUp, className }: { followUp?: FollowUp | null; className?: string }) {
  const next = followUp?.next;
  if (!next) return null;
  return (
    <Tip text={`${next.subject}${followUp.pending > 1 ? ` (mais ${followUp.pending - 1} marcado${followUp.pending > 2 ? "s" : ""})` : ""}`}>
      <span className={cn("inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        next.overdue ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          : next.today ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300" : "text-muted-foreground", className)}>
        <Icon name={TYPE_ICON[next.type] ?? "bell"} className="w-3 h-3 shrink-0" />
        <span className="truncate">{next.overdue ? "Atrasado: " : "Retorno "}{dueLabel(next.dueDate, next.dueTime)}</span>
      </span>
    </Tip>
  );
}

// ---------------------------------------------------------------- formulários

interface Target { proposalId?: number; customerId?: number }
type Mode = "registrar" | "agendar";
interface UserOption { id: number; name: string }

/** Campos de "marcar o próximo retorno", usados ao registrar um contato e ao concluir um agendado. */
interface NextState { on: boolean; type: ActivityType; subject: string; dueDate: string; dueTime: string }
const emptyNext = (): NextState => ({ on: false, type: "ligacao", subject: "", dueDate: "", dueTime: "" });
const nextPayload = (next: NextState) => (next.on && next.dueDate ? { type: next.type, subject: next.subject, dueDate: next.dueDate, dueTime: next.dueTime || null } : undefined);

function NextFields({ next, onChange }: { next: NextState; onChange: (next: NextState) => void }) {
  const set = <K extends keyof NextState>(key: K, value: NextState[K]) => onChange({ ...next, [key]: value });
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-2">
        <Checkbox id="nextOn" checked={next.on} onCheckedChange={(checked) => set("on", checked === true)} />
        <Label htmlFor="nextOn" className="cursor-pointer">Já marcar o próximo retorno</Label>
      </div>
      {next.on && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><Label>Como</Label>
            <Select name="nextType" state={next.type} modal options={ACTIVITY_TYPES.filter((type) => type.id !== "nota")} onChange={(_, value) => set("type", String(value) as ActivityType)} /></div>
          <div><Label htmlFor="nextSubject">Assunto</Label>
            <ShadInput id="nextSubject" className="mt-1" maxLength={200} value={next.subject} placeholder="Ex.: cobrar a resposta" onChange={(event) => set("subject", event.target.value)} /></div>
          <div><Label>Dia</Label>
            <CalendarPicker mode="single" name="nextDueDate" className="w-full" value={next.dueDate} placeholder="Escolha o dia" fromYear={2024} toYear={2040}
              onValueChange={(_, value) => set("dueDate", String(value ?? ""))} /></div>
          <div><Label>Hora (opcional)</Label>
            <Select name="nextDueTime" state={next.dueTime} modal clearable placeholder="Sem hora" options={TIME_OPTIONS} onChange={(_, value) => set("dueTime", String(value ?? ""))} /></div>
        </div>
      )}
    </div>
  );
}

/** Registrar um contato que já aconteceu, agendar uma atividade, ou editar uma existente. */
export function ActivityDialog({ mode, target, editing, users, defaultContact, onClose }: {
  mode: Mode; target: Target; editing?: Activity; users: UserOption[]; defaultContact?: string | null; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const done = editing ? editing.status === "feita" : mode === "registrar";
  const [type, setType] = useState<ActivityType>(editing?.type ?? "ligacao");
  const [subject, setSubject] = useState(editing?.subject ?? "");
  const [contactName, setContactName] = useState(editing?.contactName ?? defaultContact ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [result, setResult] = useState(editing?.result ?? "");
  const [doneDate, setDoneDate] = useState(editing?.doneAt ? editing.doneAt.slice(0, 10) : todayIso());
  const [dueDate, setDueDate] = useState(editing?.dueDate ?? "");
  const [dueTime, setDueTime] = useState(editing?.dueTime ?? "");
  const [userId, setUserId] = useState(editing?.userId ? String(editing.userId) : "");
  const [next, setNext] = useState<NextState>(emptyNext);
  const [error, setError] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const common = { type, subject, contactName, notes, ...(userId ? { userId: Number(userId) } : {}) };
      if (editing) return commercialApi.put(`activities/${editing.id}`, { ...common, ...(done ? { result } : { dueDate, dueTime: dueTime || null }) });
      return commercialApi.post("activities", {
        ...target, ...common,
        ...(done ? { done: true, doneDate, result, next: nextPayload(next) } : { dueDate, dueTime: dueTime || null }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ACTIVITIES_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROPOSALS_KEY] });
      toast({ title: editing ? "Alteração salva" : done ? "Contato registrado" : "Atividade marcada", variant: "success" });
      onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!done && !dueDate) return setError("Escolha o dia em que fica marcado.");
    if (done && !editing && next.on && !next.dueDate) return setError("Escolha o dia do próximo retorno, ou desmarque a opção.");
    setError(""); mutate();
  };

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar" : done ? "Registrar contato" : "Agendar atividade"}</DialogTitle>
          <DialogDescription>
            {done ? "Anote um contato que já aconteceu com o cliente e o que ficou combinado." : "Marque um retorno, uma reunião, uma visita ou uma tarefa para não esquecer."}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>{done ? "Como foi o contato" : "O que vai fazer"}</Label>
              <Select name="type" state={type} modal options={ACTIVITY_TYPES} onChange={(_, value) => setType(String(value) as ActivityType)} /></div>
            <div><Label htmlFor="activitySubject">Assunto</Label>
              <ShadInput id="activitySubject" className="mt-1" maxLength={200} value={subject} placeholder={done ? "Ex.: apresentei a proposta" : "Ex.: ligar para saber a decisão"}
                onChange={(event) => setSubject(event.target.value)} /></div>
            <div><Label htmlFor="activityContact">{done ? "Com quem falou" : "Com quem"}</Label>
              <ShadInput id="activityContact" className="mt-1" maxLength={160} value={contactName} onChange={(event) => setContactName(event.target.value)} /></div>
            {done ? (
              <div><Label>Dia do contato</Label>
                <CalendarPicker mode="single" name="doneDate" className="w-full" value={doneDate} disabled={Boolean(editing)} fromYear={2024} toYear={2040}
                  onValueChange={(_, value) => setDoneDate(String(value ?? "") || todayIso())} /></div>
            ) : (
              <div><Label>Responsável</Label>
                <Select name="userId" state={userId} modal clearable placeholder="Eu" options={users.map((user) => ({ id: String(user.id), name: user.name }))}
                  onChange={(_, value) => setUserId(String(value ?? ""))} /></div>
            )}
            {!done && (
              <>
                <div><Label>Dia</Label>
                  <CalendarPicker mode="single" name="dueDate" className="w-full" value={dueDate} placeholder="Escolha o dia" fromYear={2024} toYear={2040}
                    onValueChange={(_, value) => setDueDate(String(value ?? ""))} /></div>
                <div><Label>Hora (opcional)</Label>
                  <Select name="dueTime" state={dueTime} modal clearable placeholder="Sem hora" options={TIME_OPTIONS} onChange={(_, value) => setDueTime(String(value ?? ""))} /></div>
              </>
            )}
          </div>
          <div><Label htmlFor="activityNotes">{done ? "O que foi conversado" : "Observações"}</Label>
            <Textarea id="activityNotes" className="mt-1" rows={3} maxLength={5000} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
          {done && (
            <div><Label htmlFor="activityResult">O que ficou combinado</Label>
              <Textarea id="activityResult" className="mt-1" rows={2} maxLength={2000} value={result} onChange={(event) => setResult(event.target.value)}
                placeholder="Ex.: vai levar para a diretoria e responde até sexta" /></div>
          )}
          {done && !editing && <NextFields next={next} onChange={setNext} />}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : editing ? "Salvar" : done ? "Registrar" : "Agendar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Concluir o que estava marcado: o que ficou combinado e, se houver, o próximo retorno. */
export function CompleteDialog({ activity, onClose }: { activity: Activity; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState("");
  const [next, setNext] = useState<NextState>(emptyNext);
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => commercialApi.patch(`activities/${activity.id}/done`, { result, next: nextPayload(next) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ACTIVITIES_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROPOSALS_KEY] });
      toast({ title: "Atividade concluída", variant: "success" });
      onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (next.on && !next.dueDate) return setError("Escolha o dia do próximo retorno, ou desmarque a opção.");
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Concluir: {activity.subject}</DialogTitle>
          <DialogDescription>{activity.typeLabel} com {activity.contactName || activity.customer.name}{activity.dueDate ? `, marcada para ${dueLabel(activity.dueDate, activity.dueTime)}` : ""}.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div><Label htmlFor="completeResult">O que ficou combinado</Label>
            <Textarea id="completeResult" className="mt-1" rows={3} maxLength={2000} value={result} onChange={(event) => setResult(event.target.value)}
              placeholder="Ex.: pediu desconto; fiquei de responder amanhã" /></div>
          <NextFields next={next} onChange={setNext} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Concluir"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- lista

/** Responsáveis possíveis: os usuários ativos da empresa (a mesma lista do vendedor da proposta). */
export function useActivityUsers() {
  const { data } = useQuery({
    queryKey: ["commercialActivityUsers"], staleTime: 5 * 60 * 1000,
    queryFn: () => commercialApi.get<{ sellers: UserOption[] }>("proposals/options"),
  });
  return data?.sellers ?? [];
}

/** Uma linha do acompanhamento: pendente (com "Concluir") ou feita. */
export function ActivityItem({ activity, canEdit, showContext, onComplete, onEdit }: {
  activity: Activity; canEdit: boolean; showContext?: boolean; onComplete: (activity: Activity) => void; onEdit: (activity: Activity) => void;
}) {
  const queryClient = useQueryClient();
  const refresh = () => { queryClient.invalidateQueries({ queryKey: [ACTIVITIES_KEY] }); queryClient.invalidateQueries({ queryKey: [PROPOSALS_KEY] }); };
  const { mutate: act } = useMutation({
    mutationFn: (action: "remove" | "reopen") => (action === "remove" ? commercialApi.delete(`activities/${activity.id}`) : commercialApi.patch(`activities/${activity.id}/reopen`)),
    onSuccess: (_, action) => { refresh(); toast({ title: action === "reopen" ? "Voltou para pendente" : activity.status === "feita" ? "Registro excluído" : "Atividade cancelada", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível concluir", description: errorMessage(err), variant: "destructive" }),
  });
  const pending = activity.status === "pendente";
  return (
    <li className="flex gap-3 py-3 border-b last:border-b-0">
      <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
        pending ? (activity.overdue ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300" : "border-primary/40 bg-primary/10 text-primary") : "bg-muted text-muted-foreground")}>
        <Icon name={TYPE_ICON[activity.type] ?? "circle"} className="w-3.5 h-3.5" />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium break-words">
          {activity.subject}
          {activity.subject !== activity.typeLabel && <span className="font-normal text-muted-foreground"> · {activity.typeLabel}</span>}
        </p>
        <p className="text-xs text-muted-foreground">
          {pending
            ? <span className={cn(activity.overdue && "font-semibold text-red-600 dark:text-red-400", !activity.overdue && activity.today && "font-semibold text-amber-700 dark:text-amber-400")}>
                {activity.overdue ? "Atrasada: era para " : "Marcada para "}{activity.dueDate ? dueLabel(activity.dueDate, activity.dueTime) : "—"}
              </span>
            : <span>Feito em {activity.doneAt ? dateTimeBr(activity.doneAt) : "—"}</span>}
          {activity.contactName ? ` · com ${activity.contactName}` : ""}{activity.user ? ` · ${activity.user}` : ""}
        </p>
        {showContext && (
          <p className="text-xs text-muted-foreground truncate">
            {activity.customer.name}
            {activity.proposal && (
              <> · <Link to="/comercial/propostas/$proposalId" params={{ proposalId: String(activity.proposal.id) }} className="underline hover:text-foreground">{activity.proposal.number}</Link> {activity.proposal.title}</>
            )}
          </p>
        )}
        {activity.notes && <p className="mt-1 whitespace-pre-wrap break-words">{activity.notes}</p>}
        {activity.result && <p className="mt-1 whitespace-pre-wrap break-words"><span className="text-muted-foreground">Combinado: </span>{activity.result}</p>}
      </div>
      {canEdit && (
        <div className="flex shrink-0 items-start gap-1">
          {pending && <Button type="button" size="sm" variant="outline" className="h-7 gap-1 px-2" onClick={() => onComplete(activity)}><Icon name="check" className="w-3.5 h-3.5" /> Concluir</Button>}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label={`Ações de ${activity.subject}`}><Icon name="ellipsis-vertical" className="w-3 h-3" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2" onSelect={() => onEdit(activity)}><Icon name="pencil" className="w-3 h-3" /> Editar</DropdownMenuItem>
              {!pending && activity.dueDate && <DropdownMenuItem className="gap-2" onSelect={() => act("reopen")}><Icon name="undo-2" className="w-3 h-3" /> Voltar para pendente</DropdownMenuItem>}
              <DropdownMenuItem className="p-0" onSelect={(event) => event.preventDefault()}>
                <ConfirmDialog title={pending ? `Cancelar "${activity.subject}"?` : `Excluir "${activity.subject}"?`}
                  description={pending ? "A atividade sai da agenda." : "O registro sai do acompanhamento."}
                  onConfirm={() => act("remove")} titleBttn={pending ? "Cancelar atividade" : "Excluir registro"} iconBttn={pending ? "ban" : "trash-2"} />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </li>
  );
}

/** Estado dos diálogos (registrar, agendar, editar, concluir), para a proposta e para a agenda. */
export function useActivityDialogs(target: Target, defaultContact?: string | null) {
  const users = useActivityUsers();
  const [form, setForm] = useState<{ mode: Mode; editing?: Activity } | null>(null);
  const [completing, setCompleting] = useState<Activity | null>(null);
  const dialogs = (
    <>
      {form && <ActivityDialog mode={form.mode} editing={form.editing} target={target} users={users} defaultContact={defaultContact} onClose={() => setForm(null)} />}
      {completing && <CompleteDialog activity={completing} onClose={() => setCompleting(null)} />}
    </>
  );
  return {
    dialogs, register: () => setForm({ mode: "registrar" }), schedule: () => setForm({ mode: "agendar" }),
    edit: (activity: Activity) => setForm({ mode: activity.status === "feita" ? "registrar" : "agendar", editing: activity }), complete: setCompleting,
  };
}

/** Acompanhamento de uma proposta (ou de um cliente): o que está marcado e o que já foi feito. */
export function ActivityPanel({ proposalId, customerId, canEdit, defaultContact }: { proposalId?: number; customerId?: number; canEdit: boolean; defaultContact?: string | null }) {
  const params = { limit: 100, ...(proposalId ? { proposalId } : { customerId }) };
  const { data, isLoading, error } = useQuery({ queryKey: [ACTIVITIES_KEY, params], queryFn: () => commercialApi.get<ActivityList>("activities", params) });
  const { dialogs, register, schedule, edit, complete } = useActivityDialogs(proposalId ? { proposalId } : { customerId }, defaultContact);
  const pending = data?.rows.filter((row) => row.status === "pendente") ?? [];
  const done = data?.rows.filter((row) => row.status === "feita") ?? [];
  return (
    <section className="rounded-lg border p-4" aria-label="Acompanhamento">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Acompanhamento</h3>
          <p className="text-xs text-muted-foreground">Contatos com o cliente e retornos marcados. Uso interno: o cliente não vê.</p>
        </div>
        {canEdit && (
          <div className="flex gap-2 shrink-0">
            <Button type="button" size="sm" variant="outline" onClick={register}><Icon name="message-square-plus" className="w-4 h-4 mr-1" /> Registrar contato</Button>
            <Button type="button" size="sm" onClick={schedule}><Icon name="calendar-plus" className="w-4 h-4 mr-1" /> Agendar</Button>
          </div>
        )}
      </div>
      {isLoading && <Skeleton className="h-16 w-full mt-3" />}
      {error && <p className="mt-3 text-sm text-destructive">Erro: {errorMessage(error)}</p>}
      {data && !data.rows.length && (
        <p className="mt-3 text-sm text-muted-foreground">Nada registrado ainda. Anote cada conversa e marque o próximo retorno para a proposta não esfriar.</p>
      )}
      {pending.length > 0 && (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">A fazer ({pending.length})</p>
          <ul>{pending.map((activity) => <ActivityItem key={activity.id} activity={activity} canEdit={canEdit} onComplete={complete} onEdit={edit} />)}</ul>
        </>
      )}
      {done.length > 0 && (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Já feito ({done.length})</p>
          <ul>{done.map((activity) => <ActivityItem key={activity.id} activity={activity} canEdit={canEdit} onComplete={complete} onEdit={edit} />)}</ul>
        </>
      )}
      {dialogs}
    </section>
  );
}
