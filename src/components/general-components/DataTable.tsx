import { forwardRef, type KeyboardEvent, type MouseEvent } from "react";
import Icon from "@/components/general-components/Icon";
import { SortButton } from "@/components/general-components/SortButton";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Onde a coluna aparece no celular (< 640px), onde a tabela vira lista:
 * título e subtítulo à esquerda, `end` (valor) e `badge` à direita, `meta` em cinza embaixo.
 */
export type MobileSlot = "title" | "subtitle" | "meta" | "end" | "badge" | "hidden";

export interface DataColumn<T> {
  id: string;
  header: React.ReactNode;
  /** campo de ordenação: o cabeçalho vira SortButton ("campo:asc" | "campo:desc") */
  sortField?: string;
  cell: (row: T) => React.ReactNode;
  /** classes da célula e do cabeçalho (largura, alinhamento) */
  className?: string;
  align?: "left" | "right" | "center";
  /** padrão: "meta"; a coluna de ações use "hidden" (ela vai pelo `actions`) */
  mobile?: MobileSlot;
}

export interface DataTableSelection<T> {
  isSelected: (row: T) => boolean;
  toggle: (row: T, on: boolean) => void;
  /** estado do "selecionar todas desta página" */
  pageState: boolean | "indeterminate";
  togglePage: (on: boolean) => void;
}

const INTERACTIVE = "a,button,input,select,textarea,label,[role=button],[role=checkbox],[role=menuitem],[role=switch],[data-row-ignore]";
const fromInside = (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
  const target = event.target as HTMLElement;
  if (!event.currentTarget.contains(target)) return false; // portal (menu, diálogo)
  const hit = target.closest(INTERACTIVE);
  return !hit || hit === event.currentTarget;
};
const alignClass = (align?: DataColumn<unknown>["align"]) => (align === "right" ? "text-right" : align === "center" ? "text-center" : "");

/**
 * Tabela das listagens (padrão Unyo): `<table>` de verdade, linhas de ~40px com divisória fina,
 * cabeçalho cinza discreto com a ordenação no título, seleção com "parcial", linha clicável,
 * skeleton, vazio e erro dentro da própria tabela. Ordenação e paginação são do servidor:
 * o componente só avisa (`onSort`). No celular vira uma lista compacta (ver `MobileSlot`).
 */
export default function DataTable<T>({
  rows, columns, getRowId, loading, error, onRetry, empty, order, onSort, selection, onRowClick, rowClassName, actions, skeletonRows = 8, minWidth = 720, ariaLabel,
}: {
  rows: T[] | undefined;
  columns: DataColumn<T>[];
  getRowId: (row: T) => string | number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** conteúdo do estado vazio (use <EmptyState />) */
  empty?: React.ReactNode;
  order?: string;
  onSort?: (order: string) => void;
  selection?: DataTableSelection<T>;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  /** menu ⋯ da linha (última coluna, também no celular) */
  actions?: (row: T) => React.ReactNode;
  skeletonRows?: number;
  /** largura mínima antes de rolar de lado dentro do cartão */
  minWidth?: number;
  ariaLabel?: string;
}) {
  const colCount = columns.length + (selection ? 1 : 0) + (actions ? 1 : 0);
  const rowProps = (row: T) => onRowClick ? {
    tabIndex: 0,
    onClick: (event: MouseEvent<HTMLElement>) => { if (fromInside(event) && !window.getSelection()?.toString()) onRowClick(row); },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => { if (event.key === "Enter" && fromInside(event)) onRowClick(row); },
  } : {};
  const header = (col: DataColumn<T>) => (col.sortField && onSort
    ? <SortButton label={String(col.header)} field={col.sortField} order={order} onSort={onSort} />
    : col.header);
  const state = loading && !rows?.length ? "loading" : error ? "error" : !rows?.length ? "empty" : "rows";
  const message = state === "error"
    ? (
      <div className="py-10 flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-medium text-destructive">Não foi possível carregar: {error}</p>
        {onRetry && <Button variant="outline" size="sm" onClick={onRetry}><Icon name="rotate-cw" className="w-3.5 h-3.5" /> Tentar de novo</Button>}
      </div>
    )
    : (empty ?? <EmptyState title="Nenhum registro encontrado." />);

  const slot = (name: MobileSlot, row: T) => columns.filter((c) => (c.mobile ?? "meta") === name).map((c) => <div key={c.id} className="min-w-0">{c.cell(row)}</div>);

  return (
    <div className={cn("relative min-w-0", loading && rows?.length && "opacity-70 transition-opacity")} aria-busy={loading}>
      {/* computador e tablet */}
      <div className="hidden sm:block overflow-x-auto -mx-1 px-1">
        <table className="w-full border-separate border-spacing-0 text-[13px]" style={{ minWidth }} aria-label={ariaLabel}>
          <thead>
            <tr>
              {selection && (
                <th className="w-8 py-2 pr-2 border-b text-left">
                  <Checkbox checked={selection.pageState} onCheckedChange={(v) => selection.togglePage(v === true)} aria-label="Selecionar todas desta página" />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.id} scope="col" className={cn("py-2 pr-3 border-b font-semibold text-[12.5px] text-muted-foreground whitespace-nowrap text-left", alignClass(col.align), col.className)}>
                  {header(col)}
                </th>
              ))}
              {actions && <th className="w-10 py-2 border-b"><span className="sr-only">Ações</span></th>}
            </tr>
          </thead>
          <tbody>
            {state === "loading" && Array.from({ length: skeletonRows }, (_, i) => (
              <tr key={i}>
                {Array.from({ length: colCount }, (_, j) => (
                  <td key={j} className="py-3 pr-3 border-b border-border/70"><Skeleton className={cn("h-4", j === 0 && selection ? "w-4" : ["w-3/4", "w-2/3", "w-1/2", "w-5/6"][(i + j) % 4])} /></td>
                ))}
              </tr>
            ))}
            {(state === "empty" || state === "error") && <tr><td colSpan={colCount}>{message}</td></tr>}
            {state === "rows" && rows!.map((row) => {
              const selected = selection?.isSelected(row);
              return (
                <tr key={getRowId(row)} data-state={selected ? "selected" : undefined} {...rowProps(row)}
                  className={cn("group/row [&>td]:border-b [&>td]:border-border/70 last:[&>td]:border-b-0 [&>td]:transition-colors",
                    selected ? "[&>td]:bg-primary-soft" : "hover:[&>td]:bg-muted/60",
                    onRowClick && "cursor-pointer focus-visible:outline-none focus-visible:[&>td]:bg-muted", rowClassName?.(row))}>
                  {selection && (
                    <td className="py-2 pr-2 align-middle">
                      <Checkbox checked={selected} onCheckedChange={(v) => selection.toggle(row, v === true)} aria-label="Selecionar linha" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.id} className={cn("py-2 pr-3 align-middle", alignClass(col.align), col.className)}>{col.cell(row)}</td>
                  ))}
                  {actions && <td className="py-1 text-right align-middle">{actions(row)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* celular: lista compacta */}
      <div className="sm:hidden">
        {selection && state === "rows" && (
          <label className="flex items-center gap-2 pb-2 text-xs text-muted-foreground border-b">
            <Checkbox checked={selection.pageState} onCheckedChange={(v) => selection.togglePage(v === true)} aria-label="Selecionar todas desta página" />
            Selecionar todas desta página
          </label>
        )}
        {state === "loading" && Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex gap-3 py-3 border-b last:border-b-0"><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div><Skeleton className="h-4 w-16" /></div>
        ))}
        {(state === "empty" || state === "error") && message}
        {state === "rows" && rows!.map((row) => {
          const selected = selection?.isSelected(row);
          return (
            <div key={getRowId(row)} {...rowProps(row)}
              className={cn("flex gap-3 py-3 border-b last:border-b-0 text-[13px]", selected && "bg-primary-soft -mx-3 px-3", onRowClick && "cursor-pointer", rowClassName?.(row))}>
              {selection && <div className="pt-0.5"><Checkbox checked={selected} onCheckedChange={(v) => selection.toggle(row, v === true)} aria-label="Selecionar" /></div>}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="font-medium">{slot("title", row)}</div>
                <div className="text-xs text-muted-foreground">{slot("subtitle", row)}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">{slot("meta", row)}</div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                {slot("end", row)}
                {slot("badge", row)}
              </div>
              {actions && <div className="-mr-1">{actions(row)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Estado vazio dentro da tabela: título, causa opcional e uma ação ("Limpar filtros", "+ Novo"). */
export function EmptyState({ title, description, action, icon = "inbox" }: { title: string; description?: string; action?: React.ReactNode; icon?: string }) {
  return (
    <div className="py-10 flex flex-col items-center gap-2 text-center">
      <span className="grid place-items-center size-10 rounded-full bg-muted text-muted-foreground"><Icon name={icon} className="w-5 h-5" /></span>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** Botão ⋯ das linhas (abre o DropdownMenu de cada tela, com `DropdownMenuTrigger asChild`). */
export const RowActionsTrigger = forwardRef<HTMLButtonElement, { label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ label, className, ...props }, ref) => (
    <button ref={ref} type="button" aria-label={label} {...props}
      className={cn("inline-grid place-items-center size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground data-[state=open]:bg-muted", className)}>
      <Icon name="ellipsis" className="w-4 h-4" />
    </button>
  ),
);
RowActionsTrigger.displayName = "RowActionsTrigger";
