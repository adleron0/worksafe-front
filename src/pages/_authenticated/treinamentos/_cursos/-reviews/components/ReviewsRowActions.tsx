import { useState } from "react";
import useVerify from "@/hooks/use-verify";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { IReview } from "../interfaces/entity.interface";
import { ActiveAction, useActiveToggle } from "../../../-shared/useActiveToggle";

/** Menu ⋯ da avaliação: inativar e reativar. */
export default function ReviewsRowActions({ item, entity }: { item: IReview; entity: IDefaultEntity }) {
  const { can } = useVerify();
  const [confirm, setConfirm] = useState<ActiveAction | null>(null);
  const toggle = useActiveToggle(entity, {
    deactivate: { title: `${entity.name} inativado!`, description: `${entity.name} inativado com sucesso.` },
    activate: { title: `${entity.name} reativado!`, description: `O ${entity.name} foi reativado com sucesso.` },
  });

  const canInactive = !item.inactiveAt && can(`inactive_${entity.ability}`);
  const canActivate = !!item.inactiveAt && can(`activate_${entity.ability}`);
  if (!canInactive && !canActivate) return null;

  return (
    <>
      {/* fica dentro do diálogo do curso: menu modal, como antes */}
      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações da avaliação ${item.id}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canInactive && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("deactivate")}><Icon name="power-off" className="w-3.5 h-3.5" /> Inativar</DropdownMenuItem>}
          {canActivate && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("activate")}><Icon name="power" className="w-3.5 h-3.5" /> Reativar</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }}
          title={confirm === "activate" ? `Reativar o ${entity.name}?` : `Inativar o ${entity.name}?`}
          description={confirm === "activate"
            ? `Ao prosseguir, o ${entity.name} será reativado e poderá acessar a plataforma.`
            : `Ao prosseguir, o ${entity.name} será inativo e não poderá acessar a plataforma.`}
          onConfirm={() => { toggle(item.id, confirm); setConfirm(null); }} />
      )}
    </>
  );
}
