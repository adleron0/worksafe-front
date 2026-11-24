import { createFileRoute } from "@tanstack/react-router";
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
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { Tip, errorMessage } from "../../comercial/-shared/commercial";
import { Location, Pill, STOCK_ABILITY, STOCK_KEYS, StockOptions, stockApi, useStockOptions } from "../-shared/stock";

export const Route = createFileRoute("/_authenticated/suprimentos/estoque/locais")({
  component: LocationsPage,
});

/** Locais de estoque: almoxarifado, container, veículo... de onde o material sai e para onde volta. */
function LocationsPage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Location | "novo" | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const { data: options } = useStockOptions();
  const { data, isLoading, error } = useQuery({
    queryKey: [STOCK_KEYS.locations, showInactive],
    queryFn: () => stockApi.get<Location[]>("locations", showInactive ? { all: "1" } : undefined),
  });
  const refresh = () => { for (const key of [STOCK_KEYS.locations, STOCK_KEYS.options]) queryClient.invalidateQueries({ queryKey: [key] }); };
  const { mutate: toggle } = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => stockApi.patch<{ ok: boolean }>(`locations/${id}/${active ? "active" : "inactive"}`),
    onSuccess: (_, { active }) => { refresh(); toast({ title: active ? "Local reativado" : "Local inativado", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível alterar o local", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`view_${STOCK_ABILITY}`)) return null;
  const rows = data ?? [];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Locais de estoque</h1>
          <p className="text-sm text-muted-foreground">Onde o material fica guardado. Obras, funcionários e locações não entram aqui: o sistema controla à parte.</p>
        </div>
        {can(`create_${STOCK_ABILITY}`) && <Button onClick={() => setEditing("novo")}><Icon name="plus" className="w-4 h-4 mr-1" /> Novo local</Button>}
      </div>
      <div className="flex items-center gap-2 my-4">
        <Checkbox id="showInactive" checked={showInactive} onCheckedChange={(checked) => setShowInactive(checked === true)} />
        <Label htmlFor="showInactive">Mostrar inativos</Label>
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {isLoading && <div className="grid gap-2">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
      {!isLoading && !error && (
        <div className="rounded-card border bg-card overflow-hidden">
          {rows.map((row) => (
            <div key={row.id} className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-2.5 border-b border-border/70 last:border-b-0 hover:bg-muted/40 transition-colors text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium flex items-center gap-2">{row.name} {!row.active && <Pill>Inativo</Pill>}</p>
                {row.notes && <p className="text-xs text-muted-foreground truncate">{row.notes}</p>}
              </div>
              <div className="lg:w-44 text-muted-foreground">{row.kindLabel}</div>
              <div className="lg:w-52 text-muted-foreground truncate">{row.place ?? "—"}</div>
              <div className="lg:w-44 text-muted-foreground truncate">{row.responsible ? `Resp.: ${row.responsible}` : "Sem responsável"}</div>
              <div className="lg:w-28 tabular-nums">{row.items} item(ns)</div>
              <div className="lg:w-24 flex lg:justify-end gap-1">
                {can(`update_${STOCK_ABILITY}`) && <Tip text="Editar"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Editar ${row.name}`} onClick={() => setEditing(row)}><Icon name="pencil" className="w-4 h-4" /></Button></Tip>}
                {row.active && can(`inactive_${STOCK_ABILITY}`) && (
                  <ConfirmDialog title={`Inativar "${row.name}"?`} description="Só dá para inativar um local sem saldo: transfira o que estiver nele antes." onConfirm={() => toggle({ id: row.id, active: false })}>
                    <span><Tip text="Inativar"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Inativar ${row.name}`}><Icon name="archive" className="w-4 h-4" /></Button></Tip></span>
                  </ConfirmDialog>
                )}
                {!row.active && can(`activate_${STOCK_ABILITY}`) && <Tip text="Reativar"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Reativar ${row.name}`} onClick={() => toggle({ id: row.id, active: true })}><Icon name="archive-restore" className="w-4 h-4" /></Button></Tip>}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <LocationDialog location={editing === "novo" ? undefined : editing} options={options} onClose={() => setEditing(null)} onSaved={refresh} />}
    </>
  );
}

function LocationDialog({ location, options, onClose, onSaved }: { location?: Location; options?: StockOptions; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(location?.name ?? "");
  const [kind, setKind] = useState(location?.kind ?? "almoxarifado");
  const [placeId, setPlaceId] = useState(location?.placeId ? String(location.placeId) : "");
  const [responsibleUserId, setResponsibleUserId] = useState(location?.responsibleUserId ? String(location.responsibleUserId) : "");
  const [notes, setNotes] = useState(location?.notes ?? "");
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), kind, placeId: placeId || null, responsibleUserId: responsibleUserId || null, notes: notes.trim() };
      return location ? stockApi.put<Location>(`locations/${location.id}`, body) : stockApi.post<Location>("locations", body);
    },
    onSuccess: () => { onSaved(); toast({ title: location ? "Local salvo" : "Local criado", variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return setError("Informe o nome do local.");
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{location ? "Editar local" : "Novo local de estoque"}</DialogTitle>
          <DialogDescription>O lugar ligado ao local mostra onde ele fica no mapa (cadastro de Locais do RH).</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label htmlFor="locationName">Nome <span>*</span></Label>
              <Input id="locationName" name="locationName" value={name} maxLength={120} onValueChange={(_, value) => setName(String(value))} className="mt-1" placeholder="Ex.: Almoxarifado central" /></div>
            <div><Label>Tipo</Label>
              <Select name="kind" options={options?.locationKinds ?? []} state={kind} modal onChange={(_, value) => setKind(String(value || "almoxarifado"))} placeholder="Selecione" /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Lugar</Label>
              <Select name="placeId" options={options?.places ?? []} state={placeId} clearable modal onChange={(_, value) => setPlaceId(String(value ?? ""))} placeholder="Nenhum" /></div>
            <div><Label>Responsável</Label>
              <Select name="responsibleUserId" options={options?.users ?? []} state={responsibleUserId} clearable modal onChange={(_, value) => setResponsibleUserId(String(value ?? ""))} placeholder="Ninguém" /></div>
          </div>
          <div><Label htmlFor="locationNotes">Observações</Label>
            <Textarea id="locationNotes" className="mt-1" rows={2} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
