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
import { IComentario } from "../-interfaces/entity.interface";

type Action = "approve" | "disapprove";

const CONFIRMS: Record<Action, { title: string; description: string }> = {
  approve: { title: "Aprovar comentário?", description: "Ao prosseguir, o comentário será aprovado e ficará visível no post." },
  disapprove: { title: "Desaprovar comentário?", description: "Ao prosseguir, o comentário será desaprovado e ficará oculto no post." },
};

/** Menu ⋯ de um comentário: visualizar (moderar), aprovar e desaprovar. */
export default function ComentarioRowActions({ item, entity, onView }: { item: IComentario; entity: IDefaultEntity; onView: (item: IComentario) => void }) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const [confirm, setConfirm] = useState<Action | null>(null);

  const { mutate: updateStatus } = useMutation({
    mutationFn: (action: Action) => {
      showLoader(`${action === "approve" ? "Aprovando" : "Desaprovando"} ${entity.name}...`);
      return patch(`${entity.model}/${action}`, `${item.id}`);
    },
    onSuccess: (_, action) => {
      hideLoader();
      toast({
        title: `${entity.name} ${action === "approve" ? "aprovado" : "desaprovado"}!`,
        description: `${entity.name} ${action === "approve" ? "aprovado" : "desaprovado"} com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({ title: "Erro ao moderar comentário", description: error.response?.data?.message || "Erro desconhecido.", variant: "destructive" });
    },
  });

  const canView = can(`view_${entity.ability}`);
  const canUpdate = can(`update_${entity.ability}`);
  const canApprove = canUpdate && item.status !== "published";
  const canDisapprove = canUpdate && item.status !== "hidden";
  if (!canView && !canApprove && !canDisapprove) return null;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações do comentário ${item.id}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canView && <DropdownMenuItem className="gap-2" onSelect={() => onView(item)}><Icon name="eye" className="w-3.5 h-3.5" /> Visualizar</DropdownMenuItem>}
          {canApprove && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("approve")}><Icon name="check" className="w-3.5 h-3.5" /> Aprovar</DropdownMenuItem>}
          {canDisapprove && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("disapprove")}><Icon name="eye-off" className="w-3.5 h-3.5" /> Desaprovar</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }} title={CONFIRMS[confirm].title} description={CONFIRMS[confirm].description}
          onConfirm={() => { updateStatus(confirm); setConfirm(null); }} />
      )}
    </>
  );
}
