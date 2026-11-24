import DocStatusBadge from "@/components/general-components/DocStatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { dateBr } from "../../../comercial/-shared/commercial";
import { ExpiringRow } from "../../-shared/files";

const whenText = (row: ExpiringRow) => {
  if (row.status === "faltando" || row.days === null) return "nenhum arquivo vigente";
  if (row.days < 0) return `venceu há ${-row.days} ${row.days === -1 ? "dia" : "dias"} (${dateBr(row.expiryDate)})`;
  if (row.days === 0) return `vence hoje (${dateBr(row.expiryDate)})`;
  return `vence em ${row.days} ${row.days === 1 ? "dia" : "dias"} (${dateBr(row.expiryDate)})`;
};

export const expiringColumns: DataColumn<ExpiringRow>[] = [
  {
    id: "document", header: "Documento", className: "min-w-[220px]",
    cell: (row) => (
      <div className="min-w-0 max-w-[20rem]">
        <p className="font-medium truncate">{row.typeName ?? row.name}</p>
        {row.typeName && row.fileId && <p className="text-xs text-muted-foreground truncate">{row.name}</p>}
      </div>
    ),
  },
  { id: "where", header: "Pasta", cell: (row) => (row.folderId ? <p className="truncate max-w-[16rem]">{row.where}</p> : <span className="text-muted-foreground">—</span>) },
  { id: "status", header: "Situação", cell: (row) => <DocStatusBadge status={row.status} label={row.statusLabel} /> },
  { id: "when", header: "Quando", cell: (row) => <span className="text-muted-foreground whitespace-nowrap">{whenText(row)}</span> },
];
