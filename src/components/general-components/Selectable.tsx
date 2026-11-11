import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface SelectableProps {
  id: string | number;
  checked: boolean;
  onToggle: (id: string | number) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Componente Selectable
 *
 * Renderiza um checkbox de seleção inline dentro do item da lista.
 * Use junto com o hook useSelection para gerenciar o estado.
 *
 * @example
 * ```tsx
 * const selection = useSelection(data);
 *
 * <div className="flex items-center gap-3 p-4">
 *   <Selectable
 *     id={item.id}
 *     checked={selection.isSelected(item.id)}
 *     onToggle={selection.toggleSelection}
 *     label={item.name}
 *   />
 *   // ... resto do conteúdo
 * </div>
 * ```
 */
export function Selectable({
  id,
  checked,
  onToggle,
  label,
  className,
  disabled = false,
}: SelectableProps) {
  return (
    <div
      className={cn(
        "flex items-center flex-shrink-0",
        "justify-start lg:justify-center", // Mobile: esquerda, Desktop: centro
        "lg:w-12", // Desktop: largura fixa
        "w-auto",  // Mobile: auto
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) {
          onToggle(id);
        }
      }}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        aria-label={label ? `Selecionar ${label}` : `Selecionar item ${id}`}
        className="cursor-pointer"
      />
    </div>
  );
}
