import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import { MapPoint } from "@/components/general-components/MapView";
import Select from "@/components/general-components/Select";
import { FormPageGrid, FormSection, SummaryRow } from "@/components/general-components/FormPage";
import { errorMessage } from "../../../comercial/-shared/commercial";
import { PLACES_KEY, Place, PlaceList, PointDialog, placesApi } from "../../-shared/places";

interface PlaceDraft { name: string; kind: string; street: string; number: string; neighborhood: string; city: string; state: string; startDate: string; endDate: string; notes: string; point: MapPoint | null }
const placeDraft = (place?: Place): PlaceDraft => ({
  name: place?.name ?? "", kind: place?.kind ?? "ct", street: place?.street ?? "", number: place?.number ?? "", neighborhood: place?.neighborhood ?? "", city: place?.city ?? "", state: place?.state ?? "PE",
  startDate: place?.startDate ?? "", endDate: place?.endDate ?? "", notes: place?.notes ?? "", point: place && place.latitude !== null && place.longitude !== null ? { latitude: place.latitude, longitude: place.longitude } : null,
});

/** Cadastro e edição de um local da empresa (centro de treinamento, base temporária...), em tela cheia. */
export default function PlaceForm({ place, options, close }: { place?: Place; options: PlaceList; close: () => void }) {
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [PLACES_KEY] }); toast({ title: place ? "Local salvo" : "Local cadastrado", variant: "success" }); close(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.name.trim().length < 2) return setError("Informe o nome do local.");
    setError(""); mutate();
  };
  const kindName = options.kinds.find((kind) => kind.id === draft.kind)?.name ?? "—";
  const cityText = [draft.city.trim(), draft.state.trim()].filter(Boolean).join(" / ");

  return (
    <>
      <form onSubmit={submit}>
        <FormPageGrid aside={<>
          <section className="rounded-card border bg-card p-4 flex flex-col gap-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Resumo</p>
            <SummaryRow label="Local">{draft.name.trim() || "—"}</SummaryRow>
            <SummaryRow label="Tipo">{kindName}</SummaryRow>
            <SummaryRow label="Cidade">{cityText || "—"}</SummaryRow>
          </section>
          <section className="rounded-card border bg-card p-4 flex flex-col gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Ponto no mapa</p>
            <p className="flex items-center gap-2 text-sm">
              <Icon name="map-pin" className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="min-w-0">{draft.point ? `${draft.point.latitude.toFixed(5)}, ${draft.point.longitude.toFixed(5)}` : "Sem ponto no mapa"}</span>
            </p>
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setPicking(true)}>{draft.point ? "Ajustar o ponto" : "Marcar no mapa"}</Button>
          </section>
          {error && <p className="text-red-500 text-sm px-1">{error}</p>}
          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
            <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
          </div>
        </>}>
          <FormSection title="Dados do local" description="Centro de treinamento, base temporária ou outro ponto da empresa.">
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
          </FormSection>

          <FormSection title="Endereço" description="Usado para localizar o ponto no mapa pelo endereço.">
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
          </FormSection>

          <FormSection title="Observação">
            <Textarea id="placeNotes" aria-label="Observação" rows={3} maxLength={500} value={draft.notes} onChange={(event) => set("notes", event.target.value)} />
          </FormSection>
        </FormPageGrid>
      </form>
      {picking && (
        <PointDialog title={`Ponto de ${draft.name || "novo local"}`} point={draft.point} address={{ street: draft.street, number: draft.number, neighborhood: draft.neighborhood, city: draft.city, state: draft.state }}
          onSave={(point) => { set("point", point); setPicking(false); }} onClose={() => setPicking(false)} />
      )}
    </>
  );
}
