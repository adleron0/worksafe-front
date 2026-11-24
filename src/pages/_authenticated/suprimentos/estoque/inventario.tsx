import tailwindUtils from "@/utils/tailwind.utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { errorMessage } from "../../comercial/-shared/commercial";
import { PERM_ADJUST, Pill, toOptions, useStockOptions } from "../-shared/stock";
import { LocationField, useLocationValue } from "../-shared/stock-pickers";
import { COUNTS_KEY, Count, CountRow, countStatusTone, countsApi } from "../-shared/inventory";

export const Route = createFileRoute("/_authenticated/suprimentos/estoque/inventario")({
  component: CountsPage,
  // ?novo=1 abre direto a "Nova contagem" (atalho da Visão geral)
  validateSearch: (search: Record<string, unknown>): { novo?: "1" } => (search.novo === "1" || search.novo === 1 ? { novo: "1" as const } : {}),
});

/** Inventário: contagens por local; cada uma fecha num ajuste único com as diferenças. */
function CountsPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const { novo } = Route.useSearch();
  const [opening, setOpening] = useState(novo === "1");
  const { data, isLoading, error } = useQuery({ queryKey: [COUNTS_KEY], queryFn: () => countsApi.get<CountRow[]>("") });
  if (!can(`view_${PERM_ADJUST}`)) return null;
  const open = (id: number) => navigate({ to: "/suprimentos/estoque/inventario/$countId", params: { countId: String(id) } });

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Inventário</h1>
          <p className="text-sm text-muted-foreground">Conte o que há em cada local. Ao fechar, as diferenças viram um ajuste; peça não achada fica bloqueada como "não localizada".</p>
        </div>
        {can(PERM_ADJUST) && <Button onClick={() => setOpening(true)}><Icon name="plus" className="w-4 h-4 mr-1" /> Nova contagem</Button>}
      </div>
      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {!error && (
        <div className="mt-4 rounded-card border bg-card overflow-hidden">
          <div className="hidden lg:flex items-center py-2.5 border-b px-4 font-semibold text-[12.5px] text-muted-foreground">
            <div className="w-20">Nº</div><div className="flex-1">Local</div><div className="w-32">Situação</div><div className="w-40">Aberta em</div><div className="w-40 text-right">Contados</div><div className="w-32 text-right">Diferenças</div>
          </div>
          {isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12 w-full my-1" />)}
          {!isLoading && !data?.length && <p className="p-6 text-sm text-muted-foreground">Nenhuma contagem ainda.</p>}
          {data?.map((row) => (
            <button key={row.id} type="button" onClick={() => open(row.id)} className={`w-full text-left flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-3 last:border-b-0 text-sm ${tailwindUtils.itemClickable}`}>
              <div className="lg:w-20 font-semibold tabular-nums">#{row.id}</div>
              <div className="flex-1 min-w-0 flex items-center gap-2">{row.location} {row.blindCount && <Pill>Às cegas</Pill>}</div>
              <div className="lg:w-32"><Pill tone={countStatusTone(row.status)}>{row.status === "aberta" ? "Aberta" : row.status === "fechada" ? "Fechada" : "Cancelada"}</Pill></div>
              <div className="lg:w-40 text-muted-foreground">{new Date(row.openedAt).toLocaleDateString("pt-BR")}</div>
              <div className="lg:w-40 lg:text-right tabular-nums">{row.counted} de {row.lines}</div>
              <div className="lg:w-32 lg:text-right tabular-nums">{row.status === "aberta" && row.blindCount ? "—" : row.differences}</div>
            </button>
          ))}
        </div>
      )}
      {opening && <OpenCountDialog onClose={() => setOpening(false)} onOpened={(count) => open(count.id)} />}
    </>
  );
}

function OpenCountDialog({ onClose, onOpened }: { onClose: () => void; onOpened: (count: Count) => void }) {
  const queryClient = useQueryClient();
  const { data: options } = useStockOptions();
  const [chosenLocation, setLocationId] = useState("");
  const locationId = useLocationValue(chosenLocation);
  const [categoryId, setCategoryId] = useState("");
  const [blindCount, setBlindCount] = useState(true);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => countsApi.post<Count>("", { locationId: Number(locationId), categoryId: categoryId || null, blindCount, note: note.trim() }),
    onSuccess: (count) => { queryClient.invalidateQueries({ queryKey: [COUNTS_KEY] }); toast({ title: `Contagem #${count.id} aberta`, variant: "success" }); onClose(); onOpened(count); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!locationId) return setError("Escolha o local.");
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova contagem</DialogTitle>
          <DialogDescription>A lista do que contar sai do saldo do local agora. Às cegas, quem conta não vê o que o sistema espera.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <LocationField label="Local" value={locationId} onChange={setLocationId} />
          <div><Label>Só esta categoria</Label>
            <Select name="categoryId" options={toOptions(options?.categories)} state={categoryId} clearable modal onChange={(_, value) => setCategoryId(String(value ?? ""))} placeholder="Todas" /></div>
          <div className="flex items-center gap-2">
            <Checkbox id="blindCount" checked={blindCount} onCheckedChange={(checked) => setBlindCount(checked === true)} />
            <Label htmlFor="blindCount">Contagem às cegas</Label>
          </div>
          <div><Label htmlFor="countNote">Observação (opcional)</Label>
            <Textarea id="countNote" className="mt-1" rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Abrindo..." : "Abrir contagem"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
