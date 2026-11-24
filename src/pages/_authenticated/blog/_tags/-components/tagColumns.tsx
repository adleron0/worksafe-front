import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { ITag } from "../-interfaces/entity.interface";

export function tagColumns(): DataColumn<ITag>[] {
  return [
    {
      id: "name", header: "Tag", className: "min-w-[200px]",
      cell: (item) => <p className="font-medium truncate max-w-[20rem]">{item.name}</p>,
    },
    {
      id: "slug", header: "Slug",
      cell: (item) => <p className="text-muted-foreground truncate max-w-[20rem]">{item.slug}</p>,
    },
    {
      id: "status", header: "Situação", className: "whitespace-nowrap",
      cell: (item) => <StatusBadge tone={item.inactiveAt ? "neutral" : "success"}>{item.inactiveAt ? "Inativo" : "Ativo"}</StatusBadge>,
    },
  ];
}
