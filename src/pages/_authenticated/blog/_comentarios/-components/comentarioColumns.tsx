import InfoHint from "@/components/general-components/InfoHint";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Icon from "@/components/general-components/Icon";
import StatusBadge, { StatusTone } from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { IComentario } from "../-interfaces/entity.interface";

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  published: { label: "Aprovado", tone: "success" },
  pending: { label: "Pendente", tone: "warning" },
  hidden: { label: "Oculto", tone: "neutral" },
};

const formatDate = (date: string | Date | undefined) => (date ? format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "");

export function comentarioColumns(): DataColumn<IComentario>[] {
  return [
    {
      id: "content", header: "Comentário", className: "min-w-[260px]",
      cell: (item) => (
        <div className="min-w-0 max-w-[24rem]">
          <div className="flex items-start gap-1 min-w-0">
            <InfoHint label="Ver comentário inteiro" className="mt-0.5"><p className="whitespace-pre-line">{item.content}</p></InfoHint>
            <p className="truncate">{item.content}</p>
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">{formatDate(item.createdAt)}</p>
        </div>
      ),
    },
    {
      id: "visitor", header: "Visitante", className: "whitespace-nowrap",
      cell: (item) => (
        <div className="flex items-center gap-2 min-w-0 max-w-[12rem]">
          <Avatar className="h-6 w-6 border rounded-full">
            <AvatarImage src={item.visitor?.avatarUrl || undefined} alt={item.visitor?.name} />
            <AvatarFallback className="rounded-full uppercase text-[10px]">{item.visitor?.name?.[0] || "?"}</AvatarFallback>
          </Avatar>
          <span className="truncate text-muted-foreground">{item.visitor?.name || "Anônimo"}</span>
        </div>
      ),
    },
    {
      id: "post", header: "Post",
      cell: (item) => <p className="truncate max-w-[16rem] text-muted-foreground">{item.post?.title || "Post não encontrado"}</p>,
    },
    {
      id: "rating", header: "Avaliação", className: "whitespace-nowrap",
      cell: (item) => item.rating ? (
        <div className="flex items-center gap-0.5" aria-label={`${item.rating} de 5`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Icon key={star} name="star" className={`w-3 h-3 ${star <= item.rating! ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
          ))}
        </div>
      ) : <span className="text-muted-foreground text-xs">-</span>,
    },
    {
      id: "status", header: "Situação", className: "whitespace-nowrap",
      cell: (item) => {
        const info = STATUS[item.status] ?? { label: item.status, tone: "warning" as StatusTone };
        return <StatusBadge tone={info.tone}>{info.label}</StatusBadge>;
      },
    },
  ];
}
