import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

/**
 * Mapa com pontos (Leaflet + OpenStreetMap), embrulhado para o resto do sistema
 * não depender da biblioteca. Dois usos:
 *  - mostrar pontos (`markers`), com clique em cada um;
 *  - escolher um ponto (`picked` + `onPick`): clicar no mapa ou arrastar o alfinete.
 *
 * Os alfinetes são desenhados em HTML (sem as imagens padrão da biblioteca, que
 * quebram no empacotamento). A atribuição ao OpenStreetMap fica sempre visível:
 * é condição de uso do mapa.
 */
export interface MapMarker {
  id: string | number; latitude: number; longitude: number; label: string;
  /** Cor do alfinete (hex). */
  color?: string;
  /** Texto curto dentro do alfinete: um número, uma letra. */
  badge?: string;
  /** Alfinete menor e discreto (por exemplo, cliente sem obra no período). */
  quiet?: boolean;
  onClick?: () => void;
}
export interface MapPoint { latitude: number; longitude: number }
/** Um retângulo para enquadrar: [sul, oeste], [norte, leste]. */
export type MapBounds = [[number, number], [number, number]];

/** Enquadramentos prontos. */
export const MAP_PRESETS: Record<"pernambuco" | "nordeste" | "brasil", MapBounds> = {
  pernambuco: [[-9.49, -41.36], [-7.15, -34.8]],
  nordeste: [[-18.35, -48.76], [-1.04, -34.79]],
  brasil: [[-33.75, -73.99], [5.27, -34.79]],
};

interface MapViewProps {
  markers?: MapMarker[];
  /** O ponto em escolha; com `onPick`, o mapa vira um seletor de ponto. */
  picked?: MapPoint | null;
  onPick?: (point: MapPoint) => void;
  /** Enquadramento: muda quando a referência muda (um preset, ou os limites dos pontos). */
  bounds?: MapBounds | null;
  /** Muda para enquadrar de novo os mesmos limites (a pessoa moveu o mapa e pediu o mesmo enquadramento outra vez). */
  boundsKey?: string | number;
  /** Sem `bounds`, enquadra os pontos; sem pontos, mostra este preset. */
  fallback?: keyof typeof MAP_PRESETS;
  className?: string;
}

const pinHtml = (color: string, badge: string | undefined, quiet: boolean) => {
  const size = quiet ? 14 : 26;
  return `<span style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);color:#fff;font:600 11px/1 system-ui,sans-serif">${badge ? badge.replace(/[<>&"]/g, "") : ""}</span>`;
};
const iconOf = (marker: Pick<MapMarker, "color" | "badge" | "quiet">) => {
  const size = marker.quiet ? 14 : 26;
  return L.divIcon({ html: pinHtml(marker.color ?? "#2563eb", marker.badge, !!marker.quiet), className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
};

export default function MapView({ markers = [], picked, onPick, bounds, boundsKey: again, fallback = "pernambuco", className }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pin = useRef<L.Marker | null>(null);
  const pick = useRef(onPick);
  const firstFit = useRef(true);
  pick.current = onPick;

  // cria o mapa uma vez
  useEffect(() => {
    if (!container.current || map.current) return;
    const created = L.map(container.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: true }).fitBounds(MAP_PRESETS[fallback]);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>' }).addTo(created);
    // só a atribuição do mapa (obrigatória); sem o prefixo da biblioteca
    created.attributionControl.setPrefix(false);
    layer.current = L.layerGroup().addTo(created);
    created.on("click", (event: L.LeafletMouseEvent) => pick.current?.({ latitude: Math.round(event.latlng.lat * 1e6) / 1e6, longitude: Math.round(event.latlng.lng * 1e6) / 1e6 }));
    map.current = created;
    // mapa novo (inclusive na remontagem do modo de desenvolvimento): enquadra de novo o que há para mostrar
    firstFit.current = true;
    // o contêiner pode mudar de tamanho depois de montado (diálogo abrindo, aba trocando)
    const observer = new ResizeObserver(() => created.invalidateSize());
    observer.observe(container.current);
    return () => { observer.disconnect(); created.remove(); map.current = null; layer.current = null; pin.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // os pontos
  useEffect(() => {
    if (!layer.current) return;
    layer.current.clearLayers();
    for (const marker of markers) {
      const item = L.marker([marker.latitude, marker.longitude], { icon: iconOf(marker), keyboard: !!marker.onClick, zIndexOffset: marker.quiet ? 0 : 500 });
      item.bindTooltip(marker.label, { direction: "top", offset: [0, marker.quiet ? -6 : -12] });
      if (marker.onClick) item.on("click", (event) => { L.DomEvent.stopPropagation(event); marker.onClick?.(); });
      item.addTo(layer.current);
    }
  }, [markers]);

  // o alfinete do ponto em escolha
  useEffect(() => {
    if (!map.current) return;
    if (!picked) { pin.current?.remove(); pin.current = null; return; }
    if (!pin.current) {
      pin.current = L.marker([picked.latitude, picked.longitude], { icon: iconOf({ color: "#dc2626" }), draggable: !!pick.current, zIndexOffset: 1000 }).addTo(map.current);
      pin.current.on("dragend", () => { const at = pin.current?.getLatLng(); if (at) pick.current?.({ latitude: Math.round(at.lat * 1e6) / 1e6, longitude: Math.round(at.lng * 1e6) / 1e6 }); });
    } else pin.current.setLatLng([picked.latitude, picked.longitude]);
  }, [picked]);

  // o enquadramento
  const boundsKey = bounds ? bounds.flat().join(",") : "";
  useEffect(() => {
    if (!map.current) return;
    if (bounds) { map.current.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 }); firstFit.current = false; return; }
    // sem enquadramento pedido: na primeira vez, enquadra o que há para mostrar
    if (!firstFit.current) return;
    const points: Array<[number, number]> = [...markers.map((marker): [number, number] => [marker.latitude, marker.longitude]), ...(picked ? [[picked.latitude, picked.longitude] as [number, number]] : [])];
    if (!points.length) return;
    firstFit.current = false;
    if (points.length === 1) map.current.setView(points[0], 14);
    else map.current.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundsKey, again, markers.length, !!picked]);

  return <div ref={container} className={cn("isolate z-0 h-80 w-full overflow-hidden rounded-lg border", onPick && "cursor-crosshair", className)} role="application" aria-label="Mapa" />;
}
