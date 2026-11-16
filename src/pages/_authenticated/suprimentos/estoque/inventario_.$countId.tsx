import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import { Input as ShadInput } from "@/components/ui/input";
import SlideConfirm from "@/components/general-components/SlideConfirm";
import { cn } from "@/lib/utils";
import { NumField, Tip, errorMessage, money } from "../../comercial/-shared/commercial";
import { PERM_ADJUST, Pill, qty } from "../-shared/stock";
import { useStockRefresh, MovementDetailDialog } from "../-shared/stock-movements";
import { COUNTS_KEY, COUNT_KEY, Count, CountLine, countStatusTone, countsApi } from "../-shared/inventory";

export const Route = createFileRoute("/_authenticated/suprimentos/estoque/inventario_/$countId")({
  component: CountPage,
});

/** A contagem: lista grande para o celular, um campo por item, "achei / não achei" por peça e leitura da etiqueta. */
function CountPage() {
  const { countId } = Route.useParams();
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const refresh = useStockRefresh();
  const [edits, setEdits] = useState<Record<number, number | null>>({});
  const [tag, setTag] = useState("");
  const tagRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [movementId, setMovementId] = useState<number | null>(null);
  const { data: count, isLoading, error } = useQuery({ queryKey: [COUNT_KEY, countId], queryFn: () => countsApi.get<Count>(countId) });
  const apply = (result: Count) => { queryClient.setQueryData([COUNT_KEY, countId], result); queryClient.invalidateQueries({ queryKey: [COUNTS_KEY] }); };

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (body: { lines?: Array<{ id: number; counted: number | null }>; tag?: string }) => countsApi.put<Count>(countId, body),
    onSuccess: (result, body) => {
      apply(result);
      // tira das pendentes só o que foi salvo e não mudou de novo enquanto salvava
      if (body.lines) setEdits((current) => Object.fromEntries(Object.entries(current).filter(([id, value]) => !body.lines!.some((line) => String(line.id) === id && line.counted === value))));
      if (body.tag) { setTag(""); toast({ title: `${body.tag.toUpperCase()} achada`, variant: "success" }); tagRef.current?.focus(); }
    },
    onError: (err) => toast({ title: "Não foi possível salvar", description: errorMessage(err), variant: "destructive" }),
  });
  const { mutate: cancel } = useMutation({
    mutationFn: () => countsApi.post<Count>(`${countId}/close`, { cancel: true }),
    onSuccess: (result) => { apply(result); toast({ title: "Contagem cancelada", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível cancelar", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`view_${PERM_ADJUST}`)) return null;
  if (error) return <div className="p-4"><p className="text-destructive font-medium">Erro: {errorMessage(error)}</p><Link to="/suprimentos/estoque/inventario" className="underline text-sm">Voltar para o inventário</Link></div>;
  if (isLoading || !count) return <div className="grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-64 w-full" /></div>;

  const open = count.status === "aberta" && can(PERM_ADJUST);
  const valueOf = (line: CountLine) => (line.id in edits ? edits[line.id] : line.counted);
  const pendingEdits = Object.entries(edits).map(([id, counted]) => ({ id: Number(id), counted }));
  const term = search.trim().toLowerCase();
  const lines = count.lines.filter((line) => (!term || `${line.code} ${line.item} ${line.tag ?? ""} ${line.lot ?? ""}`.toLowerCase().includes(term)) && (!onlyPending || valueOf(line) === null));
  const done = count.lines.filter((line) => valueOf(line) !== null).length;
  const setCounted = (line: CountLine, value: number | null, now = false) => {
    setEdits((current) => ({ ...current, [line.id]: value }));
    if (now) save({ lines: [{ id: line.id, counted: value }] });
  };
  const saveLine = (line: CountLine) => {
    if (line.id in edits && edits[line.id] !== line.counted) save({ lines: [{ id: line.id, counted: edits[line.id] }] });
  };
  const missingCount = count.lines.filter((line) => valueOf(line) === null && !line.unitId).length;

  return (
    <div className="pb-24">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/suprimentos/estoque/inventario" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Inventário</Link>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h1 className="text-xl font-bold">Contagem #{count.id} · {count.location?.name}</h1>
            <Pill tone={countStatusTone(count.status)}>{count.status === "aberta" ? "Aberta" : count.status === "fechada" ? "Fechada" : "Cancelada"}</Pill>
            {count.blindCount && <Pill>Às cegas</Pill>}
          </div>
          {open && missingCount > 0 && <p className="text-xs text-amber-700 dark:text-amber-400">Faltam {missingCount} item(ns) para contar. Dá para fechar assim mesmo, considerando zero.</p>}
          <p className="text-sm text-muted-foreground">{done} de {count.lines.length} contados{count.totalValue !== null ? ` · diferença em valor ${money(count.totalValue)}` : ""}{count.note ? ` · ${count.note}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {count.movementId && <Button type="button" variant="outline" size="sm" onClick={() => setMovementId(count.movementId)}><Icon name="arrow-left-right" className="w-4 h-4 mr-1" /> Ver o ajuste</Button>}
          {open && (
            <ConfirmDialog title="Cancelar esta contagem?" description="Nada muda no estoque. Dá para abrir outra contagem no local depois." onConfirm={() => cancel()}>
              <Button type="button" variant="outline" size="sm"><Icon name="ban" className="w-4 h-4 mr-1" /> Cancelar contagem</Button>
            </ConfirmDialog>
          )}
          {open && (pendingEdits.length > 0 || saving
            ? <Tip text="Esperando salvar o que foi contado"><span tabIndex={0}><Button type="button" size="sm" disabled><Icon name="clipboard-check" className="w-4 h-4 mr-1" /> Fechar contagem</Button></span></Tip>
            : <Button type="button" size="sm" onClick={() => setClosing(true)}><Icon name="clipboard-check" className="w-4 h-4 mr-1" /> Fechar contagem</Button>)}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 my-4 p-4 rounded-lg border">
        {open && (
          <form className="flex gap-2 w-full sm:w-80" onSubmit={(event) => { event.preventDefault(); if (tag.trim()) save({ tag: tag.trim() }); }}>
            <ShadInput ref={tagRef} autoFocus name="tag" value={tag} onChange={(event) => setTag(event.target.value)} placeholder="Digite ou bipe a etiqueta" aria-label="Etiqueta da peça" />
            <Button type="submit" variant="outline" disabled={!tag.trim() || saving}>Achei</Button>
          </form>
        )}
        <div className="w-full sm:w-72"><Input name="search" value={search} onValueChange={(_, value) => setSearch(String(value))} placeholder="Filtrar a lista..." icon="search" /></div>
        <div className="flex items-center gap-2">
          <Checkbox id="onlyPending" checked={onlyPending} onCheckedChange={(checked) => setOnlyPending(checked === true)} />
          <Label htmlFor="onlyPending">Só o que falta contar</Label>
        </div>
      </div>

      <div className="rounded-lg border divide-y">
        {lines.length === 0 && <p className="p-6 text-sm text-muted-foreground">Nada para mostrar.</p>}
        {lines.map((line) => {
          const value = valueOf(line);
          const changed = line.id in edits;
          return (
            <div key={line.id} className={cn("p-3 sm:px-4 grid sm:grid-cols-12 gap-2 items-center", changed && "bg-amber-50 dark:bg-amber-950/30")}>
              <div className="sm:col-span-6 min-w-0">
                <p className="font-medium text-base truncate">{line.item}</p>
                <p className="text-xs text-muted-foreground">{[line.code, line.tag && `peça ${line.tag}`, line.lot && `lote ${line.lot}`].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="sm:col-span-4">
                {line.unitId ? (
                  <div className="flex gap-2">
                    <Button type="button" size="lg" className="flex-1" variant={value === 1 ? "default" : "outline"} disabled={!open} onClick={() => setCounted(line, 1, true)}><Icon name="check" className="w-4 h-4 mr-1" /> Achei</Button>
                    <Button type="button" size="lg" className="flex-1" variant={value === 0 ? "destructive" : "outline"} disabled={!open} onClick={() => setCounted(line, 0, true)}>Não achei</Button>
                  </div>
                ) : (
                  // salva sozinho ao sair do campo
                  <div onBlur={() => saveLine(line)}>
                    <NumField value={value} digits={3} suffix={line.unit} disabled={!open} placeholder="Contado" ariaLabel={`Quantidade contada de ${line.item}`}
                      onChange={(next) => setCounted(line, next)} onEmpty={() => setCounted(line, null)} />
                  </div>
                )}
              </div>
              <div className="sm:col-span-2 text-xs sm:text-right tabular-nums">
                {line.expected !== null && <p className="text-muted-foreground">sistema: {qty(line.expected)}</p>}
                {line.difference !== null && line.difference !== 0 && <p className={line.difference > 0 ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}>{line.difference > 0 ? "+" : ""}{qty(line.difference)}{line.value !== null ? ` · ${money(line.value)}` : ""}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {open && pendingEdits.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t bg-background p-3 flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-sm text-muted-foreground">{saving ? "Salvando..." : `${pendingEdits.length} alteração(ões) por salvar`}</span>
          <Button type="button" variant="outline" onClick={() => setEdits({})}>Descartar</Button>
          <Button type="button" disabled={saving} onClick={() => save({ lines: pendingEdits })}>{saving ? "Salvando..." : "Salvar contagem"}</Button>
        </div>
      )}

      {closing && <CloseDialog count={count} onClose={() => setClosing(false)} onClosed={(result) => { apply(result); refresh(); }} />}
      {movementId && <MovementDetailDialog id={movementId} onClose={() => setMovementId(null)} />}
    </div>
  );
}

function CloseDialog({ count, onClose, onClosed }: { count: Count; onClose: () => void; onClosed: (count: Count) => void }) {
  const [zeroMissing, setZeroMissing] = useState(false);
  const missing = count.lines.filter((line) => line.counted === null && !line.unitId);
  const unitsMissing = count.lines.filter((line) => line.unitId && (line.counted ?? 0) < 1);
  const differences = count.lines.filter((line) => line.difference !== null && Math.abs(line.difference) > 0.0005);
  const { mutate, isPending } = useMutation({
    mutationFn: () => countsApi.post<Count>(`${count.id}/close`, { zeroMissing }),
    onSuccess: (result) => { onClosed(result); toast({ title: `Contagem #${count.id} fechada`, variant: "success" }); onClose(); },
    onError: (err) => toast({ title: "Não foi possível fechar", description: errorMessage(err), variant: "destructive" }),
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fechar a contagem #{count.id}</DialogTitle>
          <DialogDescription>As diferenças viram um ajuste de estoque só, com o motivo "Inventário #{count.id}". Não dá para reabrir.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 text-sm">
          {count.blindCount ? (
            <p className="text-muted-foreground">Contagem às cegas: as diferenças aparecem depois de fechar.</p>
          ) : differences.length === 0 ? <p>Nenhuma diferença nos itens contados.</p> : (
            <div className="rounded border divide-y max-h-60 overflow-y-auto">
              {differences.map((line) => (
                <div key={line.id} className="px-3 py-1.5 flex items-center justify-between gap-3">
                  <span className="truncate">{line.item}{line.tag ? ` · ${line.tag}` : ""}</span>
                  <span className={cn("tabular-nums shrink-0", (line.difference ?? 0) > 0 ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                    {(line.difference ?? 0) > 0 ? "+" : ""}{qty(line.difference)} {line.unit}{line.value !== null ? ` · ${money(line.value)}` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
          {count.totalValue !== null && !count.blindCount && <p>Diferença em valor: <span className="font-semibold tabular-nums">{money(count.totalValue)}</span></p>}
          {unitsMissing.length > 0 && <p className="text-amber-700 dark:text-amber-400">{unitsMissing.length} peça(s) não achada(s) ficam bloqueadas como "não localizada" (não são baixadas).</p>}
          {missing.length > 0 && (
            <div className="flex items-start gap-2 rounded border border-amber-300 dark:border-amber-800 p-3">
              <Checkbox id="zeroMissing" className="mt-0.5" checked={zeroMissing} onCheckedChange={(checked) => setZeroMissing(checked === true)} />
              <Label htmlFor="zeroMissing" className="font-normal">{missing.length} item(ns) sem contagem: considerar zero (o saldo deles sai do estoque).</Label>
            </div>
          )}
          <SlideConfirm label="Deslize para fechar a contagem" pending={isPending} disabled={missing.length > 0 && !zeroMissing} onConfirm={() => mutate()} />
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Voltar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
