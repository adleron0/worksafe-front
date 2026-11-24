import { cn } from "@/lib/utils";

export type StatusTone = "primary" | "neutral" | "success" | "warning" | "danger" | "info";

/**
 * Cores por tom (padrão Unyo): fundo no tom suave, texto e ponto na cor do tom.
 * "primary" usa a cor da empresa (white label).
 */
const TONES: Record<StatusTone, string> = {
  primary: "bg-primary-soft text-primary-soft-foreground",
  success: "bg-green-500/12 text-green-700 dark:bg-green-400/15 dark:text-green-300",
  warning: "bg-amber-500/14 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  danger: "bg-red-500/12 text-red-700 dark:bg-red-400/15 dark:text-red-300",
  info: "bg-sky-500/12 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
  neutral: "bg-muted text-muted-foreground",
};

/**
 * STATUS — a situação viva de um registro (Ativo, Em aberto, Vencido, Concluída...).
 * Pílula com o ponto que pulsa (padrão Unyo: o ponto redondo é só de status).
 * Para classificar (tipo, origem, perfil, "mensal"...), use o `TagBadge`, que não tem ponto.
 * `pulse={false}` para estados encerrados quando o pulso distrair (ex.: listas longas de "Pago").
 */
export default function StatusBadge({ tone = "neutral", children, className, pulse = true, title }: {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
  /** texto para leitores de tela quando o rótulo é curto demais */
  title?: string;
}) {
  return (
    <span aria-label={title} className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-chip px-2.5 py-0.5 text-[11px] font-semibold leading-5", TONES[tone], className)}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full bg-current", pulse && "status-dot-pulse")} />
      {children}
    </span>
  );
}
