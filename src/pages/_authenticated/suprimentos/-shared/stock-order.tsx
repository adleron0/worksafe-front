import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { NumField, dateBr, errorMessage, money } from "../../comercial/-shared/commercial";
import { CONDITION_OPTIONS, Movement, OrderStock, PERM_MOVE, Pill, STOCK_ABILITY, STOCK_KEYS, qty, stockApi, useItemOptions, useStockOptions } from "./stock";
import { LineDraft, LinesEditor, MovementDetailDialog, emptyLine, linesBody, linesError, useStockRefresh } from "./stock-movements";

/** Materiais e equipamentos da obra, na tela da OS: o que está lá, o que andou, o custo, romaneio, retorno e consumo. */
export function OrderStockPanel({ orderId }: { orderId: number }) {
  const { can } = useVerify();
  const refresh = useStockRefresh();
  const visible = can(`view_${STOCK_ABILITY}`) || can(PERM_MOVE);
  const [dialog, setDialog] = useState<"dispatch" | "return" | null>(null);
  const [opened, setOpened] = useState<number | null>(null);
  const { data, error } = useQuery({
    queryKey: [STOCK_KEYS.order, orderId],
    queryFn: () => stockApi.get<OrderStock>(`service-orders/${orderId}`),
    enabled: visible,
    retry: false,
  });
  const { mutate: consume, isPending: consuming } = useMutation({
    mutationFn: () => stockApi.post<Movement>(`service-orders/${orderId}/consume`, {}),
    onSuccess: (movement) => { refresh(); toast({ title: `${movement.number}: consumo na obra lançado`, variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível dar como consumido", description: errorMessage(err), variant: "destructive" }),
  });
  if (!visible || error || !data) return null;

  const closed = ["cancelada", "encerrada"].includes(data.order.status);
  const consumables = data.atOrder.filter((row) => !row.returnable);
  const hasAnything = data.atOrder.length > 0 || data.units.length > 0;
  return (
    <section className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Materiais e equipamentos</h2>
        {data.canMove && (
          <div className="flex flex-wrap gap-2">
            {!closed && <Button size="sm" variant="outline" onClick={() => setDialog("dispatch")}><Icon name="package-minus" className="w-3 h-3 mr-1" /> Romaneio de saída</Button>}
            {hasAnything && <Button size="sm" variant="outline" onClick={() => setDialog("return")}><Icon name="undo-2" className="w-3 h-3 mr-1" /> Retorno da obra</Button>}
            {consumables.length > 0 && (
              <ConfirmDialog title="Dar como consumido?" description={`O consumível que está na obra (${consumables.map((row) => `${qty(row.quantity)} ${row.unit} ${row.item}`).join(", ")}) sai como gasto nela. O custo já contou na saída.`} onConfirm={() => consume()}>
                <Button size="sm" variant="outline" disabled={consuming}><Icon name="flame" className="w-3 h-3 mr-1" /> Dar como consumido</Button>
              </ConfirmDialog>
            )}
          </div>
        )}
      </div>

      {data.cost && (
        <p className="mt-1 text-sm text-muted-foreground">
          Custo de material do estoque: <span className="font-semibold text-foreground tabular-nums">{money(data.cost.total)}</span>
          {(data.cost.returned > 0 || data.cost.lost > 0 || data.cost.ppe > 0) && ` (saídas ${money(data.cost.sent)}${data.cost.returned ? ` − sobras ${money(data.cost.returned)}` : ""}${data.cost.lost ? ` + perdas ${money(data.cost.lost)}` : ""}${data.cost.ppe ? ` + EPI ${money(data.cost.ppe)}` : ""})`}
        </p>
      )}

      <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Na obra agora</h3>
      {!hasAnything && <p className="mt-1 text-sm text-muted-foreground">Nada do estoque está nesta obra.</p>}
      {hasAnything && (
        <ul className="mt-1 divide-y text-sm">
          {data.atOrder.map((row) => (
            <li key={`${row.itemId}-${row.lotId}`} className="py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex-1 min-w-0 truncate">{row.item}{row.lot ? <span className="text-xs text-muted-foreground"> · lote {row.lot}</span> : null}</span>
              {!row.returnable && <Pill>Consumível</Pill>}
              <span className="tabular-nums">{qty(row.quantity)} {row.unit}</span>
            </li>
          ))}
          {data.units.map((unit) => (
            <li key={unit.id} className="py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex-1 min-w-0 truncate">{unit.item} <span className="text-xs text-muted-foreground">· peça {unit.tag}</span></span>
              {unit.expiringBeforeEnd && <Pill tone="amber">Vence antes do fim da obra</Pill>}
              {unit.nextInspectionAt && <span className="text-xs text-muted-foreground">inspeção {dateBr(unit.nextInspectionAt)}</span>}
            </li>
          ))}
        </ul>
      )}

      {data.movements.length > 0 && (
        <>
          <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Movimentações</h3>
          <ul className="mt-1 divide-y text-sm">
            {data.movements.map((movement) => (
              <li key={movement.id}>
                <button type="button" className="w-full text-left py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 hover:bg-muted/40" onClick={() => setOpened(movement.id)}>
                  <span className="tabular-nums text-xs text-muted-foreground w-20">{dateBr(movement.date)}</span>
                  <span className="font-medium tabular-nums">{movement.number}</span>
                  <span>{movement.typeLabel}</span>
                  {movement.reversed && <Pill tone="red">Estornada</Pill>}
                  <span className="flex-1 min-w-0 truncate text-muted-foreground">{movement.summary}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {can(`view_${STOCK_ABILITY}`) && <p className="mt-2 text-xs text-muted-foreground"><Link to="/suprimentos/estoque/saldos" search={{ holderType: "os" }} className="underline">Ver o que está em todas as obras</Link></p>}

      {dialog === "dispatch" && <DispatchDialog orderId={orderId} orderNumber={data.order.number} onClose={() => setDialog(null)} onDone={setOpened} />}
      {dialog === "return" && <ReturnDialog data={data} onClose={() => setDialog(null)} onDone={setOpened} />}
      {opened && <MovementDetailDialog id={opened} onClose={() => setOpened(null)} />}
    </section>
  );
}

/** Locais para escolher; sem a permissão de ver o estoque, a lista não vem e o diálogo avisa. */
function useLocations() {
  const { data, isError, isLoading } = useStockOptions();
  return { locations: data?.locations ?? [], unavailable: isError || (!data && !isLoading) };
}

function DispatchDialog({ orderId, orderNumber, onClose, onDone }: { orderId: number; orderNumber: string; onClose: () => void; onDone: (id: number) => void }) {
  const refresh = useStockRefresh();
  const { locations, unavailable } = useLocations();
  const [locationId, setLocationId] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [error, setError] = useState("");
  const location = locationId || (locations[0] ? String(locations[0].id) : "");
  const { data: items = [], isLoading } = useItemOptions(location || null);
  const { mutate, isPending } = useMutation({
    mutationFn: () => stockApi.post<Movement>(`service-orders/${orderId}/dispatch`, {
      locationId: Number(location), receivedBy: receivedBy.trim(), note: note.trim() || null, lines: linesBody("saida", lines, items),
    }),
    onSuccess: (movement) => { refresh(); toast({ title: `${movement.number}: romaneio lançado`, variant: "success" }); onClose(); onDone(movement.id); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!location) return setError("Escolha de qual local sai.");
    const problem = linesError("saida", lines, items);
    if (problem) return setError(problem);
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Romaneio de saída: {orderNumber}</DialogTitle>
          <DialogDescription>O que sai do estoque para a obra. Consumível passa a contar no custo da obra; equipamento que volta, não.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Sai de <span>*</span></Label>
              {unavailable ? <p className="text-sm text-muted-foreground mt-2">Sem acesso à lista de locais de estoque.</p>
                : <Select name="locationId" options={locations} state={location} modal onChange={(_, value) => { setLocationId(String(value ?? "")); setLines((current) => current.map((line) => ({ ...line, lotId: "", unitId: "" }))); }} placeholder="Escolha o local" />}</div>
            <div><Label htmlFor="receivedBy">Quem recebeu</Label>
              <Input id="receivedBy" name="receivedBy" value={receivedBy} maxLength={160} onValueChange={(_, value) => setReceivedBy(String(value))} className="mt-1" placeholder="Nome de quem levou para a obra" /></div>
          </div>
          <LinesEditor mode="saida" locationId={location} lines={lines} onChange={setLines} items={items} itemsLoading={isLoading} />
          <div><Label htmlFor="dispatchNote">Observação (opcional)</Label>
            <Textarea id="dispatchNote" className="mt-1" rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Lançando..." : "Lançar a saída"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ReturnLine { key: string; itemId: number; lotId: number | null; unitId: number | null; label: string; unit: string; max: number; quantity: number; condition: string; include: boolean; isUnit: boolean; consumable: boolean }

function ReturnDialog({ data, onClose, onDone }: { data: OrderStock; onClose: () => void; onDone: (id: number) => void }) {
  const refresh = useStockRefresh();
  const { locations, unavailable } = useLocations();
  const [locationId, setLocationId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  // equipamento volta inteiro por padrão; consumível começa em zero (só a sobra volta)
  const [lines, setLines] = useState<ReturnLine[]>(() => [
    ...data.atOrder.map((row) => ({
      key: `b-${row.itemId}-${row.lotId ?? 0}`, itemId: row.itemId, lotId: row.lotId, unitId: null, label: `${row.item}${row.lot ? ` · lote ${row.lot}` : ""}`, unit: row.unit,
      max: row.quantity, quantity: row.returnable ? row.quantity : 0, condition: "ok", include: true, isUnit: false, consumable: !row.returnable,
    })),
    ...data.units.map((unit) => ({
      key: `u-${unit.id}`, itemId: unit.itemId, lotId: null, unitId: unit.id, label: `${unit.item} · peça ${unit.tag}`, unit: "un",
      max: 1, quantity: 1, condition: "ok", include: true, isUnit: true, consumable: false,
    })),
  ]);
  const location = locationId || (locations[0] ? String(locations[0].id) : "");
  const setLine = (key: string, patch: Partial<ReturnLine>) => setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  const chosen = lines.filter((line) => (line.isUnit ? line.include : line.quantity > 0));
  const { mutate, isPending } = useMutation({
    mutationFn: () => stockApi.post<Movement>(`service-orders/${data.order.id}/return`, {
      locationId: Number(location), note: note.trim() || null,
      lines: chosen.map((line) => ({ itemId: line.itemId, ...(line.lotId ? { lotId: line.lotId } : {}), ...(line.unitId ? { unitId: line.unitId } : {}), quantity: line.isUnit ? 1 : line.quantity, condition: line.condition })),
    }),
    onSuccess: (movement) => { refresh(); toast({ title: `${movement.number}: retorno lançado`, variant: "success" }); onClose(); onDone(movement.id); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!location) return setError("Escolha para qual local volta.");
    if (!chosen.some((line) => line.condition !== "faltando")) return setError("Informe o que voltou.");
    const over = chosen.find((line) => line.quantity > line.max + 0.0005);
    if (over) return setError(`${over.label}: voltou mais do que está na obra (${qty(over.max)}).`);
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Retorno da obra: {data.order.number}</DialogTitle>
          <DialogDescription>Sobra de consumível volta abatendo do custo da obra. Peça avariada volta bloqueada; a que exige inspeção volta esperando inspeção. "Não voltou" não anda.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="sm:w-1/2"><Label>Volta para <span>*</span></Label>
            {unavailable ? <p className="text-sm text-muted-foreground mt-2">Sem acesso à lista de locais de estoque.</p>
              : <Select name="locationId" options={locations} state={location} modal onChange={(_, value) => setLocationId(String(value ?? ""))} placeholder="Escolha o local" />}</div>
          <div className="rounded border divide-y">
            {lines.map((line) => (
              <div key={line.key} className="p-3 grid sm:grid-cols-12 gap-2 items-center text-sm">
                <div className="sm:col-span-6 flex items-center gap-2 min-w-0">
                  {line.isUnit && <Checkbox id={line.key} checked={line.include} onCheckedChange={(checked) => setLine(line.key, { include: checked === true })} />}
                  <Label htmlFor={line.isUnit ? line.key : undefined} className="font-normal truncate">{line.label}</Label>
                  {line.consumable && <Pill>Consumível</Pill>}
                </div>
                <div className="sm:col-span-3">
                  {line.isUnit ? <span className="text-xs text-muted-foreground">1 peça</span> : (
                    <NumField value={line.quantity} digits={3} suffix={line.unit} ariaLabel={`Quantidade que voltou de ${line.label}`} onChange={(value) => setLine(line.key, { quantity: value })} />
                  )}
                  {!line.isUnit && <p className="text-xs text-muted-foreground mt-0.5">na obra: {qty(line.max)}</p>}
                </div>
                <div className="sm:col-span-3">
                  <Select name={`condition-${line.key}`} options={CONDITION_OPTIONS} state={line.condition} modal onChange={(_, value) => setLine(line.key, { condition: String(value || "ok") })} />
                </div>
              </div>
            ))}
          </div>
          <div><Label htmlFor="returnNote">Observação (opcional)</Label>
            <Textarea id="returnNote" className="mt-1" rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Lançando..." : "Lançar o retorno"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
