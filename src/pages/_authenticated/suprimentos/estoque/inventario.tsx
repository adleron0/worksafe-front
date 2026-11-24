import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import StatusBadge, { StatusTone } from "@/components/general-components/StatusBadge";
import TagBadge from "@/components/general-components/TagBadge";
import { errorMessage } from "../../comercial/-shared/commercial";
import { PERM_ADJUST, toOptions, useStockOptions } from "../-shared/stock";
import { LocationField, useLocationValue } from "../-shared/stock-pickers";
import { COUNTS_KEY, Count, CountRow, countStatusTone, countsApi } from "../-shared/inventory";

export const Route = createFileRoute("/_authenticated/suprimentos/estoque/inventario")({
  component: CountsPage,
  // ?novo=1 abre direto a "Nova contagem" (atalho da Visão geral)
  validateSearch: (search: Record<string, unknown>): { novo?: "1" } => (search.novo === "1" || search.novo === 1 ? { novo: "1" as const } : {}),
});

const COUNT_TONE: Record<ReturnType<typeof countStatusTone>, StatusTone> = { amber: "warning", green: "success", muted: "neutral" };

/** Inventário: contagens por local; cada uma fecha num ajuste único com as diferenças. */
function CountsPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const { novo } = Route.useSearch();
  const [opening, setOpening] = useState(novo === "1");
  const { data, isLoading, error, refetch } = useQuery({ queryKey: [COUNTS_KEY], queryFn: () => countsApi.get<CountRow[]>("") });
  if (!can(`view_${PERM_ADJUST}`)) return null;
  const open = (id: number) => navigate({ to: "/suprimentos/estoque/inventario/$countId", params: { countId: String(id) } });

  const columns: DataColumn<CountRow>[] = [
    { id: "id", header: "Nº", className: "w-16 font-semibold tabular-nums", cell: (row) => `#${row.id}` },
    { id: "location", header: "Local", cell: (row) => <span className="inline-flex items-center gap-2">{row.location} {row.blindCount && <TagBadge>Às cegas</TagBadge>}</span> },
    { id: "status", header: "Situação", className: "w-28", cell: (row) => <StatusBadge tone={COUNT_TONE[countStatusTone(row.status)]}>{row.status === "aberta" ? "Aberta" : row.status === "fechada" ? "Fechada" : "Cancelada"}</StatusBadge> },
    { id: "openedAt", header: "Aberta em", className: "w-28 text-muted-foreground tabular-nums", cell: (row) => new Date(row.openedAt).toLocaleDateString("pt-BR") },
    { id: "counted", header: "Contados", align: "right", className: "w-28 tabular-nums", cell: (row) => `${row.counted} de ${row.lines}` },
    { id: "differences", header: "Diferenças", align: "right", className: "w-24 tabular-nums", cell: (row) => (row.status === "aberta" && row.blindCount ? "—" : row.differences) },
  ];

  return (
    <>
      <PageHeader title="Inventário" description={'Conte o que há em cada local. Ao fechar, as diferenças viram um ajuste; peça não achada fica bloqueada como "não localizada".'} />
      <ListCard>
        {can(PERM_ADJUST) && (
          <ListToolbar>
            <Button onClick={() => setOpening(true)}><Icon name="plus" className="w-4 h-4" /> Nova contagem</Button>
          </ListToolbar>
        )}
        <DataTable rows={data} columns={columns} getRowId={(row) => row.id} ariaLabel="Contagens" skeletonRows={3}
          loading={isLoading} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
          onRowClick={(row) => open(row.id)}
          empty={<EmptyState title="Nenhuma contagem ainda." action={can(PERM_ADJUST) && <Button size="sm" onClick={() => setOpening(true)}><Icon name="plus" className="w-4 h-4" /> Nova contagem</Button>} />} />
      </ListCard>
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
