import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, CornerDownLeft } from 'lucide-react';
import { CERTIFICATE_VARIABLES, VARIABLE_GROUPS, fold } from '../utils/variablesCatalog';

interface VariablesPanelProps {
  /** Há um texto selecionado? (a variável entra nele em vez de criar outro) */
  hasTextSelected: boolean;
  onInsert: (key: string) => void;
}

/**
 * Lista de variáveis com busca: nome em português, a chave e um exemplo do
 * valor que entra na geração. Clicar insere no texto selecionado ou cria um
 * texto novo.
 */
const VariablesPanel: React.FC<VariablesPanelProps> = ({ hasTextSelected, onInsert }) => {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => {
    const q = fold(query.trim());
    const list = q
      ? CERTIFICATE_VARIABLES.filter((v) => fold(`${v.label} ${v.key} ${v.group} ${v.example}`).includes(q))
      : CERTIFICATE_VARIABLES;
    return VARIABLE_GROUPS.map((g) => ({ g, items: list.filter((v) => v.group === g) })).filter((x) => x.items.length);
  }, [query]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar: nome, CPF, período…"
          className="h-8 pl-8 text-xs"
        />
      </div>
      <p className="rounded-md bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground">
        <CornerDownLeft className="mr-1 inline h-3 w-3" />
        {hasTextSelected ? 'Clique para colocar no fim do texto selecionado.' : 'Clique para criar um texto com a variável.'}
      </p>

      {groups.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma variável encontrada.</p>}

      {groups.map(({ g, items }) => (
        <div key={g}>
          <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g}</h4>
          <div className="space-y-0.5">
            {items.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => onInsert(v.key)}
                className="w-full rounded-md px-2 py-1.5 text-left hover:bg-muted"
              >
                <span className="block truncate text-xs font-medium">{v.label}</span>
                <p className="truncate text-[11px] text-muted-foreground">ex.: {v.example}</p>
                <code className="block truncate text-[10px] text-muted-foreground/80">{`{{${v.key}}}`}</code>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default VariablesPanel;
