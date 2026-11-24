import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";

/**
 * BADGE (etiqueta) — classifica o registro: tipo, origem, perfil, vínculo, "mensal", "parcela 2/6"...
 * Sem o ponto (o ponto é só do status). Neutra por padrão; com `color` vira a etiqueta colorida do
 * Unyo (fundo e borda no tom bem suave da cor, ícone na cor, texto normal).
 * Para a situação de um registro (Ativo, Pago, Vencido...), use o `StatusBadge`.
 */
export default function TagBadge({ children, icon, color, size = "sm", className, title }: {
  children?: React.ReactNode;
  /** ícone lucide em kebab-case */
  icon?: string;
  /** cor da etiqueta (qualquer cor CSS); sem ela, cinza neutro */
  color?: string;
  size?: "sm" | "md";
  className?: string;
  title?: string;
}) {
  const style = color ? {
    background: `color-mix(in srgb, ${color} 8%, hsl(var(--card)))`,
    borderColor: `color-mix(in srgb, ${color} 30%, hsl(var(--border)))`,
  } : undefined;
  return (
    <span aria-label={title} style={style}
      className={cn("inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-chip border font-medium",
        size === "sm" ? "px-1.5 py-px text-[11px]" : "px-2.5 py-0.5 text-[12.5px]",
        color ? "text-foreground" : "border-transparent bg-muted text-muted-foreground", className)}>
      {icon && <Icon name={icon} className={size === "sm" ? "size-3 shrink-0" : "size-3.5 shrink-0"}
        style={color ? { color: `color-mix(in srgb, ${color} 65%, hsl(var(--foreground)))` } : undefined} />}
      {children !== undefined && <span className="truncate">{children}</span>}
    </span>
  );
}
