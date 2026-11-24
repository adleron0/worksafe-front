import { useEffect, useRef, useState } from "react";
import Icon from "@/components/general-components/Icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Busca com espera (400ms) antes de avisar; o "x" limpa na hora. */
export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (value: string) => void; placeholder: string; className?: string }) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => setText(value), [value]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className={cn("relative w-full sm:w-80", className)}>
      <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input value={text} placeholder={placeholder} aria-label={placeholder} maxLength={120}
        onChange={(event) => { const next = event.target.value; setText(next); clearTimeout(timer.current); timer.current = setTimeout(() => onChange(next.trim()), 400); }}
        className="w-full h-9 rounded-lg border bg-background pl-9 pr-8 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" />
      {text && (
        <button type="button" aria-label="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => { clearTimeout(timer.current); setText(""); onChange(""); }}>
          <Icon name="x" className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/**
 * Barra de ferramentas da listagem, numa linha só: busca → Filtros (com contador)
 * → à direita as ações (menu "Ações" e o botão primário "+ Novo").
 * No celular a busca ocupa a linha inteira e os botões vêm abaixo.
 */
export default function ListToolbar({ search, onOpenFilters, filterCount = 0, children, className }: {
  search?: { value: string; onChange: (value: string) => void; placeholder: string };
  onOpenFilters?: () => void;
  filterCount?: number;
  /** ações à direita (ActionsMenu, botão primário) */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {search && <SearchInput {...search} />}
      {onOpenFilters && (
        <Button variant="outline" onClick={onOpenFilters} aria-label={filterCount ? `Filtros (${filterCount} ativos)` : "Filtros"}>
          <Icon name="sliders-horizontal" className="w-4 h-4" /> Filtros
          {filterCount > 0 && <span className="rounded-full bg-primary text-primary-foreground text-[10px] leading-4 px-1.5 tabular-nums">{filterCount}</span>}
        </Button>
      )}
      {children && <div className="flex items-center gap-2 ml-auto">{children}</div>}
    </div>
  );
}
