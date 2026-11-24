import Icon from "@/components/general-components/Icon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** Páginas a mostrar (0-based), com -1 no lugar das reticências: 0 … 4 5 6 … 66 */
export function pageWindow(current: number, totalPages: number, siblings = 1): number[] {
  if (totalPages <= 5 + siblings * 2) return Array.from({ length: totalPages }, (_, i) => i);
  const start = Math.max(1, current - siblings);
  const end = Math.min(totalPages - 2, current + siblings);
  const pages: number[] = [0];
  if (start > 1) pages.push(-1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 2) pages.push(-1);
  pages.push(totalPages - 1);
  return pages;
}

const pageBtn = "min-w-8 h-8 px-2 inline-flex items-center justify-center rounded-lg border bg-card text-[13px] tabular-nums transition-colors";

/**
 * Rodapé da listagem (padrão Unyo): "Mostrando 1–10 de 670 · 10 por página ▾"
 * à esquerda e as páginas numeradas à direita. Página é 0-based (como na URL).
 * No celular: "1–10 de 670" e só ‹ página ›.
 */
export default function ListFooter({ total, page, limit, limits = [10, 30, 50, 100], onPageChange, onLimitChange, className }: {
  total: number;
  page: number;
  limit: number;
  limits?: number[];
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  className?: string;
}) {
  if (!total) return null;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(page, totalPages - 1);
  const first = current * limit + 1;
  const last = Math.min((current + 1) * limit, total);
  const options = limits.includes(limit) ? limits : [...limits, limit].sort((a, b) => a - b);
  const go = (next: number) => { if (next >= 0 && next < totalPages && next !== current) onPageChange(next); };

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted-foreground", className)}>
      <div className="flex items-center gap-1.5">
        <span className="tabular-nums"><span className="hidden sm:inline">Mostrando </span>{first}–{last} de {total.toLocaleString("pt-BR")}</span>
        {onLimitChange && (
          <>
            <span aria-hidden>·</span>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-foreground hover:bg-muted">
                {limit} por página <Icon name="chevron-down" className="w-3.5 h-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {options.map((n) => (
                  <DropdownMenuItem key={n} onSelect={() => onLimitChange(n)} className={cn("tabular-nums", n === limit && "font-semibold text-primary")}>{n} por página</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
      {totalPages > 1 && (
        <nav aria-label="Páginas" className="flex items-center gap-1">
          <button type="button" className={cn(pageBtn, "disabled:opacity-40 hover:bg-muted")} disabled={current === 0} onClick={() => go(current - 1)} aria-label="Página anterior">
            <Icon name="chevron-left" className="w-4 h-4" />
          </button>
          <span className="sm:hidden px-2 tabular-nums text-foreground">{current + 1} / {totalPages}</span>
          {pageWindow(current, totalPages).map((p, i) => p < 0
            ? <span key={`e${i}`} className="hidden sm:inline px-1">…</span>
            : (
              <button key={p} type="button" onClick={() => go(p)} aria-current={p === current ? "page" : undefined}
                className={cn(pageBtn, "hidden sm:inline-flex", p === current ? "bg-primary border-primary text-primary-foreground font-semibold" : "text-foreground hover:bg-muted")}>
                {p + 1}
              </button>
            ))}
          <button type="button" className={cn(pageBtn, "disabled:opacity-40 hover:bg-muted")} disabled={current >= totalPages - 1} onClick={() => go(current + 1)} aria-label="Próxima página">
            <Icon name="chevron-right" className="w-4 h-4" />
          </button>
        </nav>
      )}
    </div>
  );
}
