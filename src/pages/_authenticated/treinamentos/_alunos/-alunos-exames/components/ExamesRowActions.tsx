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
import { IEntity } from "../interfaces/entity.interface";

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "response" in error
      ? (error as ApiError).response?.data?.message || fallback
      : fallback;

/** Menu ⋯ do exame: ver detalhes, inativar e reativar. */
export default function ExamesRowActions({ item, entity, onView }: { item: IEntity; entity: IDefaultEntity; onView: (item: IEntity) => void }) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const [confirm, setConfirm] = useState<null | "deactivate" | "activate">(null);

  const { mutate: run } = useMutation({
    mutationFn: (action: "deactivate" | "activate") => {
      showLoader(`${action === "activate" ? "Ativando" : "Inativando"} ${entity.name}...`);
      return patch<IEntity>("exames", `${action === "activate" ? "active" : "inactive"}/${item.id}`);
    },
    onSuccess: (_data, action) => {
      hideLoader();
      toast(action === "activate"
        ? { title: `${entity.name} reativado!`, description: `${entity.name} foi reativado com sucesso.`, variant: "success" }
        : { title: `${entity.name} inativado!`, description: `${entity.name} inativado com sucesso.`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: unknown, action) => {
      hideLoader();
      const label = action === "activate" ? "reativar" : "inativar";
      toast({ title: `Erro ao ${label} ${entity.name}`, description: errorMessage(error, `Erro ao ${label} ${entity.name}`), variant: "destructive" });
    },
  });

  const canInactive = !item.inactiveAt && can(`inactive_${entity.ability}`);
  const canActivate = !!item.inactiveAt && can(`activate_${entity.ability}`);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações do exame ${item.id}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="gap-2" onSelect={() => onView(item)}><Icon name="eye" className="w-3.5 h-3.5" /> Ver detalhes</DropdownMenuItem>
          {canInactive && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("deactivate")}><Icon name="power-off" className="w-3.5 h-3.5" /> Inativar</DropdownMenuItem>}
          {canActivate && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("activate")}><Icon name="power" className="w-3.5 h-3.5" /> Reativar</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }}
          title={confirm === "activate" ? "Reativar exame?" : "Inativar exame?"}
          description={confirm === "activate" ? "Ao prosseguir, este exame será reativado." : "Ao prosseguir, este exame será inativado."}
          onConfirm={() => { if (item.id) run(confirm); setConfirm(null); }} />
      )}
    </>
  );
}
