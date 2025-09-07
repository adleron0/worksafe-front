import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { patch } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
// Componentes UI
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@/components/ui/kibo-ui/status";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import tailwindUtils from "@/utils/tailwind.utils";
// Interfaces
import { IEntity } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

interface ItemsProps {
  item: IEntity;
  index: number;
  entity: IDefaultEntity;
  setFormData: (data: IEntity) => void;
  setOpenForm: (open: boolean) => void;
}

const Item = ({
  item,
  index,
  entity,
  setFormData,
  setOpenForm,
}: ItemsProps) => {
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  // Mutation para inativar
  const { mutate: deactivate } = useMutation({
    mutationFn: (id: number) => {
      showLoader(`Inativando ${entity.name}...`);
      return patch<IEntity>(entity.model, `inactive/${id}`);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} ${item.title} inativado!`,
        description: `${entity.name} inativado com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({
        title: `Erro ao inativar ${entity.name}`,
        description:
          error instanceof Error
            ? error.message
            : typeof error === "object" && error !== null && "response" in error
              ? (error as ApiError).response?.data?.message ||
                `Erro ao inativar ${entity.name}`
              : `Erro ao inativar ${entity.name}`,
        variant: "destructive",
      });
    },
  });

  // Mutation para ativar
  const { mutate: activate } = useMutation({
    mutationFn: (id: number) => {
      showLoader(`Ativando ${entity.name}...`);
      return patch<IEntity>(entity.model, `active/${id}`);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} ${item.title} reativado!`,
        description: `${entity.name} foi reativado com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({
        title: `Erro ao reativar ${entity.name}`,
        description:
          error instanceof Error
            ? error.message
            : typeof error === "object" && error !== null && "response" in error
              ? (error as ApiError).response?.data?.message ||
                `Erro ao reativar ${entity.name}`
              : `Erro ao reativar ${entity.name}`,
        variant: "destructive",
      });
    },
  });

  const handleConfirmAction = (actionType: "activate" | "deactivate") => {
    if (!item.id) return;

    if (actionType === "activate") {
      activate(item.id);
    } else {
      deactivate(item.id);
    }
  };

  const handleEdit = () => {
    setFormData(item);
    setOpenForm(true);
  };

  // Função para formatar a configuração de progresso
  const getProgressConfigDisplay = () => {
    try {
      const config =
        typeof item.progressConfig === "string"
          ? JSON.parse(item.progressConfig)
          : item.progressConfig;

      if (config.isRequired) {
        return `Vídeo: ${config.videoCompletePercent || 85}% | Texto: ${config.textCompletePercent || 90}%`;
      }
      return "Não obrigatória";
    } catch {
      return "Vídeo: 85% | Texto: 90%";
    }
  };

  return (
    <>
      {/* Header apenas no primeiro item */}
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg font-semibold text-sm text-inverse-foreground">
          <p className="w-3/12">Título</p>
          <p className="w-2/12">Cursos Associados</p>
          <p className="w-3/12">Configuração Progresso</p>
          <p className="w-1/12">Versão</p>
          <p className="w-2/12">Status</p>
          <p className="w-1/12 text-center">Ações</p>
        </div>
      )}

      {/* Conteúdo do item */}
      <div
        className={`
          ${index % 2 === 0 ? "bg-background" : "bg-background/50"}
          group relative shadow-sm rounded gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full
          ${tailwindUtils.itemClickable}
        `}
        onClick={() =>
          navigate({
            to: `/treinamentos/aulas-online/${item.id}`,
          } as any)
        }
      >
        {/* Título */}
        <div className="flex flex-col lg:w-3/12 relative z-10">
          <p className="text-xs text-muted-foreground lg:hidden">Título</p>
          <p className="font-medium">{item.title}</p>
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {item.description}
            </p>
          )}
          {item.steps && item.steps.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {item.steps.length} {item.steps.length === 1 ? "etapa" : "etapas"}
            </p>
          )}
        </div>

        {/* Cursos Associados */}
        <div className="flex flex-col lg:w-2/12 relative z-10">
          <p className="text-xs text-muted-foreground lg:hidden">Cursos</p>
          <p className="text-sm text-muted-foreground">
            {item?.course?.name || "não associado"}
          </p>
        </div>

        {/* Configuração de Progresso */}
        <div className="flex flex-col lg:w-3/12 relative z-10">
          <p className="text-xs text-muted-foreground lg:hidden">
            Configuração
          </p>
          <p className="text-xs">{getProgressConfigDisplay()}</p>
          {item.progressConfig && (
            <div className="flex gap-2 mt-1">
              {item.progressConfig.requireSequential && (
                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                  Sequencial
                </span>
              )}
              {!item.progressConfig.allowSkip && (
                <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded">
                  Sem pular
                </span>
              )}
            </div>
          )}
        </div>

        {/* Versão */}
        <div className="flex flex-col lg:w-1/12 relative z-10">
          <p className="text-xs text-muted-foreground lg:hidden">Versão</p>
          <p className="text-sm">{item.version || "1.0.0"}</p>
        </div>

        {/* Status */}
        <div className="flex flex-col lg:w-2/12 relative z-10">
          <p className="text-xs text-muted-foreground lg:hidden">Status</p>
          <Status
            status={item.isActive ? "online" : "offline"}
            className="w-fit"
          >
            <StatusIndicator />
            <StatusLabel>{item.isActive ? "Ativo" : "Inativo"}</StatusLabel>
          </Status>
        </div>

        {/* Ações */}
        <div className="absolute flex justify-center top-2 right-2 lg:static lg:w-1/12 z-10">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-8 w-8 rounded-full p-0 text-gray-700 cursor-pointer"
                variant="outline"
                size="sm"
                onClick={(e) => e.stopPropagation()}
              >
                <Icon
                  name="ellipsis-vertical"
                  className="text-foreground dark:text-primary w-3 h-3"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {can(`update_${entity.ability}`) && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit();
                  }}
                >
                  <Icon name="pencil" className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}

              {!item.inactiveAt
                ? can(`inactive_${entity.ability}`) && (
                    <DropdownMenuItem
                      className="p-0"
                      onSelect={(e) => e.preventDefault()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ConfirmDialog
                        title={`Inativar a ${entity.name} ${item.title}?`}
                        description={`Ao prosseguir, a ${entity.name} ${item.title} será inativada.`}
                        onConfirm={() => handleConfirmAction("deactivate")}
                        titleBttn="Inativar"
                        iconBttn="power-off"
                      />
                    </DropdownMenuItem>
                  )
                : can(`activate_${entity.ability}`) && (
                    <DropdownMenuItem
                      className="p-0"
                      onSelect={(e) => e.preventDefault()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ConfirmDialog
                        title={`Reativar a ${entity.name} ${item.title}?`}
                        description={`Ao prosseguir, a ${entity.name} ${item.title} será reativada.`}
                        onConfirm={() => handleConfirmAction("activate")}
                        titleBttn="Reativar"
                        iconBttn="power"
                      />
                    </DropdownMenuItem>
                  )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
};

export default Item;
