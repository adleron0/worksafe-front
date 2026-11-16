import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import SlideConfirm from "@/components/general-components/SlideConfirm";
import { NumField, Tip, dateBr, errorMessage, money, newUid, todayIso } from "../../comercial/-shared/commercial";
import { LotPicker, UnitPicker } from "./stock-pickers";
import {
  ImportResult, ItemOption, MANUAL_TYPES, ManualType, Movement, PERM_ADJUST, STOCK_KEYS, qty, stockApi, useItemOptions, useStockOptions,
} from "./stock";

// ---------------------------------------------------------------- linhas de itens (lançamento, romaneio)

export interface LineDraft { key: string; itemId: string; quantity: number; unitCost: number | null; lotNumber: string; expiresAt: string; lotId: string; unitId: string }
export const emptyLine = (): LineDraft => ({ key: newUid(), itemId: "", quantity: 1, unitCost: null, lotNumber: "", expiresAt: "", lotId: "", unitId: "" });
/** entrada: de fora para o local (pede lote novo); saida: do local para fora (escolhe o lote que existe); ajuste: com sinal. */
export type LinesMode = "entrada" | "saida" | "ajuste";

const lineIn = (mode: LinesMode, line: LineDraft) => mode === "entrada" || (mode === "ajuste" && line.quantity > 0);

/** Confere as linhas antes de mandar; devolve a mensagem do primeiro problema. */
export function linesError(mode: LinesMode, lines: LineDraft[], items: ItemOption[]): string {
  const used = lines.filter((line) => line.itemId);
  if (!used.length) return "Informe pelo menos um item.";
  for (const [index, line] of used.entries()) {
    const item = items.find((option) => String(option.id) === line.itemId);
    const label = `Linha ${index + 1}${item ? ` (${item.label})` : ""}`;
    if (!line.quantity || Number.isNaN(line.quantity)) return `${label}: informe a quantidade.`;
    if (mode !== "ajuste" && line.quantity < 0) return `${label}: a quantidade não pode ser negativa.`;
    if (!item) continue;
    if (item.tracking === "unidade" && mode === "ajuste") return `${label}: peça rastreada não se ajusta por quantidade (use baixa ou entrada).`;
    if (item.tracking === "unidade" && !lineIn(mode, line) && !line.unitId) return `${label}: escolha a peça (etiqueta).`;
    if (item.tracking === "unidade" && !Number.isInteger(line.quantity)) return `${label}: peças são inteiras.`;
    if (item.tracking === "lote" && lineIn(mode, line) && !line.lotNumber.trim()) return `${label}: informe o número do lote.`;
    if (item.tracking === "lote" && !lineIn(mode, line) && !line.lotId) return `${label}: escolha o lote.`;
  }
  return "";
}

/** O que vai para a API (cada tipo só leva o que usa). */
export function linesBody(mode: LinesMode, lines: LineDraft[], items: ItemOption[]) {
  return lines.filter((line) => line.itemId).map((line) => {
    const item = items.find((option) => String(option.id) === line.itemId);
    const entering = lineIn(mode, line);
    return {
      itemId: Number(line.itemId), quantity: line.quantity,
      ...(mode === "entrada" && line.unitCost !== null ? { unitCost: line.unitCost } : {}),
      ...(item?.tracking === "lote" && entering ? { lotNumber: line.lotNumber.trim(), expiresAt: line.expiresAt || null } : {}),
      ...(item?.tracking === "lote" && !entering ? { lotId: Number(line.lotId) } : {}),
      ...(item?.tracking === "unidade" && !entering && line.unitId ? { unitId: Number(line.unitId), quantity: 1 } : {}),
    };
  });
}

export function LinesEditor({ mode, locationId, lines, onChange, items, itemsLoading, showCost }: {
  mode: LinesMode; locationId: string; lines: LineDraft[]; onChange: (lines: LineDraft[]) => void; items: ItemOption[]; itemsLoading?: boolean; showCost?: boolean;
}) {
  const setLine = (key: string, patch: Partial<LineDraft>) => onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  const options = items.map((item) => ({ id: item.id, name: mode === "entrada" ? item.name : `${item.name} · ${qty(item.available)} ${item.unit} aqui` }));
  return (
    <div className="grid gap-3">
      {lines.map((line, index) => {
        const item = items.find((option) => String(option.id) === line.itemId);
        const entering = lineIn(mode, line);
        return (
          <div key={line.key} className="rounded border p-3 grid gap-2">
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 sm:col-span-7">
                {index === 0 && <Label className="text-xs">Item</Label>}
                <Select name={`item-${line.key}`} options={options} state={line.itemId} isLoading={itemsLoading} modal
                  onChange={(_, value) => setLine(line.key, { itemId: String(value ?? ""), lotId: "", lotNumber: "", expiresAt: "", unitId: "" })} placeholder="Escolha o item" />
              </div>
              <div className={showCost && mode === "entrada" ? "col-span-5 sm:col-span-2" : "col-span-10 sm:col-span-4"}>
                {index === 0 && <Label className="text-xs">{mode === "ajuste" ? "Diferença (+ ou −)" : "Quantidade"}</Label>}
                <NumField value={line.quantity} digits={3} suffix={item?.unit} ariaLabel={`Quantidade da linha ${index + 1}`} onChange={(value) => setLine(line.key, { quantity: value })} />
              </div>
              {showCost && mode === "entrada" && (
                <div className="col-span-5 sm:col-span-2">
                  {index === 0 && <Label className="text-xs">Custo unitário</Label>}
                  <NumField value={line.unitCost} kind="money" placeholder="Opcional" ariaLabel={`Custo unitário da linha ${index + 1}`} onChange={(value) => setLine(line.key, { unitCost: value })} onEmpty={() => setLine(line.key, { unitCost: null })} />
                </div>
              )}
              <div className="col-span-2 sm:col-span-1 flex justify-end">
                {lines.length > 1 && (
                  <Tip text="Remover a linha"><Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label={`Remover a linha ${index + 1}`} onClick={() => onChange(lines.filter((l) => l.key !== line.key))}><Icon name="trash-2" className="w-4 h-4" /></Button></Tip>
                )}
              </div>
            </div>
            {item?.tracking === "lote" && entering && (
              <div className="grid sm:grid-cols-2 gap-2">
                <div><Label className="text-xs">Número do lote <span>*</span></Label>
                  <Input name={`lotNumber-${line.key}`} value={line.lotNumber} maxLength={60} onValueChange={(_, value) => setLine(line.key, { lotNumber: String(value) })} placeholder="Como está na embalagem" /></div>
                <div><Label className="text-xs">Validade do lote</Label>
                  <CalendarPicker mode="single" name={`expiresAt-${line.key}`} className="w-full" value={line.expiresAt} placeholder="Sem validade" fromYear={2020} toYear={2050}
                    onValueChange={(_, value) => setLine(line.key, { expiresAt: String(value ?? "") })} /></div>
              </div>
            )}
            {item?.tracking === "lote" && !entering && (
              <div><Label className="text-xs">Lote <span>*</span></Label>
                <LotPicker name={`lot-${line.key}`} itemId={line.itemId} locationId={locationId} unit={item.unit} value={line.lotId} onChange={(value) => setLine(line.key, { lotId: value })} /></div>
            )}
            {item?.tracking === "unidade" && mode === "entrada" && (
              <p className="text-xs text-muted-foreground">Peça rastreada: entram {Math.max(0, Math.round(line.quantity))} peça(s), cada uma com etiqueta própria gerada pelo código do item.</p>
            )}
            {item?.tracking === "unidade" && mode === "saida" && (
              <div><Label className="text-xs">Peça <span>*</span></Label>
                {locationId ? <UnitPicker name={`unit-${line.key}`} itemId={line.itemId} holderType="local" holderId={locationId} value={line.unitId}
                  exclude={lines.filter((l) => l.key !== line.key && l.unitId).map((l) => l.unitId)} onChange={(value) => setLine(line.key, { unitId: value, quantity: 1 })} />
                  : <p className="text-xs text-muted-foreground">Escolha o local para ver as peças.</p>}
              </div>
            )}
            {item?.tracking === "unidade" && mode === "ajuste" && (
              <p className="text-xs text-amber-600 dark:text-amber-400">Peça rastreada não se ajusta por quantidade: use a baixa na ficha da peça ou uma entrada.</p>
            )}
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => onChange([...lines, emptyLine()])}><Icon name="plus" className="w-3 h-3 mr-1" /> Adicionar item</Button>
    </div>
  );
}

/** Depois de qualquer movimentação, o que pode ter mudado. */
export function useStockRefresh() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [STOCK_KEYS.movements, STOCK_KEYS.balances, STOCK_KEYS.items, STOCK_KEYS.item, STOCK_KEYS.kardex, STOCK_KEYS.overview, STOCK_KEYS.itemOptions, STOCK_KEYS.reorder, STOCK_KEYS.order, STOCK_KEYS.locations]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
}

// ---------------------------------------------------------------- novo lançamento

export function NewMovementDialog({ initialType, onClose, onDone }: { initialType: ManualType; onClose: () => void; onDone?: (movement: Movement) => void }) {
  const { can } = useVerify();
  const refresh = useStockRefresh();
  const allowed = MANUAL_TYPES.filter((type) => can(type.permission));
  const [type, setType] = useState<ManualType>(initialType);
  const [date, setDate] = useState(todayIso());
  const [locationId, setLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [error, setError] = useState("");
  const { data: options } = useStockOptions();
  const locations = options?.locations ?? [];
  const location = locationId || (locations[0] ? String(locations[0].id) : "");
  const { data: items = [], isLoading: itemsLoading } = useItemOptions(location || null);
  const mode: LinesMode = type === "saldo_inicial" || type === "entrada_avulsa" ? "entrada" : type === "ajuste" ? "ajuste" : "saida";
  const meta = MANUAL_TYPES.find((option) => option.id === type)!;

  const { mutate, isPending } = useMutation({
    mutationFn: () => stockApi.post<Movement>("movements", {
      type, date, locationId: Number(location), note: note.trim() || null,
      ...(type === "transferencia" ? { toLocationId: Number(toLocationId) } : {}),
      ...(type === "consumo_interno" && costCenterId ? { costCenterId: Number(costCenterId) } : {}),
      lines: linesBody(mode, lines, items),
    }),
    onSuccess: (movement) => { refresh(); toast({ title: `${movement.number}: ${movement.typeLabel.toLowerCase()} lançada`, variant: "success" }); onDone?.(movement); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!location) return setError("Escolha o local.");
    if (type === "transferencia" && !toLocationId) return setError("Escolha o local de destino.");
    if (type === "transferencia" && toLocationId === location) return setError("A origem e o destino são o mesmo local.");
    if (type === "ajuste" && !note.trim()) return setError("Informe o motivo do ajuste.");
    const problem = linesError(mode, lines, items);
    if (problem) return setError(problem);
    setError(""); mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{meta.name}</DialogTitle>
          <DialogDescription>{meta.hint}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid sm:grid-cols-3 gap-3">
            <div><Label>Tipo</Label>
              <Select name="type" options={allowed.map(({ id, name }) => ({ id, name }))} state={type} modal onChange={(_, value) => { setType((String(value || type)) as ManualType); setLines([emptyLine()]); }} placeholder="Selecione" /></div>
            <div><Label>Data</Label>
              <CalendarPicker mode="single" name="date" className="mt-1 w-full" value={date} fromYear={2020} toYear={2040} onValueChange={(_, value) => setDate(String(value ?? "") || todayIso())} /></div>
            <div><Label>{type === "transferencia" ? "Sai de" : mode === "entrada" ? "Entra em" : "Local"} <span>*</span></Label>
              <Select name="locationId" options={locations} state={location} modal onChange={(_, value) => { setLocationId(String(value ?? "")); setLines((current) => current.map((line) => ({ ...line, lotId: "", unitId: "" }))); }} placeholder="Escolha o local" /></div>
          </div>
          {type === "transferencia" && (
            <div className="sm:w-1/3"><Label>Vai para <span>*</span></Label>
              <Select name="toLocationId" options={locations.filter((l) => String(l.id) !== location)} state={toLocationId} modal onChange={(_, value) => setToLocationId(String(value ?? ""))} placeholder="Escolha o destino" /></div>
          )}
          {type === "consumo_interno" && (
            <div className="sm:w-1/2"><Label>Centro de custo</Label>
              <Select name="costCenterId" options={options?.costCenters ?? []} state={costCenterId} clearable modal onChange={(_, value) => setCostCenterId(String(value ?? ""))} placeholder="Nenhum" /></div>
          )}
          <LinesEditor mode={mode} locationId={location} lines={lines} onChange={setLines} items={items} itemsLoading={itemsLoading} showCost={mode === "entrada"} />
          <div><Label htmlFor="movementNote">{type === "ajuste" ? "Motivo do ajuste" : "Observação (opcional)"}{type === "ajuste" && <span> *</span>}</Label>
            <Textarea id="movementNote" className="mt-1" rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Lançando..." : "Lançar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- detalhe e estorno

export function MovementDetailDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const refresh = useStockRefresh();
  const queryClient = useQueryClient();
  const [reversing, setReversing] = useState(false);
  const [note, setNote] = useState("");
  const { data: movement, isLoading, error } = useQuery({ queryKey: [STOCK_KEYS.movement, id], queryFn: () => stockApi.get<Movement>(`movements/${id}`) });
  const { mutate: reverse, isPending } = useMutation({
    mutationFn: () => stockApi.post<Movement>(`movements/${id}/reverse`, { note: note.trim() || null }),
    onSuccess: (reversal) => {
      refresh(); queryClient.invalidateQueries({ queryKey: [STOCK_KEYS.movement] });
      toast({ title: `Estornada: ${reversal.number}`, variant: "success" }); setReversing(false);
    },
    onError: (err) => toast({ title: "Não foi possível estornar", description: errorMessage(err), variant: "destructive" }),
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{movement ? `${movement.number} · ${movement.typeLabel}` : "Movimentação"}</DialogTitle>
          <DialogDescription>{movement ? [dateBr(movement.date), movement.user && `lançada por ${movement.user}`].filter(Boolean).join(" · ") : "Carregando..."}</DialogDescription>
        </DialogHeader>
        {error && <p className="text-destructive text-sm">Erro: {errorMessage(error)}</p>}
        {isLoading && <Skeleton className="h-40 w-full" />}
        {movement && (
          <div className="grid gap-4 text-sm">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              {movement.serviceOrder && <span>Obra: <Link to="/servicos/ordens-de-servico/$orderId" params={{ orderId: String(movement.serviceOrder.id) }} className="text-primary underline">{movement.serviceOrder.number}</Link> {movement.serviceOrder.title}</span>}
              {movement.purchaseOrder && <span>Pedido: <Link to="/suprimentos/pedidos-de-compra/$purchaseId" params={{ purchaseId: String(movement.purchaseOrder.id) }} className="text-primary underline">{movement.purchaseOrder.number}</Link></span>}
              {movement.employee && <span>Funcionário: {movement.employee.name}</span>}
              {movement.reverses && <span>Estorna a {movement.reverses.number}</span>}
              {movement.reversedBy && <span className="text-red-600 dark:text-red-400">Estornada pela {movement.reversedBy.number}</span>}
            </div>
            {movement.note && <p className="rounded bg-muted/50 p-2">{movement.note}</p>}
            <div className="rounded border overflow-hidden">
              <div className="hidden md:flex px-3 py-2 bg-muted/50 text-xs font-semibold">
                <div className="flex-1">Item</div><div className="w-48">De → para</div><div className="w-24 text-right">Qtd.</div>{movement.total !== null && <div className="w-28 text-right">Custo</div>}
              </div>
              {movement.lines.map((line) => (
                <div key={line.id} className="flex flex-col md:flex-row md:items-center gap-1 px-3 py-2 border-t">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{line.code} — {line.item}</p>
                    <p className="text-xs text-muted-foreground">{[line.lot && `lote ${line.lot}`, line.tag && `peça ${line.tag}`, line.condition && line.condition !== "ok" && `voltou ${line.condition}`, line.chargedToOrder && "conta no custo da obra", line.note].filter(Boolean).join(" · ") || " "}</p>
                  </div>
                  <div className="md:w-48 text-xs text-muted-foreground">{line.from} → {line.to}</div>
                  <div className="md:w-24 md:text-right tabular-nums">{qty(line.quantity)} {line.unit}</div>
                  {movement.total !== null && <div className="md:w-28 md:text-right tabular-nums">{money(line.totalCost)}</div>}
                </div>
              ))}
              {movement.total !== null && <div className="px-3 py-2 border-t text-right font-semibold tabular-nums">Total {money(movement.total)}</div>}
            </div>
            {movement.signature && (
              <p className="text-muted-foreground">Recebido por <span className="text-foreground">{movement.signature.name ?? "—"}</span>{movement.signature.document ? ` (${movement.signature.document})` : ""}{movement.signature.at ? ` em ${new Date(movement.signature.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : ""}</p>
            )}
            {movement.canReverse && !reversing && (
              <Button type="button" variant="outline" className="w-fit" onClick={() => setReversing(true)}><Icon name="undo-2" className="w-4 h-4 mr-1" /> Estornar</Button>
            )}
            {movement.canReverse && reversing && (
              <div className="rounded border border-red-300 dark:border-red-800 p-3 grid gap-3">
                <p>O estorno lança o movimento contrário: o que entrou sai e o que saiu volta. Se parte já foi usada em outra movimentação, ele não passa.</p>
                <div><Label htmlFor="reverseNote">Motivo (opcional)</Label>
                  <Textarea id="reverseNote" className="mt-1" rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></div>
                <SlideConfirm label="Deslize para estornar" pending={isPending} onConfirm={() => reverse()} />
                <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setReversing(false)}>Desistir</Button>
              </div>
            )}
          </div>
        )}
        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- carga inicial por planilha

/** Lê o arquivo em UTF-8; se não for (planilha salva pelo Excel), em Windows-1252. */
async function readText(file: File) {
  const buffer = await file.arrayBuffer();
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buffer); } catch { return new TextDecoder("windows-1252").decode(buffer); }
}

export function ImportCsvButton() {
  const { can } = useVerify();
  const refresh = useStockRefresh();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { mutate, isPending } = useMutation({
    mutationFn: async (file: File) => stockApi.post<ImportResult>("import", { csv: await readText(file) }),
    onSuccess: (value) => {
      refresh();
      for (const key of [STOCK_KEYS.options, STOCK_KEYS.categories]) queryClient.invalidateQueries({ queryKey: [key] });
      setResult(value);
    },
    onError: (err) => toast({ title: "Não foi possível importar a planilha", description: errorMessage(err), variant: "destructive" }),
  });
  if (!can(PERM_ADJUST)) return null;
  return (
    <>
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) mutate(file); event.target.value = ""; }} />
      <Tip text="CSV com cabeçalho: código; nome; categoria; unidade; controle; quantidade; local; custo; série; fabricação; lote; validade. Só a coluna nome é obrigatória.">
        <Button type="button" variant="outline" disabled={isPending} onClick={() => fileRef.current?.click()}><Icon name="file-spreadsheet" className="w-4 h-4 mr-1" /> {isPending ? "Importando..." : "Carga por planilha"}</Button>
      </Tip>
      {result && (
        <Dialog open onOpenChange={(open) => { if (!open) setResult(null); }}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Planilha importada</DialogTitle>
              <DialogDescription>O saldo de cada local entrou como "Saldo inicial", numa movimentação por local.</DialogDescription>
            </DialogHeader>
            <ul className="grid gap-1 text-sm">
              <li>{result.lines} linha(s) com saldo lançado</li>
              <li>{result.items} item(ns) novo(s) cadastrado(s)</li>
              <li>{result.categories} categoria(s) e {result.locations} local(is) criados</li>
            </ul>
            {result.errors.length > 0 && (
              <div className="rounded border border-red-300 dark:border-red-800 p-3 text-sm">
                <p className="font-medium">{result.errors.length} linha(s) não entraram:</p>
                <ul className="mt-1 grid gap-0.5 text-xs text-muted-foreground max-h-60 overflow-y-auto">{result.errors.map((message, index) => <li key={index}>{message}</li>)}</ul>
              </div>
            )}
            <DialogFooter><Button type="button" onClick={() => setResult(null)}>Fechar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
