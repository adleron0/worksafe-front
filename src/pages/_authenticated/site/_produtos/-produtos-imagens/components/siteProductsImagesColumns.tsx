import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { IEntity } from "../interfaces/entity.interface";

export function siteProductsImagesColumns(): DataColumn<IEntity>[] {
  return [
    {
      id: "image", header: "Imagem", className: "min-w-[220px]",
      cell: (item) => (
        <div className="flex items-center gap-2.5 min-w-0 max-w-[22rem]">
          <Avatar className="h-8 w-8 border rounded-md">
            <AvatarImage src={item?.imageUrl || undefined} alt={item?.name} className="object-cover" />
            <AvatarFallback className="rounded-md text-xs">{item?.name?.[0]}</AvatarFallback>
          </Avatar>
          <span className="font-medium truncate">{item?.name}</span>
        </div>
      ),
    },
    {
      id: "status", header: "Situação", className: "whitespace-nowrap",
      cell: (item) => <StatusBadge tone={item.inactiveAt ? "neutral" : "success"}>{item.inactiveAt ? "Inativo" : "Ativo"}</StatusBadge>,
    },
  ];
}
