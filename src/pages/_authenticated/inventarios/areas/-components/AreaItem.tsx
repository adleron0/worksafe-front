// Serviços
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inactiveArea, activeArea } from "@/services/specific/areaService";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { useNavigate } from "@tanstack/react-router";
// Template Page
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import AreaForm from "./AreaForm";
import { Separator } from "@/components/ui/separator";
import { SendHorizontal } from "lucide-react";
import Icon from "@/components/general-components/Icon";
// Interfaces
import { Area } from "../-interfaces/area.interface";
import { ApiError } from "@/general-interfaces/api.interface";

interface AreaItemProps {
  area: Area;
}

const AreaItem = ({ area }: AreaItemProps) => {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

   // Mutation para inativar a área
  const { mutate: deactivateArea } = useMutation({
    mutationFn: (areaId: number) => {
      showLoader(`Inativando área ${area.name}...`);
      return inactiveArea(areaId);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: "Área inativada!",
        description: `Área ${area.name} inativada com sucesso`,
        variant: "default",
        duration: 5000
      })
      queryClient.invalidateQueries({ queryKey: ['listAreasCompany'] });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({
        title: "Erro ao inativar o área!",
        description: error instanceof Error 
          ? error.message 
          : typeof error === 'object' && error !== null && 'response' in error 
            ? ((error as ApiError).response?.data?.message || "Erro ao inativar a área!")
            : "Erro ao inativar a área!",
        variant: "destructive",
        duration: 5000
      })
    }
  });

  // Mutation para ativar a área
  const { mutate: activateArea } = useMutation({
    mutationFn: (areaId: number) => {
      showLoader(`Ativando área ${area.name}...`);
      return activeArea(areaId);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: "Área Reativado!",
        description: `Área ${area.name} foi reativada com sucesso`,	
        variant: "success",
        duration: 5000
      })
      queryClient.invalidateQueries({ queryKey: ['listAreasCompany'] });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({
        title: "Erro ao reativar o área!",
        description: error instanceof Error 
          ? error.message 
          : typeof error === 'object' && error !== null && 'response' in error 
            ? ((error as ApiError).response?.data?.message || "Erro ao reativar a área!")
            : "Erro ao reativar a área!",
        variant: "destructive",
        duration: 5000
      })
    }
  });

  const handleConfirmAction = (actionType: "activate" | "deactivate") => {
    if (!area.id) return;

    if (actionType === "activate") {
      activateArea(area.id);
    } else {
      deactivateArea(area.id);
    }
  };

  const navigate = useNavigate();

  return (
    <>
      {/* Conteúdo do item */}
      <div className="relative shadow-sm bg-background/50 rounded flex flex-col overflow-hidden border w-full">
        {/* Avatar e Nome */}
        <div className="relative min-h-24 h-44 w-full overflow-hidden">
          <img
            src={area.imageUrl || undefined}
            alt={area.name}
            className="h-full w-full object-cover rounded-t"
          />
        </div>

        <div className="flex flex-col p-2 gap-2 justify-between">
          <div className="flex justify-between items-baseline">

            {/* Status */}
            <div>
              <Badge
                variant="outline"
                className="flex gap-2 items-center text-xs font-medium text-foreground rounded-full px-1.5"
              >
                <div 
                  className={`${
                    area.inactiveAt
                    ? "bg-red-500 dark:bg-red-600"
                    : "bg-green-500 dark:bg-green-600"
                  } h-2 w-2 rounded-full animate-echo`}
                />
                <span>{area.inactiveAt ? "área inativa" : "área ativa"}</span>
              </Badge>
            </div>

            {/* Data de Criação */}
            <div className="flex items-baseline gap-1 text-xs">
              <p className="text-xs font-medium text-gray-800 dark:text-gray-300">
                Cadastro:
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-100 truncate">
                {new Date(area.createdAt || '2024-01-01').toLocaleDateString()}
              </p>
            </div>

          </div>
          
          <Separator />

          <div className="flex flex-col gap-1 h-10">
            <h2 className="text-sm font-semibold truncate">{area.name}</h2>
            <h2 className="text-xs truncate">{area.description}</h2>
          </div>

          
          <Separator />

          <Button
            variant="outline"
            onClick={() => {
              navigate({
                to: `/inventarios/areas/${area.id}`,
              })
            }}
            className="flex items-center gap-1 cursor-pointer h-7 w-full text-xs truncate"
          >
            <p>Ir para Área</p>
            <SendHorizontal className="w-2.5 h-2.5 ml-1" />
          </Button>

          {/* Ações */}
          <div className="flex justify-between gap-2">
            {!area.inactiveAt ? (
              can("activate_area_inventarios") && (
                <ConfirmDialog
                  title={`Inativar área ${area.name}?`}
                  description={`Ao prosseguir, a área ${area.name} será inativada.`}
                  onConfirm={() => handleConfirmAction("deactivate")}
                >
                  <Button
                    variant="secondary"
                    className="flex items-center gap-1 cursor-pointer h-7 w-1/2 text-xs truncate"
                  >
                    <Icon name="power" className="w-3 h-3" />
                    <p>Inativar</p>
                  </Button>
                </ConfirmDialog>
              )
            ) : (
              can("inactive_area_inventarios") && (
                <ConfirmDialog
                  title={`Reativar área ${area.name}?`}
                  description={`Ao prosseguir, a área ${area.name} será reativada.`}
                  onConfirm={() => handleConfirmAction("activate")}
                >
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1 cursor-pointer h-7 w-1/2 text-xs truncate"
                  >
                    <Icon name="power" className="w-3 h-3" />
                    <p>Reativar</p>
                  </Button>
                </ConfirmDialog>
              )
            )}

            {can("update_area_inventarios") && <AreaForm areaToEdit={area} />}
          </div>
        </div>
      </div>

    </>
  )
};

export default AreaItem;
