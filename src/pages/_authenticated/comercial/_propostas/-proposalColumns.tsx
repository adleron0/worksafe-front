import type { DataColumn } from "@/components/general-components/DataTable";
import UiStatusBadge from "@/components/general-components/StatusBadge";
import { dateBr, money } from "../-shared/commercial";
import { FollowUpChip } from "../-shared/activities";
import { KindBadge, ProposalRow, StatusBadge } from "../-shared/proposals";

/** Data e hora da criação no fuso de quem está vendo (o createdAt vem em UTC). */
const createdAt = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
};

/** Colunas da visão Lista das propostas. */
export const proposalColumns: DataColumn<ProposalRow>[] = [
  {
    id: "number", header: "Número", className: "w-40",
    cell: (row) => (
      <div className="flex flex-col items-start gap-0.5">
        <span className="font-semibold tabular-nums">{row.number}</span>
        <KindBadge kind={row.kind} />
      </div>
    ),
  },
  {
    id: "customer", header: "Cliente e título",
    cell: (row) => (
      <div className="min-w-0 max-w-[26rem]">
        <p className="font-medium truncate">{row.customer.name}</p>
        <p className="text-xs text-muted-foreground truncate">{row.title}{row.seller ? ` · vendedor ${row.seller}` : ""}</p>
      </div>
    ),
  },
  { id: "followUp", header: "Retorno", className: "w-44", cell: (row) => <FollowUpChip followUp={row.followUp} /> },
  {
    id: "createdAt", header: "Criada", className: "w-36",
    cell: (row) => (
      <div className="text-xs text-muted-foreground">
        <p className="tabular-nums">{createdAt(row.createdAt)}</p>
        {row.createdBy && <p className="truncate max-w-[9rem]">por {row.createdBy}</p>}
      </div>
    ),
  },
  {
    id: "status", header: "Situação", className: "w-40",
    cell: (row) => (
      <div className="flex flex-wrap items-center gap-1">
        <StatusBadge status={row.status} expired={row.expired} />
        {row.inactiveAt && <UiStatusBadge tone="neutral" pulse={false}>Arquivada</UiStatusBadge>}
      </div>
    ),
  },
  { id: "validUntil", header: "Validade", className: "w-28 text-muted-foreground tabular-nums", cell: (row) => dateBr(row.validUntil) },
  { id: "total", header: "Total", align: "right", className: "w-36 font-semibold tabular-nums", cell: (row) => money(row.total) },
];
