import type { DataColumn } from "@/components/general-components/DataTable";
import { dateBr } from "../../../comercial/-shared/commercial";
import { CustomerPoint, PLACE_COLOR, Place } from "../../-shared/places";

const muted = "text-xs text-muted-foreground";
const SOURCE_TEXT = { endereco: "pelo endereço", manual: "ajustado à mão" } as const;

export const placeColumns: DataColumn<Place>[] = [
  {
    id: "name", header: "Local", className: "min-w-[220px]",
    cell: (place) => (
      <div className="flex items-start gap-2.5 min-w-0">
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PLACE_COLOR[place.kind] ?? "#475569" }} />
        <div className="min-w-0 max-w-[18rem]">
          <p className="font-medium truncate">{place.name} <span className="font-normal text-muted-foreground">· {place.kindName}</span></p>
          <p className={`${muted} truncate`}>{place.address ?? "Sem endereço"}</p>
        </div>
      </div>
    ),
  },
  {
    id: "situation", header: "Situação",
    cell: (place) => (
      <div className="whitespace-nowrap">
        {place.latitude === null ? <p className="text-xs text-amber-700 dark:text-amber-400">Sem ponto no mapa</p> : <p className={muted}>No mapa</p>}
        {(place.startDate || place.endDate) && <p className={muted}>{place.startDate ? `desde ${dateBr(place.startDate)}` : ""}{place.endDate ? ` até ${dateBr(place.endDate)}` : ""}{!place.current ? " · fora do período" : ""}</p>}
      </div>
    ),
  },
];

export const customerPointColumns: DataColumn<CustomerPoint>[] = [
  {
    id: "name", header: "Cliente", className: "min-w-[220px]",
    cell: (customer) => (
      <div className="min-w-0 max-w-[20rem]">
        <p className="font-medium truncate">{customer.name}</p>
        <p className={`${muted} truncate`}>{customer.address ?? "Sem endereço no cadastro"}</p>
      </div>
    ),
  },
  {
    id: "point", header: "Ponto",
    cell: (customer) => <span className={customer.source ? `${muted} whitespace-nowrap` : "text-xs text-amber-700 dark:text-amber-400 whitespace-nowrap"}>{customer.source ? `Ponto ${SOURCE_TEXT[customer.source]}` : "Sem ponto no mapa"}</span>,
  },
];
