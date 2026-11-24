import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Opções de "por página" das listas de treinamentos (as mesmas do antigo seletor "Itens"). */
export const LIMITS = [10, 30, 50, 100, 200];

const FIXED = ["page", "limit", "show", "all"];
const isEmpty = (value: unknown): boolean =>
  value === undefined || value === null || value === "" || (Array.isArray(value) && value.every(isEmpty));

/**
 * Quantos filtros da busca avançada estão ligados: ignora página, limite, ordenação,
 * a busca de texto (`ignore`) e o que a tela já fixa no estado inicial (`base`).
 */
export function countFilters(params: Record<string, unknown>, base: Record<string, unknown>, ignore: string[] = []) {
  return Object.entries(params).filter(([key, value]) => {
    if (FIXED.includes(key) || key.startsWith("order-") || ignore.includes(key) || isEmpty(value)) return false;
    return !(key in base && JSON.stringify(base[key]) === JSON.stringify(value));
  }).length;
}

export const muted = "text-xs text-muted-foreground";

/** Data dd/mm/aaaa (ou "—"). `utc` para datas sem hora gravadas à meia-noite UTC. */
export function formatDay(date?: string | Date | null, utc = false) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", utc ? { timeZone: "UTC" } : undefined);
}

/** Texto com o resto num balão (a célula fica em uma linha só). */
export function More({ children, lines }: { children: React.ReactNode; lines: Array<string | number | false | null | undefined> }) {
  const extra = lines.filter((line): line is string => typeof line === "string" && line !== "");
  if (!extra.length) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild><span className="cursor-help min-w-0">{children}</span></TooltipTrigger>
      <TooltipContent className="max-w-xs space-y-0.5">{extra.map((line) => <p key={line}>{line}</p>)}</TooltipContent>
    </Tooltip>
  );
}

/** Célula de identificação: avatar pequeno + nome (+ uma linha cinza). */
export function NameCell({ name, image, sub, square, className }: { name: string; image?: string | null; sub?: React.ReactNode; square?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 min-w-0", className)}>
      <Avatar className={cn("size-8 border shrink-0", square ? "rounded-md" : "rounded-full")}>
        <AvatarImage src={image || undefined} alt={name} className="object-cover" />
        <AvatarFallback className={cn("text-xs uppercase", square ? "rounded-md" : "rounded-full")}>{name?.[0] || "?"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="font-medium truncate">{name}</p>
        {sub && <div className={cn(muted, "truncate")}>{sub}</div>}
      </div>
    </div>
  );
}
