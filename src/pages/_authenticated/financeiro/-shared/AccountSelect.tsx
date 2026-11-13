import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import { ChartAccount, accountPath } from "./financial";

interface AccountSelectProps {
  accounts: ChartAccount[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** "leaf": só contas que aceitam lançamento. "parent": só contas que podem ter filhas. "any": qualquer uma. */
  mode?: "leaf" | "parent" | "any";
  /** Esconde esta conta e as filhas dela (ao escolher para onde mover). */
  excludeCode?: string;
  nature?: "receita" | "despesa";
  disabled?: boolean;
  clearable?: boolean;
}

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Seletor de conta do plano de contas: mostra a hierarquia com recuo e
 * código, busca por nome ou código, e só deixa escolher o que o `mode` permite
 * (as demais aparecem como cabeçalho, para dar contexto).
 */
export default function AccountSelect({
  accounts, value, onChange, placeholder = "Selecione a conta", mode = "leaf", excludeCode, nature, disabled, clearable,
}: AccountSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = accounts.find((a) => String(a.id) === value);
  const selectable = (account: ChartAccount) => {
    if (account.inactiveAt) return false;
    if (mode === "leaf") return account.acceptsEntries;
    if (mode === "parent") return account.level < 3;
    return true;
  };

  const visible = useMemo(() => {
    const term = normalize(search.trim());
    const pool = accounts.filter((a) =>
      !a.inactiveAt
      && (!nature || a.nature === nature)
      && !(excludeCode && (a.code === excludeCode || a.code.startsWith(`${excludeCode}.`)))
      && !(mode === "parent" && a.level >= 3));
    if (!term) return pool;
    // mantém as mães de quem bateu na busca, para a hierarquia continuar legível
    const matched = pool.filter((a) => normalize(a.name).includes(term) || a.code.startsWith(term));
    const keep = new Set<string>();
    for (const account of matched) {
      const parts = account.code.split(".");
      for (let i = 1; i <= parts.length; i++) keep.add(parts.slice(0, i).join("."));
    }
    return pool.filter((a) => keep.has(a.code));
  }, [accounts, search, nature, excludeCode, mode]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" disabled={disabled}
          className="w-full justify-between font-normal h-auto min-h-9 py-1.5 mt-1 text-left">
          {selected ? (
            <span className="flex flex-col min-w-0">
              <span className="truncate"><span className="text-muted-foreground tabular-nums mr-1.5">{selected.code}</span>{selected.name}</span>
              {selected.level > 1 && <span className="text-xs text-muted-foreground truncate">{accountPath(accounts, selected)}</span>}
            </span>
          ) : <span className="text-muted-foreground">{placeholder}</span>}
          <span className="flex items-center gap-1 shrink-0">
            {clearable && selected && (
              <span role="button" aria-label="Limpar" className="p-0.5 rounded hover:bg-muted"
                onClick={(event) => { event.stopPropagation(); event.preventDefault(); onChange(""); }}>
                <Icon name="x" className="w-3 h-3" />
              </span>
            )}
            <Icon name="chevrons-up-down" className="w-3 h-3 opacity-60" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-72" align="start">
        <div className="p-2 border-b">
          <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome ou código..."
            className="w-full bg-transparent text-sm outline-none px-1 py-1" />
        </div>
        <div className="max-h-64 overflow-y-auto py-1" role="listbox">
          {visible.length === 0 && <p className="text-sm text-muted-foreground px-3 py-2">Nenhuma conta encontrada.</p>}
          {visible.map((account) => {
            const can = selectable(account);
            return (
              <button key={account.id} type="button" role="option" aria-selected={String(account.id) === value} disabled={!can}
                onClick={() => { onChange(String(account.id)); setOpen(false); setSearch(""); }}
                style={{ paddingLeft: `${0.75 + (account.level - 1) * 1}rem` }}
                className={cn(
                  "w-full text-left text-sm pr-3 py-1.5 flex items-baseline gap-2",
                  can ? "hover:bg-accent cursor-pointer" : "cursor-default text-muted-foreground font-semibold",
                  String(account.id) === value && "bg-accent",
                )}>
                <span className="tabular-nums text-xs text-muted-foreground shrink-0">{account.code}</span>
                <span className="truncate">{account.name}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
