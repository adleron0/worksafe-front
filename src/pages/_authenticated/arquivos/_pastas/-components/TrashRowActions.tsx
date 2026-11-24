import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";

/** Menu ⋯ de um item da lixeira: restaurar e, para quem administra, apagar de vez (com deslize). */
export default function TrashRowActions({ name, extra = "", canManage, restoring, purging, onRestore, onPurge }: {
  name: string; extra?: string; canManage: boolean; restoring: boolean; purging: boolean; onRestore: () => void; onPurge: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações de ${name}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="gap-2" disabled={restoring} onSelect={onRestore}><Icon name="undo-2" className="w-3.5 h-3.5" /> Restaurar</DropdownMenuItem>
          {canManage && <DropdownMenuSeparator />}
          {canManage && (
            <DropdownMenuItem className="gap-2 text-red-600 dark:text-red-400" disabled={purging} onSelect={() => setConfirm(true)}><Icon name="trash-2" className="w-3.5 h-3.5" /> Apagar de vez</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(false); }} title="Apagar de vez?"
          description={`"${name}"${extra} sai do sistema e do armazenamento. Não dá para desfazer.`} slideLabel="Deslize para apagar de vez"
          onConfirm={() => { onPurge(); setConfirm(false); }} />
      )}
    </>
  );
}
