import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { IEntity } from "../-interfaces/entity.interface";

export const profileColumns: DataColumn<IEntity>[] = [
  { id: "name", header: "Nome", className: "min-w-[220px]", cell: (item) => <span className="font-medium">{item.name}</span> },
  {
    id: "createdAt", header: "Cadastro", className: "whitespace-nowrap",
    cell: (item) => <span className="tabular-nums text-muted-foreground">{new Date(item.createdAt || "2024-01-01").toLocaleDateString()}</span>,
  },
  {
    id: "status", header: "Situação",
    cell: (item) => <StatusBadge tone={item.inactiveAt ? "danger" : "success"}>{item.inactiveAt ? "Inativo" : "Ativo"}</StatusBadge>,
  },
];
