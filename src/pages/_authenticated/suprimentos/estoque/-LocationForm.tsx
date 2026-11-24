import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { FormPageGrid, FormSection, SummaryRow } from "@/components/general-components/FormPage";
import { errorMessage } from "../../comercial/-shared/commercial";
import { Location, STOCK_KEYS, stockApi, useStockOptions } from "../-shared/stock";

/** Cadastro e edição de um local de estoque (almoxarifado, container, veículo...), em tela cheia. */
export default function LocationForm({ location, close }: { location?: Location; close: () => void }) {
  const queryClient = useQueryClient();
  const { data: options } = useStockOptions();
  const [name, setName] = useState(location?.name ?? "");
  const [kind, setKind] = useState(location?.kind ?? "almoxarifado");
  const [placeId, setPlaceId] = useState(location?.placeId ? String(location.placeId) : "");
  const [responsibleUserId, setResponsibleUserId] = useState(location?.responsibleUserId ? String(location.responsibleUserId) : "");
  const [notes, setNotes] = useState(location?.notes ?? "");
  const [error, setError] = useState("");
  const refresh = () => { for (const key of [STOCK_KEYS.locations, STOCK_KEYS.options]) queryClient.invalidateQueries({ queryKey: [key] }); };
  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), kind, placeId: placeId || null, responsibleUserId: responsibleUserId || null, notes: notes.trim() };
      return location ? stockApi.put<Location>(`locations/${location.id}`, body) : stockApi.post<Location>("locations", body);
    },
    onSuccess: () => { refresh(); toast({ title: location ? "Local salvo" : "Local criado", variant: "success" }); close(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return setError("Informe o nome do local.");
    setError(""); mutate();
  };
  const nameOf = (list: Array<{ id: number | string; name: string }> | undefined, id: string) => list?.find((option) => String(option.id) === id)?.name;

  return (
    <form onSubmit={submit}>
      <FormPageGrid aside={<>
        <section className="rounded-card border bg-card p-4 flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Resumo</p>
          <SummaryRow label="Local">{name.trim() || "—"}</SummaryRow>
          <SummaryRow label="Tipo">{nameOf(options?.locationKinds, kind) ?? "—"}</SummaryRow>
          <SummaryRow label="Lugar">{nameOf(options?.places, placeId) ?? "Nenhum"}</SummaryRow>
          <SummaryRow label="Responsável">{nameOf(options?.users, responsibleUserId) ?? "Ninguém"}</SummaryRow>
          {location && <SummaryRow label="Itens">{`${location.items} item(ns)`}</SummaryRow>}
        </section>
        {error && <p className="text-red-500 text-sm px-1">{error}</p>}
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
          <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
        </div>
      </>}>
        <FormSection title="Dados do local" description="Como o local aparece nas movimentações e nos saldos.">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label htmlFor="locationName">Nome <span>*</span></Label>
              <Input id="locationName" name="locationName" value={name} maxLength={120} onValueChange={(_, value) => setName(String(value))} className="mt-1" placeholder="Ex.: Almoxarifado central" /></div>
            <div><Label>Tipo</Label>
              <Select name="kind" options={options?.locationKinds ?? []} state={kind} modal onChange={(_, value) => setKind(String(value || "almoxarifado"))} placeholder="Selecione" /></div>
          </div>
        </FormSection>
        <FormSection title="Onde fica e quem cuida" description="O lugar ligado ao local mostra onde ele fica no mapa (cadastro de Locais do RH).">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Lugar</Label>
              <Select name="placeId" options={options?.places ?? []} state={placeId} clearable modal onChange={(_, value) => setPlaceId(String(value ?? ""))} placeholder="Nenhum" /></div>
            <div><Label>Responsável</Label>
              <Select name="responsibleUserId" options={options?.users ?? []} state={responsibleUserId} clearable modal onChange={(_, value) => setResponsibleUserId(String(value ?? ""))} placeholder="Ninguém" /></div>
          </div>
        </FormSection>
        <FormSection title="Observações">
          <Textarea id="locationNotes" aria-label="Observações" rows={3} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </FormSection>
      </FormPageGrid>
    </form>
  );
}
