import { useRef, useState } from "react";
import Icon from "@/components/general-components/Icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Ícone ⓘ pequeno ao lado de um dado que tem detalhes. Passar o mouse mostra os detalhes
 * (cursor "?"); clicar ou tocar fixa o balão — no celular é o toque que abre.
 * É um botão, então o clique nele não abre a linha da tabela.
 * Sem detalhes (`lines` vazio e sem `children`), não aparece nada.
 */
export default function InfoHint({ lines, children, label = "Ver detalhes", className, side = "top" }: {
  /** linhas de texto; itens vazios/false são ignorados */
  lines?: Array<string | number | false | null | undefined>;
  /** conteúdo livre, no lugar de `lines` */
  children?: React.ReactNode;
  label?: string;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}) {
  const items = (lines ?? []).filter((line): line is string | number => (typeof line === "string" && line !== "") || typeof line === "number");
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  if (!items.length && !children) return null;

  const hover = (next: boolean) => {
    if (pinned) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), next ? 120 : 150);
  };

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setPinned(false); }}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} data-row-ignore
          onMouseEnter={() => hover(true)} onMouseLeave={() => hover(false)}
          onClick={(event) => { event.preventDefault(); event.stopPropagation(); clearTimeout(timer.current); const next = !(pinned && open); setPinned(next); setOpen(next); }}
          className={cn("inline-grid place-items-center size-4 shrink-0 rounded-full align-[-2px] text-muted-foreground/70 cursor-help transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30", open && "text-primary", className)}>
          <Icon name="info" className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} align="center" sideOffset={6}
        onMouseEnter={() => hover(true)} onMouseLeave={() => hover(false)}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="w-auto max-w-xs p-2.5 text-xs leading-relaxed">
        {children ?? <div className="space-y-0.5">{items.map((line, i) => <p key={i}>{line}</p>)}</div>}
      </PopoverContent>
    </Popover>
  );
}
