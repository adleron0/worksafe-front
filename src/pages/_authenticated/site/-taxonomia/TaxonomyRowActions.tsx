import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { patch } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useLoader } from "@/context/GeneralContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { ApiError } from "@/general-interfaces/api.interface";
import { ITaxonomy, TaxonomyEntity } from "./types";

/** Menu ⋯ de uma categoria/marca da loja: editar, inativar e reativar. */
export default function TaxonomyRowActions({ item, entity, onEdit }: { item: ITaxonomy; entity: TaxonomyEntity; onEdit: (item: ITaxonomy) => void }) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const [confirm, setConfirm] = useState<"active" | "inactive" | null>(null);
  const done = entity.article;

  const { mutate: toggleStatus } = useMutation({
    mutationFn: (action: "active" | "inactive") => {
      showLoader(`${action === "active" ? "Reativando" : "Inativando"}...`);
      return patch(`${entity.model}/${action}/${item.id}`, "");
    },
    onSuccess: (_, action) => {
      hideLoader();
      toast({ title: `${entity.name} ${action === "active" ? "reativad" : "inativad"}${done}!`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      queryClient.invalidateQueries({ queryKey: [`options${entity.model}`] });
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({ title: "Erro ao alterar status", description: error.response?.data?.message || "Erro desconhecido.", variant: "destructive" });
    },
  });

  const products = item._count?.products ?? 0;
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

      {confirm === "inactive" && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }}
          title={`Inativar ${item.name}?`}
          description={
            products > 0
              ? `${products} produto(s) usam ess${done === "a" ? "a" : "e"} ${entity.name.toLowerCase()}. Ela deixa de aparecer nos filtros da loja e nas opções do cadastro; os produtos continuam na loja.`
              : `Ela deixa de aparecer nas opções do cadastro de produtos.`
          }
          onConfirm={() => { toggleStatus("inactive"); setConfirm(null); }} />
      )}
      {confirm === "active" && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }}
          title={`Reativar ${item.name}?`}
          description="Volta a aparecer nos filtros da loja e nas opções do cadastro."
          onConfirm={() => { toggleStatus("active"); setConfirm(null); }} />
      )}
    </>
  );
}
