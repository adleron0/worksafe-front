// Serviços
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { put } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
// Template Page
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  // DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
// import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import OptionSelector from "@/components/general-components/OptionSelector";
// Interfaces
import { IEntity } from "../interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

interface ItemsProps {
  item: IEntity;
  index: number;
  entity: IDefaultEntity;
  setFormData: (data: IEntity) => void;
  setOpenForm: (open: boolean) => void;
}

const SubscriptionItem = ({ item, index, entity, setFormData, setOpenForm }: ItemsProps) => {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  const status = [
    { label: "Confirmado", value: "confirmed", color: "#22c55e" },
    { label: "Recusado", value: "declined", color: "#ef4444" },
    { label: "Pendente", value: "pending", color: "#fbc02d" },
  ];

  // Mutation para alterar status
  const { mutate: changeStatus } = useMutation({
    mutationFn: ({ id, newStatus }: { id: number; newStatus: string }) => {
      showLoader(`Atualizando status...`);
      return put<IEntity>("subscription", `${id}`, { 
        ...item,
        subscribeStatus: newStatus as "pending" | "confirmed" | "declined"
      });
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: "Status atualizado!",
        description: "O status foi atualizado com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: unknown) => {
      hideLoader();
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null && 'response' in error 
          ? ((error as ApiError).response?.data?.message || "Erro ao atualizar status")
          : "Erro ao atualizar status";
      toast({
        title: "Erro ao atualizar status",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const handleStatusChange = (newStatus: string | number) => {
    if (!item.id) return;
    changeStatus({ id: item.id, newStatus: newStatus as string });
  };

  // Mutation para inativar
  // const { mutate: deactivate } = useMutation({
  //   mutationFn: (id: number) => {
  //     showLoader(`Inativando ${entity.name}...`);
  //     return patch<IEntity>(entity.model, `inactive/${id}`);
  //   },
  //   onSuccess: () => {
  //     hideLoader();
  //     toast({
  //       title: `${entity.name} ${item.name} inativada!`,
  //       description: `${entity.name} inativada com sucesso.`,
  //       variant: "success",
  //     })
  //     queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
  //   },
  //   onError: (error: unknown) => {
  //     hideLoader();
  //     toast({
  //       title: `Erro ao inativar ${entity.name}`,
  //       description: error instanceof Error 
  //         ? error.message 
  //         : typeof error === 'object' && error !== null && 'response' in error 
  //           ? ((error as ApiError).response?.data?.message || `Erro ao inativar ${entity.name}`)
  //           : `Erro ao inativar ${entity.name}`,
  //       variant: "destructive",
  //     })
  //   }
  // });

  // Mutation para ativar
  // const { mutate: activate } = useMutation({
  //   mutationFn: (id: number) => {
  //     showLoader(`Ativando ${entity.name}...`);
  //     return patch<IEntity>(entity.model, `active/${id}`);
  //   },
  //   onSuccess: () => {
  //     hideLoader();
  //     toast({
  //       title: `${entity.name} ${item.name} reativada!`,
  //       description: `A ${entity.name} foi reativada com sucesso.`,
  //       variant: "success",
  //     })
  //     queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
  //   },
  //   onError: (error: unknown) => {
  //     hideLoader();
  //     toast({
  //       title: `Erro ao reativar ${entity.name}`,
  //       description: error instanceof Error 
  //         ? error.message 
  //         : typeof error === 'object' && error !== null && 'response' in error 
  //           ? ((error as ApiError).response?.data?.message || `Erro ao reativar ${entity.name}`)
  //           : `Erro ao reativar ${entity.name}`,
  //       variant: "destructive",
  //     })
  //   }
  // });

  // const handleConfirmAction = (actionType: "activate" | "deactivate") => {
  //   if (!item.id) return;

  //   if (actionType === "activate") {
  //     activate(item.id);
  //   } else {
  //     deactivate(item.id);
  //   }
  // };


  return (
    <>
      {/* Renderiza o Header apenas no primeiro item */}
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg font-semibold text-sm text-inverse-foreground">
          <div className="w-4/12">Nome</div>
          <div className="w-4/12">Contato</div>
          <div className="w-2/12">Status</div>
          <div className="w-1/12">Ações</div>
        </div>
      )}

      {/* Conteúdo do item */}
      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        
        {/* Avatar e Nome com CPF */}
        <div className="w-full lg:w-4/12 flex items-center space-x-4 md:pr-2">
          <Avatar className="border rounded-full">
            <AvatarImage src={undefined} alt={item.name} />
            <AvatarFallback className="rounded-full">{item.name?.[0] || "?"}</AvatarFallback>
          </Avatar>
          <div className="break-words w-9/12 md:w-full">
            <h2 className="text-sm font-semibold">{item.name}</h2>
            <p className="text-xs text-muted-foreground">
              {item.cpf || "CPF não informado"}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.occupation || "Cargo não informado"}
            </p>
          </div>
        </div>

        {/* Contato (Telefone e E-mail) */}
        <div className="w-full lg:w-4/12 flex flex-col gap-1 md:pr-2">
          <div className="flex items-center gap-2">
            <Icon name="phone" className="w-3 h-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {item.phone || 'Telefone não informado'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="mail" className="w-3 h-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground truncate">
              {item.email || 'E-mail não informado'}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="lg:w-2/12 flex items-baseline gap-2 md:pr-2">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 w-full">
            <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Status: </p>
            <OptionSelector
              currentValue={item.subscribeStatus || "pending"}
              onChange={handleStatusChange}
              options={status}
              disabled={!can(`update_${entity.ability}`)}
              className="w-full lg:w-auto"
            />
          </div>
        </div>

        {/* Ações */}
        <div className="absolute top-2 right-2 lg:static lg:w-1/12">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-8 w-8 rounded-full p-0 text-gray-700"
                variant="outline"
                size="sm">
                  <Icon name="ellipsis-vertical" className="text-foreground dark:text-primary w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>

              { can(`update_${entity.ability}`) && (
                  <Button 
                    variant="ghost" 
                    className="flex justify-start gap-2 p-2 items-baseline w-full h-fit"
                    onClick={() => {
                      setFormData(item);
                      setOpenForm(true);
                    }}
                  >
                    <Icon name="edit-3" className="w-3 h-3" /> 
                    <p>Editar</p>
                  </Button>
                )
              }
              
              {/* {
                !item.inactiveAt ? (
                  can(`inactive_${entity.ability}`) && (
                      <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                        <ConfirmDialog
                          title={`Inativar a ${entity.name} ${item.name}?`}
                          description={`Ao prosseguir, a ${entity.name} ${item.name} será inativada.`}
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
                        title={`Reativar a ${entity.name} ${item.name}?`}
                        description={`Ao prosseguir, a ${entity.name} ${item.name} será reativada.`}
                        onConfirm={() => handleConfirmAction("activate")}
                        titleBttn="Reativar"
                        iconBttn="power"
                      />
                    </DropdownMenuItem>
                  )
                )
              } */}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  )
};

export default SubscriptionItem;