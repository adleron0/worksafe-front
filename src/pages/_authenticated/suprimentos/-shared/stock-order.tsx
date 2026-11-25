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
import { NumField, dateBr, errorMessage, money } from "../../comercial/-shared/commercial";
import { useAuth } from "@/context/AuthContext";
import { Movement, OrderStock, PERM_MOVE, Pill, STOCK_ABILITY, STOCK_KEYS, qty, stockApi, useItemOptions } from "./stock";
import { LocationField, useLocationValue } from "./stock-pickers";
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
    <section className="rounded-card border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Materiais e equipamentos</h2>
        {data.canMove && (
          <div className="flex flex-wrap gap-2">
            {!closed && <Button size="sm" variant="outline" onClick={() => setDialog("dispatch")}><Icon name="package-minus" className="w-3 h-3 mr-1" /> Mandar material para a obra</Button>}
            {hasAnything && <Button size="sm" variant="outline" onClick={() => setDialog("return")}><Icon name="undo-2" className="w-3 h-3 mr-1" /> Receber de volta da obra</Button>}
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

export function DispatchDialog({ orderId, orderNumber, onClose, onDone }: { orderId: number; orderNumber: string; onClose: () => void; onDone: (id: number) => void }) {
  const refresh = useStockRefresh();
  const { user } = useAuth();
  const [locationId, setLocationId] = useState("");
  // quem leva costuma ser quem lança: começa com o nome do usuário
  const [receivedBy, setReceivedBy] = useState(user?.username ?? "");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [error, setError] = useState("");
  const location = useLocationValue(locationId);
  const { data: items = [], isLoading } = useItemOptions(location || null);
  const { mutate, isPending } = useMutation({
    mutationFn: () => stockApi.post<Movement>(`service-orders/${orderId}/dispatch`, {
      locationId: Number(location), receivedBy: receivedBy.trim(), note: note.trim() || null, lines: linesBody("saida", lines, items),
    }),
    onSuccess: (movement) => { refresh(); toast({ title: `${movement.number}: material enviado para a obra`, variant: "success" }); onClose(); onDone(movement.id); },
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
          <DialogTitle>Mandar material para a obra: {orderNumber}</DialogTitle>
          <DialogDescription>O que sai do estoque para a obra. Consumível passa a contar no custo da obra; equipamento que volta, não.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid sm:grid-cols-2 gap-3 items-start">
            <LocationField label="Sai de" value={location} onChange={(value) => { setLocationId(value); setLines((current) => current.map((line) => ({ ...line, lotId: "", unitId: "" }))); }} />
            <div><Label htmlFor="receivedBy">Quem recebeu</Label>
              <Input id="receivedBy" name="receivedBy" value={receivedBy} maxLength={160} onValueChange={(_, value) => setReceivedBy(String(value))} className="mt-1" placeholder="Nome de quem levou para a obra" /></div>
          </div>
          <LinesEditor mode="saida" locationId={location} lines={lines} onChange={setLines} items={items} itemsLoading={isLoading} />
          <div><Label htmlFor="dispatchNote">Observação (opcional)</Label>
            <Textarea id="dispatchNote" className="mt-1" rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter className="sticky bottom-0 bg-background pt-2 pb-1">
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Lançando..." : "Mandar para a obra"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Peça: "obra" = ainda na obra (não vai na lista); os outros viram a condição de volta. */
type UnitBack = "obra" | "ok" | "problema" | "faltando";
interface ReturnLine { key: string; itemId: number; lotId: number | null; unitId: number | null; label: string; unit: string; max: number; quantity: number; problem: boolean; back: UnitBack; isUnit: boolean; consumable: boolean }

export function ReturnDialog({ data, onClose, onDone }: { data: OrderStock; onClose: () => void; onDone: (id: number) => void }) {
  const refresh = useStockRefresh();
  const [locationId, setLocationId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  // tudo começa como "ainda na obra": a pessoa marca só o que voltou
  const [lines, setLines] = useState<ReturnLine[]>(() => [
    ...data.units.map((unit) => ({
      key: `u-${unit.id}`, itemId: unit.itemId, lotId: null, unitId: unit.id, label: `${unit.item} · peça ${unit.tag}`, unit: "un",
      max: 1, quantity: 1, problem: false, back: "obra" as UnitBack, isUnit: true, consumable: false,
    })),
    ...data.atOrder.map((row) => ({
      key: `b-${row.itemId}-${row.lotId ?? 0}`, itemId: row.itemId, lotId: row.lotId, unitId: null, label: `${row.item}${row.lot ? ` · lote ${row.lot}` : ""}`, unit: row.unit,
      max: row.quantity, quantity: 0, problem: false, back: "obra" as UnitBack, isUnit: false, consumable: !row.returnable,
    })),
  ]);
  const location = useLocationValue(locationId);
  const setLine = (key: string, patch: Partial<ReturnLine>) => setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  const chosen = lines.filter((line) => (line.isUnit ? line.back !== "obra" : line.quantity > 0));
  const conditionOf = (line: ReturnLine) => (line.isUnit ? (line.back === "problema" ? "avariado" : line.back === "faltando" ? "faltando" : "ok") : line.problem ? "avariado" : "ok");
  const { mutate, isPending } = useMutation({
    mutationFn: () => stockApi.post<Movement>(`service-orders/${data.order.id}/return`, {
      locationId: Number(location), note: note.trim() || null,
      lines: chosen.map((line) => ({ itemId: line.itemId, ...(line.lotId ? { lotId: line.lotId } : {}), ...(line.unitId ? { unitId: line.unitId } : {}), quantity: line.isUnit ? 1 : line.quantity, condition: conditionOf(line) })),
    }),
    onSuccess: (movement) => { refresh(); toast({ title: `${movement.number}: volta da obra lançada`, variant: "success" }); onClose(); onDone(movement.id); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!location) return setError("Escolha para qual local volta.");
    if (!chosen.some((line) => conditionOf(line) !== "faltando")) return setError("Marque o que voltou da obra.");
    const over = chosen.find((line) => line.quantity > line.max + 0.0005);
    if (over) return setError(`${over.label}: voltou mais do que está na obra (${qty(over.max)}).`);
    setError(""); mutate();
  };
  const choice = (line: ReturnLine, back: UnitBack, label: string, icon: string, tone: "default" | "destructive" | "secondary") => (
    <Button type="button" size="lg" className="flex-1 h-auto py-2 whitespace-normal" variant={line.back === back ? tone : "outline"} onClick={() => setLine(line.key, { back: line.back === back ? "obra" : back })}>
      <Icon name={icon} className="w-4 h-4 mr-1 shrink-0" /> {label}
    </Button>
  );
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receber de volta da obra: {data.order.number}</DialogTitle>
          <DialogDescription>Marque só o que voltou; o resto continua na obra. Peça com problema volta bloqueada; a que exige inspeção volta esperando inspeção.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="sm:w-1/2"><LocationField label="Volta para" value={location} onChange={setLocationId} /></div>
          <div className="rounded border divide-y">
            {lines.map((line) => (
              <div key={line.key} className="p-3 grid gap-2 text-sm">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="font-medium truncate">{line.label}</span>
                  {line.consumable && <Pill>Consumível</Pill>}
                  {!line.isUnit && <span className="text-xs text-muted-foreground">na obra: {qty(line.max)} {line.unit}</span>}
                  {line.isUnit && line.back === "obra" && <span className="text-xs text-muted-foreground">ainda na obra</span>}
                </div>
                {line.isUnit ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    {choice(line, "ok", "Voltou bem", "check", "default")}
                    {choice(line, "problema", "Voltou com problema", "triangle-alert", "secondary")}
                    {choice(line, "faltando", "Não voltou", "x", "destructive")}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="w-44">
                      <Label className="text-xs">{line.consumable ? "Sobrou quanto?" : "Voltou quanto?"}</Label>
                      <NumField value={line.quantity} digits={3} suffix={line.unit} ariaLabel={`Quantidade que voltou de ${line.label}`} onChange={(value) => setLine(line.key, { quantity: value })} />
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setLine(line.key, { quantity: line.max })}>Voltou tudo</Button>
                    {!line.consumable && line.quantity > 0 && (
                      <div className="flex items-center gap-2 pb-2">
                        <Checkbox id={`problem-${line.key}`} checked={line.problem} onCheckedChange={(checked) => setLine(line.key, { problem: checked === true })} />
                        <Label htmlFor={`problem-${line.key}`} className="font-normal">Voltou com problema</Label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div><Label htmlFor="returnNote">Observação (opcional)</Label>
            <Textarea id="returnNote" className="mt-1" rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter className="sticky bottom-0 bg-background pt-2 pb-1">
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Lançando..." : `Receber ${chosen.length ? `(${chosen.length})` : ""}`}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
