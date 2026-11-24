import InfoHint from "@/components/general-components/InfoHint";
import TagBadge from "@/components/general-components/TagBadge";
import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SiteStockBadge } from "@/pages/_authenticated/suprimentos/-shared/inventory";
import { IEntity } from "../-interfaces/entity.interface";
import FeaturesCell from "../../-shared/FeaturesCell";

const muted = "text-xs text-muted-foreground";

export function siteProductsColumns(): DataColumn<IEntity>[] {
  return [
    {
      id: "name", header: "Produto", className: "min-w-[240px]",
      cell: (item) => (
        <div className="flex items-center gap-2.5 min-w-0 max-w-[22rem]">
          <Avatar className="h-8 w-8 border rounded-md">
            <AvatarImage src={item.imageUrl || undefined} alt={item.name} className="object-cover" />
            <AvatarFallback className="rounded-md text-xs">{item.name[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate">
              <span className="font-medium">{item.name}</span>
              {item.featured && (
                <TagBadge icon="star" className="ml-1.5 align-middle">destaque</TagBadge>
              )}
            </p>
            {(item.category || item.brand) && <p className={`${muted} truncate`}>{[item.category?.name, item.brand?.name].filter(Boolean).join(" · ")}</p>}
          </div>
        </div>
      ),
    },
    {
      id: "features", header: "Características",
      cell: (item) => <FeaturesCell features={item.features} />,
    },
    {
      id: "description", header: "Descrição",
      cell: (item) => item.description ? (
        <div className="flex items-start gap-1 min-w-0">
          <InfoHint label="Ver descrição inteira" lines={[item.description]} className="mt-0.5" />
          <p className="truncate max-w-[16rem] text-muted-foreground">{item.description}</p>
        </div>
      ) : <span className="text-muted-foreground">-</span>,
    },
    {
      id: "price", header: "Preço", align: "right", className: "whitespace-nowrap",
      cell: (item) => (
        <div>
          <p className={`tabular-nums ${item.price ? "font-medium" : "text-muted-foreground"}`}>{item.price ? `R$ ${item.price}` : "Não informado"}</p>
          {item.oldPrice ? <p className={`${muted} tabular-nums`}>antigo: R$ {item.oldPrice}</p> : null}
        </div>
      ),
    },
    {
      id: "stock", header: "Estoque", className: "whitespace-nowrap",
      cell: (item) => <div className="[&>a]:mt-0"><SiteStockBadge productId={Number(item.id)} /></div>,
    },
    {
      id: "status", header: "Situação", className: "whitespace-nowrap",
      cell: (item) => <StatusBadge tone={item.active ? "success" : "neutral"}>{item.active ? "Ativo" : "Inativo"}</StatusBadge>,
    },
  ];
}
