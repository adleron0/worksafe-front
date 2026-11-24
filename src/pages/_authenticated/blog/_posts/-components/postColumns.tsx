import InfoHint from "@/components/general-components/InfoHint";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Icon from "@/components/general-components/Icon";
import StatusBadge, { StatusTone } from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { IPost } from "../-interfaces/entity.interface";

const POST_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  published: { label: "Publicado", tone: "success" },
  draft: { label: "Rascunho", tone: "neutral" },
  archived: { label: "Arquivado", tone: "neutral" },
};

export function PostStatusBadge({ status }: { status: string }) {
  const info = POST_STATUS[status] ?? { label: status, tone: "neutral" as StatusTone };
  return <StatusBadge tone={info.tone} pulse={status !== "archived"}>{info.label}</StatusBadge>;
}

export const formatPostDate = (date: string | Date | null | undefined) => {
  if (!date) return "Não publicado";
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
};

const muted = "text-xs text-muted-foreground";

export function postColumns(): DataColumn<IPost>[] {
  return [
    {
      id: "title", header: "Post", sortField: "title", className: "min-w-[280px]",
      cell: (item) => (
        <div className="flex items-center gap-3 min-w-0 max-w-[26rem]">
          {item.coverImage ? (
            <img src={item.coverImage} alt="" className="h-9 w-14 shrink-0 object-cover rounded-md border" />
          ) : (
            <div className="h-9 w-14 shrink-0 bg-muted rounded-md flex items-center justify-center">
              <Icon name="image" className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium truncate">{item.title}</p>
            {item.tags && item.tags.length > 0 ? (
              <div className="flex items-center gap-1 min-w-0">
                <InfoHint label="Ver tags" lines={[`Tags: ${item.tags.map((t) => t.tag.name).join(", ")}`]} />
                <p className={`${muted} truncate`}>{item.slug}</p>
              </div>
            ) : (
              <p className={`${muted} truncate`}>{item.slug}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "author", header: "Autor", className: "whitespace-nowrap",
      cell: (item) => (
        <div className="flex items-center gap-2 min-w-0 max-w-[12rem]">
          <Avatar className="h-6 w-6 border rounded-full">
            <AvatarImage src={item.author?.imageUrl || undefined} alt={item.author?.name} />
            <AvatarFallback className="rounded-full uppercase text-[10px]">{item.author?.name?.[0] || "?"}</AvatarFallback>
          </Avatar>
          <span className="truncate text-muted-foreground">{item.author?.name || "Não informado"}</span>
        </div>
      ),
    },
    {
      id: "category", header: "Categoria", className: "whitespace-nowrap",
      cell: (item) => item.category
        ? <span className="truncate">{item.category.name}</span>
        : <span className="text-muted-foreground">Sem categoria</span>,
    },
    {
      id: "publishedAt", header: "Publicação", sortField: "publishedAt", className: "whitespace-nowrap",
      cell: (item) => <span className={`tabular-nums ${item.publishedAt ? "" : "text-muted-foreground"}`}>{formatPostDate(item.publishedAt)}</span>,
    },
    {
      id: "featured", header: "Destaque", align: "center",
      cell: (item) => item.featured
        ? <Icon name="star" className="w-4 h-4 inline text-yellow-500 fill-yellow-500" />
        : <Icon name="star" className="w-4 h-4 inline text-muted-foreground/50" />,
    },
    {
      id: "viewCount", header: "Views", sortField: "viewCount", align: "right", className: "whitespace-nowrap",
      cell: (item) => <span className="tabular-nums text-muted-foreground">{item.viewCount || 0}</span>,
    },
    {
      id: "status", header: "Situação", className: "whitespace-nowrap",
      cell: (item) => <PostStatusBadge status={item.status} />,
    },
  ];
}
