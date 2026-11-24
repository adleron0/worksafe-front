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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import MapView, { MapPoint } from "@/components/general-components/MapView";
import Select from "@/components/general-components/Select";
import { Tip, dateBr, errorMessage } from "../../comercial/-shared/commercial";
import { CUSTOMER_POINTS_KEY, CustomerPoint, CustomerPoints, PLACES_ABILITY, PLACES_KEY, PLACE_COLOR, Place, PlaceList, PointDialog, placesApi, usePlaces } from "../-shared/places";

export const Route = createFileRoute("/_authenticated/rh/_locais/locais")({
  component: PlacesPage,
});

/** Locais: os pontos da empresa (CTs, bases) e o ponto de cada cliente no mapa. */
function PlacesPage() {
  const { can } = useVerify();
  if (!can(`view_${PLACES_ABILITY}`)) return null;
  const canWrite = can(`update_${PLACES_ABILITY}`);
  return (
    <>
      <div>
        <h1 className="text-xl font-bold">Locais</h1>
        <p className="text-sm text-muted-foreground">Os pontos da empresa (centros de treinamento, bases temporárias) e onde fica cada cliente. É o que o mapa de alocação mostra.</p>
      </div>
      <Tabs defaultValue="empresa" className="mt-4">
        <TabsList>
          <TabsTrigger value="empresa">Locais da empresa</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
        </TabsList>
        <TabsContent value="empresa" className="mt-4"><CompanyPlaces canWrite={canWrite} /></TabsContent>
        <TabsContent value="clientes" className="mt-4"><CustomerPlaces canWrite={canWrite} /></TabsContent>
      </Tabs>
    </>
  );
}

// ---------------------------------------------------------------- locais da empresa

function CompanyPlaces({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = usePlaces();
  const [editing, setEditing] = useState<Place | "novo" | null>(null);
  const { mutate: inactivate } = useMutation({
    mutationFn: (id: number) => placesApi.patch<Place>(`${id}/inactive`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [PLACES_KEY] }); toast({ title: "Local inativado", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível inativar", description: errorMessage(err), variant: "destructive" }),
  });
  const points = (data?.rows ?? []).filter((place) => place.latitude !== null && place.longitude !== null);

  return (
    <div className="grid gap-4">
      {canWrite && <Button className="w-fit" onClick={() => setEditing("novo")}><Icon name="plus" className="w-4 h-4 mr-1" /> Novo local</Button>}
      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {isLoading && <Skeleton className="h-40 w-full" />}
      {data && (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-lg border">
            {!data.rows.length && <p className="p-6 text-sm text-muted-foreground">Nenhum local cadastrado. Comece pelo centro de treinamento.</p>}
            {data.rows.map((place) => (
              <div key={place.id} className="flex items-start gap-3 border-b px-4 py-3 text-sm last:border-b-0">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: PLACE_COLOR[place.kind] ?? "#475569" }} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{place.name} <span className="font-normal text-muted-foreground">· {place.kindName}</span></p>
                  <p className="text-xs text-muted-foreground">{place.address ?? "Sem endereço"}</p>
                  {(place.startDate || place.endDate) && <p className="text-xs text-muted-foreground">{place.startDate ? `desde ${dateBr(place.startDate)}` : ""}{place.endDate ? ` até ${dateBr(place.endDate)}` : ""}{!place.current ? " · fora do período" : ""}</p>}
                  {place.latitude === null && <p className="text-xs text-amber-700 dark:text-amber-400">Sem ponto no mapa</p>}
                </div>
                {canWrite && <Tip text="Editar"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Editar ${place.name}`} onClick={() => setEditing(place)}><Icon name="pencil" className="w-4 h-4" /></Button></Tip>}
                {canWrite && (
                  <ConfirmDialog title={`Inativar "${place.name}"?`} description="O local some do mapa e das escolhas. O que já foi lançado nele continua guardado." onConfirm={() => inactivate(place.id)}>
                    <span><Tip text="Inativar"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Inativar ${place.name}`}><Icon name="archive" className="w-4 h-4" /></Button></Tip></span>
                  </ConfirmDialog>
                )}
              </div>
            ))}
          </div>
          <MapView className="h-96" markers={points.map((place) => ({ id: place.id, latitude: place.latitude as number, longitude: place.longitude as number, label: `${place.name} · ${place.kindName}`, color: PLACE_COLOR[place.kind], onClick: canWrite ? () => setEditing(place) : undefined }))} />
        </div>
      )}
      {editing && data && <PlaceDialog place={editing === "novo" ? undefined : editing} options={data} onClose={() => setEditing(null)} />}
    </div>
  );
}

interface PlaceDraft { name: string; kind: string; street: string; number: string; neighborhood: string; city: string; state: string; startDate: string; endDate: string; notes: string; point: MapPoint | null }
const placeDraft = (place?: Place): PlaceDraft => ({
  name: place?.name ?? "", kind: place?.kind ?? "ct", street: place?.street ?? "", number: place?.number ?? "", neighborhood: place?.neighborhood ?? "", city: place?.city ?? "", state: place?.state ?? "PE",
  startDate: place?.startDate ?? "", endDate: place?.endDate ?? "", notes: place?.notes ?? "", point: place && place.latitude !== null && place.longitude !== null ? { latitude: place.latitude, longitude: place.longitude } : null,
});

function PlaceDialog({ place, options, onClose }: { place?: Place; options: PlaceList; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<PlaceDraft>(placeDraft(place));
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof PlaceDraft>(key: K, value: PlaceDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const body = {
        name: draft.name.trim(), kind: draft.kind, street: draft.street.trim(), number: draft.number.trim(), neighborhood: draft.neighborhood.trim(), city: draft.city.trim(), state: draft.state.trim(),
        startDate: draft.kind === "base" ? draft.startDate || null : null, endDate: draft.kind === "base" ? draft.endDate || null : null, notes: draft.notes.trim(),
        latitude: draft.point?.latitude ?? null, longitude: draft.point?.longitude ?? null,
      };
      return place ? placesApi.put<Place>(String(place.id), body) : placesApi.post<Place>("", body);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [PLACES_KEY] }); toast({ title: place ? "Local salvo" : "Local cadastrado", variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.name.trim().length < 2) return setError("Informe o nome do local.");
    setError(""); mutate();
  };

  return (
    <>
      <Dialog open={!picking} onOpenChange={(open) => { if (!open && !picking) onClose(); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{place ? "Editar local" : "Novo local"}</DialogTitle>
            <DialogDescription>Centro de treinamento, base temporária ou outro ponto da empresa.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
              <div>
                <Label htmlFor="placeName">Nome <span>*</span></Label>
                <Input id="placeName" name="placeName" className="mt-1" value={draft.name} maxLength={120} onValueChange={(_, value) => set("name", String(value))} placeholder="Ex.: CT Recife" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select name="placeKind" modal options={options.kinds} state={draft.kind} onChange={(_, value) => set("kind", String(value ?? "ct"))} placeholder="Selecione" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
              <div>
                <Label htmlFor="placeStreet">Rua</Label>
                <Input id="placeStreet" name="placeStreet" className="mt-1" value={draft.street} maxLength={200} onValueChange={(_, value) => set("street", String(value))} />
              </div>
              <div>
                <Label htmlFor="placeNumber">Número</Label>
                <Input id="placeNumber" name="placeNumber" className="mt-1" value={draft.number} maxLength={20} onValueChange={(_, value) => set("number", String(value))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_5rem]">
              <div>
                <Label htmlFor="placeNeighborhood">Bairro</Label>
                <Input id="placeNeighborhood" name="placeNeighborhood" className="mt-1" value={draft.neighborhood} maxLength={120} onValueChange={(_, value) => set("neighborhood", String(value))} />
              </div>
              <div>
                <Label htmlFor="placeCity">Cidade</Label>
                <Input id="placeCity" name="placeCity" className="mt-1" value={draft.city} maxLength={120} onValueChange={(_, value) => set("city", String(value))} />
              </div>
              <div>
                <Label htmlFor="placeState">UF</Label>
                <Input id="placeState" name="placeState" className="mt-1" value={draft.state} maxLength={2} onValueChange={(_, value) => set("state", String(value).toUpperCase())} />
              </div>
            </div>
            {draft.kind === "base" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Base desde</Label>
                  <CalendarPicker mode="single" name="placeStart" className="mt-1 w-full" value={draft.startDate} placeholder="Não informado" fromYear={2020} toYear={2040} onValueChange={(_, value) => set("startDate", String(value ?? ""))} />
                </div>
                <div>
                  <Label>Até</Label>
                  <CalendarPicker mode="single" name="placeEnd" className="mt-1 w-full" value={draft.endDate} placeholder="Sem data para encerrar" fromYear={2020} toYear={2040} onValueChange={(_, value) => set("endDate", String(value ?? ""))} />
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm">
              <Icon name="map-pin" className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1">{draft.point ? `Ponto no mapa: ${draft.point.latitude.toFixed(5)}, ${draft.point.longitude.toFixed(5)}` : "Sem ponto no mapa"}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setPicking(true)}>{draft.point ? "Ajustar o ponto" : "Marcar no mapa"}</Button>
            </div>
            <div>
              <Label htmlFor="placeNotes">Observação</Label>
              <Textarea id="placeNotes" className="mt-1" rows={2} maxLength={500} value={draft.notes} onChange={(event) => set("notes", event.target.value)} />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {picking && (
        <PointDialog title={`Ponto de ${draft.name || "novo local"}`} point={draft.point} address={{ street: draft.street, number: draft.number, neighborhood: draft.neighborhood, city: draft.city, state: draft.state }}
          onSave={(point) => { set("point", point); setPicking(false); }} onClose={() => setPicking(false)} />
      )}
    </>
  );
}

// ---------------------------------------------------------------- ponto dos clientes

const SOURCE_TEXT = { endereco: "pelo endereço", manual: "ajustado à mão" } as const;

function CustomerPlaces({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [missing, setMissing] = useState(false);
  const [picking, setPicking] = useState<CustomerPoint | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const params = { ...(search.trim() ? { search: search.trim() } : {}), ...(missing ? { missing: "true" } : {}) };
  const { data, isLoading, error } = useQuery({ queryKey: [CUSTOMER_POINTS_KEY, params], queryFn: () => placesApi.get<CustomerPoints>("customers", params), placeholderData: (previous) => previous });
  const refresh = () => queryClient.invalidateQueries({ queryKey: [CUSTOMER_POINTS_KEY] });

  const { mutate: locate, variables: locatingId, isPending: locating } = useMutation({
    mutationFn: (id: number) => placesApi.post<{ found: boolean; precise: boolean }>(`customers/${id}/locate`),
    onSuccess: (result) => {
      refresh();
      if (!result.found) toast({ title: "Não achei o endereço deste cliente", description: "Use \"Ajustar no mapa\" para marcar o ponto à mão.", variant: "destructive" });
      else toast({ title: result.precise ? "Ponto encontrado pelo endereço" : "Só achei a cidade", description: result.precise ? undefined : "O ponto ficou no centro da cidade. Ajuste no mapa.", variant: "success" });
    },
    onError: (err) => toast({ title: "Não foi possível localizar", description: errorMessage(err), variant: "destructive" }),
  });
  const { mutate: savePoint, isPending: saving } = useMutation({
    mutationFn: ({ id, point }: { id: number; point: MapPoint | null }) => placesApi.put<CustomerPoint>(`customers/${id}/point`, { latitude: point?.latitude ?? null, longitude: point?.longitude ?? null }),
    onSuccess: () => { refresh(); setPicking(null); toast({ title: "Ponto salvo", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível salvar o ponto", description: errorMessage(err), variant: "destructive" }),
  });
  /** Localiza todos os que faltam, em lotes pequenos (o serviço pede um intervalo entre consultas). */
  const locateAll = async () => {
    const skip: number[] = [];
    let done = 0;
    setProgress("Localizando...");
    try {
      for (let round = 0; round < 200; round++) {
        const result = await placesApi.post<{ located: number; failed: number[]; remaining: number; enabled: boolean }>("customers/locate-missing", { limit: 5, skip });
        if (!result.enabled) { toast({ title: "A localização pelo endereço está desligada neste ambiente", variant: "destructive" }); break; }
        done += result.located; skip.push(...result.failed);
        setProgress(`Localizando... ${done} encontrado(s), ${result.remaining} na fila`);
        refresh();
        if (!result.remaining || (!result.located && !result.failed.length)) break;
      }
      toast({ title: `${done} cliente(s) localizado(s)`, description: skip.length ? `${skip.length} não foram encontrados: marque à mão.` : undefined, variant: "success" });
    } catch (err) { toast({ title: "A localização parou", description: errorMessage(err), variant: "destructive" }); }
    setProgress(null); refresh();
  };
  const points = (data?.rows ?? []).filter((customer) => customer.latitude !== null && customer.longitude !== null);

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 rounded-card border bg-card p-4 xl:flex-row xl:items-center">
        <div className="w-full xl:w-80"><Input name="customerSearch" value={search} onValueChange={(_, value) => setSearch(String(value))} placeholder="Buscar cliente..." icon="search" /></div>
        <div className="flex items-center gap-2">
          <Checkbox id="customerMissing" checked={missing} onCheckedChange={(checked) => setMissing(checked === true)} />
          <Label htmlFor="customerMissing" className="font-normal">Só quem está sem ponto{data ? ` (${data.missing} de ${data.total})` : ""}</Label>
        </div>
        {canWrite && !!data?.missing && (
          <ConfirmDialog title={`Localizar ${data.missing} cliente(s) pelo endereço?`} description="O endereço de cada cliente (sem o nome) é consultado num serviço de mapas externo, um por vez. Pode levar alguns minutos; dá para continuar usando o sistema." onConfirm={locateAll}>
            <Button type="button" variant="outline" className="xl:ml-auto" disabled={!!progress}><Icon name="map-pinned" className="w-4 h-4 mr-1" /> {progress ?? "Localizar todos sem ponto"}</Button>
          </ConfirmDialog>
        )}
      </div>
      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {isLoading && <Skeleton className="h-40 w-full" />}
      {data && (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="max-h-[32rem] overflow-y-auto rounded-lg border">
            {!data.rows.length && <p className="p-6 text-sm text-muted-foreground">Nenhum cliente com esses filtros.</p>}
            {data.rows.map((customer) => (
              <div key={customer.id} className="flex items-start gap-3 border-b px-4 py-3 text-sm last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">{customer.address ?? "Sem endereço no cadastro"}</p>
                  <p className={customer.source ? "text-xs text-muted-foreground" : "text-xs text-amber-700 dark:text-amber-400"}>{customer.source ? `Ponto ${SOURCE_TEXT[customer.source]}` : "Sem ponto no mapa"}</p>
                </div>
                {canWrite && customer.city && <Tip text="Localizar pelo endereço do cadastro"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={locating && locatingId === customer.id} aria-label={`Localizar ${customer.name} pelo endereço`} onClick={() => locate(customer.id)}><Icon name="locate-fixed" className="w-4 h-4" /></Button></Tip>}
                {canWrite && <Tip text="Ajustar no mapa"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Ajustar o ponto de ${customer.name} no mapa`} onClick={() => setPicking(customer)}><Icon name="map-pin" className="w-4 h-4" /></Button></Tip>}
              </div>
            ))}
          </div>
          <MapView className="h-[32rem]" markers={points.map((customer) => ({ id: customer.id, latitude: customer.latitude as number, longitude: customer.longitude as number, label: customer.name, color: "#2563eb", onClick: canWrite ? () => setPicking(customer) : undefined }))} />
        </div>
      )}
      {picking && (
        <PointDialog title={`Ponto de ${picking.name}`} description={picking.address ? `Endereço do cadastro: ${picking.address}. Clique no mapa ou arraste o alfinete.` : undefined}
          point={picking.latitude !== null && picking.longitude !== null ? { latitude: picking.latitude, longitude: picking.longitude } : null}
          clearLabel="Tirar o ponto" saving={saving} onSave={(point) => savePoint({ id: picking.id, point })} onClose={() => setPicking(null)} />
      )}
    </div>
  );
}
