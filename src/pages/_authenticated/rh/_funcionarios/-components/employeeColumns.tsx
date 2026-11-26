import type { DataColumn } from "@/components/general-components/DataTable";
import { EntityBadge } from "@/components/general-components/EntitySelect";
import { formatPHONE } from "@/utils/phone-mask";
import { dateBr } from "../../../comercial/-shared/commercial";
import { EmployeeRow, EmployeeStatusBadge } from "../../-shared/employees";
import { DocStatusBadge } from "../../-shared/documents";

const muted = "text-xs text-muted-foreground";
const DOC_SIGNAL: Record<string, string> = { em_dia: "Em dia", a_vencer: "A vencer", vencido: "Vencido", faltando: "Faltando" };

export const employeeColumns: DataColumn<EmployeeRow>[] = [
  {
    id: "name", header: "Funcionário", className: "min-w-[220px]",
    cell: (row) => (
      <div className="min-w-0 max-w-[20rem]">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="font-medium truncate">{row.name}</p>
          <EntityBadge id={row.entityId} className="shrink-0" />
        </div>
        <p className={`${muted} truncate`}>{[row.registration && `matrícula ${row.registration}`, row.hasUser && "tem acesso ao sistema"].filter(Boolean).join(" · ") || "—"}</p>
      </div>
    ),
  },
  {
    id: "role", header: "Função",
    cell: (row) => (
      <div className="min-w-0 max-w-[14rem]">
        <p className="truncate">{row.primaryRole ?? <span className="text-muted-foreground">Sem função</span>}</p>
        {row.roles.length > 1 && <p className={`${muted} truncate`}>também {row.roles.filter((role) => !role.isPrimary).map((role) => role.name).join(", ")}</p>}
      </div>
    ),
  },
  { id: "status", header: "Situação", cell: (row) => <EmployeeStatusBadge status={row.status} label={row.statusLabel} until={row.statusUntil} /> },
  {
    id: "documents", header: "Documentos",
    cell: (row) => (row.documents && row.documents !== "vazia" && row.documents !== "sem_validade"
      ? <DocStatusBadge status={row.documents} label={DOC_SIGNAL[row.documents]} />
      : <span className="text-muted-foreground">—</span>),
  },
  { id: "phone", header: "Telefone", cell: (row) => <span className="text-muted-foreground tabular-nums whitespace-nowrap">{row.phone ? formatPHONE(row.phone) : "—"}</span> },
  { id: "admission", header: "Admissão", cell: (row) => <span className="text-muted-foreground tabular-nums">{dateBr(row.admissionDate)}</span> },
];
