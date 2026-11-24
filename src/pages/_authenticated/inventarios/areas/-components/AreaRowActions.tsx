import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inactiveArea, activeArea } from "@/services/specific/areaService";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { Area } from "../-interfaces/area.interface";
import { ApiError } from "@/general-interfaces/api.interface";

const errorMessage = (error: unknown, fallback: string) => error instanceof Error
  ? error.message
  : typeof error === "object" && error !== null && "response" in error
    ? ((error as ApiError).response?.data?.message || fallback)
    : fallback;

/** Menu ⋯ de uma área: ir para a área, editar, inativar e reativar. */
export default function AreaRowActions({ area, onOpen, onEdit }: { area: Area; onOpen: (area: Area) => void; onEdit: (area: Area) => void }) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const [confirm, setConfirm] = useState<null | "activate" | "deactivate">(null);

  const { mutate: deactivateArea } = useMutation({
    mutationFn: (areaId: number) => {
      showLoader(`Inativando área ${area.name}...`);
      return inactiveArea(areaId);
    },
    onSuccess: () => {
      hideLoader();
      toast({ title: "Área inativada!", description: `Área ${area.name} inativada com sucesso`, variant: "default", duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ["listAreasCompany"] });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({ title: "Erro ao inativar o área!", description: errorMessage(error, "Erro ao inativar a área!"), variant: "destructive", duration: 5000 });
    },
  });

  const { mutate: activateArea } = useMutation({
    mutationFn: (areaId: number) => {
      showLoader(`Ativando área ${area.name}...`);
      return activeArea(areaId);
    },
    onSuccess: () => {
      hideLoader();
      toast({ title: "Área Reativado!", description: `Área ${area.name} foi reativada com sucesso`, variant: "success", duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ["listAreasCompany"] });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({ title: "Erro ao reativar o área!", description: errorMessage(error, "Erro ao reativar a área!"), variant: "destructive", duration: 5000 });
    },
  });

  // permissões como na tela antiga (inativar pede activate_*, reativar pede inactive_*)
  const canToggle = area.inactiveAt ? can("activate_area_inventarios") : can("inactive_area_inventarios");
  const canUpdate = can("update_area_inventarios");

  const CONFIRMS = {
    deactivate: { title: `Inativar área ${area.name}?`, description: `Ao prosseguir, a área ${area.name} será inativada.` },
    activate: { title: `Reativar área ${area.name}?`, description: `Ao prosseguir, a área ${area.name} será reativada.` },
  } as const;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações da área ${area.name}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="gap-2" onSelect={() => onOpen(area)}><Icon name="send-horizontal" className="w-3.5 h-3.5" /> Ir para área</DropdownMenuItem>
          {canUpdate && <DropdownMenuItem className="gap-2" onSelect={() => onEdit(area)}><Icon name="edit-3" className="w-3.5 h-3.5" /> Editar</DropdownMenuItem>}
          {canToggle && <DropdownMenuSeparator />}
          {canToggle && (area.inactiveAt
            ? <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("activate")}><Icon name="power" className="w-3.5 h-3.5" /> Reativar</DropdownMenuItem>
            : <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("deactivate")}><Icon name="power-off" className="w-3.5 h-3.5" /> Inativar</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }} title={CONFIRMS[confirm].title} description={CONFIRMS[confirm].description}
          onConfirm={() => { if (area.id) (confirm === "activate" ? activateArea : deactivateArea)(area.id); setConfirm(null); }} />
      )}
    </>
  );
}
