import useVerify from "@/hooks/use-verify";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { IEntity } from "../-interfaces/entity.interface";

/** Menu ⋯ da inscrição: editar. Dentro do diálogo da turma o menu é modal (`modalPopover`). */
export default function SubscriptionRowActions({ item, entity, onEdit, modalPopover = false }: {
  item: IEntity; entity: IDefaultEntity; onEdit: (item: IEntity) => void; modalPopover?: boolean;
}) {
  const { can } = useVerify();
  if (!can(`update_${entity.ability}`)) return null;
  return (
    <DropdownMenu modal={modalPopover}>
      <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações da inscrição de ${item.name}`} /></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="gap-2" onSelect={() => onEdit(item)}><Icon name="pencil" className="w-3.5 h-3.5" /> Editar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
