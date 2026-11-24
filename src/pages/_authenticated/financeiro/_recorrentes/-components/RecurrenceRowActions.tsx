import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";

/** Menu ⋯ de um recorrente: ver os meses lançados, editar e encerrar (com deslize). */
export default function RecurrenceRowActions({ description, ended, canUpdate, canEnd, onOpenMonths, onEdit, onEnd }: {
  description: string; ended: boolean; canUpdate: boolean; canEnd: boolean; onOpenMonths: () => void; onEdit: () => void; onEnd: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const editable = !ended && canUpdate;
  const endable = !ended && canEnd;
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações de ${description}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="gap-2" onSelect={onOpenMonths}><Icon name="calendar-range" className="w-3.5 h-3.5" /> Ver meses</DropdownMenuItem>
          {editable && <DropdownMenuItem className="gap-2" onSelect={onEdit}><Icon name="pencil" className="w-3.5 h-3.5" /> Editar</DropdownMenuItem>}
          {endable && <DropdownMenuSeparator />}
          {endable && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm(true)}><Icon name="circle-stop" className="w-3.5 h-3.5" /> Encerrar</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(false); }} title="Encerrar este recorrente?" slideLabel="Deslize para encerrar"
          description="Não gera mais lançamentos e remove os meses futuros que ainda estão em aberto. Os já vencidos e os pagos ficam."
          onConfirm={() => { onEnd(); setConfirm(false); }} />
      )}
    </>
  );
}
