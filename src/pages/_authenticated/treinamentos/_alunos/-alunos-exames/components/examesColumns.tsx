import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { muted } from "../../../-shared/lista";
import { IEntity } from "../interfaces/entity.interface";

const formatDate = (date?: string | Date) => (date ? format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "Não informado");

/** Nota de 0 a 10 pelas respostas marcadas. */
const examData = (item: IEntity) => {
  if (!item.examResponses || !Array.isArray(item.examResponses)) return null;
  const totalQuestions = item.examResponses.length;
  const correctAnswers = item.examResponses.filter((response) => response.options?.some((opt) => opt.isSelected && opt.isCorrect)).length;
  const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 10 : 0;
  return { totalQuestions, correctAnswers, score };
};

export const examesColumns: DataColumn<IEntity>[] = [
  {
    id: "course", header: "Curso", className: "min-w-[200px]",
    cell: (item) => (
      <div className="min-w-0">
        <p className="font-medium truncate">{item.course?.name || "Não informado"}</p>
        <p className={muted}>{formatDate(item.createdAt)}</p>
      </div>
    ),
  },
  {
    id: "class", header: "Turma",
    cell: (item) => (
      <p className="truncate">
        {item.class?.name || "Não informado"}
        {item.classId && <span className={`${muted} ml-1`}>#{item.classId}</span>}
      </p>
    ),
  },
  {
    id: "score", header: "Nota / Acertos", className: "whitespace-nowrap",
    cell: (item) => {
      const data = examData(item);
      return (
        <span className="inline-flex items-baseline gap-1.5">
          <span className={`font-semibold tabular-nums ${data && data.score >= 6 ? "text-green-600" : "text-red-600"}`}>{data ? data.score.toFixed(1) : "-"}</span>
          {data && <span className={`${muted} tabular-nums`}>({data.correctAnswers}/{data.totalQuestions})</span>}
        </span>
      );
    },
  },
  {
    id: "result", header: "Resultado",
    cell: (item) => <StatusBadge tone={item.result ? "success" : "danger"}>{item.result ? "Aprovado" : "Reprovado"}</StatusBadge>,
  },
];
