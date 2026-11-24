import { useState } from "react";
import useVerify from "@/hooks/use-verify";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { IEntity } from "./interfaces/entity.interface";
import { ActiveAction, useActiveToggle } from "../../-shared/useActiveToggle";

/** Menu ⋯ do instrutor vinculado à turma: desvincular (inativar) e reativar. */
export default function TurmasInstrutoresRowActions({ item, entity }: { item: IEntity; entity: IDefaultEntity }) {
  const { can } = useVerify();
  const [confirm, setConfirm] = useState<ActiveAction | null>(null);
  const name = item.instructor?.name;
  const toggle = useActiveToggle(entity, {
    deactivate: { title: `${entity.name} ${name} inativado!`, description: `${entity.name} inativado com sucesso.` },
    activate: { title: `${entity.name} ${name} reativado!`, description: `O ${entity.name} foi reativado com sucesso.` },
  });

  const canInactive = !item.inactiveAt && can(`inactive_${entity.ability}`);
  const canActivate = !!item.inactiveAt && can(`activate_${entity.ability}`);
  if (!canInactive && !canActivate) return null;

  return (
    <>
      {/* fica dentro do diálogo da turma: menu modal, como antes */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações de ${name}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canInactive && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("deactivate")}><Icon name="power-off" className="w-3.5 h-3.5" /> Inativar</DropdownMenuItem>}
          {canActivate && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("activate")}><Icon name="power" className="w-3.5 h-3.5" /> Reativar</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }}
          title={confirm === "activate" ? `Reativar o ${entity.name} ${name}?` : `Inativar o ${entity.name} ${name}?`}
          description={confirm === "activate"
            ? `Ao prosseguir, o ${entity.name} ${name} será reativado na turma.`
            : `Ao prosseguir, o ${entity.name} ${name} será desvinculado da turma.`}
          onConfirm={() => { toggle(item.id, confirm); setConfirm(null); }} />
      )}
    </>
  );
}
