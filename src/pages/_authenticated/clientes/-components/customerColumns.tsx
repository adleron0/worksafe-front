import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { formatDocumento } from "@/utils/documento";
import { formatPHONE } from "@/utils/phone-mask";
import { IEntity } from "../-interfaces/entity.interface";

const muted = "text-xs text-muted-foreground";
const empty = <span className="text-muted-foreground">—</span>;

export const customerColumns: DataColumn<IEntity>[] = [
  {
    id: "customer", header: "Cliente", className: "min-w-[260px]",
    cell: (item) => (
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className="size-8 rounded-md border bg-white">
          <AvatarImage src={item.imageUrl || undefined} alt={item.name} className="object-contain" />
          <AvatarFallback className="rounded-md text-xs font-medium">{item.name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 max-w-[20rem]">
          <p className="truncate font-medium">{item.name}</p>
          {item.cnpj && <p className={`${muted} truncate tabular-nums`}>{formatDocumento(item.cnpj)}</p>}
        </div>
      </div>
    ),
  },
  {
    id: "address", header: "Endereço",
    cell: (item) => (item.city?.name || item.state?.name
      ? (
        <div className="min-w-0 max-w-[12rem]">
          <p className="truncate">{item.city?.name || item.state?.name}</p>
          {item.city?.name && item.state?.name && <p className={`${muted} truncate`}>{item.state.name}</p>}
        </div>
      )
      : empty),
  },
  {
    id: "contacts", header: "Contatos", className: "min-w-[200px]",
    cell: (item) => (item.phone || item.email
      ? (
        <div className="min-w-0 max-w-[16rem]">
          <p className="truncate tabular-nums">{item.phone ? formatPHONE(item.phone) : item.email}</p>
          {item.phone && item.email && <p className={`${muted} truncate`}>{item.email}</p>}
        </div>
      )
      : empty),
  },
  {
    id: "createdAt", header: "Cadastro", className: "whitespace-nowrap",
    cell: (item) => <span className="tabular-nums text-muted-foreground">{new Date(item.createdAt || "2024-01-01").toLocaleDateString()}</span>,
  },
  {
    id: "status", header: "Situação",
    cell: (item) => <StatusBadge tone={item.active ? "success" : "neutral"}>{item.active ? "Ativo" : "Inativo"}</StatusBadge>,
  },
];
