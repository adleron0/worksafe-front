import Icon from "@/components/general-components/Icon";
import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { Area } from "../-interfaces/area.interface";

export const areaColumns: DataColumn<Area>[] = [
  {
    id: "area", header: "Área", className: "min-w-[280px]",
    cell: (area) => (
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="size-9 shrink-0 overflow-hidden rounded-md border bg-muted grid place-items-center">
          {area.imageUrl
            ? <img src={area.imageUrl} alt={area.name} className="size-full object-cover" />
            : <Icon name="map" className="w-4 h-4 text-muted-foreground" />}
        </span>
        <div className="min-w-0 max-w-[24rem]">
          <p className="truncate font-medium">{area.name}</p>
          {area.description && <p className="text-xs text-muted-foreground truncate">{area.description}</p>}
        </div>
      </div>
    ),
  },
  {
    id: "createdAt", header: "Cadastro", className: "whitespace-nowrap",
    cell: (area) => <span className="tabular-nums text-muted-foreground">{new Date(area.createdAt || "2024-01-01").toLocaleDateString()}</span>,
  },
  {
    id: "status", header: "Situação",
    cell: (area) => <StatusBadge tone={area.inactiveAt ? "danger" : "success"}>{area.inactiveAt ? "Inativa" : "Ativa"}</StatusBadge>,
  },
];
