import { useState } from "react";
import { CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const FULL = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-11" → "Nov/2026" */
const label = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]}/${ym.slice(0, 4)}`;
const ymOf = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, "0")}`;
const thisMonth = () => { const d = new Date(); return ymOf(d.getFullYear(), d.getMonth()); };
const shift = (ym: string, months: number) => {
  const d = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + months, 1);
  return ymOf(d.getFullYear(), d.getMonth());
};

/** Texto do período: "Nov/2026" ou "Out/2026 a Dez/2026" (vazio = qualquer mês). */
export const monthRangeText = (from?: string, to?: string) => {
  if (!from && !to) return "";
  if (from && to && from === to) return label(from);
  if (from && to) return `${label(from)} a ${label(to)}`;
  return from ? `A partir de ${label(from)}` : `Até ${label(to!)}`;
};

/**
 * Calendário de meses: o ano no topo (setas para passar), os 12 meses abaixo.
 * Um clique escolhe um mês; o segundo clique fecha o período (em qualquer
 * ordem, inclusive em outro ano). Valores no formato AAAA-MM.
 */
export default function MonthRangePicker({ from, to, onChange, placeholder = "Qualquer mês", className, clearable = true, align = "start" }: {
  from?: string; to?: string; onChange: (from: string, to: string) => void; placeholder?: string; className?: string;
  /** false quando o período é obrigatório (sem o "x" de limpar) */
  clearable?: boolean;
  /** lado do popover em relação ao botão (use "end" quando o botão fica à direita) */
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number((from || thisMonth()).slice(0, 4)));
  // primeiro clique feito, esperando o fim do período
  const [pending, setPending] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const pick = (ym: string) => {
    if (!pending) { setPending(ym); onChange(ym, ym); return; }
    const [a, b] = pending <= ym ? [pending, ym] : [ym, pending];
    setPending(null); setHover(null);
    onChange(a, b);
    setOpen(false);
  };
  const preset = (a: string, b: string) => { setPending(null); onChange(a, b); setYear(Number(b.slice(0, 4))); setOpen(false); };

  // faixa destacada: a escolhida ou, durante a escolha, até onde o mouse está
  const [lo, hi] = pending && hover ? (pending <= hover ? [pending, hover] : [hover, pending]) : [from ?? "", to ?? from ?? ""];
  const now = thisMonth();
  const text = monthRangeText(from, to);
  const yearStart = `${new Date().getFullYear()}-01`;

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setPending(null); setHover(null); } }}>
      <div className={cn("relative", className)}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className={cn("w-full justify-start text-left font-normal", clearable && "pr-9", !text && "text-muted-foreground")}>
            <CalendarIcon className="h-4 w-4" />
            <span className="truncate">{text || placeholder}</span>
          </Button>
        </PopoverTrigger>
        {text && clearable && (
          <button type="button" aria-label="Limpar período" onClick={() => { setPending(null); onChange("", ""); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <PopoverContent className="w-72 p-3 rounded-card" align={align}>
        <div className="flex items-center justify-between mb-3">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setYear(year - 1)} aria-label="Ano anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <div className="font-semibold text-sm tabular-nums">{year}</div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setYear(year + 1)} aria-label="Próximo ano"><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-4 gap-1.5" onMouseLeave={() => setHover(null)}>
          {MONTHS.map((name, index) => {
            const ym = ymOf(year, index);
            const edge = ym === lo || ym === hi;
            const inside = !!lo && ym > lo && ym < hi;
            return (
              <button key={ym} type="button" onClick={() => pick(ym)} onMouseEnter={() => setHover(ym)}
                aria-label={`${FULL[index]} de ${year}`} aria-pressed={edge || inside}
                className={cn(
                  "h-8 rounded-lg text-[13px] transition-colors",
                  edge ? "bg-primary text-primary-foreground font-medium"
                    : inside ? "bg-primary/15 text-foreground"
                      : "hover:bg-muted",
                  ym === now && !edge && "ring-1 ring-primary",
                )}>
                {name}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2 min-h-4">
          {pending ? `De ${label(pending)}: clique no mês final (ou no mesmo para só ele).` : "Clique em um mês, ou em dois para um período."}
        </p>
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t">
          {[
            { text: "Este mês", a: now, b: now },
            { text: "Mês passado", a: shift(now, -1), b: shift(now, -1) },
            { text: "Últimos 3 meses", a: shift(now, -2), b: now },
            { text: "Este ano", a: yearStart, b: `${yearStart.slice(0, 4)}-12` },
          ].map((p) => (
            <button key={p.text} type="button" onClick={() => preset(p.a, p.b)}
              className={cn("rounded-chip border px-2 py-0.5 text-[11px] font-medium transition-colors", from === p.a && to === p.b ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted")}>
              {p.text}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
