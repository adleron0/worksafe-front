import { cn } from "@/lib/utils";

export interface QuickFilterOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Filtro rápido em botões lado a lado (um ativo por vez), para os recortes
 * mais usados de uma lista sem abrir a busca avançada.
 */
export default function QuickFilter<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: QuickFilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-0.5 rounded-lg bg-muted p-0.5">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                active ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
