import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import CalendarPicker from "@/components/general-components/Calendar";
import Input from "@/components/general-components/Input";
import { NumField, errorMessage, todayIso } from "../../comercial/-shared/commercial";
import { PAYABLES_KEY } from "../../financeiro/-shared/payables";
import { PURCHASES_KEY, PURCHASE_KEY, Purchase, purchasesApi } from "./purchases";
import { STOCK_KEYS, qty, useItemOptions, useStockOptions } from "./stock";
import { LocationField } from "./stock-pickers";

/** Quanto falta receber de uma linha do pedido. */
export const pendingOf = (item: { quantity: number; receivedQuantity?: number }) => Math.max(0, Math.round((Number(item.quantity) - Number(item.receivedQuantity ?? 0)) * 1000) / 1000);

interface LineState { quantity: number; locationId: string; lotNumber: string; expiresAt: string; serials: string[] }

/**
 * Recebimento detalhado do pedido comprado: por linha ligada ao estoque, quanto chegou, para onde
 * e, conforme o item, o lote (número e validade) ou as peças (uma linha por peça, com o nº de série).
 */
export function PurchaseReceiveDialog({ purchase, onClose }: { purchase: Purchase; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toObra = !!purchase.serviceOrder;
  const { data: options } = useStockOptions(!toObra);
  const { data: itemOptions = [] } = useItemOptions();
  const locations = options?.locations ?? [];
  const firstLocation = locations[0] ? String(locations[0].id) : "";
  const pending = purchase.items.map((item, index) => ({ item, index, left: pendingOf(item) })).filter((row) => row.item.itemId && row.left > 0);
  const [date, setDate] = useState(todayIso());
  const [invoiceNumber, setInvoiceNumber] = useState(purchase.invoiceNumber ?? "");
  const [lines, setLines] = useState<Record<number, LineState>>(() => Object.fromEntries(pending.map((row) => [row.index, { quantity: row.left, locationId: "", lotNumber: "", expiresAt: "", serials: [] }])));
  const [error, setError] = useState("");
  const setLine = (index: number, patch: Partial<LineState>) => setLines((current) => ({ ...current, [index]: { ...current[index], ...patch } }));
  const trackingOf = (itemId?: number | null) => itemOptions.find((option) => option.id === itemId)?.tracking ?? "quantidade";

  const { mutate, isPending } = useMutation({
    mutationFn: () => purchasesApi.post<Purchase>(`${purchase.id}/receive`, {
      date, invoiceNumber: invoiceNumber.trim(),
      lines: pending.filter((row) => lines[row.index].quantity > 0).map((row) => {
        const line = lines[row.index];
        const tracking = trackingOf(row.item.itemId);
        const count = Math.round(line.quantity);
        const serials = line.serials.slice(0, count);
        return {
          index: row.index, quantity: line.quantity,
          ...(!toObra && (line.locationId || firstLocation) ? { locationId: Number(line.locationId || firstLocation) } : {}),
          ...(tracking === "lote" || line.lotNumber.trim() ? { lotNumber: line.lotNumber.trim(), expiresAt: line.expiresAt || null } : {}),
          // sem nenhum nº de série, a API cria as peças sozinha (etiqueta automática)
          ...(tracking === "unidade" && serials.some((serial) => serial?.trim()) ? { units: Array.from({ length: count }, (_, i) => ({ serialNumber: serials[i]?.trim() || null })) } : {}),
        };
      }),
    }),
    onSuccess: (result) => {
      queryClient.setQueryData([PURCHASE_KEY, String(result.id)], result);
      for (const key of [PURCHASES_KEY, PAYABLES_KEY, STOCK_KEYS.balances, STOCK_KEYS.items, STOCK_KEYS.item, STOCK_KEYS.movements, STOCK_KEYS.overview, STOCK_KEYS.itemOptions, STOCK_KEYS.order, STOCK_KEYS.reorder]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      toast({ title: result.status === "recebido" ? `${result.number}: tudo recebido` : `${result.number}: recebimento registrado`, variant: "success" });
      onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const chosen = pending.filter((row) => lines[row.index].quantity > 0);
    if (!chosen.length) return setError("Informe o que chegou.");
    for (const row of chosen) {
      const line = lines[row.index];
      const tracking = trackingOf(row.item.itemId);
      if (line.quantity > row.left + 0.0005) return setError(`${row.item.description}: chegou mais do que falta receber (${qty(row.left)}).`);
      if (tracking === "lote" && !line.lotNumber.trim()) return setError(`${row.item.description}: informe o número do lote.`);
      if (tracking === "unidade" && !Number.isInteger(line.quantity)) return setError(`${row.item.description}: peças são inteiras.`);
    }
    setError(""); mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receber itens: {purchase.number}</DialogTitle>
          <DialogDescription>
            {toObra ? `Pedido da ${purchase.serviceOrder!.number}: o que chegar entra direto na obra.` : "O que chegar entra no local de estoque escolhido em cada linha."} Quando tudo o que é do estoque chega, o pedido passa a "Recebido".
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Dia em que chegou</Label>
              <CalendarPicker mode="single" name="receiveDate" className="mt-1 w-full" value={date} fromYear={2024} toYear={2040} onValueChange={(_, value) => setDate(String(value ?? "") || todayIso())} /></div>
            <div><Label htmlFor="receiveInvoice">Nº da nota do fornecedor</Label>
              <Input id="receiveInvoice" name="receiveInvoice" value={invoiceNumber} maxLength={60} onValueChange={(_, value) => setInvoiceNumber(String(value))} className="mt-1" placeholder="Opcional" /></div>
          </div>
          {pending.length === 0 && <p className="text-sm text-muted-foreground">Nada do estoque falta receber neste pedido.</p>}
          {pending.map((row) => {
            const line = lines[row.index];
            const tracking = trackingOf(row.item.itemId);
            const count = tracking === "unidade" ? Math.max(0, Math.round(line.quantity)) : 0;
            return (
              <section key={row.index} className="rounded border p-3 grid gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{row.item.description}</p>
                  <p className="text-xs text-muted-foreground">recebido {qty(row.item.receivedQuantity ?? 0)} de {qty(row.item.quantity)} {row.item.unit ?? ""} · falta {qty(row.left)}</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label className="text-xs">Quantidade que chegou</Label>
                    <NumField value={line.quantity} digits={3} suffix={row.item.unit ?? undefined} ariaLabel={`Quantidade recebida de ${row.item.description}`} onChange={(value) => setLine(row.index, { quantity: value })} /></div>
                  {toObra ? (
                    <p className="text-sm text-muted-foreground sm:pt-6">Entra direto na obra.</p>
                  ) : (
                    <div className="sm:pt-5"><LocationField name={`location-${row.index}`} label="Entra em" value={line.locationId || firstLocation} onChange={(value) => setLine(row.index, { locationId: value })} /></div>
                  )}
                </div>
                {tracking === "lote" && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><Label className="text-xs">Número do lote <span>*</span></Label>
                      <Input name={`lot-${row.index}`} value={line.lotNumber} maxLength={60} onValueChange={(_, value) => setLine(row.index, { lotNumber: String(value) })} placeholder="Como está na embalagem" /></div>
                    <div><Label className="text-xs">Validade do lote</Label>
                      <CalendarPicker mode="single" name={`expires-${row.index}`} className="w-full" value={line.expiresAt} placeholder="Sem validade" fromYear={2020} toYear={2050}
                        onValueChange={(_, value) => setLine(row.index, { expiresAt: String(value ?? "") })} /></div>
                  </div>
                )}
                {tracking === "unidade" && count > 0 && (
                  <div className="grid gap-2">
                    <p className="text-xs text-muted-foreground">Uma linha por peça. O nº de série é opcional; a etiqueta é gerada pelo código do item.</p>
                    {count > 200 ? <p className="text-xs text-red-500">No máximo 200 peças por recebimento.</p> : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {Array.from({ length: count }, (_, i) => (
                          <Input key={i} name={`serial-${row.index}-${i}`} value={line.serials[i] ?? ""} maxLength={80} placeholder={`Peça ${i + 1}: nº de série`}
                            onValueChange={(_, value) => { const next = [...line.serials]; next[i] = String(value); setLine(row.index, { serials: next }); }} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending || pending.length === 0}>{isPending ? "Registrando..." : "Registrar recebimento"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
