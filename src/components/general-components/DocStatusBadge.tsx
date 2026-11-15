import { cn } from "@/lib/utils";
import type { DocumentFolderTone } from "./DocumentFolder";

/** Situação de um documento pelo vencimento: a mesma nos documentos de funcionário (RH) e nos arquivos da empresa. */
export type DocStatus = "em_dia" | "a_vencer" | "vencido" | "sem_validade" | "faltando" | "vazia";

const STATUS_STYLE: Record<DocStatus, string> = {
  em_dia: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  a_vencer: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  vencido: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  faltando: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  sem_validade: "bg-muted text-muted-foreground",
  vazia: "bg-muted text-muted-foreground",
};
/** A cor da pasta para cada situação. */
export const STATUS_TONE: Record<DocStatus, DocumentFolderTone> = { em_dia: "ok", a_vencer: "warn", vencido: "danger", faltando: "danger", sem_validade: "neutral", vazia: "neutral" };

export default function DocStatusBadge({ status, label }: { status: DocStatus; label: string }) {
  return <span className={cn("inline-flex rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", STATUS_STYLE[status])}>{label}</span>;
}
