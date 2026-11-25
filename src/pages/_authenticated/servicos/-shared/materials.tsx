import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import { dateBr, errorMessage, money } from "../../comercial/-shared/commercial";
import { OrderPurchases, PURCHASES_ABILITY, PURCHASES_KEY, PurchaseStatus, purchasesApi } from "../../suprimentos/-shared/purchases";
import { Movement, OrderStock, PERM_MOVE, STOCK_ABILITY, STOCK_KEYS, qty, stockApi } from "../../suprimentos/-shared/stock";
import { DispatchDialog, ReturnDialog } from "../../suprimentos/-shared/stock-order";
import { MovementDetailDialog, useStockRefresh } from "../../suprimentos/-shared/stock-movements";

/**
 * Materiais da obra numa lista só: o que foi pedido para comprar e o que saiu
 * do estoque, cada um com a sua situação numa trilha (pedido → aprovado →
 * comprado → recebido → na obra). Um botão principal, "Pedir material".
 */
type TrailStep = "pedido" | "aprovado" | "comprado" | "recebido" | "na_obra";
const TRAIL: Array<{ id: TrailStep; name: string }> = [
  { id: "pedido", name: "Pedido" }, { id: "aprovado", name: "Aprovado" }, { id: "comprado", name: "Comprado" }, { id: "recebido", name: "Recebido" }, { id: "na_obra", name: "Na obra" },
];
const PURCHASE_TRAIL: Record<PurchaseStatus, TrailStep | null> = { solicitado: "pedido", aprovado: "aprovado", comprado: "comprado", recebido: "recebido", recusado: null, cancelado: null };

/** A trilha da situação, com o passo atual marcado. Recusado/cancelado aparecem por extenso. */
function Trail({ at, stopped }: { at: TrailStep | null; stopped?: string }) {
  if (!at) return <span className="text-xs font-medium text-muted-foreground">{stopped}</span>;
  const index = TRAIL.findIndex((step) => step.id === at);
  return (
    <ol className="flex items-center gap-0.5" aria-label={`Situação: ${TRAIL[index].name}`}>
      {TRAIL.map((step, i) => (
        <li key={step.id} className="flex items-center gap-0.5" aria-current={i === index ? "step" : undefined}>
          <span className={cn("h-1.5 w-5 rounded-full", i <= index ? "bg-primary" : "bg-muted")} aria-hidden="true" />
          {i === index && <span className="ml-1 text-xs font-medium whitespace-nowrap">{step.name}</span>}
        </li>
      ))}
    </ol>
  );
}

export function OrderMaterials({ orderId, orderNumber, locked }: { orderId: number; orderNumber: string; locked: boolean }) {
  const { can } = useVerify();
  const refresh = useStockRefresh();
  const seesPurchases = can(`view_${PURCHASES_ABILITY}`);
  const canBuy = seesPurchases && can(`create_${PURCHASES_ABILITY}`) && !locked;
  const seesStock = can(`view_${STOCK_ABILITY}`) || can(PERM_MOVE);
  const [choosing, setChoosing] = useState(false);
  const [dialog, setDialog] = useState<"dispatch" | "return" | null>(null);
  const [opened, setOpened] = useState<number | null>(null);
  const [history, setHistory] = useState(false);

  const purchases = useQuery({ queryKey: [PURCHASES_KEY, "os", orderId], queryFn: () => purchasesApi.get<OrderPurchases>(`service-order/${orderId}`), retry: false });
  const stock = useQuery({ queryKey: [STOCK_KEYS.order, orderId], queryFn: () => stockApi.get<OrderStock>(`service-orders/${orderId}`), enabled: seesStock, retry: false });
  const { mutate: consume, isPending: consuming } = useMutation({
    mutationFn: () => stockApi.post<Movement>(`service-orders/${orderId}/consume`, {}),
    onSuccess: (movement) => { refresh(); toast({ title: `${movement.number}: consumo na obra lançado`, variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível dar como consumido", description: errorMessage(err), variant: "destructive" }),
  });

  const buys = purchases.data?.rows ?? [];
  const atOrder = stock.data?.atOrder ?? [];
  const units = stock.data?.units ?? [];
  const canMove = !!stock.data?.canMove;
  const consumables = atOrder.filter((row) => !row.returnable);
  const hasStock = atOrder.length > 0 || units.length > 0;
  const waiting = buys.filter((row) => row.status === "solicitado").length;
  const canDispatch = canMove && !locked;
  const loading = purchases.isLoading || (seesStock && stock.isLoading);

  return (
    <div className="grid gap-4">
      <section className="rounded-card border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">O que a obra precisa</h2>
            <p className="text-xs text-muted-foreground">Compras e material do estoque juntos, cada um com a sua situação.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(canBuy || canDispatch) && <Button size="sm" onClick={() => setChoosing(true)}><Icon name="plus" className="w-4 h-4 mr-1" /> Pedir material</Button>}
            {(hasStock && canMove) && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild><Button size="sm" variant="outline" aria-label="Mais ações de materiais"><Icon name="ellipsis" className="w-4 h-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="gap-2" onSelect={() => setDialog("return")}><Icon name="undo-2" className="w-3.5 h-3.5" /> Receber de volta da obra</DropdownMenuItem>
                  {consumables.length > 0 && (
                    <ConfirmDialog title="Dar como consumido?" description={`O consumível que está na obra (${consumables.map((row) => `${qty(row.quantity)} ${row.unit} ${row.item}`).join(", ")}) sai como gasto nela. O custo já contou na saída.`} onConfirm={() => consume()}>
                      <DropdownMenuItem className="gap-2" disabled={consuming} onSelect={(event) => event.preventDefault()}><Icon name="flame" className="w-3.5 h-3.5" /> Dar como consumido</DropdownMenuItem>
                    </ConfirmDialog>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {(purchases.data || stock.data) && (
          <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
            {purchases.data && <div className="rounded-md border p-2.5"><p className="text-xs text-muted-foreground">Compras comprometidas</p><p className="font-semibold tabular-nums">{money(purchases.data.committed)}</p></div>}
            {purchases.data && <div className={cn("rounded-md border p-2.5", waiting > 0 && "border-amber-400")}><p className="text-xs text-muted-foreground">Esperando aprovação</p><p className="font-semibold tabular-nums">{waiting} pedido{waiting === 1 ? "" : "s"}{purchases.data.pending > 0 ? ` · ${money(purchases.data.pending)}` : ""}</p></div>}
            {stock.data?.cost && <div className="rounded-md border p-2.5"><p className="text-xs text-muted-foreground">Material do estoque</p><p className="font-semibold tabular-nums">{money(stock.data.cost.total)}</p></div>}
          </div>
        )}

        {loading && <p className="mt-3 text-sm text-muted-foreground">Carregando…</p>}
        {!loading && buys.length === 0 && !hasStock && <p className="mt-3 text-sm text-muted-foreground">Nada pedido nem enviado para esta obra ainda.</p>}
        {(buys.length > 0 || hasStock) && (
          <ul className="mt-3 divide-y border-t text-sm" aria-label="Materiais da obra">
            {buys.map((row) => (
              <li key={`p${row.id}`} className="py-2.5 grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_200px_110px] gap-x-3 gap-y-1 items-center">
                <div className="min-w-0">
                  <p className="truncate">
                    <Icon name="shopping-cart" className="inline w-3.5 h-3.5 mr-1 text-muted-foreground" aria-label="Compra" />
                    {seesPurchases ? <Link to="/suprimentos/pedidos-de-compra/$purchaseId" params={{ purchaseId: String(row.id) }} className="font-medium hover:underline">{row.title || row.number}</Link> : <span className="font-medium">{row.title || row.number}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{row.number}{row.supplier ? ` · ${row.supplier}` : ""}</p>
                </div>
                <Trail at={PURCHASE_TRAIL[row.status]} stopped={row.status === "recusado" ? "Recusado" : "Cancelado"} />
                <span className="hidden sm:block text-right tabular-nums">{money(row.total)}</span>
              </li>
            ))}
            {atOrder.map((row) => (
              <li key={`s${row.itemId}-${row.lotId}`} className="py-2.5 grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_200px_110px] gap-x-3 gap-y-1 items-center">
                <div className="min-w-0">
                  <p className="truncate"><Icon name="package" className="inline w-3.5 h-3.5 mr-1 text-muted-foreground" aria-label="Do estoque" /><span className="font-medium">{row.item}</span></p>
                  <p className="text-xs text-muted-foreground truncate">Do estoque{row.lot ? ` · lote ${row.lot}` : ""}{!row.returnable ? " · consumível" : ""}</p>
                </div>
                <Trail at="na_obra" />
                <span className="hidden sm:block text-right tabular-nums">{qty(row.quantity)} {row.unit}</span>
              </li>
            ))}
            {units.map((unit) => (
              <li key={`u${unit.id}`} className="py-2.5 grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_200px_110px] gap-x-3 gap-y-1 items-center">
                <div className="min-w-0">
                  <p className="truncate"><Icon name="wrench" className="inline w-3.5 h-3.5 mr-1 text-muted-foreground" aria-label="Equipamento" /><span className="font-medium">{unit.item}</span> <span className="text-xs text-muted-foreground">· peça {unit.tag}</span></p>
                  <p className={cn("text-xs truncate", unit.expiringBeforeEnd ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
                    {unit.expiringBeforeEnd ? "Vence antes do fim da obra" : unit.nextInspectionAt ? `Inspeção ${dateBr(unit.nextInspectionAt)}` : "Equipamento do estoque"}
                  </p>
                </div>
                <Trail at="na_obra" />
                <span className="hidden sm:block text-right text-xs text-muted-foreground">1 peça</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {stock.data && stock.data.movements.length > 0 && (
        <section className="rounded-card border bg-card p-4">
          <button type="button" className="w-full flex items-center justify-between gap-2 text-left" onClick={() => setHistory((value) => !value)} aria-expanded={history}>
            <h2 className="font-semibold">Movimentações do estoque <span className="text-sm font-normal text-muted-foreground">({stock.data.movements.length})</span></h2>
            <Icon name={history ? "chevron-up" : "chevron-down"} className="w-4 h-4 text-muted-foreground" />
          </button>
          {history && (
            <ul className="mt-2 divide-y text-sm">
              {stock.data.movements.map((movement) => (
                <li key={movement.id}>
                  <button type="button" className="w-full text-left py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 hover:bg-muted/40" onClick={() => setOpened(movement.id)}>
                    <span className="tabular-nums text-xs text-muted-foreground w-20">{dateBr(movement.date)}</span>
                    <span className="font-medium tabular-nums">{movement.number}</span>
                    <span>{movement.typeLabel}</span>
                    {movement.reversed && <span className="text-xs text-red-600">estornada</span>}
                    <span className="flex-1 min-w-0 truncate text-muted-foreground">{movement.summary}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {choosing && (
        <Dialog open onOpenChange={(open) => { if (!open) setChoosing(false); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Pedir material para a {orderNumber}</DialogTitle>
              <DialogDescription>Tem no estoque? Mande de lá. Não tem? Peça a compra.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              {canDispatch && (
                <button type="button" className="rounded-md border p-3 text-left hover:bg-muted/50 flex gap-3" onClick={() => { setChoosing(false); setDialog("dispatch"); }}>
                  <Icon name="package-minus" className="w-5 h-5 mt-0.5 text-primary shrink-0" />
                  <span><b>Mandar do estoque</b><span className="block text-sm text-muted-foreground">Sai do almoxarifado e fica registrado como na obra.</span></span>
                </button>
              )}
              {canBuy && (
                <Link to="/suprimentos/pedidos-de-compra/$purchaseId" params={{ purchaseId: "novo" }} search={{ os: orderId }} className="rounded-md border p-3 text-left hover:bg-muted/50 flex gap-3">
                  <Icon name="shopping-cart" className="w-5 h-5 mt-0.5 text-primary shrink-0" />
                  <span><b>Pedir compra</b><span className="block text-sm text-muted-foreground">Vira um pedido de compra ligado a esta obra, para aprovar e comprar.</span></span>
                </Link>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      {dialog === "dispatch" && <DispatchDialog orderId={orderId} orderNumber={orderNumber} onClose={() => setDialog(null)} onDone={setOpened} />}
      {dialog === "return" && stock.data && <ReturnDialog data={stock.data} onClose={() => setDialog(null)} onDone={setOpened} />}
      {opened && <MovementDetailDialog id={opened} onClose={() => setOpened(null)} />}
    </div>
  );
}
