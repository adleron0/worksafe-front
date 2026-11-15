import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import ColorPickerInput from "@/components/general-components/ColorPickerInput";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { Tip, errorMessage, todayIso } from "../../comercial/-shared/commercial";
import useVerify from "@/hooks/use-verify";
import { ALLOCATION_KEY } from "./allocation";
import { PLACES_ABILITY, usePlaces } from "./places";

/** Atividades fora de OS (aula, treinamento, atividade no CT...): tipos, lançamento e parte do dia. */
export type Shift = "integral" | "manha" | "tarde" | "noite";
export const SHIFT_OPTIONS: Array<{ id: Shift; name: string }> = [{ id: "integral", name: "Dia inteiro" }, { id: "manha", name: "Manhã" }, { id: "tarde", name: "Tarde" }, { id: "noite", name: "Noite" }];
export const SHIFT_LABEL: Record<Shift, string> = { integral: "dia inteiro", manha: "manhã", tarde: "tarde", noite: "noite" };
/** Duas partes do dia se cruzam: dia inteiro cruza com qualquer uma; manhã só com manhã, e assim por diante. */
export const shiftsClash = (a: Shift, b: Shift) => a === "integral" || b === "integral" || a === b;
/** A parte do dia como a linha do tempo desenha. */
export const shiftPart = (shift: Shift) => (({ integral: "full", manha: "am", tarde: "pm", noite: "night" }) as const)[shift];

export interface ActivityType { id: number; name: string; color: string; occupies: boolean; inactive: boolean }
export interface Activity {
  id: number; typeId: number; typeName: string; color: string; occupies: boolean; location: string | null; placeId?: number | null; startDate: string; endDate: string; shift: Shift; notes: string | null;
  employees: Array<{ id: number; name: string }>;
}
export const ACTIVITY_TYPES_KEY = "hrActivityTypes";
export const ACTIVITIES_ABILITY = "alocacao";

export const activitiesApi = {
  get: async <T,>(path = "", params?: Record<string, unknown>) => (await api.get<T>(`hr-activities${path ? `/${path}` : ""}`, { params })).data,
  post: async <T,>(path: string, body?: unknown) => (await api.post<T>(`hr-activities${path ? `/${path}` : ""}`, body ?? {})).data,
  put: async <T,>(path: string, body?: unknown) => (await api.put<T>(`hr-activities/${path}`, body ?? {})).data,
  patch: async <T,>(path: string, body?: unknown) => (await api.patch<T>(`hr-activities/${path}`, body ?? {})).data,
  delete: async <T,>(path: string) => (await api.delete<T>(`hr-activities/${path}`)).data,
};
export const useActivityTypes = (enabled = true) => useQuery({ queryKey: [ACTIVITY_TYPES_KEY], enabled, staleTime: 5 * 60 * 1000, queryFn: () => activitiesApi.get<{ rows: ActivityType[] }>("types") });

interface ActivityDialogProps {
  /** Atividade em edição; vazio = nova. */
  activity?: Activity;
  /** Quem já vem marcado numa atividade nova (por exemplo, a pessoa da ficha). */
  employeeIds?: number[];
  employees: Array<{ id: number; name: string }>;
  canWrite: boolean;
  onClose: () => void;
}

/** Lançar ou alterar uma atividade: o que é, quem, onde, quando e em que parte do dia. */
export function ActivityDialog({ activity, employeeIds = [], employees, canWrite, onClose }: ActivityDialogProps) {
  const queryClient = useQueryClient();
  const { data: types } = useActivityTypes();
  const [typeId, setTypeId] = useState(activity ? String(activity.typeId) : "");
  const [people, setPeople] = useState<string[]>(() => (activity ? activity.employees.map((employee) => String(employee.id)) : employeeIds.map(String)));
  const [startDate, setStartDate] = useState(activity?.startDate ?? todayIso());
  const [endDate, setEndDate] = useState(activity?.endDate ?? "");
  const [shift, setShift] = useState<Shift>(activity?.shift ?? "integral");
  const [location, setLocation] = useState(activity?.location ?? "");
  const [placeId, setPlaceId] = useState(activity?.placeId ? String(activity.placeId) : "");
  const { can } = useVerify();
  // os locais da empresa (CT, bases em uso) para quem pode vê-los; senão fica só o texto
  const { data: places } = usePlaces(can(`view_${PLACES_ABILITY}`));
  const placeOptions = (places?.rows ?? []).filter((place) => place.current || String(place.id) === placeId).map((place) => ({ id: String(place.id), name: `${place.name} · ${place.kindName}` }));
  const [notes, setNotes] = useState(activity?.notes ?? "");
  const [error, setError] = useState("");
  // quem está numa atividade antiga e saiu da lista (desligado) continua aparecendo
  const options = [...employees, ...(activity?.employees ?? []).filter((employee) => !employees.some((item) => item.id === employee.id))].map(({ id, name }) => ({ id: String(id), name }));
  const done = () => { queryClient.invalidateQueries({ queryKey: [ALLOCATION_KEY] }); onClose(); };

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      const body = { typeId: Number(typeId), employeeIds: people.map(Number), startDate, endDate: endDate || startDate, shift, placeId: placeId || null, location: location.trim(), notes: notes.trim() };
      return activity ? activitiesApi.put<Activity>(String(activity.id), body) : activitiesApi.post<Activity>("", body);
    },
    onSuccess: () => { toast({ title: activity ? "Atividade salva" : "Atividade lançada", variant: "success" }); done(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const { mutate: remove } = useMutation({
    mutationFn: () => activitiesApi.delete<{ id: number }>(String(activity?.id)),
    onSuccess: () => { toast({ title: "Atividade cancelada", variant: "success" }); done(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!typeId) return setError("Escolha o tipo da atividade.");
    if (!people.length) return setError("Escolha pelo menos uma pessoa.");
    if (!startDate) return setError("Informe o dia.");
    if (endDate && endDate < startDate) return setError("O fim não pode ser antes do início.");
    setError(""); save();
  };
  const current = types?.rows.find((type) => String(type.id) === typeId);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{activity ? "Atividade" : "Nova atividade"}</DialogTitle>
          <DialogDescription>O que não é ordem de serviço: aula, treinamento, atividade no centro de treinamento, deslocamento. Aparece no mapa de alocação.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div>
            <Label>Tipo <span>*</span></Label>
            <Select name="typeId" modal disabled={!canWrite} options={[...(types?.rows ?? []), ...(activity && !types?.rows.some((type) => type.id === activity.typeId) ? [{ id: activity.typeId, name: activity.typeName }] : [])].map(({ id, name }) => ({ id: String(id), name }))}
              state={typeId} onChange={(_, value) => { setTypeId(String(value ?? "")); setError(""); }} placeholder="Selecione" />
            {current && !current.occupies && <p className="mt-1 text-xs text-muted-foreground">Este tipo não ocupa a pessoa: ela continua aparecendo como livre para escala.</p>}
          </div>
          <div>
            <Label>Quem <span>*</span></Label>
            <Select name="people" multiple modal disabled={!canWrite} options={options} state={people} placeholder="Escolha uma ou mais pessoas"
              onChange={(_, value) => setPeople(Array.isArray(value) ? value.map(String) : value ? [String(value)] : [])} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>De <span>*</span></Label>
              <CalendarPicker mode="single" name="activityStart" className="mt-1 w-full" value={startDate} disabled={!canWrite} placeholder="Escolha" fromYear={2024} toYear={2040} onValueChange={(_, value) => setStartDate(String(value ?? ""))} />
            </div>
            <div>
              <Label>Até</Label>
              <CalendarPicker mode="single" name="activityEnd" className="mt-1 w-full" value={endDate} disabled={!canWrite} placeholder="Só um dia" fromYear={2024} toYear={2040} onValueChange={(_, value) => setEndDate(String(value ?? ""))} />
            </div>
            <div>
              <Label>Parte do dia</Label>
              <Select name="activityShift" modal disabled={!canWrite} options={SHIFT_OPTIONS} state={shift} onChange={(_, value) => setShift((String(value ?? "integral") as Shift))} placeholder="Dia inteiro" />
            </div>
          </div>
          {placeOptions.length > 0 && (
            <div>
              <Label>Local da empresa</Label>
              <Select name="activityPlace" modal clearable disabled={!canWrite} options={placeOptions} state={placeId} placeholder="Nenhum (use o campo abaixo)"
                onChange={(_, value) => { const next = String(value ?? ""); setPlaceId(next); const place = places?.rows.find((item) => String(item.id) === next); if (place && !location.trim()) setLocation(place.name); }} />
            </div>
          )}
          <div>
            <Label htmlFor="activityLocation">Onde</Label>
            <Input id="activityLocation" name="activityLocation" className="mt-1" value={location} maxLength={200} disabled={!canWrite} onValueChange={(_, value) => setLocation(String(value))} placeholder="Ex.: CT Recife" />
          </div>
          <div>
            <Label htmlFor="activityNotes">Observação</Label>
            <Textarea id="activityNotes" className="mt-1" rows={2} maxLength={500} disabled={!canWrite} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter className="gap-2 sm:justify-between">
            {activity && canWrite ? (
              <ConfirmDialog title="Cancelar esta atividade?" description="Ela sai do mapa de alocação para todas as pessoas que estavam nela." onConfirm={() => remove()}>
                <Button type="button" variant="outline" className="text-red-600"><Icon name="trash-2" className="w-4 h-4 mr-1" /> Cancelar atividade</Button>
              </ConfirmDialog>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>{canWrite ? "Fechar" : "Voltar"}</Button>
              {canWrite && <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : activity ? "Salvar" : "Lançar"}</Button>}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Tipos de atividade: nome, cor da barra e se ocupa a pessoa. */
export function ActivityTypesDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data } = useActivityTypes();
  const [editing, setEditing] = useState<{ id?: number; name: string; color: string; occupies: boolean } | null>(null);
  const [error, setError] = useState("");
  const refresh = () => { queryClient.invalidateQueries({ queryKey: [ACTIVITY_TYPES_KEY] }); queryClient.invalidateQueries({ queryKey: [ALLOCATION_KEY] }); };

  const { mutate: save, isPending } = useMutation({
    mutationFn: (value: NonNullable<typeof editing>) => (value.id ? activitiesApi.put<ActivityType>(`types/${value.id}`, value) : activitiesApi.post<ActivityType>("types", value)),
    onSuccess: () => { refresh(); setEditing(null); setError(""); toast({ title: "Tipo de atividade salvo", variant: "success" }); },
    onError: (err) => setError(errorMessage(err)),
  });
  const { mutate: inactivate } = useMutation({
    mutationFn: (id: number) => activitiesApi.patch<ActivityType>(`types/${id}/inactive`),
    onSuccess: () => { refresh(); toast({ title: "Tipo de atividade inativado", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível inativar", description: errorMessage(err), variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tipos de atividade</DialogTitle>
          <DialogDescription>O que pode ser lançado fora de ordem de serviço. A cor é a da barra no mapa.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[45vh] overflow-y-auto rounded-md border">
          {data?.rows.map((type) => (
            <div key={type.id} className="flex items-center gap-2 border-b px-3 py-2 text-sm last:border-b-0">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: type.color }} />
              <span className="min-w-0 flex-1 truncate">{type.name}</span>
              {!type.occupies && <span className="rounded bg-muted px-1.5 py-0.5 text-xs">não ocupa</span>}
              <Tip text="Editar"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Editar ${type.name}`} onClick={() => { setEditing({ id: type.id, name: type.name, color: type.color, occupies: type.occupies }); setError(""); }}><Icon name="pencil" className="w-4 h-4" /></Button></Tip>
              <ConfirmDialog title={`Inativar "${type.name}"?`} description="O tipo deixa de aparecer para novas atividades. As que já existem continuam no mapa." onConfirm={() => inactivate(type.id)}>
                <span><Tip text="Inativar"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Inativar ${type.name}`}><Icon name="archive" className="w-4 h-4" /></Button></Tip></span>
              </ConfirmDialog>
            </div>
          ))}
        </div>
        {editing ? (
          <form className="grid gap-3 rounded-md border p-3" onSubmit={(event) => { event.preventDefault(); if (editing.name.trim().length < 2) return setError("Informe o nome do tipo."); save({ ...editing, name: editing.name.trim() }); }}>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <Label htmlFor="activityTypeName">Nome <span>*</span></Label>
                <Input id="activityTypeName" name="activityTypeName" className="mt-1" value={editing.name} maxLength={80} onValueChange={(_, value) => setEditing({ ...editing, name: String(value) })} />
              </div>
              <ColorPickerInput label="Cor" value={editing.color} onChange={(color) => setEditing({ ...editing, color })} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="activityTypeOccupies" checked={editing.occupies} onCheckedChange={(checked) => setEditing({ ...editing, occupies: checked === true })} />
              <Label htmlFor="activityTypeOccupies" className="font-normal">Ocupa a pessoa (ela deixa de aparecer como livre para escala)</Label>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setEditing(null); setError(""); }}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Salvando..." : "Salvar tipo"}</Button>
            </div>
          </form>
        ) : (
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setEditing({ name: "", color: "#0f766e", occupies: true })}><Icon name="plus" className="w-4 h-4 mr-1" /> Novo tipo</Button>
        )}
        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
