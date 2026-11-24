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
import { ICupom } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";

const errorMessage = (error: unknown, fallback: string) => (error && typeof error === "object" && "response" in error
  ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
  : fallback);

/** Menu ⋯ de um cupom: editar, inativar e ativar. */
export default function CupomRowActions({ item, entity, onEdit }: { item: ICupom; entity: IDefaultEntity; onEdit: (item: ICupom) => void }) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const [confirm, setConfirm] = useState<null | "activate" | "inactivate">(null);

  const activateMutation = useMutation({
    mutationFn: async (id: number) => {
      showLoader(`Ativando ${entity.name}...`);
      return patch<ICupom>(entity.model, `active/${id}`);
    },
    onSuccess: () => {
      hideLoader();
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      toast({ title: `${entity.name} ativado`, description: `${entity.name} foi ativado com sucesso.` });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({ title: "Erro ao ativar", description: errorMessage(error, "Ocorreu um erro ao ativar."), variant: "destructive" });
    },
  });

  const inactivateMutation = useMutation({
    mutationFn: async (id: number) => {
      showLoader(`Inativando ${entity.name}...`);
      return patch<ICupom>(entity.model, `inactive/${id}`);
    },
    onSuccess: () => {
      hideLoader();
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      toast({ title: `${entity.name} inativado`, description: `${entity.name} foi inativado com sucesso.` });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({ title: "Erro ao inativar", description: errorMessage(error, "Ocorreu um erro ao inativar."), variant: "destructive" });
    },
  });

  const canUpdate = can(`update_${entity.ability}`);
  const canToggle = item.active ? can(`inactive_${entity.ability}`) : can(`activate_${entity.ability}`);
  if (!canUpdate && !canToggle) return null;

  const CONFIRMS = {
    inactivate: { title: "Inativar cupom", description: `Tem certeza que deseja inativar o cupom ${item.code}?` },
    activate: { title: "Ativar cupom", description: `Tem certeza que deseja ativar o cupom ${item.code}?` },
  } as const;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações do cupom ${item.code}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canUpdate && <DropdownMenuItem className="gap-2" onSelect={() => onEdit(item)}><Icon name="edit" className="w-3.5 h-3.5" /> Editar</DropdownMenuItem>}
          {canToggle && (item.active
            ? <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("inactivate")}><Icon name="x-circle" className="w-3.5 h-3.5" /> Inativar</DropdownMenuItem>
            : <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("activate")}><Icon name="check-circle" className="w-3.5 h-3.5" /> Ativar</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }} title={CONFIRMS[confirm].title} description={CONFIRMS[confirm].description}
          onConfirm={() => { (confirm === "activate" ? activateMutation : inactivateMutation).mutate(item.id); setConfirm(null); }} />
      )}
    </>
  );
}
