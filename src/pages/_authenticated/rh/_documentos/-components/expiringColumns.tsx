import type { DataColumn } from "@/components/general-components/DataTable";
import { dateBr } from "../../../comercial/-shared/commercial";
import { DocStatusBadge, ExpiringRow } from "../../-shared/documents";

export const whenText = (row: ExpiringRow) => {
  if (row.status === "faltando" || row.days === null) return "não enviado";
  if (row.days < 0) return `venceu há ${-row.days} ${row.days === -1 ? "dia" : "dias"} (${dateBr(row.expiryDate)})`;
  if (row.days === 0) return `vence hoje (${dateBr(row.expiryDate)})`;
  return `vence em ${row.days} ${row.days === 1 ? "dia" : "dias"} (${dateBr(row.expiryDate)})`;
};

export const expiringColumns: DataColumn<ExpiringRow>[] = [
  { id: "employee", header: "Funcionário", className: "min-w-[200px]", cell: (row) => <p className="font-medium truncate max-w-[18rem]">{row.employee.name}</p> },
  { id: "type", header: "Documento", cell: (row) => <p className="truncate max-w-[16rem]">{row.typeName}</p> },
  { id: "status", header: "Situação", cell: (row) => <DocStatusBadge status={row.status} label={row.statusLabel} /> },
  { id: "when", header: "Quando", cell: (row) => <span className="text-muted-foreground whitespace-nowrap">{whenText(row)}</span> },
];
