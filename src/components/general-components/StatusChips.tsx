import { cn } from "@/lib/utils";

export interface StatusChipOption<T extends string = string> {
  value: T;
  label: string;
  /** quantidade ao lado do rótulo (sem número quando não se sabe) */
  count?: number;
  /** cor do quadradinho (qualquer cor CSS) */
  color?: string;
}

type Props<T extends string> = {
  options: StatusChipOption<T>[];
  className?: string;
  ariaLabel?: string;
} & (
  | { multiple?: false; value: T; onChange: (value: T) => void }
  | { multiple: true; value: T[]; onChange: (value: T[]) => void }
);

/**
 * Chips de situação com quadradinho de cor e contador (padrão Unyo).
 * `multiple`: vários ligados ao mesmo tempo, nenhum = todos. Sem `multiple`:
 * um ativo por vez (quem tem "Todas" coloca como opção).
 * No celular os chips rolam de lado em vez de quebrar em várias linhas.
 */
export default function StatusChips<T extends string>(props: Props<T>) {
  const { options, className, ariaLabel = "Situação" } = props;
  const isOn = (value: T) => (props.multiple ? props.value.includes(value) : props.value === value);
  const toggle = (value: T) => {
    if (props.multiple) props.onChange(props.value.includes(value) ? props.value.filter((v) => v !== value) : [...props.value, value]);
    else props.onChange(value);
  };
  return (
    <div role="group" aria-label={ariaLabel}
      className={cn("flex items-center gap-2 min-w-0 overflow-x-auto scroll-oculto sm:flex-wrap sm:overflow-visible -mx-1 px-1 py-0.5", className)}>
      {options.map((option) => {
        const on = isOn(option.value);
        return (
          <button key={option.value} type="button" aria-pressed={on} onClick={() => toggle(option.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-chip border px-2.5 py-1 text-[11px] font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              on ? "bg-primary-soft border-primary text-primary-soft-foreground" : "bg-card text-muted-foreground hover:border-primary/60 hover:text-foreground",
            )}>
            {option.color && <span aria-hidden className="size-2.5 rounded-[2px] shrink-0" style={{ background: option.color }} />}
            {option.label}
            {option.count !== undefined && <span className="font-normal tabular-nums">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
