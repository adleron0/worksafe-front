import { cn } from "@/lib/utils";

export interface Bucket { count: number; total: number }
export interface SummaryCard {
  view: string;
  label: string;
  bucket?: Bucket;
  /** Classe de cor do valor (ex.: "text-red-600"). */
  tone?: string;
  /** Texto curto depois da quantidade (ex.: "11/2026"). */
  hint?: string;
  /** Bolinha de cor antes do rótulo (a cor da situação). */
  color?: string;
}

const brl = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

/**
 * Cartões de resumo: rótulo, valor total e quantidade. Clicar num cartão escolhe a visão/filtro
 * e o cartão ativo fica marcado. Sem `onPick` os cartões só mostram os números.
 */
export default function SummaryCards({ cards, active, onPick, noun = ["conta", "contas"], columns = "grid-cols-2 md:grid-cols-3 xl:grid-cols-6", className, ariaLabel }: {
  cards: SummaryCard[];
  active?: string;
  onPick?: (view: string) => void;
  /** Como contar os itens: [singular, plural]. */
  noun?: [string, string];
  /** Colunas do grid por largura de tela. */
  columns?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn("grid gap-3 my-4", columns, className)}>
      {cards.map((card) => {
        const body = (
          <>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
              {card.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: card.color }} aria-hidden />}
              <span className="truncate">{card.label}</span>
            </p>
            <p className={cn("text-lg font-bold tabular-nums truncate", card.tone)}>{card.bucket ? brl(card.bucket.total) : "—"}</p>
            <p className="text-xs text-muted-foreground truncate">
              {card.bucket ? `${card.bucket.count} ${card.bucket.count === 1 ? noun[0] : noun[1]}` : " "}{card.hint ? ` · ${card.hint}` : ""}
            </p>
          </>
        );
        const base = "rounded-lg border p-3 text-left min-w-0";
        if (!onPick) return <div key={card.view} data-card={card.view} className={base}>{body}</div>;
        return (
          <button key={card.view} type="button" data-card={card.view} onClick={() => onPick(card.view)} aria-pressed={active === card.view}
            className={cn(base, "transition-colors hover:bg-muted/50 cursor-pointer", active === card.view && "border-primary ring-1 ring-primary bg-primary/5")}>
            {body}
          </button>
        );
      })}
    </div>
  );
}
