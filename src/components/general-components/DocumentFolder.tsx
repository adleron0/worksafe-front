import Folder from "@/components/ui-bits/Folder/Folder";
import { cn } from "@/lib/utils";

export type DocumentFolderTone = "neutral" | "ok" | "warn" | "danger";

/** A cor da pasta diz a situação do que está dentro (o Folder só aceita cor em hexadecimal). */
const TONE_COLOR: Record<DocumentFolderTone, string> = { neutral: "#64748b", ok: "#16a34a", warn: "#f59e0b", danger: "#dc2626" };

interface DocumentFolderProps {
  name: string;
  /** Quantos arquivos há na pasta. */
  count: number;
  tone?: DocumentFolderTone;
  /** Texto curto da situação (ex.: "Vencido", "Em dia"). */
  statusLabel?: string;
  /** Até 3 títulos que aparecem nos papéis da pasta. */
  papers?: string[];
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

/**
 * Pasta de documentos: a porta de entrada de uma categoria de arquivos.
 * Embrulha o Folder do React Bits para o resto do sistema não depender dele;
 * o conteúdo da pasta é listado por quem usa, com os componentes do projeto.
 */
export default function DocumentFolder({ name, count, tone = "neutral", statusLabel, papers = [], selected = false, onSelect, className }: DocumentFolderProps) {
  return (
    <div
      role="button" tabIndex={0} aria-pressed={selected} aria-label={`Pasta ${name}: ${count} ${count === 1 ? "arquivo" : "arquivos"}${statusLabel ? `, ${statusLabel}` : ""}`}
      onClick={onSelect} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect?.(); } }}
      className={cn("flex w-36 shrink-0 cursor-pointer flex-col items-center gap-2 rounded-lg border p-3 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
        selected ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50", className)}
    >
      {/* a pasta é só o desenho: quem recebe o clique é o cartão */}
      <div className="pointer-events-none flex h-24 items-end justify-center" aria-hidden>
        <Folder size={0.62} color={TONE_COLOR[tone]} variant="solid" open={selected} intro={false} draggable={false} zoomOnClick={false} closeOnOutsideClick={false}
          items={papers.slice(0, 3)} />
      </div>
      <div className="min-w-0 w-full">
        <p className="text-sm font-medium leading-tight">{name}</p>
        <p className="text-xs text-muted-foreground">{count} {count === 1 ? "arquivo" : "arquivos"}{statusLabel ? ` · ${statusLabel}` : ""}</p>
      </div>
    </div>
  );
}
