import { cn } from "@/lib/utils";

export type StatusTone = "primary" | "neutral" | "success" | "warning" | "danger" | "info";

const TONES: Record<StatusTone, string> = {
  primary: "bg-primary-soft text-primary-soft-foreground",
  neutral: "bg-muted text-muted-foreground",
  success: "bg-muted text-green-700 dark:text-green-400",
  warning: "bg-muted text-amber-700 dark:text-amber-400",
  danger: "bg-muted text-red-700 dark:text-red-400",
  info: "bg-muted text-sky-700 dark:text-sky-400",
};

/**
 * Selo de situação: pílula pequena com pontinho na cor do tom.
 * A cor vai no texto e no ponto; o fundo é neutro (só "primary" usa o tom suave da empresa).
 */
export default function StatusBadge({ tone = "neutral", children, className }: { tone?: StatusTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-chip px-2 py-0.5 text-[11px] font-semibold", TONES[tone], className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current shrink-0" />
      {children}
    </span>
  );
}
