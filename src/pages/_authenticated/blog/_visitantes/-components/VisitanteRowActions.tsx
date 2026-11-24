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
import { IVisitante } from "../-interfaces/entity.interface";

type Action = "block" | "unblock";

/** Menu ⋯ de um visitante: visualizar, bloquear e desbloquear. */
export default function VisitanteRowActions({ item, entity, onView }: { item: IVisitante; entity: IDefaultEntity; onView: (item: IVisitante) => void }) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const [confirm, setConfirm] = useState<Action | null>(null);

  const { mutate: toggleBlock } = useMutation({
    mutationFn: (action: Action) => {
      showLoader(`${action === "block" ? "Bloqueando" : "Desbloqueando"} ${entity.name}...`);
      return patch(`${entity.model}/${action}/${item.id}`, "");
    },
    onSuccess: (_, action) => {
      hideLoader();
      toast({
        title: `${entity.name} ${action === "block" ? "bloqueado" : "desbloqueado"}!`,
        description: `${entity.name} ${action === "block" ? "bloqueado" : "desbloqueado"} com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({ title: "Erro ao alterar status", description: error.response?.data?.message || "Erro desconhecido.", variant: "destructive" });
    },
  });

  const canView = can(`view_${entity.ability}`);
  const canUpdate = can(`update_${entity.ability}`);
  if (!canView && !canUpdate) return null;

  const CONFIRMS: Record<Action, { title: string; description: string }> = {
    block: { title: `Bloquear ${entity.name} ${item.name}?`, description: `Ao prosseguir, ${entity.name} ${item.name} será bloqueado e não poderá mais comentar.` },
    unblock: { title: `Desbloquear ${entity.name} ${item.name}?`, description: `Ao prosseguir, ${entity.name} ${item.name} será desbloqueado e poderá comentar novamente.` },
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações de ${item.name}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canView && <DropdownMenuItem className="gap-2" onSelect={() => onView(item)}><Icon name="eye" className="w-3.5 h-3.5" /> Visualizar</DropdownMenuItem>}
          {canUpdate && !item.blocked && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("block")}><Icon name="ban" className="w-3.5 h-3.5" /> Bloquear</DropdownMenuItem>}
          {canUpdate && item.blocked && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("unblock")}><Icon name="check-circle" className="w-3.5 h-3.5" /> Desbloquear</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }} title={CONFIRMS[confirm].title} description={CONFIRMS[confirm].description}
          onConfirm={() => { toggleBlock(confirm); setConfirm(null); }} />
      )}
    </>
  );
}
