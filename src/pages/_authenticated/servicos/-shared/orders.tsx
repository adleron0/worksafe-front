import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import { cn } from "@/lib/utils";
import { dateBr, errorMessage, todayIso } from "../../comercial/-shared/commercial";
import { BILLING_KEY } from "../../comercial/-shared/contracts";
import { PROPOSAL_KEY } from "../../comercial/-shared/proposals";

/** Ordem de serviço: tipos (espelham a API), etapas e a passagem entre elas. */
export type OrderStatus = "a_liberar" | "a_mobilizar" | "agendada" | "em_execucao" | "concluida" | "encerrada" | "cancelada";

export interface OrderRow {
  id: number; number: string; status: OrderStatus; title: string; customer: { id: number; name: string };
  proposal: { id: number; number: string } | null; customerOrderNumber: string | null;
  plannedStart: string | null; plannedEnd: string | null; startedAt: string | null; finishedAt: string | null;
  responsible: string | null; location: string | null; checklist: { done: number; total: number }; late: boolean;
}
export interface OrderList { rows: OrderRow[]; total: number; summary: Partial<Record<OrderStatus, number>> }

export interface ChecklistItem { id?: string; title: string; done: boolean; doneAt?: string | null; doneBy?: string | null }
export interface TeamMember { name: string; role: string }
export interface ScopeItem { type: string; description: string; unit: string | null; quantity: number; workDays: number | null; hoursPerDay: number | null; overtimeHours: number; night: boolean; weekend: boolean; travel: boolean }
export interface ScopeSection { title: string; kind: string; items: ScopeItem[] }
export interface OrderEvent { id: number; type: string; from: OrderStatus | null; to: OrderStatus | null; note: string | null; at: string; user: string | null }
export interface Order {
  id: number; number: string; status: OrderStatus; statusLabel: string; nextStatuses: OrderStatus[]; title: string; description: string | null; statusNote: string | null; late: boolean;
  customer: { id: number; name: string; corporateName: string; cnpj: string; phone: string | null; email: string | null } | null;
  proposal: { id: number; number: string } | null; contract: { id: number; number: string } | null;
  customerOrder: { number: string | null; date: string | null; fileUrl: string | null; fileName: string | null } | null;
  contactName: string | null; contactPhone: string | null; contactEmail: string | null; location: string | null;
  responsible: { id: number; name: string } | null; team: TeamMember[];
  plannedStart: string | null; plannedEnd: string | null; startedAt: string | null; finishedAt: string | null;
  scope: ScopeSection[]; schedule: { unit: "dia" | "semana" | "mes"; steps: Array<{ title: string; start: number; duration: number }> } | null;
  checklist: ChecklistItem[]; notes: string | null; conclusionNotes: string | null;
  canSeeCosts: boolean; budget: { revenue: number; cost: number; tax: number; commission: number; profit: number; groups: Array<{ type: string; label: string; cost: number }> } | null;
  events: OrderEvent[];
}
export interface OrderOptions { users: Array<{ id: number; name: string }> }

export const ORDERS_KEY = "serviceOrders";
export const ORDER_KEY = "serviceOrder";
export const ORDERS_ABILITY = "ordens_de_servico";

/** Rotas da OS recebem JSON (o helper padrão envia multipart). */
export const ordersApi = {
  get: async <T,>(path = "", params?: Record<string, unknown>) => (await api.get<T>(`service-orders${path ? `/${path}` : ""}`, { params })).data,
  put: async <T,>(path: string, body?: unknown) => (await api.put<T>(`service-orders/${path}`, body ?? {})).data,
  patch: async <T,>(path: string, body?: unknown) => (await api.patch<T>(`service-orders/${path}`, body ?? {})).data,
};

/** As etapas, na ordem da esteira. Cancelada fica fora do quadro. */
export const ORDER_STAGES: Array<{ id: OrderStatus; name: string; color: string; hint: string }> = [
  { id: "a_liberar", name: "A liberar", color: "#9ca3af", hint: "Esperando o pedido do cliente" },
  { id: "a_mobilizar", name: "A mobilizar", color: "#f59e0b", hint: "Separar equipe, materiais e marcar a data" },
  { id: "agendada", name: "Agendada", color: "#6366f1", hint: "Com data marcada" },
  { id: "em_execucao", name: "Em execução", color: "#3b82f6", hint: "Obra em andamento" },
  { id: "concluida", name: "Concluída", color: "#22c55e", hint: "Serviço entregue; libera o faturamento" },
  { id: "encerrada", name: "Encerrada", color: "#0f766e", hint: "Resultado fechado" },
];
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  ...(Object.fromEntries(ORDER_STAGES.map((stage) => [stage.id, stage.name])) as Record<Exclude<OrderStatus, "cancelada">, string>), cancelada: "Cancelada",
};
const ORDER: OrderStatus[] = ["a_liberar", "a_mobilizar", "agendada", "em_execucao", "concluida", "encerrada", "cancelada"];
/** As passagens que existem (as mesmas da API). */
export const ORDER_MOVES: Record<OrderStatus, OrderStatus[]> = {
  a_liberar: ["a_mobilizar", "cancelada"], a_mobilizar: ["agendada", "a_liberar", "cancelada"], agendada: ["em_execucao", "a_mobilizar", "cancelada"],
  em_execucao: ["concluida", "agendada", "cancelada"], concluida: ["encerrada", "em_execucao"], encerrada: ["concluida"], cancelada: ["a_mobilizar"],
};
export const isForward = (from: OrderStatus, to: OrderStatus) => to !== "cancelada" && from !== "cancelada" && ORDER.indexOf(to) > ORDER.indexOf(from);
/** O próximo passo natural de cada etapa (o botão em destaque). */
export const nextStage = (status: OrderStatus): OrderStatus | null => ORDER_MOVES[status].find((to) => isForward(status, to)) ?? (status === "cancelada" ? "a_mobilizar" : null);
/** Nome da ação de uma passagem. */
export function moveLabel(from: OrderStatus, to: OrderStatus): string {
  if (to === "cancelada") return "Cancelar a OS";
  if (from === "cancelada") return "Reativar";
  if (!isForward(from, to)) return `Voltar para "${ORDER_STATUS_LABEL[to]}"`;
  return ({ a_mobilizar: "Liberar sem pedido", agendada: "Agendar", em_execucao: "Iniciar a execução", concluida: "Concluir o serviço", encerrada: "Encerrar" } as Record<string, string>)[to] ?? ORDER_STATUS_LABEL[to];
}

export function OrderStageBadge({ status, late }: { status: OrderStatus; late?: boolean }) {
  const color = ORDER_STAGES.find((stage) => stage.id === status)?.color ?? "#6b7280";
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("inline-flex items-center gap-1.5 rounded bg-muted px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", status === "cancelada" && "line-through text-muted-foreground")}>
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /> {ORDER_STATUS_LABEL[status]}
      </span>
      {late && <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300 whitespace-nowrap">Atrasada</span>}
    </span>
  );
}

/** Período da OS em uma frase: o real quando já começou, senão o previsto. */
export function periodText(row: Pick<OrderRow, "plannedStart" | "plannedEnd" | "startedAt" | "finishedAt">): string {
  if (row.finishedAt) return `Feita de ${dateBr(row.startedAt)} a ${dateBr(row.finishedAt)}`;
  if (row.startedAt) return `Começou em ${dateBr(row.startedAt)}${row.plannedEnd ? ` · término previsto ${dateBr(row.plannedEnd)}` : ""}`;
  if (row.plannedStart) return `Marcada para ${dateBr(row.plannedStart)}${row.plannedEnd ? ` a ${dateBr(row.plannedEnd)}` : ""}`;
  return "Sem data marcada";
}

type Movable = Pick<Order, "id" | "number" | "status" | "plannedStart" | "plannedEnd" | "startedAt">;

/**
 * Passagem de etapa: pede só o que aquela passagem exige (a data para agendar,
 * a data real para iniciar e concluir, o motivo para cancelar).
 */
export function MoveDialog({ order, target, onClose, onDone }: { order: Movable; target: OrderStatus; onClose: () => void; onDone?: (order: Order) => void }) {
  const queryClient = useQueryClient();
  const forward = isForward(order.status, target);
  const [plannedStart, setPlannedStart] = useState(order.plannedStart ?? "");
  const [plannedEnd, setPlannedEnd] = useState(order.plannedEnd ?? "");
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [conclusionNotes, setConclusionNotes] = useState("");
  const [error, setError] = useState("");
  const scheduling = target === "agendada" && forward;
  const starting = target === "em_execucao" && forward;
  const finishing = target === "concluida" && forward;
  const cancelling = target === "cancelada";

  const { mutate, isPending } = useMutation({
    mutationFn: () => ordersApi.patch<Order>(`${order.id}/status`, {
      status: target, note,
      ...(scheduling ? { plannedStart, plannedEnd: plannedEnd || null } : {}),
      ...(starting || finishing ? { date } : {}),
      ...(finishing ? { conclusionNotes } : {}),
    }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.setQueryData([ORDER_KEY, String(result.id)], result);
      // concluir libera parcelas no faturamento e muda o que a proposta mostra
      queryClient.invalidateQueries({ queryKey: [BILLING_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROPOSAL_KEY] });
      toast({ title: `${result.number}: ${result.statusLabel.toLowerCase()}`, variant: "success" });
      onDone?.(result); onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (scheduling && !plannedStart) return setError("Escolha a data de início.");
    if (cancelling && !note.trim()) return setError("Informe o motivo do cancelamento.");
    setError(""); mutate();
  };
  const description = scheduling ? "Marque quando a equipe começa. A OS passa a aparecer como agendada."
    : starting ? "Registre o dia em que a equipe começou de fato."
      : finishing ? "Registre o dia em que o serviço foi entregue. Isso libera para faturar as parcelas combinadas para depois da conclusão."
        : cancelling ? "A OS sai do quadro. Ela continua guardada e pode ser reativada."
          : target === "a_mobilizar" && order.status === "a_liberar" ? "Use quando o cliente não emite pedido de compra, ou quando a obra vai começar antes de ele chegar."
            : target === "encerrada" ? "Use quando não há mais nada a lançar nesta obra."
              : !forward && order.status === "concluida" ? "A OS volta para execução e as parcelas de depois da conclusão voltam a aguardar."
                : `A OS volta para "${ORDER_STATUS_LABEL[target]}".`;

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{moveLabel(order.status, target)}: {order.number}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          {scheduling && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Início previsto <span>*</span></Label>
                <CalendarPicker mode="single" name="plannedStart" className="mt-1 w-full" value={plannedStart} placeholder="Escolha o dia" fromYear={2024} toYear={2040}
                  onValueChange={(_, value) => setPlannedStart(String(value ?? ""))} /></div>
              <div><Label>Término previsto</Label>
                <CalendarPicker mode="single" name="plannedEnd" className="mt-1 w-full" value={plannedEnd} placeholder="Opcional" fromYear={2024} toYear={2040}
                  onValueChange={(_, value) => setPlannedEnd(String(value ?? ""))} /></div>
            </div>
          )}
          {(starting || finishing) && (
            <div><Label>{starting ? "Dia em que começou" : "Dia em que terminou"}</Label>
              <CalendarPicker mode="single" name="moveDate" className="mt-1 w-full sm:w-1/2" value={date} fromYear={2024} toYear={2040}
                onValueChange={(_, value) => setDate(String(value ?? "") || todayIso())} /></div>
          )}
          {finishing && (
            <div><Label htmlFor="conclusionNotes">Como foi a entrega (opcional)</Label>
              <Textarea id="conclusionNotes" className="mt-1" rows={3} maxLength={5000} value={conclusionNotes} onChange={(event) => setConclusionNotes(event.target.value)}
                placeholder="Ex.: entregue sem pendências; cliente assinou o termo de aceite" /></div>
          )}
          <div><Label htmlFor="moveNote">{cancelling ? "Motivo" : "Observação (opcional)"}{cancelling && <span> *</span>}</Label>
            <Textarea id="moveNote" className="mt-1" rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : moveLabel(order.status, target)}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
