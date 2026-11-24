import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";

export interface RowAction {
  id: string;
  label: string;
  /** ícone lucide em kebab-case */
  icon: string;
  onSelect: () => void;
  /** some do menu (sem permissão, não se aplica) */
  hidden?: boolean;
  /** pede confirmação antes (ConfirmDialog controlado) */
  confirm?: { title: string; description: string; slideLabel?: string };
  /** linha divisória antes deste item */
  separator?: boolean;
  /** texto em vermelho (excluir, cancelar) */
  danger?: boolean;
}

/**
 * Menu ⋯ das linhas das listas de Suprimentos (padrão do DataTable): editar, inativar, reativar...
 * Sem nenhuma ação visível, não mostra nada.
 */
export default function RowActions({ label, actions }: { label: string; actions: RowAction[] }) {
  const [pending, setPending] = useState<RowAction | null>(null);
  const visible = actions.filter((action) => !action.hidden);
  if (!visible.length) return null;
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={label} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {visible.map((action, index) => (
            <div key={action.id}>
              {action.separator && index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem className={action.danger ? "gap-2 text-destructive focus:text-destructive" : "gap-2"}
                onSelect={() => (action.confirm ? setPending(action) : action.onSelect())}>
                <Icon name={action.icon} className="w-3.5 h-3.5" /> {action.label}
              </DropdownMenuItem>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {pending?.confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setPending(null); }}
          title={pending.confirm.title} description={pending.confirm.description} slideLabel={pending.confirm.slideLabel}
          onConfirm={() => { pending.onSelect(); setPending(null); }} />
      )}
    </>
  );
}
