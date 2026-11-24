import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { IEntity } from "../-interfaces/entity.interface";
import FeaturesCell from "../../-shared/FeaturesCell";

export function siteServicesColumns(): DataColumn<IEntity>[] {
  return [
    {
      id: "name", header: "Serviço", className: "min-w-[240px]",
      cell: (item) => (
        <div className="flex items-center gap-2.5 min-w-0 max-w-[22rem]">
          <Avatar className="h-8 w-8 border rounded-md">
            <AvatarImage src={item.imageUrl || undefined} alt={item.name} className="object-cover" />
            <AvatarFallback className="rounded-md text-xs">{item.name[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium truncate">{item.name}</p>
            {item.slug && <p className="text-xs text-muted-foreground truncate">/servicos/{item.slug}</p>}
          </div>
        </div>
      ),
    },
    {
      id: "features", header: "Características",
      cell: (item) => <FeaturesCell features={item.features} />,
    },
    {
      id: "createdAt", header: "Cadastro", className: "whitespace-nowrap",
      cell: (item) => <span className="tabular-nums text-muted-foreground">{new Date(item.createdAt || "2024-01-01").toLocaleDateString()}</span>,
    },
    {
      id: "status", header: "Situação", className: "whitespace-nowrap",
      cell: (item) => <StatusBadge tone={item.active ? "success" : "neutral"}>{item.active ? "Ativo" : "Inativo"}</StatusBadge>,
    },
  ];
}
