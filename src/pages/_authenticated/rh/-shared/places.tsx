import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/general-components/Icon";
import MapView, { MapPoint } from "@/components/general-components/MapView";
import { errorMessage } from "../../comercial/-shared/commercial";

/** Locais da empresa (CTs, bases) e pontos no mapa: tipos (espelham a API) e o seletor de ponto. */
export interface Place {
  id: number; name: string; kind: string; kindName: string; street: string | null; number: string | null; neighborhood: string | null; city: string | null; state: string | null; zipCode: string | null;
  address: string | null; latitude: number | null; longitude: number | null; startDate: string | null; endDate: string | null; notes: string | null; current: boolean; inactive: boolean;
}
export interface PlaceList { kinds: Array<{ id: string; name: string }>; geocoder: boolean; rows: Place[] }
export interface CustomerPoint { id: number; name: string; address: string | null; city: string | null; state: string | null; latitude: number | null; longitude: number | null; source: "endereco" | "manual" | null }
export interface CustomerPoints { geocoder: boolean; total: number; missing: number; rows: CustomerPoint[] }
export interface Geocoded { found: boolean; enabled: boolean; latitude?: number; longitude?: number; precise?: boolean; label?: string }

export const PLACES_KEY = "companyPlaces";
export const CUSTOMER_POINTS_KEY = "customerPoints";
export const PLACES_ABILITY = "locais";
export const PLACE_COLOR: Record<string, string> = { ct: "#7c3aed", base: "#be185d", sede: "#0f766e", outro: "#475569" };

export const placesApi = {
  get: async <T,>(path = "", params?: Record<string, unknown>) => (await api.get<T>(`places${path ? `/${path}` : ""}`, { params })).data,
  post: async <T,>(path: string, body?: unknown) => (await api.post<T>(`places${path ? `/${path}` : ""}`, body ?? {})).data,
  put: async <T,>(path: string, body?: unknown) => (await api.put<T>(`places/${path}`, body ?? {})).data,
  patch: async <T,>(path: string, body?: unknown) => (await api.patch<T>(`places/${path}`, body ?? {})).data,
};
export const usePlaces = (enabled = true) => useQuery({ queryKey: [PLACES_KEY], enabled, staleTime: 60 * 1000, queryFn: () => placesApi.get<PlaceList>() });

interface PointDialogProps {
  title: string; description?: string;
  point: MapPoint | null;
  /** Um ponto de referência para abrir o mapa perto (por exemplo, o do cliente), quando ainda não há ponto. */
  hint?: MapPoint | null;
  /** Endereço para o botão "Localizar pelo endereço"; sem ele o botão não aparece. */
  address?: { street?: string | null; number?: string | number | null; neighborhood?: string | null; city?: string | null; state?: string | null } | null;
  /** Texto do botão que tira o ponto (por exemplo, "Usar o ponto do cliente"); sem ele não há como tirar. */
  clearLabel?: string;
  saving?: boolean;
  onSave: (point: MapPoint | null) => void;
  onClose: () => void;
}

/** Escolher um ponto no mapa: clicar, arrastar o alfinete ou localizar pelo endereço. */
export function PointDialog({ title, description, point, hint, address, clearLabel, saving, onSave, onClose }: PointDialogProps) {
  const [picked, setPicked] = useState<MapPoint | null>(point);
  const [message, setMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const locate = async () => {
    setLocating(true); setMessage("");
    try {
      const result = await placesApi.post<Geocoded>("geocode", address ?? {});
      if (!result.enabled) setMessage("A localização pelo endereço está desligada neste ambiente. Clique no mapa para marcar o ponto.");
      else if (!result.found || result.latitude === undefined || result.longitude === undefined) setMessage("Não achei esse endereço. Clique no mapa para marcar o ponto.");
      else {
        setPicked({ latitude: result.latitude, longitude: result.longitude });
        setMessage(result.precise ? "Ponto encontrado pelo endereço. Confira e arraste se precisar." : "Só achei a cidade: o ponto está no centro dela. Arraste para o lugar certo.");
      }
    } catch (err) { setMessage(errorMessage(err)); }
    setLocating(false);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description ?? "Clique no mapa para marcar o ponto, ou arraste o alfinete vermelho."}</DialogDescription>
        </DialogHeader>
        <MapView className="h-[50vh]" picked={picked} onPick={setPicked} markers={!picked && hint ? [{ id: "hint", latitude: hint.latitude, longitude: hint.longitude, label: "Ponto do cliente", color: "#64748b", quiet: true }] : []} />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {address?.city && <Button type="button" variant="outline" size="sm" disabled={locating} onClick={locate}><Icon name="map-pin" className="w-4 h-4 mr-1" /> {locating ? "Localizando..." : "Localizar pelo endereço"}</Button>}
          <span className="text-muted-foreground tabular-nums">{picked ? `${picked.latitude.toFixed(5)}, ${picked.longitude.toFixed(5)}` : "Nenhum ponto marcado"}</span>
        </div>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <DialogFooter className="gap-2 sm:justify-between">
          {clearLabel && point ? <Button type="button" variant="outline" disabled={saving} onClick={() => onSave(null)}>{clearLabel}</Button> : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" disabled={saving || !picked} onClick={() => onSave(picked)}>{saving ? "Salvando..." : "Salvar ponto"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
