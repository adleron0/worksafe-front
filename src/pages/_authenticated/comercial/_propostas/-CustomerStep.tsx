import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import { cn } from "@/lib/utils";
import { commercialApi, errorMessage } from "../-shared/commercial";
import { CustomerOption, KIND_LABEL, ProposalKind, formatCnpj } from "../-shared/proposals";

interface Props {
  kind: ProposalKind;
  onKind: (kind: ProposalKind) => void;
  selected: CustomerOption | null;
  onSelect: (customer: CustomerOption) => void;
  readOnly?: boolean;
}

type Row = CustomerOption & { place?: string | null };
const SHOWN = 10;

/**
 * Passo 1: para quem é a proposta. Só o tipo e a lista de clientes — um campo
 * para filtrar e um cartão por cliente; o escolhido fica destacado na lista.
 */
export default function CustomerStep({ kind, onKind, selected, onSelect, readOnly }: Props) {
  const [term, setTerm] = useState("");
  const { data, isFetching, error } = useQuery({
    queryKey: ["commercialCustomers", term.trim()],
    queryFn: () => commercialApi.get<Row[]>("proposals/customers", term.trim() ? { search: term.trim() } : undefined),
    placeholderData: (previous) => previous,
  });
  // o escolhido aparece sempre, mesmo quando a busca não o traz
  const rows: Row[] = (data ?? []).slice(0, SHOWN);
  if (selected && !rows.some((row) => row.id === selected.id)) rows.unshift(selected);
  const more = (data?.length ?? 0) > SHOWN;

  return (
    <div className="grid gap-4">
      <div className="inline-flex w-fit rounded-md border overflow-hidden" role="radiogroup" aria-label="Tipo de proposta">
        {(Object.keys(KIND_LABEL) as ProposalKind[]).map((value) => (
          <button key={value} type="button" role="radio" aria-checked={kind === value} disabled={readOnly} onClick={() => onKind(value)}
            className={cn("px-3.5 h-9 text-sm font-medium border-l first:border-l-0 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60",
              kind === value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
            {KIND_LABEL[value]}
          </button>
        ))}
      </div>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium">Cliente</span>
        <Input name="customerSearch" value={term} maxLength={120} disabled={readOnly} onValueChange={(_, value) => setTerm(String(value))}
          placeholder="Digite o nome ou o CNPJ para filtrar" icon="search" aria-label="Filtrar clientes" />
      </label>

      <ul className="grid gap-1" role="listbox" aria-label="Clientes">
        {error && !data && <li className="px-3 py-2 text-sm text-destructive">Não foi possível carregar os clientes: {errorMessage(error)}</li>}
        {isFetching && !data && <li className="px-3 py-2 text-sm text-muted-foreground">Buscando…</li>}
        {rows.map((row) => {
          const active = selected?.id === row.id;
          return (
            <li key={row.id}>
              <button type="button" role="option" aria-selected={active} disabled={readOnly && !active} onClick={() => onSelect(row)}
                className={cn("w-full min-w-0 flex items-baseline gap-2 rounded-md border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  active ? "border-primary bg-primary/10" : "bg-background hover:bg-muted/60")}>
                {active && <Icon name="check" className="w-4 h-4 shrink-0 self-center text-primary" />}
                <span className="truncate text-sm font-medium">{row.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{[formatCnpj(row.cnpj), row.place].filter(Boolean).join(" · ")}</span>
              </button>
            </li>
          );
        })}
        {data && rows.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{term ? "Nenhum cliente para essa busca." : "Nenhum cliente cadastrado."}</li>}
      </ul>

      <p className="text-xs text-muted-foreground">
        {more ? `Mostrando os ${SHOWN} primeiros. Digite para filtrar. ` : ""}
        Não achou? <Link to="/clientes" className="underline">Cadastre a empresa em Clientes</Link> e volte aqui.
      </p>
    </div>
  );
}
