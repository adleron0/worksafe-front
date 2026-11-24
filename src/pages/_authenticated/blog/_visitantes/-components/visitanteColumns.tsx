import Icon from "@/components/general-components/Icon";
import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { IVisitante } from "../-interfaces/entity.interface";

export function visitanteColumns(): DataColumn<IVisitante>[] {
  return [
    {
      id: "name", header: "Visitante", className: "min-w-[200px]",
      cell: (item) => (
        <div className="flex items-center gap-2 min-w-0 max-w-[18rem]">
          <Avatar className="h-7 w-7 border rounded-full">
            <AvatarImage src={item.avatarUrl || undefined} alt={item.name} />
            <AvatarFallback className="rounded-full uppercase text-[10px]">{item.name?.[0] || "?"}</AvatarFallback>
          </Avatar>
          <span className="font-medium truncate">{item.name}</span>
        </div>
      ),
    },
    {
      id: "email", header: "E-mail",
      cell: (item) => (
        <div className="flex items-center gap-1.5 min-w-0 max-w-[18rem] text-muted-foreground">
          <Icon name="mail" className="w-3 h-3 shrink-0" />
          <span className="truncate">{item.email}</span>
        </div>
      ),
    },
    {
      id: "comments", header: "Comentários", align: "right",
      cell: (item) => <span className="tabular-nums">{item._count?.comments || 0}</span>,
    },
    {
      id: "status", header: "Situação", className: "whitespace-nowrap",
      cell: (item) => <StatusBadge tone={item.blocked ? "danger" : "success"}>{item.blocked ? "Bloqueado" : "Ativo"}</StatusBadge>,
    },
  ];
}
