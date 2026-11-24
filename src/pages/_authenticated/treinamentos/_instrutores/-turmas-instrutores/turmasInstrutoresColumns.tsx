import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { NameCell } from "../../-shared/lista";
import { IEntity } from "./interfaces/entity.interface";

export const turmasInstrutoresColumns: DataColumn<IEntity>[] = [
  {
    id: "instructor", header: "Instrutor", className: "min-w-[240px]",
    cell: (item) => <NameCell name={item.instructor?.name ?? ""} image={item.instructor?.imageUrl} square />,
  },
  {
    id: "status", header: "Status",
    cell: (item) => <StatusBadge tone={!item.inactiveAt ? "success" : "danger"}>{!item.inactiveAt ? "Ativo" : "Inativo"}</StatusBadge>,
  },
];
