import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
// Componentes UI
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/kibo-ui/status";
import { Progress } from "@/components/ui/progress";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
// Interfaces
import { IEntity } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ItemsProps {
  item: IEntity;
  index: number;
  entity: IDefaultEntity;
  setFormData: (data: IEntity) => void;
  setOpenForm: (open: boolean) => void;
}

const Item = ({ item, index, entity, setFormData, setOpenForm }: ItemsProps) => {
  const { can } = useVerify();
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
        })
        queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      },
      onError: (error: unknown) => {
        hideLoader();
        toast({
          title: `Erro ao inativar ${entity.name}`,
          description: error instanceof Error 
            ? error.message 
            : typeof error === 'object' && error !== null && 'response' in error 
              ? ((error as ApiError).response?.data?.message || `Erro ao inativar ${entity.name}`)
              : `Erro ao inativar ${entity.name}`,
          variant: "destructive",
        })
      }
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
        })
        queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      },
      onError: (error: unknown) => {
        hideLoader();
        toast({
          title: `Erro ao reativar ${entity.name}`,
          description: error instanceof Error 
            ? error.message 
            : typeof error === 'object' && error !== null && 'response' in error 
              ? ((error as ApiError).response?.data?.message || `Erro ao reativar ${entity.name}`)
              : `Erro ao reativar ${entity.name}`,
          variant: "destructive",
        })
      }
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
      const config = typeof item.progressConfig === 'string' 
        ? JSON.parse(item.progressConfig) 
        : item.progressConfig;
      
      return `${config.minProgress || 80}% mínimo`;
    } catch {
      return '80% mínimo';
    }
  };

  return (
    <>
      {/* Header apenas no primeiro item */}
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg font-semibold text-sm text-inverse-foreground">
          <p className="w-4/12">Título</p>
          <p className="w-1/12">Versão</p>
          <p className="w-2/12">Progresso Min.</p>
          <p className="w-2/12">Data Criação</p>
          <p className="w-2/12">Status</p>
          <p className="w-1/12 text-center">Ações</p>
        </div>
      )}

      {/* Conteúdo do item */}
      <div 
        className={`
          ${index % 2 === 0 ? "bg-background" : "bg-background/50"} 
          group relative shadow-sm rounded gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full 
          border-b border-border/40
          cursor-pointer 
          transition-all duration-200 ease-in-out
          hover:shadow-md 
          hover:-translate-y-0.5
          hover:bg-card
          after:absolute after:left-0 after:top-0 after:h-full after:w-0.5 after:bg-primary after:opacity-0 hover:after:opacity-100 after:transition-opacity
        `}
        onClick={() => console.log('Item clicado:', item.id)}
      >
        {/* Título */}
        <div className="flex flex-col lg:w-4/12 relative z-10">
          <p className="text-xs text-muted-foreground lg:hidden">Título</p>
          <p className="font-medium">{item.title}</p>
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
          )}
          <p className="text-xs text-muted-foreground">curso: {item.course?.name || '-'}</p>
        </div>

        {/* Versão */}
        <div className="flex flex-col lg:w-1/12 relative z-10">
          <p className="text-xs text-muted-foreground lg:hidden">Versão</p>
          <p className="text-sm">{item.version || '1.0.0'}</p>
        </div>

        {/* Configuração de Progresso */}
        <div className="flex flex-col lg:w-2/12 space-y-1 pr-4 lg:pr-8 relative z-10">
          <Progress 
            value={typeof item.progressConfig === 'string' 
              ? JSON.parse(item.progressConfig).minProgress || 80
              : item.progressConfig?.minProgress || 80} 
            className="h-2 w-full"
          />
          <p className="text-xs text-muted-foreground lg:hidden">Progresso</p>
          <p className="text-xs text-muted-foreground">{getProgressConfigDisplay()}</p>
        </div>

        {/* Data de Criação */}
        <div className="flex flex-col lg:w-2/12 relative z-10">
          <p className="text-xs text-muted-foreground lg:hidden">Data Criação</p>
          <p className="text-sm">
            {item.createdAt 
              ? format(new Date(item.createdAt), "dd/MM/yyyy", { locale: ptBR })
              : '-'}
          </p>
        </div>

        {/* Status */}
        <div className="flex flex-col lg:w-2/12 relative z-10">
          <p className="text-xs text-muted-foreground lg:hidden">Status</p>
          <Status status={item.isActive ? "online" : "offline"} className="w-fit">
            <StatusIndicator />
            <StatusLabel>
              {item.isActive ? 'Ativo' : 'Inativo'}
            </StatusLabel>
          </Status>
        </div>

        {/* Ações */}
        <div className="absolute top-2 right-2 lg:static lg:w-1/12">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-8 w-8 rounded-full p-0 text-gray-700 cursor-pointer"
                variant="outline"
                size="sm"
                onClick={(e) => e.stopPropagation()}>
                <Icon name="ellipsis-vertical" className="text-foreground dark:text-primary w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {can(`update_${entity.ability}`) && (
                <DropdownMenuItem onClick={handleEdit}>
                  <Icon name="pencil" className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              
              {
                !item.inactiveAt ? (
                  can(`inactive_${entity.ability}`) && (
                      <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                        <ConfirmDialog
                          title={`Inativar a ${entity.name} ${item.title}?`}
                          description={`Ao prosseguir, a ${entity.name} ${item.title} será inativada.`}
                          onConfirm={() => handleConfirmAction("deactivate")}
                          titleBttn="Inativar"
                          iconBttn="power-off"
                        />
                      </DropdownMenuItem>
                  )
                ) : (
                  can(`activate_${entity.ability}`) && (	
                    <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                      <ConfirmDialog
                        title={`Reativar a ${entity.name} ${item.title}?`}
                        description={`Ao prosseguir, a ${entity.name} ${item.title} será reativada.`}
                        onConfirm={() => handleConfirmAction("activate")}
                        titleBttn="Reativar"
                        iconBttn="power"
                      />
                    </DropdownMenuItem>
                  )
                )
              }
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
};

export default Item;