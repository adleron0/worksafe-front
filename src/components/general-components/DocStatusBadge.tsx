import StatusBadge, { StatusTone } from "./StatusBadge";
import type { DocumentFolderTone } from "./DocumentFolder";

/** Situação de um documento pelo vencimento: a mesma nos documentos de funcionário (RH) e nos arquivos da empresa. */
export type DocStatus = "em_dia" | "a_vencer" | "vencido" | "sem_validade" | "faltando" | "vazia";

const BADGE_TONE: Record<DocStatus, StatusTone> = {
  em_dia: "success", a_vencer: "warning", vencido: "danger", faltando: "danger", sem_validade: "neutral", vazia: "neutral",
};
/** A cor da pasta para cada situação. */
export const STATUS_TONE: Record<DocStatus, DocumentFolderTone> = { em_dia: "ok", a_vencer: "warn", vencido: "danger", faltando: "danger", sem_validade: "neutral", vazia: "neutral" };

/** Situação do documento no padrão de status (ponto pulsante). */
export default function DocStatusBadge({ status, label }: { status: DocStatus; label: string }) {
  return <StatusBadge tone={BADGE_TONE[status]}>{label}</StatusBadge>;
}
