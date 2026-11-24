import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

interface Row { id?: number; name: string; active?: boolean }

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "response" in error
      ? ((error as ApiError).response?.data?.message || fallback)
      : fallback;

/**
 * Menu ⋯ de produtos e serviços do site: editar, imagens (só produtos), inativar e reativar.
 * A situação vem de `active` (como na lista antiga).
 */
export default function SiteItemRowActions<T extends Row>({ item, entity, onEdit, onImages }: {
  item: T;
  entity: IDefaultEntity;
  onEdit: (item: T) => void;
  onImages?: (item: T) => void;
}) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const [confirm, setConfirm] = useState<"activate" | "deactivate" | null>(null);

  const { mutate: deactivate } = useMutation({
    mutationFn: (id: number) => {
      showLoader(`Inativando ${entity.name}...`);
      return patch<T>(entity.model, `inactive/${id}`);
    },
    onSuccess: () => {
      hideLoader();
      toast({ title: `${entity.name} ${item.name} inativado!`, description: `${entity.name} inativado com sucesso.`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({ title: `Erro ao inativar ${entity.name}`, description: errorMessage(error, `Erro ao inativar ${entity.name}`), variant: "destructive" });
    },
  });

  const { mutate: activate } = useMutation({
    mutationFn: (id: number) => {
      showLoader(`Ativando ${entity.name}...`);
      return patch<T>(entity.model, `active/${id}`);
    },
    onSuccess: () => {
      hideLoader();
      toast({ title: `${entity.name} ${item.name} reativado!`, description: `O ${entity.name} foi reativado com sucesso.`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({ title: `Erro ao reativar ${entity.name}`, description: errorMessage(error, `Erro ao reativar ${entity.name}`), variant: "destructive" });
    },
  });

  const handleConfirm = (action: "activate" | "deactivate") => {
    if (!item.id) return;
    if (action === "activate") activate(item.id);
    else deactivate(item.id);
  };

  const canEdit = can(`update_${entity.ability}`);
  const canInactive = !!item.active && can(`inactive_${entity.ability}`);
  const canActive = !item.active && can(`activate_${entity.ability}`);
  if (!canEdit && !onImages && !canInactive && !canActive) return null;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações de ${item.name}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit && <DropdownMenuItem className="gap-2" onSelect={() => onEdit(item)}><Icon name="pencil" className="w-3.5 h-3.5" /> Editar</DropdownMenuItem>}
          {onImages && <DropdownMenuItem className="gap-2" onSelect={() => onImages(item)}><Icon name="image" className="w-3.5 h-3.5" /> Imagens</DropdownMenuItem>}
          {canInactive && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("deactivate")}><Icon name="power-off" className="w-3.5 h-3.5" /> Inativar</DropdownMenuItem>}
          {canActive && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("activate")}><Icon name="power" className="w-3.5 h-3.5" /> Reativar</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }}
          title={confirm === "deactivate" ? `Inativar o ${entity.name} ${item.name}?` : `Reativar o ${entity.name} ${item.name}?`}
          description={confirm === "deactivate"
            ? `Ao prosseguir, o ${entity.name} ${item.name} será inativo e não poderá acessar a plataforma.`
            : `Ao prosseguir, o ${entity.name} ${item.name} será reativado e poderá acessar a plataforma.`}
          onConfirm={() => { handleConfirm(confirm); setConfirm(null); }} />
      )}
    </>
  );
}
