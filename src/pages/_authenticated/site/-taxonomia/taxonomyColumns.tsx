import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { ITaxonomy, TaxonomyEntity } from "./types";

export function taxonomyColumns(entity: TaxonomyEntity): DataColumn<ITaxonomy>[] {
  const done = entity.article;
  return [
    {
      id: "name", header: entity.name, className: "min-w-[220px]",
      cell: (item) => <p className="font-medium truncate max-w-[24rem]">{item.name}</p>,
    },
    {
      id: "products", header: "Produtos", align: "right",
      cell: (item) => <span className="tabular-nums">{item._count?.products ?? 0}</span>,
    },
    {
      id: "status", header: "Situação", className: "whitespace-nowrap",
      cell: (item) => <StatusBadge tone={item.inactiveAt ? "neutral" : "success"}>{item.inactiveAt ? "Inativ" + done : "Ativ" + done}</StatusBadge>,
    },
  ];
}
