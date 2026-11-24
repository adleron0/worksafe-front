import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Icon from "@/components/general-components/Icon";
import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { More, NameCell, muted } from "../../../-shared/lista";
import { IReview } from "../interfaces/entity.interface";

const formatDate = (date?: Date | string) => (date ? format(new Date(date), "dd/MM/yyyy", { locale: ptBR }) : "-");

function Stars({ rating }: { rating?: number }) {
  if (!rating) return <span className="text-muted-foreground">-</span>;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => <Icon key={i} name="star" className={`h-3 w-3 ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />)}
      <span className="ml-1 tabular-nums">({rating})</span>
    </span>
  );
}

export const reviewsColumns: DataColumn<IReview>[] = [
  {
    id: "trainee", header: "Aluno", className: "min-w-[220px]",
    cell: (item) => <NameCell name={item.trainee?.name ?? ""} image={item.trainee?.imageUrl} sub={item.trainee?.email} square />,
  },
  {
    id: "rating", header: "Avaliação", className: "min-w-[220px]",
    cell: (item) => (
      <div className="min-w-0 max-w-[22rem]">
        <p className="flex items-center gap-2"><Stars rating={item.generalRating} /><span className={muted}>{formatDate(item.createdAt)}</span></p>
        <More lines={item.opinionRating && item.opinionRating.length > 50 ? [item.opinionRating] : []}>
          <p className={`${muted} truncate`}>{item.opinionRating ? item.opinionRating : "Sem justificativa"}</p>
        </More>
      </div>
    ),
  },
  {
    id: "status", header: "Exposição/status", className: "whitespace-nowrap",
    cell: (item) => (
      <span className="inline-flex items-center gap-1.5">
        <StatusBadge tone={item.authorizationExposeReview ? "info" : "neutral"}>{item.authorizationExposeReview ? "Exposto na LP" : "Oculto na LP"}</StatusBadge>
        <StatusBadge tone={!item.inactiveAt ? "success" : "neutral"}>{!item.inactiveAt ? "Ativo" : "Inativo"}</StatusBadge>
      </span>
    ),
  },
];
