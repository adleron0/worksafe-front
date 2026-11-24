import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { useLoader } from "@/context/GeneralContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

interface Row { id?: number; name: string; inactiveAt?: Date | string | null }

/** Menu ⋯ das categorias e tags do blog: editar, inativar e reativar (nomes no feminino, como antes). */
export default function ActiveRowActions<T extends Row>({ item, entity, onEdit }: { item: T; entity: IDefaultEntity; onEdit: (item: T) => void }) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const [confirm, setConfirm] = useState<"active" | "inactive" | null>(null);

  const { mutate: toggleStatus } = useMutation({
    mutationFn: (action: "active" | "inactive") => {
      showLoader(`${action === "active" ? "Ativando" : "Inativando"} ${entity.name}...`);
      return patch(`${entity.model}/${action}/${item.id}`, "");
    },
    onSuccess: (_, action) => {
      hideLoader();
      toast({
        title: `${entity.name} ${action === "active" ? "ativada" : "inativada"}!`,
        description: `${entity.name} ${action === "active" ? "ativada" : "inativada"} com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({ title: "Erro ao alterar status", description: error.response?.data?.message || "Erro desconhecido.", variant: "destructive" });
    },
  });

  const canEdit = can(`update_${entity.ability}`);
  const canInactive = !item.inactiveAt && can(`inactive_${entity.ability}`);
  const canActive = !!item.inactiveAt && can(`activate_${entity.ability}`);
  if (!canEdit && !canInactive && !canActive) return null;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações de ${item.name}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit && <DropdownMenuItem className="gap-2" onSelect={() => onEdit(item)}><Icon name="pencil" className="w-3.5 h-3.5" /> Editar</DropdownMenuItem>}
          {canInactive && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("inactive")}><Icon name="power-off" className="w-3.5 h-3.5" /> Inativar</DropdownMenuItem>}
          {canActive && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("active")}><Icon name="power" className="w-3.5 h-3.5" /> Reativar</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }}
          title={`${confirm === "inactive" ? "Inativar" : "Reativar"} ${entity.name} ${item.name}?`}
          description={`Ao prosseguir, ${entity.name} ${item.name} será ${confirm === "inactive" ? "inativada" : "reativada"}.`}
          onConfirm={() => { toggleStatus(confirm); setConfirm(null); }} />
      )}
    </>
  );
}
