import Icon from "@/components/general-components/Icon";
import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { More, muted } from "../../-shared/lista";
import { IEntity } from "../-interfaces/entity.interface";

export const coursesColumns: DataColumn<IEntity>[] = [
  {
    id: "name", header: "Curso", className: "min-w-[240px]",
    cell: (item) => {
      const flags = item.flags?.split("#").filter(Boolean) ?? [];
      return (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="size-8 border rounded-md relative overflow-visible shrink-0">
            <AvatarImage src={item.imageUrl || undefined} alt={item.name} className="object-cover rounded-md" />
            <AvatarFallback className="rounded-md text-xs">{item.name[0]}</AvatarFallback>
            {item.icon && (
              <span className="absolute -bottom-1 -right-1 size-4 rounded-full grid place-items-center border-2 border-background" style={{ backgroundColor: item.color || "#000000" }}>
                <Icon name={item.icon} className="w-2.5 h-2.5 text-foreground" />
              </span>
            )}
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium truncate">{item.name}</p>
            <More lines={flags.length ? [`Destaques: ${flags.join(", ")}`] : []}>
              <p className={`${muted} truncate`}>
                {item.hoursDuration} horas
                {flags.length > 0 && <span className="text-primary-soft-foreground"> · <Icon name="flag" className="inline w-3 h-3 -mt-0.5" /> {flags[0]}{flags.length > 1 ? ` +${flags.length - 1}` : ""}</span>}
              </p>
            </More>
          </div>
        </div>
      );
    },
  },
  {
    id: "description", header: "Descrição", className: "min-w-[260px]",
    cell: (item) => item.description
      ? <More lines={item.description.length > 70 ? [item.description] : []}><p className="text-muted-foreground truncate max-w-[28rem]">{item.description}</p></More>
      : <span className="text-muted-foreground">—</span>,
  },
  {
    id: "status", header: "Status",
    cell: (item) => <StatusBadge tone={item.active ? "success" : "neutral"}>{item.active ? "Ativo" : "Inativo"}</StatusBadge>,
  },
];
