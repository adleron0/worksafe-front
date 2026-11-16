import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { dateBr, errorMessage, money, todayIso } from "../../comercial/-shared/commercial";
import { PAYABLES_KEY, PAYABLES_SUMMARY_KEY } from "../../financeiro/-shared/payables";
import { STOCK_KEYS, useStockOptions } from "./stock";
import { paymentMethodOptions } from "../../financeiro/_receber/-components/options";

/** Pedido de compra: tipos (espelham a API), etapas e a passagem entre elas. */
export type PurchaseStatus = "solicitado" | "aprovado" | "comprado" | "recebido" | "recusado" | "cancelado";
/** `itemId` liga a linha a um item do estoque; `receivedQuantity` é quanto dela já entrou. */
export interface PurchaseItem { description: string; unit: string | null; quantity: number; unitPrice: number; total: number; itemId?: number | null; receivedQuantity?: number }
export interface PurchaseAttachment { id: string; kind: string; name: string; url: string }
export interface PurchaseBudget { group: string; budgetLabel: string | null; budget: number | null; committed: number; thisOrder: number; remaining: number | null }
export interface PurchaseEvent { id: number; type: string; from: PurchaseStatus | null; to: PurchaseStatus | null; note: string | null; at: string; user: string | null }

export interface PurchaseRow {
  id: number; number: string; title: string; group: string; status: PurchaseStatus; total: number;
  supplier: { id: number; name: string } | null; serviceOrder: { id: number; number: string } | null;
  neededBy: string | null; deliveryDate: string | null; requestedBy: string | null; late: boolean; createdAt: string;
}
export interface PurchaseList {
  rows: PurchaseRow[]; total: number; canApprove: boolean;
  summary: Partial<Record<PurchaseStatus, { count: number; total: number }>>;
}
export interface Purchase extends Omit<PurchaseRow, "supplier" | "serviceOrder"> {
  statusLabel: string; nextStatuses: PurchaseStatus[]; statusNote: string | null;
  supplier: { id: number; name: string; document: string | null; pixKey: string | null; phone: string | null; email: string | null } | null;
  serviceOrder: { id: number; number: string; title: string; customer: string } | null;
  items: PurchaseItem[]; justification: string | null; purchasedAt: string | null; receivedAt: string | null;
  paymentTerms: { count: number; firstDueDate: string; method: string | null } | null; invoiceNumber: string | null;
  attachments: PurchaseAttachment[]; approvedBy: string | null; approvedAt: string | null;
  payables: Array<{ id: number; value: number; dueDate: string; status: string; paidAt: string | null; installmentNumber: number | null; installmentTotal: number | null }>;
  canApprove: boolean; budget: PurchaseBudget | null; events: PurchaseEvent[];
}
export interface PurchaseOptions {
  suppliers: Array<{ id: number; name: string; document: string | null }>; groups: Array<{ id: string; name: string }>;
  serviceOrders: Array<{ id: number; name: string }>; canApprove: boolean;
}
export interface OrderPurchases {
  rows: Array<{ id: number; number: string; title: string; group: string; status: PurchaseStatus; total: number; supplier: string | null }>;
  committed: number; pending: number; byGroup: Array<{ group: string; name: string; committed: number }>;
}

export const PURCHASES_KEY = "purchaseOrders";
export const PURCHASE_KEY = "purchaseOrder";
export const PURCHASE_OPTIONS_KEY = "purchaseOrderOptions";
export const PURCHASES_ABILITY = "pedidos_de_compra";

/** Rotas do pedido recebem JSON (o helper padrão envia multipart). */
export const purchasesApi = {
  get: async <T,>(path = "", params?: Record<string, unknown>) => (await api.get<T>(`purchase-orders${path ? `/${path}` : ""}`, { params })).data,
  post: async <T,>(path: string, body?: unknown) => (await api.post<T>(`purchase-orders${path ? `/${path}` : ""}`, body ?? {})).data,
  put: async <T,>(path: string, body?: unknown) => (await api.put<T>(`purchase-orders/${path}`, body ?? {})).data,
  patch: async <T,>(path: string, body?: unknown) => (await api.patch<T>(`purchase-orders/${path}`, body ?? {})).data,
  delete: async <T,>(path: string) => (await api.delete<T>(`purchase-orders/${path}`)).data,
};

/** As etapas, na ordem da esteira. Recusado e cancelado ficam fora do quadro. */
export const PURCHASE_STAGES: Array<{ id: PurchaseStatus; name: string; color: string; hint: string }> = [
  { id: "solicitado", name: "Solicitado", color: "#f59e0b", hint: "Esperando aprovação" },
  { id: "aprovado", name: "Aprovado", color: "#6366f1", hint: "Pode comprar; já conta como comprometido na obra" },
  { id: "comprado", name: "Comprado", color: "#3b82f6", hint: "Fechado com o fornecedor; as contas a pagar foram geradas" },
  { id: "recebido", name: "Recebido", color: "#22c55e", hint: "Material ou serviço entregue" },
];
export const PURCHASE_STATUS_LABEL: Record<PurchaseStatus, string> = {
  solicitado: "Solicitado", aprovado: "Aprovado", comprado: "Comprado", recebido: "Recebido", recusado: "Recusado", cancelado: "Cancelado",
};
/** As passagens que existem (as mesmas da API). */
export const PURCHASE_MOVES: Record<PurchaseStatus, PurchaseStatus[]> = {
  solicitado: ["aprovado", "recusado", "cancelado"], aprovado: ["comprado", "solicitado", "cancelado"], comprado: ["recebido", "aprovado", "cancelado"],
  recebido: ["comprado"], recusado: ["solicitado"], cancelado: ["solicitado"],
};
const ORDER: PurchaseStatus[] = ["solicitado", "aprovado", "comprado", "recebido"];
const OFF: PurchaseStatus[] = ["recusado", "cancelado"];
export const isForward = (from: PurchaseStatus, to: PurchaseStatus) => !OFF.includes(to) && !OFF.includes(from) && ORDER.indexOf(to) > ORDER.indexOf(from);
/** Aprovar e recusar só para quem tem a permissão de aprovação. */
export const needsApproval = (from: PurchaseStatus, to: PurchaseStatus) => from === "solicitado" && (to === "aprovado" || to === "recusado");
export const allowedMoves = (status: PurchaseStatus, canApprove: boolean) => PURCHASE_MOVES[status].filter((to) => canApprove || !needsApproval(status, to));
export const nextStage = (status: PurchaseStatus, canApprove: boolean): PurchaseStatus | null =>
  allowedMoves(status, canApprove).find((to) => isForward(status, to)) ?? (OFF.includes(status) ? "solicitado" : null);
export function moveLabel(from: PurchaseStatus, to: PurchaseStatus): string {
  if (to === "cancelado") return "Cancelar o pedido";
  if (to === "recusado") return "Recusar";
  if (OFF.includes(from)) return "Solicitar de novo";
  if (!isForward(from, to)) return ({ solicitado: "Voltar para solicitado", aprovado: "Desfazer a compra", comprado: "Desfazer o recebimento" } as Record<string, string>)[to] ?? PURCHASE_STATUS_LABEL[to];
  return ({ aprovado: "Aprovar", comprado: "Registrar a compra", recebido: "Registrar o recebimento" } as Record<string, string>)[to] ?? PURCHASE_STATUS_LABEL[to];
}
export const GROUP_LABEL: Record<string, string> = { material: "Materiais", locacao: "Locações", terceiros: "Terceiros", outros: "Outros" };

export function PurchaseStageBadge({ status, late }: { status: PurchaseStatus; late?: boolean }) {
  const color = PURCHASE_STAGES.find((stage) => stage.id === status)?.color ?? (status === "recusado" ? "#ef4444" : "#6b7280");
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("inline-flex items-center gap-1.5 rounded bg-muted px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", status === "cancelado" && "line-through text-muted-foreground")}>
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /> {PURCHASE_STATUS_LABEL[status]}
      </span>
      {late && <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300 whitespace-nowrap">Atrasado</span>}
    </span>
  );
}

/** O orçado do grupo na obra, o que já foi comprometido e quanto sobra com este pedido. */
export function BudgetBox({ budget, className }: { budget: PurchaseBudget; className?: string }) {
  const over = budget.remaining !== null && budget.remaining < 0;
  return (
    <div className={cn("rounded border p-3 text-sm grid gap-1", over && "border-red-300 dark:border-red-800", className)}>
      <p className="font-medium">Orçamento da obra · {budget.group}</p>
      {budget.budget === null ? (
        <p className="text-muted-foreground">A proposta não previu custo neste grupo. Já comprometido em outros pedidos: {money(budget.committed)}.</p>
      ) : (
        <>
          <p className="flex justify-between gap-3"><span className="text-muted-foreground">Orçado na proposta</span><span className="tabular-nums">{money(budget.budget)}</span></p>
          <p className="flex justify-between gap-3"><span className="text-muted-foreground">Já comprometido em outros pedidos</span><span className="tabular-nums">{money(budget.committed)}</span></p>
          <p className="flex justify-between gap-3"><span className="text-muted-foreground">Este pedido</span><span className="tabular-nums">{money(budget.thisOrder)}</span></p>
          <p className={cn("flex justify-between gap-3 font-semibold border-t pt-1", over ? "text-red-600 dark:text-red-400" : "")}>
            <span>{over ? "Passa do orçado em" : "Sobra depois deste pedido"}</span><span className="tabular-nums">{money(Math.abs(budget.remaining ?? 0))}</span>
          </p>
        </>
      )}
    </div>
  );
}

type Movable = Pick<Purchase, "id" | "number" | "status"> & { total: number; supplier: { id: number; name: string } | null; budget?: PurchaseBudget | null; items?: PurchaseItem[]; serviceOrder?: { id: number } | null };

/**
 * Passagem de etapa: pede só o que aquela passagem exige (motivo para recusar
 * e cancelar; parcelas e vencimento para comprar; data e nota para receber).
 */
export function PurchaseMoveDialog({ purchase, target, onClose, onDone }: { purchase: Movable; target: PurchaseStatus; onClose: () => void; onDone?: (purchase: Purchase) => void }) {
  const queryClient = useQueryClient();
  const from = purchase.status;
  const approving = from === "solicitado" && target === "aprovado";
  const buying = from === "aprovado" && target === "comprado";
  const receiving = target === "recebido";
  const needsReason = target === "recusado" || target === "cancelado";
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayIso());
  const [installments, setInstallments] = useState("1");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("boleto");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [locationId, setLocationId] = useState("");
  const [error, setError] = useState("");
  // ao aprovar pelo quadro, busca o pedido para mostrar o orçamento da obra
  const { data: full } = useQuery({
    queryKey: [PURCHASE_KEY, String(purchase.id)],
    queryFn: () => purchasesApi.get<Purchase>(String(purchase.id)),
    enabled: (approving && purchase.budget === undefined) || (receiving && purchase.items === undefined),
  });
  const budget = purchase.budget ?? full?.budget ?? null;
  // receber: o que é do estoque e ainda falta entra no local escolhido (pedido de obra entra direto na obra)
  const items = purchase.items ?? full?.items ?? [];
  const toObra = (purchase.serviceOrder ?? full?.serviceOrder ?? null) !== null;
  const stockPending = receiving && isForward(from, target) && items.some((item) => item.itemId && (item.receivedQuantity ?? 0) < item.quantity);
  const { can: canDo } = useVerify();
  const { data: stockOptions, isError: stockOptionsError } = useStockOptions(stockPending && !toObra);
  // sem ver o estoque não vem a lista de locais: a API usa o local padrão
  const noStockOptions = stockOptionsError || !canDo("list_itens_estoque");
  const locations = stockOptions?.locations ?? [];
  const count = Number(installments);

  const { mutate, isPending } = useMutation({
    mutationFn: () => purchasesApi.patch<Purchase>(`${purchase.id}/status`, {
      status: target, note,
      ...(buying ? { installments: count, firstDueDate, paymentMethod, deliveryDate: deliveryDate || null, date } : {}),
      ...(receiving ? { date, invoiceNumber, ...(stockPending && !toObra && (locationId || locations[0]) ? { locationId: Number(locationId || locations[0].id) } : {}) } : {}),
    }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [PURCHASES_KEY] });
      // receber ou desfazer o recebimento mexe no estoque
      for (const key of [STOCK_KEYS.balances, STOCK_KEYS.items, STOCK_KEYS.item, STOCK_KEYS.movements, STOCK_KEYS.overview, STOCK_KEYS.itemOptions, STOCK_KEYS.order]) queryClient.invalidateQueries({ queryKey: [key] });
      queryClient.setQueryData([PURCHASE_KEY, String(result.id)], result);
      // comprar e desfazer mexem nas contas a pagar
      for (const key of [PAYABLES_KEY, PAYABLES_SUMMARY_KEY]) queryClient.invalidateQueries({ queryKey: [key] });
      toast({ title: `${result.number}: ${result.statusLabel.toLowerCase()}`, variant: "success" });
      onDone?.(result); onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (needsReason && !note.trim()) return setError(target === "recusado" ? "Informe o motivo da recusa." : "Informe o motivo do cancelamento.");
    if (buying && !purchase.supplier) return setError("Escolha o fornecedor no pedido antes de comprar.");
    if (buying && (!Number.isInteger(count) || count < 1 || count > 60)) return setError("Informe de 1 a 60 parcelas.");
    if (buying && !firstDueDate) return setError("Informe o vencimento da primeira parcela.");
    setError(""); mutate();
  };
  const description = approving ? "Aprovado, o pedido pode ser comprado e o valor passa a contar como comprometido."
    : target === "recusado" ? "O pedido sai do quadro. Quem pediu vê o motivo e pode ajustar e solicitar de novo."
      : target === "cancelado" ? (from === "comprado" ? "As contas a pagar geradas por este pedido são excluídas. Se alguma já foi paga, estorne a baixa antes." : "O pedido sai do quadro e pode ser solicitado de novo depois.")
        : buying ? `Compra fechada com ${purchase.supplier?.name ?? "o fornecedor"}. As parcelas viram contas a pagar no Financeiro.`
          : receiving && isForward(from, target) ? "Registre o dia em que o material ou serviço chegou."
            : from === "comprado" && target === "aprovado" ? "As contas a pagar geradas por este pedido são excluídas. Se alguma já foi paga, estorne a baixa antes."
              : target === "solicitado" && from === "aprovado" ? "O pedido volta a esperar aprovação e pode ser alterado."
                : `O pedido volta para "${PURCHASE_STATUS_LABEL[target]}".`;

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{moveLabel(from, target)}: {purchase.number}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          {approving && <p className="text-sm">Valor do pedido: <span className="font-semibold tabular-nums">{money(purchase.total)}</span></p>}
          {approving && budget && <BudgetBox budget={budget} />}
          {buying && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label htmlFor="installments">Parcelas <span>*</span></Label>
                  <Input id="installments" name="installments" type="number" min={1} max={60} value={installments} onValueChange={(_, value) => setInstallments(String(value))} className="mt-1" /></div>
                <div><Label>Primeiro vencimento <span>*</span></Label>
                  <CalendarPicker mode="single" name="firstDueDate" className="mt-1 w-full" value={firstDueDate} placeholder="Escolha o dia" fromYear={2024} toYear={2040}
                    onValueChange={(_, value) => setFirstDueDate(String(value ?? ""))} /></div>
              </div>
              {count >= 1 && count <= 60 && (
                <p className="text-xs text-muted-foreground -mt-2">{count === 1 ? `Uma conta de ${money(purchase.total)}.` : `${count} parcelas de cerca de ${money(purchase.total / count)}, uma por mês.`}</p>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Forma de pagamento</Label>
                  <Select name="paymentMethod" options={paymentMethodOptions} state={paymentMethod} onChange={(_, value) => setPaymentMethod(String(value))} placeholder="Selecione" modal /></div>
                <div><Label>Prazo de entrega</Label>
                  <CalendarPicker mode="single" name="deliveryDate" className="mt-1 w-full" value={deliveryDate} placeholder="Opcional" fromYear={2024} toYear={2040}
                    onValueChange={(_, value) => setDeliveryDate(String(value ?? ""))} /></div>
              </div>
            </>
          )}
          {receiving && isForward(from, target) && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Dia em que chegou</Label>
                <CalendarPicker mode="single" name="moveDate" className="mt-1 w-full" value={date} fromYear={2024} toYear={2040}
                  onValueChange={(_, value) => setDate(String(value ?? "") || todayIso())} /></div>
              <div><Label htmlFor="invoiceNumber">Nº da nota do fornecedor</Label>
                <Input id="invoiceNumber" name="invoiceNumber" value={invoiceNumber} maxLength={60} onValueChange={(_, value) => setInvoiceNumber(String(value))} className="mt-1" placeholder="Opcional" /></div>
            </div>
          )}
          {stockPending && (toObra ? (
            <p className="text-sm text-muted-foreground -mt-2">Os itens do estoque deste pedido entram direto na obra.</p>
          ) : noStockOptions ? (
            <p className="text-sm text-muted-foreground -mt-2">Os itens do estoque entram no local de estoque padrão.</p>
          ) : (
            <div>
              <Label>Local de estoque onde entra</Label>
              <Select name="locationId" options={locations} state={locationId || (locations[0] ? String(locations[0].id) : "")} modal onChange={(_, value) => setLocationId(String(value ?? ""))} placeholder="Escolha o local" />
              <p className="text-xs text-muted-foreground mt-1">Itens por lote ou por peça pedem o "Receber itens", na ficha do pedido.</p>
            </div>
          ))}
          <div><Label htmlFor="moveNote">{needsReason ? "Motivo" : "Observação (opcional)"}{needsReason && <span> *</span>}</Label>
            <Textarea id="moveNote" className="mt-1" rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : moveLabel(from, target)}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Compras de uma obra, na tela da OS: o que já está comprometido e os pedidos. */
export function OrderPurchasesPanel({ orderId, canRequest }: { orderId: number; canRequest: boolean }) {
  const { can } = useVerify();
  const seesPurchases = can(`view_${PURCHASES_ABILITY}`);
  const { data } = useQuery({
    queryKey: [PURCHASES_KEY, "serviceOrder", orderId],
    queryFn: () => purchasesApi.get<OrderPurchases>(`service-order/${orderId}`),
  });
  if (!data || (!data.rows.length && !(seesPurchases && canRequest))) return null;
  return (
    <section className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Compras da obra</h2>
        {seesPurchases && canRequest && can(`create_${PURCHASES_ABILITY}`) && (
          <Button asChild size="sm" variant="outline">
            <Link to="/suprimentos/pedidos-de-compra/$purchaseId" params={{ purchaseId: "novo" }} search={{ os: orderId }}><Icon name="plus" className="w-3 h-3 mr-1" /> Pedir compra</Link>
          </Button>
        )}
      </div>
      {data.rows.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nenhum pedido de compra para esta obra.</p> : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Comprometido: <span className="font-semibold text-foreground tabular-nums">{money(data.committed)}</span>
            {data.byGroup.length > 0 && ` (${data.byGroup.map((g) => `${g.name} ${money(g.committed)}`).join(" · ")})`}
            {data.pending > 0 && <> · esperando aprovação: <span className="tabular-nums">{money(data.pending)}</span></>}
          </p>
          <ul className="mt-3 divide-y text-sm">
            {data.rows.map((row) => (
              <li key={row.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                {seesPurchases
                  ? <Link to="/suprimentos/pedidos-de-compra/$purchaseId" params={{ purchaseId: String(row.id) }} className="font-medium tabular-nums hover:underline">{row.number}</Link>
                  : <span className="font-medium tabular-nums">{row.number}</span>}
                <span className="flex-1 min-w-0 truncate text-muted-foreground">{row.title}{row.supplier ? ` · ${row.supplier}` : ""}</span>
                <PurchaseStageBadge status={row.status} />
                <span className="tabular-nums">{money(row.total)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export const purchaseWhen = (row: Pick<PurchaseRow, "neededBy" | "deliveryDate" | "status">) =>
  row.status === "comprado" && row.deliveryDate ? `Entrega prevista ${dateBr(row.deliveryDate)}` : row.neededBy ? `Precisa até ${dateBr(row.neededBy)}` : "Sem prazo";
