import { useState } from "react";
import useVerify from "@/hooks/use-verify";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Dialog from "@/components/general-components/Dialog";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { IEntity } from "../-interfaces/entity.interface";
import { ActiveAction, useActiveToggle } from "../../-shared/useActiveToggle";
import Reviews from "../-reviews";

/** Menu ⋯ do curso: editar, exame, avaliações, inativar e reativar. */
export default function CoursesRowActions({ item, entity, onEdit, onExam }: {
  item: IEntity; entity: IDefaultEntity; onEdit: (item: IEntity) => void; onExam: (item: IEntity) => void;
}) {
  const { can } = useVerify();
  const [openReviews, setOpenReviews] = useState(false);
  const [confirm, setConfirm] = useState<ActiveAction | null>(null);
  const toggle = useActiveToggle(entity, {
    deactivate: { title: `${entity.name} ${item.name} inativado!`, description: `${entity.name} inativado com sucesso.` },
    activate: { title: `${entity.name} ${item.name} reativado!`, description: `${entity.name} foi reativado com sucesso.` },
  });

  const canUpdate = can(`update_${entity.ability}`);
  const canView = can(`view_${entity.ability}`);
  const canInactive = !!item.active && can(`inactive_${entity.ability}`);
  const canActivate = !item.active && can(`activate_${entity.ability}`);
  if (!canUpdate && !canView && !canInactive && !canActivate) return null;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações de ${item.name}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canUpdate && <DropdownMenuItem className="gap-2" onSelect={() => onEdit(item)}><Icon name="pencil" className="w-3.5 h-3.5" /> Editar</DropdownMenuItem>}
          {canUpdate && <DropdownMenuItem className="gap-2" onSelect={() => onExam(item)}><Icon name="file-text" className="w-3.5 h-3.5" /> Exame do curso</DropdownMenuItem>}
          {canView && <DropdownMenuItem className="gap-2" onSelect={() => setOpenReviews(true)}><Icon name="star" className="w-3.5 h-3.5" /> Ver avaliações</DropdownMenuItem>}
          {(canUpdate || canView) && (canInactive || canActivate) && <DropdownMenuSeparator />}
          {canInactive && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("deactivate")}><Icon name="power-off" className="w-3.5 h-3.5" /> Inativar</DropdownMenuItem>}
          {canActivate && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("activate")}><Icon name="power" className="w-3.5 h-3.5" /> Reativar</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }}
          title={confirm === "activate" ? `Reativar ${entity.name} ${item.name}?` : `Inativar ${entity.name} ${item.name}?`}
          description={confirm === "activate" ? `Ao prosseguir, ${entity.name} ${item.name} será reativado.` : `Ao prosseguir, ${entity.name} ${item.name} será inativado.`}
          onConfirm={() => { toggle(item.id, confirm); setConfirm(null); }} />
      )}

      {/* Avaliações do curso */}
      <Dialog open={openReviews} onOpenChange={setOpenReviews} title="Avaliações do Curso" description={`Lista de avaliações do curso ${item.name}`} showBttn={false} showHeader={true}>
        {openReviews && <Reviews courseId={item.id || 0} courseName={item.name} />}
      </Dialog>
    </>
  );
}
