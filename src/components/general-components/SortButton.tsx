import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";

/**
 * Ordenação em três estados no padrão do sistema: ↕ neutro → ↑ crescente →
 * ↓ decrescente → neutro. `order` é "campo:asc" ou "campo:desc" (vazio = neutro).
 */
export function SortButton({ label, field, order, onSort, className }: { label: string; field: string; order?: string; onSort: (order: string) => void; className?: string }) {
  const [current, dir] = (order ?? "").split(":");
  const active = current === field;
  return (
    <button type="button" className={cn("inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring", active && "text-foreground", className)}
      onClick={() => onSort(active && dir === "asc" ? `${field}:desc` : active && dir === "desc" ? "" : `${field}:asc`)}>
      {label}
      <Icon name={active ? (dir === "asc" ? "arrow-up" : "arrow-down") : "arrow-up-down"} className={cn("w-3 h-3", !active && "opacity-40")} />
    </button>
  );
}

export default SortButton;
