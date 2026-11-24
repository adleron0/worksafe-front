import { useState } from "react";
import useVerify from "@/hooks/use-verify";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Dialog from "@/components/general-components/Dialog";
import VisualizadorCertificados from "@/components/general-components/visualizadorCertificados";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ICertificate } from "../-interfaces/entity.interface";
import { ActiveAction, useActiveToggle } from "../../-shared/useActiveToggle";
import DuplicateCertificateModal from "./DuplicateCertificateModal";

/** Menu ⋯ do modelo de certificado: visualizar, editar (só no computador), duplicar, inativar e reativar. */
export default function CertificateRowActions({ item, entity, onEdit, isDesktop }: {
  item: ICertificate; entity: IDefaultEntity; onEdit: (item: ICertificate) => void; isDesktop: boolean;
}) {
  const { can } = useVerify();
  const [openDuplicateModal, setOpenDuplicateModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [confirm, setConfirm] = useState<ActiveAction | null>(null);
  const toggle = useActiveToggle(entity, {
    deactivate: { title: `${entity.name} ${item.name} inativado!`, description: `${entity.name} inativado com sucesso.` },
    activate: { title: `${entity.name} ${item.name} reativado!`, description: `O ${entity.name} foi reativado com sucesso.` },
  }, entity.model, `list_${entity.pluralName}`);

  const canEdit = can(`update_${entity.ability}`) && isDesktop;
  const canDuplicate = can(`create_${entity.ability}`);
  const canInactive = item.active && can(`inactive_${entity.ability}`);
  const canActivate = !item.active && can(`activate_${entity.ability}`);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações de ${item.name}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="gap-2" onSelect={() => setOpenViewModal(true)}><Icon name="eye" className="w-3.5 h-3.5" /> Visualizar certificado</DropdownMenuItem>
          {canEdit && <DropdownMenuItem className="gap-2" onSelect={() => onEdit(item)}><Icon name="pencil" className="w-3.5 h-3.5" /> Editar template</DropdownMenuItem>}
          {canDuplicate && <DropdownMenuItem className="gap-2" onSelect={() => setOpenDuplicateModal(true)}><Icon name="copy" className="w-3.5 h-3.5" /> Duplicar certificado</DropdownMenuItem>}
          {(canInactive || canActivate) && <DropdownMenuSeparator />}
          {canInactive && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("deactivate")}><Icon name="power-off" className="w-3.5 h-3.5" /> Inativar</DropdownMenuItem>}
          {canActivate && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("activate")}><Icon name="power" className="w-3.5 h-3.5" /> Reativar</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }}
          title={confirm === "activate" ? `Reativar o ${entity.name} ${item.name}?` : `Inativar o ${entity.name} ${item.name}?`}
          description={confirm === "activate"
            ? `Ao prosseguir, o ${entity.name} ${item.name} será reativado e poderá ser utilizado novamente.`
            : `Ao prosseguir, o ${entity.name} ${item.name} será inativo e não poderá ser utilizado.`}
          onConfirm={() => { toggle(item.id, confirm); setConfirm(null); }} />
      )}

      {/* Modal de Duplicação */}
      <DuplicateCertificateModal certificate={item} open={openDuplicateModal} onOpenChange={setOpenDuplicateModal} />

      {/* Modal de Visualização */}
      {openViewModal && item.fabricJsonFront && (
        <Dialog
          open={openViewModal}
          onOpenChange={setOpenViewModal}
          title={`Modelo: ${item.name}`}
          description="Pré-visualização do template"
          showBttn={false}
          showHeader={true}
          className="md:w-fit"
          classNameContent="h-fit md:h-[80vh]"
        >
          <div className="h-fit md:h-full w-full">
            <VisualizadorCertificados certificateData={item} variableToReplace={{}} zoom={50} />
          </div>
        </Dialog>
      )}
    </>
  );
}
