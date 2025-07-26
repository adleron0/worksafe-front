// Serviços
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
// Template Page
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
  openInstructorsModal: (open: boolean) => void;
}

const SiteServicesItem = ({ item, index, entity, setFormData, setOpenForm, openInstructorsModal }: ItemsProps) => {
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
        description: `O ${entity.name} foi reativado com sucesso.`,
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

  return (
    <>
      {/* Renderiza o Header apenas no primeiro item */}
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg font-semibold text-sm text-inverse-foreground">
          <div className="w-4/12">Turma</div>
          <div className="w-4/12">Detlhes</div>
          <div className="w-2/12">Período</div>
          <div className="w-1/12">Status</div>
          <div className="w-1/12">Ações</div>
        </div>
      )}

      {/* Conteúdo do item */}
      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        {/* Badges */}
        <div className="absolute -top-1 left-4 flex items-center gap-2">
            <Badge variant="outline" className="text-2xs h-4 rounded-sm font-medium text-inverse-foreground bg-primary">
              <Icon name="asterisk" className="w-4 h-4" />
              {item.openClass ? "Turma aberta" : "InCompany"}
            </Badge>

            { item.minimumQuorum && (
              <Badge variant="outline" className="text-2xs h-4 rounded-sm font-medium text-inverse-foreground bg-primary">
                <Icon name="arrow-big-down-dash" className="w-3 h-3" />
                {`Mín: ${item.minimumQuorum}`}
              </Badge>
              )
            }

            { item.maxSubscriptions && (
              <Badge variant="outline" className="text-2xs h-4 rounded-sm font-medium text-inverse-foreground bg-primary">
                <Icon name="arrow-big-up-dash" className="w-3 h-3" />
                {`Máx: ${item.maxSubscriptions}`}
              </Badge>
              )
            }
        </div>

        {/* Avatar e Nome */}
        <div className="w-full lg:w-4/12 flex items-center space-x-4 md:pr-2">
          <Avatar className="border rounded-md">
            <AvatarImage src={item.imageUrl || undefined} alt={item.name} />
            <AvatarFallback className="rounded-md">{item.name[0]}</AvatarFallback>
          </Avatar>
          <div className="break-words w-9/12 md:w-full">
            <p className="text-xs text-muted-foreground dark:text-gray-100">
              Turma: #{item.id}
            </p>
            <h2 className="text-sm font-semibold">{item.name}</h2>
            <p className="text-xs text-muted-foreground dark:text-gray-100">
              {item.hoursDuration} horas
            </p>
            <p className="text-xs text-muted-foreground dark:text-gray-100">
              {item.landingPagesDates}
            </p>
          </div>
        </div>

        {/* Detalhes */}
        <div className="lg:w-4/12 flex items-baseline gap-2 md:pr-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Detalhes: </p>
          <div className="flex flex-col items-start gap-0.5">
            <p className="text-xs text-muted-foreground dark:text-gray-100">
              {item.price ? `valor atual: R$ ${item.price}` : 'Não informado'}
            </p>
            <p className="text-xs text-muted-foreground dark:text-gray-100">
              {item.oldPrice ? `valor antigo: R$ ${item.oldPrice}` : 'Não informado'}
            </p>
            <div className="flex flex-wrap gap-0.5">
              {
                item.gifts?.split('#').map((feature: string, index: number) => (
                  <p 
                    key={`feature-${index}`} 
                    className="text-xs text-muted-foreground dark:text-gray-100 border rounded-sm py-1 px-2"
                  >
                    {feature}
                  </p>
                ))
              }
            </div>
          </div>
        </div>

        {/* Período */}
        <div className="lg:w-2/12 flex items-baseline gap-2 md:pr-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Período: </p>
          <div>
            <p className="text-sm text-muted-foreground dark:text-gray-100">
              {new Date(item.initialDate || '2024-01-01').toLocaleDateString()}
            </p>
            <p className="text-sm text-muted-foreground dark:text-gray-100">
              {new Date(item.finalDate || '2024-01-01').toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="lg:w-1/12 flex items-baseline gap-2 md:pr-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Status: </p>
          <Badge
            variant="outline"
            className={`${
              item.active
              ? "bg-green-200 text-green-900 dark:bg-green-900 dark:text-green-200"
              : "bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-200"
            } rounded-full px-2 py-1 text-xs`}
          >
            {item.active ? "Ativo" : "Inativo"}
          </Badge>
        </div>

        {/* Ações */}
        <div className="absolute top-2 right-2 lg:static lg:w-1/12">
          <DropdownMenu modal={false}>
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

              <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                <Button 
                  variant="ghost" 
                  className="flex justify-start gap-2 p-2 items-baseline w-full h-fit"
                  onClick={() => {
                    openInstructorsModal(true);
                    setFormData(item);
                  }}
                >
                  <Icon name="contact" className="w-3 h-3" /> 
                  <p>Instrutores</p>
                </Button>
              </DropdownMenuItem>
              
              {
                item.active ? (
                  can(`inactive_${entity.ability}`) && (
                      <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                        <ConfirmDialog
                          title={`Inativar o ${entity.name} ${item.name}?`}
                          description={`Ao prosseguir, o ${entity.name} ${item.name} será inativo e não poderá acessar a plataforma.`}
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
                        description={`Ao prosseguir, o ${entity.name} ${item.name} será reativado e poderá acessar a plataforma.`}
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
  )
};

export default SiteServicesItem;
