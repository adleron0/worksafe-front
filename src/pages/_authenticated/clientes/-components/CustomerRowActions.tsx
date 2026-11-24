import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { IEntity } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

const errorMessage = (error: unknown, fallback: string) => error instanceof Error
  ? error.message
  : typeof error === "object" && error !== null && "response" in error
    ? ((error as ApiError).response?.data?.message || fallback)
    : fallback;

/** Menu ⋯ de um cliente: abrir a ficha, inativar e reativar. */
export default function CustomerRowActions({ item, entity, onOpen }: { item: IEntity; entity: IDefaultEntity; onOpen: (item: IEntity) => void }) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const [confirm, setConfirm] = useState<null | "activate" | "deactivate">(null);

  const { mutate: deactivate } = useMutation({
    mutationFn: (id: number) => {
      showLoader(`Inativando ${entity.name}...`);
      return patch<IEntity>(entity.model, `inactive/${id}`);
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
      return patch<IEntity>(entity.model, `active/${id}`);
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

  const canToggle = item.active ? can(`inactive_${entity.ability}`) : can(`activate_${entity.ability}`);
  const CONFIRMS = {
    deactivate: { title: `Inativar o ${entity.name} ${item.name}?`, description: `Ao prosseguir, o ${entity.name} ${item.name} será inativo e não poderá acessar a plataforma.` },
    activate: { title: `Reativar o ${entity.name} ${item.name}?`, description: `Ao prosseguir, o ${entity.name} ${item.name} será reativado e poderá acessar a plataforma.` },
  } as const;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações de ${item.name}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="gap-2" onSelect={() => onOpen(item)}><Icon name="square-arrow-out-up-right" className="w-3.5 h-3.5" /> Abrir</DropdownMenuItem>
          {canToggle && <DropdownMenuSeparator />}
          {canToggle && (item.active
            ? <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("deactivate")}><Icon name="power-off" className="w-3.5 h-3.5" /> Inativar</DropdownMenuItem>
            : <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("activate")}><Icon name="power" className="w-3.5 h-3.5" /> Reativar</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }} title={CONFIRMS[confirm].title} description={CONFIRMS[confirm].description}
          onConfirm={() => { if (item.id) (confirm === "activate" ? activate : deactivate)(item.id); setConfirm(null); }} />
      )}
    </>
  );
}
