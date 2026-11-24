import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { ICategoria } from "../-interfaces/entity.interface";

export function categoriaColumns(): DataColumn<ICategoria>[] {
  return [
    {
      id: "name", header: "Categoria", className: "min-w-[200px]",
      cell: (item) => (
        <div className="min-w-0 max-w-[18rem]">
          <p className="font-medium truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground truncate">{item.slug}</p>
        </div>
      ),
    },
    {
      id: "description", header: "Descrição",
      cell: (item) => <p className="text-muted-foreground truncate max-w-[24rem]">{item.description || "Sem descrição"}</p>,
    },
    {
      id: "posts", header: "Posts", align: "right",
      cell: (item) => <span className="tabular-nums">{item._count?.posts || 0}</span>,
    },
    {
      id: "status", header: "Situação", className: "whitespace-nowrap",
      cell: (item) => <StatusBadge tone={item.inactiveAt ? "neutral" : "success"}>{item.inactiveAt ? "Inativo" : "Ativo"}</StatusBadge>,
    },
  ];
}
