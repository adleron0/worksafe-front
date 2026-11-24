import { useState } from "react";
import useVerify from "@/hooks/use-verify";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { IEntity } from "../-interfaces/entity.interface";
import { ActiveAction, useActiveToggle } from "../../-shared/useActiveToggle";

/** Menu ⋯ do instrutor: editar, assinatura, inativar e reativar. */
export default function InstructorsRowActions({ item, entity, onEdit, onSignature }: {
  item: IEntity; entity: IDefaultEntity; onEdit: (item: IEntity) => void; onSignature: (item: IEntity) => void;
}) {
  const { can } = useVerify();
  const [confirm, setConfirm] = useState<ActiveAction | null>(null);
  const toggle = useActiveToggle(entity, {
    deactivate: { title: `${entity.name} ${item.name} inativado!`, description: `${entity.name} inativado com sucesso.` },
    activate: { title: `${entity.name} ${item.name} reativado!`, description: `O ${entity.name} foi reativado com sucesso.` },
  });

  const canUpdate = can(`update_${entity.ability}`);
  const canInactive = !!item.active && can(`inactive_${entity.ability}`);
  const canActivate = !item.active && can(`activate_${entity.ability}`);
  if (!canUpdate && !canInactive && !canActivate) return null;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações de ${item.name}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canUpdate && <DropdownMenuItem className="gap-2" onSelect={() => onEdit(item)}><Icon name="pencil" className="w-3.5 h-3.5" /> Editar</DropdownMenuItem>}
          {canUpdate && <DropdownMenuItem className="gap-2" onSelect={() => onSignature(item)}><Icon name="signature" className="w-3.5 h-3.5" /> Assinatura</DropdownMenuItem>}
          {canUpdate && (canInactive || canActivate) && <DropdownMenuSeparator />}
          {canInactive && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("deactivate")}><Icon name="power-off" className="w-3.5 h-3.5" /> Inativar</DropdownMenuItem>}
          {canActivate && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("activate")}><Icon name="power" className="w-3.5 h-3.5" /> Reativar</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }}
          title={confirm === "activate" ? `Reativar o ${entity.name} ${item.name}?` : `Inativar o ${entity.name} ${item.name}?`}
          description={confirm === "activate"
            ? `Ao prosseguir, o ${entity.name} ${item.name} será reativado e poderá acessar a plataforma.`
            : `Ao prosseguir, o ${entity.name} ${item.name} será inativo e não poderá acessar a plataforma.`}
          onConfirm={() => { toggle(item.id, confirm); setConfirm(null); }} />
      )}
    </>
  );
}
