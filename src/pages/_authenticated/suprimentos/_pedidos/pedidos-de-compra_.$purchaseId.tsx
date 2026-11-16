import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { NumField, Tip, dateBr, errorMessage, money } from "../../comercial/-shared/commercial";
import { SUPPLIER_OPTIONS_KEY, formatDocument } from "../../financeiro/-shared/payables";
import { paymentMethodLabel } from "../../financeiro/_receber/-components/options";
import {
  BudgetBox, PURCHASES_ABILITY, PURCHASES_KEY, PURCHASE_KEY, PURCHASE_OPTIONS_KEY, PURCHASE_STAGES, PURCHASE_STATUS_LABEL, Purchase, PurchaseItem, PurchaseMoveDialog,
  PurchaseOptions, PurchaseStageBadge, PurchaseStatus, allowedMoves, isForward, moveLabel, nextStage, purchasesApi,
} from "../-shared/purchases";
import { REORDER_STORAGE_KEY, ReorderDraft, qty, readReorderDraft, useItemOptions } from "../-shared/stock";
import { PurchaseReceiveDialog, pendingOf } from "../-shared/stock-receive";
import { SERVICE_STORAGE_KEY, ServiceDraft, readServiceDraft } from "../-shared/equipment";

export const Route = createFileRoute("/_authenticated/suprimentos/_pedidos/pedidos-de-compra_/$purchaseId")({
  component: PurchasePage,
  // os: pedido para uma obra; reposicao: linhas vindas de Estoque → Reposição (guardadas no sessionStorage)
  // servico: pedido da calibração/manutenção de uma peça (Equipamentos → Calibração e manutenção)
  validateSearch: (search: Record<string, unknown>): { os?: number; reposicao?: "1"; servico?: "1" } => ({
    ...(search.servico === "1" || search.servico === 1 ? { servico: "1" as const } : {}),
    ...(Number(search.os) > 0 ? { os: Number(search.os) } : {}),
    ...(search.reposicao === "1" || search.reposicao === 1 ? { reposicao: "1" as const } : {}),
  }),
});

interface Draft { title: string; group: string; supplierId: string; serviceOrderId: string; neededBy: string; justification: string; items: PurchaseItem[] }
const emptyItem = (): PurchaseItem => ({ description: "", unit: "", quantity: 1, unitPrice: 0, total: 0 });
const draftOf = (purchase?: Purchase, os?: number, reorder?: ReorderDraft | null): Draft => ({
  title: purchase?.title ?? (reorder ? "Reposição de estoque" : ""), group: purchase?.group ?? "material",
  supplierId: purchase?.supplier ? String(purchase.supplier.id) : reorder?.supplierId ? String(reorder.supplierId) : "",
  serviceOrderId: purchase?.serviceOrder ? String(purchase.serviceOrder.id) : os ? String(os) : "", neededBy: purchase?.neededBy ?? "",
  justification: purchase?.justification ?? (reorder ? "Itens abaixo do estoque mínimo." : ""),
  items: purchase?.items.length ? purchase.items.map((item) => ({ ...item, unit: item.unit ?? "" }))
    : reorder ? reorder.items.map((item) => ({ ...item, total: item.quantity * item.unitPrice })) : [emptyItem()],
});
const serviceDraftOf = (service: ServiceDraft, os?: number): Draft => ({
  ...draftOf(undefined, os), title: service.title, group: service.group || "outros", supplierId: service.supplierId ? String(service.supplierId) : "",
  justification: "Serviço de calibração/manutenção de equipamento do estoque.", items: service.items.map((item) => ({ ...item, total: item.quantity * item.unitPrice })),
});
const totalOf = (items: PurchaseItem[]) => Math.round(items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0) * 100) / 100;
const KINDS = [{ id: "cotacao", name: "Cotação" }, { id: "nota", name: "Nota do fornecedor" }, { id: "outro", name: "Outro" }];
const EVENT_LABEL: Record<string, string> = { criado: "Solicitado", avancou: "Avançou", voltou: "Voltou", recusado: "Recusado", cancelado: "Cancelado" };

/** Pedido de compra: o que se pede, de quem, para qual obra; e por onde ele já passou. */
function PurchasePage() {
  const { purchaseId } = Route.useParams();
  const { os, reposicao, servico } = Route.useSearch();
  const isNew = purchaseId === "novo";
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // o pedido do serviço de calibração/manutenção: título, grupo, fornecedor e a linha do serviço
  const [service] = useState<ServiceDraft | null>(() => (isNew && servico ? readServiceDraft() : null));
  const [draft, setDraft] = useState<Draft | null>(isNew ? (service ? serviceDraftOf(service, os) : draftOf(undefined, os, reposicao ? readReorderDraft() : null)) : null);
  const [moving, setMoving] = useState<PurchaseStatus | null>(null);
  const [receiving, setReceiving] = useState(false);
  const [newSupplier, setNewSupplier] = useState(false);
  const [kind, setKind] = useState("cotacao");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: purchase, isLoading, error: loadError } = useQuery({
    queryKey: [PURCHASE_KEY, purchaseId],
    queryFn: () => purchasesApi.get<Purchase>(purchaseId),
    enabled: !isNew,
  });
  const { data: options } = useQuery({ queryKey: [PURCHASE_OPTIONS_KEY], queryFn: () => purchasesApi.get<PurchaseOptions>("options") });
  useEffect(() => { if (purchase) setDraft(draftOf(purchase)); }, [purchase]);
  // as linhas da reposição já foram lidas: não voltam num próximo "novo pedido"
  useEffect(() => { if (reposicao) { try { sessionStorage.removeItem(REORDER_STORAGE_KEY); } catch { /* sem armazenamento */ } } }, [reposicao]);
  useEffect(() => { if (servico) { try { sessionStorage.removeItem(SERVICE_STORAGE_KEY); } catch { /* sem armazenamento */ } } }, [servico]);
  const { data: stockItems, isError: noStockItems } = useItemOptions();

  const apply = (result: Purchase) => {
    queryClient.setQueryData([PURCHASE_KEY, String(result.id)], result);
    queryClient.invalidateQueries({ queryKey: [PURCHASES_KEY] });
  };
  const status: PurchaseStatus = purchase?.status ?? "solicitado";
  const canUpdate = can(`update_${PURCHASES_ABILITY}`);
  const canApprove = can(`approve_${PURCHASES_ABILITY}`);
  // itens e valores só mudam antes da aprovação; o fornecedor ainda pode mudar com o pedido aprovado
  const editable = isNew ? can(`create_${PURCHASES_ABILITY}`) : canUpdate && (status === "solicitado" || status === "recusado");
  const supplierEditable = editable || (canUpdate && status === "aprovado");

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (value: Draft) => {
      const body = {
        title: value.title.trim(), group: value.group, supplierId: value.supplierId || null, serviceOrderId: value.serviceOrderId || null,
        neededBy: value.neededBy || null, justification: value.justification.trim(),
        items: value.items.filter((item) => item.description.trim()).map((item) => ({ description: item.description.trim(), unit: item.unit || null, quantity: item.quantity, unitPrice: item.unitPrice, itemId: item.itemId ?? null })),
      };
      if (isNew) return purchasesApi.post<Purchase>("", service ? { ...body, stockServiceEventId: service.stockServiceEventId } : body);
      return purchasesApi.put<Purchase>(purchaseId, editable ? body : { supplierId: body.supplierId, neededBy: body.neededBy });
    },
    onSuccess: (result) => {
      apply(result);
      toast({ title: isNew ? `${result.number} solicitado` : "Pedido salvo", variant: "success" });
      if (isNew) navigate({ to: "/suprimentos/pedidos-de-compra/$purchaseId", params: { purchaseId: String(result.id) }, replace: true });
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const { mutate: upload, isPending: uploading } = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file); form.append("kind", kind);
      return (await api.post<Purchase>(`purchase-orders/${purchaseId}/attachments`, form)).data;
    },
    onSuccess: (result) => { apply(result); toast({ title: "Anexo enviado", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível enviar o anexo", description: errorMessage(err), variant: "destructive" }),
  });
  const { mutate: detach } = useMutation({
    mutationFn: (attachmentId: string) => purchasesApi.delete<Purchase>(`${purchaseId}/attachments/${attachmentId}`),
    onSuccess: apply,
    onError: (err) => toast({ title: "Não foi possível remover o anexo", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`view_${PURCHASES_ABILITY}`)) return null;
  if (loadError) return <div className="p-4"><p className="text-destructive font-medium">Erro: {errorMessage(loadError)}</p><Link to="/suprimentos/pedidos-de-compra" className="underline text-sm">Voltar para os pedidos de compra</Link></div>;
  if ((!isNew && (isLoading || !purchase)) || !draft) return <div className="grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-64 w-full" /></div>;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => (current ? { ...current, [key]: value } : current));
  const setItem = (index: number, patch: Partial<PurchaseItem>) => set("items", draft.items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const total = totalOf(draft.items);
  const dirty = isNew || JSON.stringify(draft) !== JSON.stringify(draftOf(purchase));
  const next = purchase ? nextStage(status, canApprove) : null;
  const others = purchase ? allowedMoves(status, canApprove).filter((target) => target !== next) : [];
  const stageIndex = PURCHASE_STAGES.findIndex((stage) => stage.id === status);
  const stockOptions = (stockItems ?? []).map(({ id, name }) => ({ id, name }));
  const hasStockLines = !!purchase?.items.some((item) => item.itemId);
  const canReceive = !!purchase && canUpdate && status === "comprado" && purchase.items.some((item) => item.itemId && pendingOf(item) > 0);
  const pickStock = (index: number, value: string) => {
    const option = (stockItems ?? []).find((item) => String(item.id) === value);
    if (!option) return setItem(index, { itemId: null });
    const current = draft.items[index];
    setItem(index, { itemId: option.id, description: current.description.trim() && current.itemId ? option.label : current.description.trim() || option.label, unit: option.unit, ...(current.unitPrice ? {} : { unitPrice: option.lastCost ?? 0 }) });
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (editable) {
      if (draft.title.trim().length < 2) return setError("Informe o que será comprado.");
      if (!draft.items.some((item) => item.description.trim())) return setError("Informe pelo menos um item.");
      if (total <= 0) return setError("Informe a quantidade e o valor dos itens.");
    }
    setError(""); save(draft);
  };

  return (
    <>
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/suprimentos/pedidos-de-compra" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Pedidos de compra</Link>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h1 className="text-xl font-bold tabular-nums">{purchase?.number ?? "Novo pedido de compra"}</h1>
            {purchase && <PurchaseStageBadge status={status} late={purchase.late} />}
          </div>
          {purchase && <p className="text-sm text-muted-foreground truncate">{purchase.title}{purchase.requestedBy ? ` · pedido por ${purchase.requestedBy}` : ""}</p>}
        </div>
        {purchase && canUpdate && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canReceive && <Button type="button" variant={next === "recebido" ? "default" : "outline"} disabled={dirty} onClick={() => setReceiving(true)}><Icon name="package-check" className="w-4 h-4 mr-1" /> Receber itens</Button>}
            {next && <Button type="button" variant={canReceive && next === "recebido" ? "outline" : "default"} disabled={dirty} onClick={() => setMoving(next)}><Icon name="arrow-right" className="w-4 h-4 mr-1" /> {moveLabel(status, next)}</Button>}
            {others.length > 0 && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild><Button type="button" variant="outline" className="gap-1">Mais ações <Icon name="chevron-down" className="w-4 h-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {others.map((target) => (
                    <DropdownMenuItem key={target} className="gap-2" onSelect={() => setMoving(target)}>
                      <Icon name={target === "cancelado" || target === "recusado" ? "ban" : isForward(status, target) ? "arrow-right" : "undo-2"} className="w-3 h-3" /> {moveLabel(status, target)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>

      {purchase && status !== "recusado" && status !== "cancelado" && (
        <ol className="my-4 flex flex-wrap items-center gap-x-1 gap-y-2 text-xs" aria-label="Etapas do pedido de compra">
          {PURCHASE_STAGES.map((stage, index) => (
            <li key={stage.id} className="flex items-center gap-1">
              <Tip text={stage.hint}>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1", index === stageIndex ? "border-primary bg-primary/10 font-semibold text-foreground" : index < stageIndex ? "text-foreground" : "text-muted-foreground")}>
                  {index < stageIndex ? <Icon name="check" className="w-3 h-3 text-primary" /> : <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />} {stage.name}
                </span>
              </Tip>
              {index < PURCHASE_STAGES.length - 1 && <Icon name="chevron-right" className="w-3 h-3 text-muted-foreground" />}
            </li>
          ))}
        </ol>
      )}
      {purchase && (status === "recusado" || status === "cancelado") && (
        <p className="my-4 rounded border border-red-300 dark:border-red-800 p-3 text-sm">
          <span className="font-semibold">{PURCHASE_STATUS_LABEL[status]}.</span> {purchase.statusNote ?? ""} {canUpdate && "Ajuste o pedido e use \"Solicitar de novo\"."}
        </p>
      )}
      {purchase && status === "solicitado" && !canApprove && <p className="mb-4 text-sm text-muted-foreground">Esperando aprovação de quem tem a permissão de aprovar compras.</p>}
      {isNew && <div className="my-4" />}

      <div className="grid xl:grid-cols-3 gap-4 items-start">
        <form onSubmit={submit} className="xl:col-span-2 grid gap-4">
          <section className="rounded-lg border p-4 grid gap-4">
            <div>
              <Label htmlFor="title">O que será comprado <span>*</span></Label>
              <Input id="title" name="title" value={draft.title} maxLength={200} disabled={!editable} onValueChange={(_, value) => set("title", String(value))} className="mt-1" placeholder="Ex.: Cabo de aço e grampos para a linha de vida" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Grupo do gasto <span>*</span></Label>
                <Select name="group" options={options?.groups ?? []} state={draft.group} disabled={!editable} onChange={(_, value) => set("group", String(value ?? "material"))} placeholder="Selecione" />
              </div>
              <div>
                <Label>Precisa até</Label>
                <CalendarPicker mode="single" name="neededBy" className="mt-1 w-full" value={draft.neededBy} placeholder="Sem prazo" fromYear={2024} toYear={2040} disabled={!supplierEditable}
                  onValueChange={(_, value) => set("neededBy", String(value ?? ""))} />
              </div>
            </div>
            <div>
              <Label>Ordem de serviço</Label>
              <Select name="serviceOrderId" options={[...(options?.serviceOrders ?? []), ...(purchase?.serviceOrder && !options?.serviceOrders.some((o) => o.id === purchase.serviceOrder!.id) ? [{ id: purchase.serviceOrder.id, name: `${purchase.serviceOrder.number} — ${purchase.serviceOrder.customer}` }] : [])]}
                state={draft.serviceOrderId} disabled={!editable} clearable onChange={(_, value) => set("serviceOrderId", String(value ?? ""))} placeholder="Não é para uma obra (gasto da empresa)" />
              <p className="text-xs text-muted-foreground mt-1">Quando é para uma obra, o valor aprovado entra no comprometido daquela OS.</p>
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label>Fornecedor</Label>
                {supplierEditable && can(`create_${PURCHASES_ABILITY}`) && <button type="button" className="text-xs underline text-primary" onClick={() => setNewSupplier(true)}>Cadastrar fornecedor</button>}
              </div>
              <Select name="supplierId" options={(options?.suppliers ?? []).map(({ id, name }) => ({ id, name }))} state={draft.supplierId} disabled={!supplierEditable} clearable onChange={(_, value) => set("supplierId", String(value ?? ""))} placeholder="A definir (obrigatório para comprar)" />
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="font-semibold">Itens</h2>
            {hasStockLines && status === "comprado" && <p className="text-xs text-muted-foreground">As linhas ligadas a um item do estoque entram nele pelo "Receber itens".</p>}
            <div className="mt-3 grid gap-3">
              {draft.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 lg:col-span-5">
                    {index === 0 && <Label className="text-xs">Descrição</Label>}
                    <Input name={`item-${index}`} value={item.description} maxLength={255} disabled={!editable} onValueChange={(_, value) => setItem(index, { description: String(value) })} placeholder="Descrição do item" />
                  </div>
                  <div className="col-span-3 lg:col-span-1">
                    {index === 0 && <Label className="text-xs">Un.</Label>}
                    <Input name={`unit-${index}`} value={item.unit ?? ""} maxLength={20} disabled={!editable} onValueChange={(_, value) => setItem(index, { unit: String(value) })} placeholder="un" />
                  </div>
                  <div className="col-span-3 lg:col-span-2">
                    {index === 0 && <Label className="text-xs">Qtd.</Label>}
                    <NumField value={item.quantity} digits={3} disabled={!editable} ariaLabel={`Quantidade do item ${index + 1}`} onChange={(value) => setItem(index, { quantity: value })} />
                  </div>
                  <div className="col-span-5 lg:col-span-2">
                    {index === 0 && <Label className="text-xs">Valor unitário</Label>}
                    <NumField value={item.unitPrice} kind="money" disabled={!editable} ariaLabel={`Valor unitário do item ${index + 1}`} onChange={(value) => setItem(index, { unitPrice: value })} />
                  </div>
                  <div className="col-span-10 lg:col-span-1 text-right text-sm tabular-nums pb-2">{money(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</div>
                  <div className="col-span-2 lg:col-span-1 flex justify-end">
                    {editable && draft.items.length > 1 && (
                      <Tip text="Remover o item"><Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label={`Remover o item ${index + 1}`} onClick={() => set("items", draft.items.filter((_, i) => i !== index))}><Icon name="trash-2" className="w-4 h-4" /></Button></Tip>
                    )}
                  </div>
                  {(!noStockItems || item.itemId) && (editable || item.itemId) && (
                    <div className="col-span-12 flex flex-wrap items-center gap-x-3 gap-y-1 -mt-1">
                      <div className="w-full sm:w-80">
                        <Select name={`stock-${index}`} options={stockOptions} state={item.itemId ? String(item.itemId) : ""} clearable disabled={!editable} modal={false}
                          onChange={(_, value) => pickStock(index, String(value ?? ""))} placeholder="Item do estoque (opcional)" />
                      </div>
                      {item.itemId && purchase && (status === "comprado" || status === "recebido") && (
                        <span className={cn("text-xs", pendingOf(item) > 0 ? "text-muted-foreground" : "text-green-700 dark:text-green-400")}>
                          recebido {qty(item.receivedQuantity ?? 0)} de {qty(item.quantity)} {item.unit ?? ""}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              {editable ? <Button type="button" variant="outline" size="sm" onClick={() => set("items", [...draft.items, emptyItem()])}><Icon name="plus" className="w-3 h-3 mr-1" /> Adicionar item</Button> : <span />}
              <p className="text-sm">Total: <span className="text-lg font-bold tabular-nums">{money(total)}</span></p>
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <Label htmlFor="justification">Para que é (justificativa)</Label>
            <Textarea id="justification" className="mt-1" rows={3} maxLength={2000} disabled={!editable} value={draft.justification} onChange={(event) => set("justification", event.target.value)}
              placeholder="Ajuda quem vai aprovar a decidir" />
          </section>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {(editable || supplierEditable) && (
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving || !dirty}>{saving ? "Salvando..." : isNew ? "Solicitar compra" : "Salvar"}</Button>
              {isNew && <Button type="button" variant="outline" onClick={() => navigate({ to: "/suprimentos/pedidos-de-compra" })}>Cancelar</Button>}
              {!isNew && dirty && <Button type="button" variant="outline" onClick={() => setDraft(draftOf(purchase))}>Desfazer alterações</Button>}
            </div>
          )}
        </form>

        {purchase && (
          <div className="grid gap-4">
            {purchase.budget && <BudgetBox budget={purchase.budget} className="rounded-lg p-4" />}

            {(purchase.approvedBy || purchase.purchasedAt || purchase.receivedAt) && (
              <section className="rounded-lg border p-4 text-sm grid gap-1">
                <h2 className="font-semibold">Andamento</h2>
                {purchase.approvedBy && <p><span className="text-muted-foreground">Aprovado por</span> {purchase.approvedBy}{purchase.approvedAt ? ` em ${new Date(purchase.approvedAt).toLocaleDateString("pt-BR")}` : ""}</p>}
                {purchase.purchasedAt && <p><span className="text-muted-foreground">Comprado em</span> {dateBr(purchase.purchasedAt)}{purchase.paymentTerms ? ` · ${purchase.paymentTerms.count}x${purchase.paymentTerms.method ? ` · ${paymentMethodLabel(purchase.paymentTerms.method)}` : ""}` : ""}</p>}
                {purchase.deliveryDate && <p><span className="text-muted-foreground">Entrega prevista</span> {dateBr(purchase.deliveryDate)}</p>}
                {purchase.receivedAt && <p><span className="text-muted-foreground">Recebido em</span> {dateBr(purchase.receivedAt)}{purchase.invoiceNumber ? ` · nota ${purchase.invoiceNumber}` : ""}</p>}
                {purchase.supplier?.pixKey && <p><span className="text-muted-foreground">Pix do fornecedor</span> <span className="select-all">{purchase.supplier.pixKey}</span></p>}
              </section>
            )}

            {purchase.payables.length > 0 && (
              <section className="rounded-lg border p-4 text-sm">
                <h2 className="font-semibold">Contas a pagar geradas</h2>
                <ul className="mt-2 divide-y">
                  {purchase.payables.map((payable) => (
                    <li key={payable.id} className="py-1.5 flex items-center justify-between gap-3">
                      <span>{payable.installmentNumber ? `${payable.installmentNumber}/${payable.installmentTotal} · ` : ""}vence {dateBr(payable.dueDate)}</span>
                      <span className="flex items-center gap-2">
                        <span className={cn("rounded px-1.5 py-0.5 text-xs", payable.status === "paga" ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300" : "bg-muted")}>{payable.status === "paga" ? "Paga" : "Aberta"}</span>
                        <span className="tabular-nums">{money(payable.value)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">A baixa é feita em Financeiro → Contas a Pagar.</p>
              </section>
            )}

            <section className="rounded-lg border p-4 text-sm">
              <h2 className="font-semibold">Anexos</h2>
              {purchase.attachments.length === 0 && <p className="mt-1 text-muted-foreground">Nenhum anexo. Guarde aqui as cotações e, depois, a nota do fornecedor.</p>}
              <ul className="mt-2 grid gap-1">
                {purchase.attachments.map((attachment) => (
                  <li key={attachment.id} className="flex items-center justify-between gap-2">
                    <a href={attachment.url} target="_blank" rel="noreferrer" className="min-w-0 truncate underline text-primary">{KINDS.find((k) => k.id === attachment.kind)?.name ?? "Anexo"}: {attachment.name}</a>
                    {canUpdate && (
                      <ConfirmDialog title="Remover este anexo?" description={attachment.name} onConfirm={() => detach(attachment.id)} titleBttn="Remover" iconBttn="trash-2" />
                    )}
                  </li>
                ))}
              </ul>
              {canUpdate && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="w-44"><Select name="attachmentKind" options={KINDS} state={kind} onChange={(_, value) => setKind(String(value ?? "outro"))} placeholder="Tipo" /></div>
                  <input ref={fileRef} type="file" accept="application/pdf,application/xml,text/xml,image/*" className="hidden"
                    onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); event.target.value = ""; }} />
                  <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? "Enviando..." : "Anexar arquivo"}</Button>
                </div>
              )}
            </section>

            <section className="rounded-lg border p-4 text-sm">
              <h2 className="font-semibold">Histórico</h2>
              <ul className="mt-2 grid gap-2">
                {purchase.events.map((event) => (
                  <li key={event.id}>
                    <p>{EVENT_LABEL[event.type] ?? event.type}{event.to && event.type !== "criado" ? `: ${PURCHASE_STATUS_LABEL[event.to]}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{new Date(event.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}{event.user ? ` · ${event.user}` : ""}{event.note ? ` · ${event.note}` : ""}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>

      {purchase && moving && <PurchaseMoveDialog purchase={purchase} target={moving} onClose={() => setMoving(null)} />}
      {purchase && receiving && <PurchaseReceiveDialog purchase={purchase} onClose={() => setReceiving(false)} />}
      {newSupplier && (
        <SupplierDialog onClose={() => setNewSupplier(false)} onCreated={(supplier) => {
          queryClient.setQueryData<PurchaseOptions>([PURCHASE_OPTIONS_KEY], (current) => (current ? { ...current, suppliers: [...current.suppliers, supplier].sort((a, b) => a.name.localeCompare(b.name)) } : current));
          queryClient.invalidateQueries({ queryKey: [SUPPLIER_OPTIONS_KEY] });
          set("supplierId", String(supplier.id));
        }} />
      )}
    </>
  );
}

/** Cadastro rápido de fornecedor (o cadastro completo fica em Financeiro → Fornecedores). */
function SupplierDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (supplier: { id: number; name: string; document: string | null }) => void }) {
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => purchasesApi.post<{ id: number; name: string; document: string | null }>("suppliers", { name: name.trim(), document: document.replace(/\D/g, ""), pixKey: pixKey.trim() }),
    onSuccess: (supplier) => { toast({ title: `${supplier.name} cadastrado`, variant: "success" }); onCreated(supplier); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); event.stopPropagation();
    if (name.trim().length < 2) return setError("Informe o nome do fornecedor.");
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar fornecedor</DialogTitle>
          <DialogDescription>Só o essencial. Os demais dados podem ser completados depois em Financeiro → Fornecedores.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div><Label htmlFor="supplierName">Nome <span>*</span></Label>
            <Input id="supplierName" name="supplierName" value={name} maxLength={160} onValueChange={(_, value) => setName(String(value))} className="mt-1" /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label htmlFor="supplierDocument">CNPJ ou CPF</Label>
              <Input id="supplierDocument" name="supplierDocument" value={document} maxLength={18} onValueChange={(_, value) => setDocument(String(value))} onBlur={() => setDocument(formatDocument(document))} className="mt-1" placeholder="Opcional" /></div>
            <div><Label htmlFor="supplierPix">Chave Pix</Label>
              <Input id="supplierPix" name="supplierPix" value={pixKey} maxLength={140} onValueChange={(_, value) => setPixKey(String(value))} className="mt-1" placeholder="Opcional" /></div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Cadastrar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
