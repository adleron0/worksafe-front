import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";

/** Menu ⋯ de um tipo de documento: editar e inativar (com confirmação). Serve ao RH e aos arquivos da empresa. */
export default function DocumentTypeRowActions({ name, onEdit, onInactivate, inactivateDescription }: {
  name: string; onEdit: () => void; onInactivate: () => void; inactivateDescription: string;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações de ${name}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="gap-2" onSelect={onEdit}><Icon name="pencil" className="w-3.5 h-3.5" /> Editar</DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onSelect={() => setConfirm(true)}><Icon name="archive" className="w-3.5 h-3.5" /> Inativar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(false); }} title={`Inativar "${name}"?`} description={inactivateDescription}
          onConfirm={() => { onInactivate(); setConfirm(false); }} />
      )}
    </>
  );
}
