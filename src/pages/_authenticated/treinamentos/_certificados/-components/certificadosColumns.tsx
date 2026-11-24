import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import StatusBadge from "@/components/general-components/StatusBadge";
import TagBadge from "@/components/general-components/TagBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { CertificateThumbnail } from "@/components/general-components/visualizadorCertificados";
import { renderVersion, resolveHighlight, themeInfo } from "@/components/general-components/visualizadorCertificados/highlight";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { muted } from "../../-shared/lista";
import { ICertificate } from "../-interfaces/entity.interface";

const formatDate = (date: string | Date | undefined) => {
  if (!date) return "Não informado";
  // string ISO: só a parte da data, para não mudar o dia pelo fuso
  if (typeof date === "string") {
    const [year, month, day] = date.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
  }
  return format(date, "dd/MM/yyyy", { locale: ptBR });
};

/** Válido = ativo e dentro da validade (comparando só as datas, sem fuso). */

/** Cor da etiqueta de destaque (a cor principal de cada acabamento do selo). */
const HIGHLIGHT_TAG_COLOR: Record<string, string> = { ouro: "#d4a017", prata: "#7b8791", holografico: "#a855f7" };
export const isValidCertificate = (item: ICertificate) => {
  if (item.inactiveAt) return false;
  if (item.expirationDate) {
    const expDateStr = typeof item.expirationDate === "string" ? item.expirationDate.split("T")[0] : format(item.expirationDate, "yyyy-MM-dd");
    if (expDateStr < format(new Date(), "yyyy-MM-dd")) return false;
  }
  return true;
};

export const certificadosColumns: DataColumn<ICertificate>[] = [
  {
    id: "trainee", header: "Aluno", className: "min-w-[280px]",
    cell: (item) => {
      const highlight = resolveHighlight(item);
      const highlightTheme = themeInfo(highlight?.theme);
      return (
        <div className="flex items-center gap-2.5 min-w-0">
          {item.fabricJsonFront && item.variableToReplace ? (
            <div className="w-16 rounded-md overflow-hidden border bg-background shrink-0">
              <CertificateThumbnail
                certificateData={{
                  id: item.id || 0,
                  name: item.course?.name || "Certificado",
                  fabricJsonFront: item.fabricJsonFront,
                  fabricJsonBack: item.fabricJsonBack,
                  canvasWidth: item.canvasWidth,
                  canvasHeight: item.canvasHeight,
                  certificateId: item.key?.toString() || "CERT-001",
                  updatedAt: renderVersion(item) ?? undefined,
                }}
                variableToReplace={item.variableToReplace || {}}
                className="w-full h-fit"
                zoom={20}
                showLoader={false}
              />
            </div>
          ) : (
            <Avatar className="size-8 border rounded-md bg-primary/10 shrink-0">
              <AvatarFallback className="rounded-md bg-primary/10 text-primary font-bold text-xs">{item.trainee?.name?.charAt(0).toUpperCase() || "A"}</AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0">
            <p className="font-medium truncate flex items-center gap-1.5">
              <span className="truncate">{item.trainee?.name || "Não informado"}</span>
              {highlightTheme && highlight && (
                <TagBadge icon={highlightTheme.icon} color={HIGHLIGHT_TAG_COLOR[highlightTheme.id] ?? "#d4a017"} className="shrink-0">{highlight.label}</TagBadge>
              )}
            </p>
            <p className={`${muted} truncate`}>{item.course?.name || "Não informado"}</p>
          </div>
        </div>
      );
    },
  },
  {
    id: "class", header: "Turma", className: "min-w-[160px]",
    cell: (item) => (
      <p className="truncate max-w-[14rem]">
        {item.class?.name || <span className="text-muted-foreground">Não informado</span>}
        {item.class?.classCode && <span className={`${muted} ml-1`}>({item.class.classCode})</span>}
      </p>
    ),
  },
  {
    id: "dates", header: "Emissão · Validade", className: "whitespace-nowrap",
    cell: (item) => (
      <div>
        <p className="tabular-nums">{formatDate(item.createdAt)}</p>
        <p className={`${muted} tabular-nums`}>Validade {formatDate(item.expirationDate)}</p>
      </div>
    ),
  },
  {
    id: "status", header: "Status",
    cell: (item) => (isValidCertificate(item) ? <StatusBadge tone="success">Válido</StatusBadge> : <StatusBadge tone="danger">Expirado</StatusBadge>),
  },
];
