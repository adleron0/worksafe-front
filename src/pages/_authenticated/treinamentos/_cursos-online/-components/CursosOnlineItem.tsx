import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
// Componentes UI
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/kibo-ui/status";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
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
  onManageLessons?: (item: IEntity) => void;
}

const Item = ({ item, index, entity, setFormData, setOpenForm, onManageLessons }: ItemsProps) => {
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
        title: `${entity.name} ${item.name} inativado!`,
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
        title: `${entity.name} ${item.name} reativado!`,
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

  // Função para contar lições
  const getLessonsCount = () => {
    if (!item.lessons || item.lessons.length === 0) {
      return 'Sem lições';
    }
    return `${item.lessons.length} ${item.lessons.length === 1 ? 'lição' : 'lições'}`;
  };

  return (
    <>
      {/* Header apenas no primeiro item */}
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg font-semibold text-sm text-inverse-foreground">
          <p className="w-4/12">Nome</p>
          <p className="w-3/12">Curso</p>
          <p className="w-2/12">Lições</p>
          <p className="w-2/12">Status</p>
          <p className="w-1/12 text-center">Ações</p>
        </div>
      )}

      {/* Conteúdo do item */}
      <div 
        className={`
          ${index % 2 === 0 ? "bg-background" : "bg-background/50"} 
          group relative shadow-sm rounded gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full 
        `}
        onClick={() => console.log('Item clicado:', item.id)}
      >
        {/* Nome */}
        <div className="flex flex-col lg:w-4/12 relative z-10">
          <p className="text-xs text-muted-foreground lg:hidden">Nome</p>
          <p className="font-medium">{item.name}</p>
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
          )}
        </div>

        {/* Curso */}
        <div className="flex flex-col lg:w-3/12 relative z-10">
          <p className="text-xs text-muted-foreground lg:hidden">Curso</p>
          <p className="text-sm">{item.course?.name || '-'}</p>
          {item.course?.hoursDuration && (
            <p className="text-xs text-muted-foreground">{item.course.hoursDuration}h</p>
          )}
        </div>

        {/* Lições */}
        <div className="flex flex-col lg:w-2/12 relative z-10">
          <p className="text-xs text-muted-foreground lg:hidden">Lições</p>
          <p className="text-sm">{getLessonsCount()}</p>
          {item.lessons && item.lessons.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {item.lessons.filter(l => l.lesson?.isActive).length} ativas
            </p>
          )}
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
        <div className="absolute flex justify-center top-2 right-2 lg:static lg:w-1/12 z-10">
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
                <>
                  <DropdownMenuItem onClick={handleEdit}>
                    <Icon name="pencil" className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  
                  {onManageLessons && (
                    <DropdownMenuItem onClick={() => onManageLessons(item)}>
                      <Icon name="grip-vertical" className="mr-2 h-4 w-4" />
                      Vincular Aulas
                    </DropdownMenuItem>
                  )}
                </>
              )}
              
              {
                !item.inactiveAt ? (
                  can(`inactive_${entity.ability}`) && (
                      <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                        <ConfirmDialog
                          title={`Inativar o ${entity.name} ${item.name}?`}
                          description={`Ao prosseguir, o ${entity.name} ${item.name} será inativado.`}
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
                        title={`Reativar o ${entity.name} ${item.name}?`}
                        description={`Ao prosseguir, o ${entity.name} ${item.name} será reativado.`}
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