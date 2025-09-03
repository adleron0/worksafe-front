import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
// Componentes UI
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
// Interfaces
import { IReview as IEntity } from "../interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ItemsProps {
  item: IEntity;
  index: number;
  entity: IDefaultEntity;
}

const Item = ({ item, index, entity }: ItemsProps) => {
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
          title: `${entity.name} inativado!`,
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
          title: `${entity.name} reativado!`,
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

  const renderStars = (rating: number | undefined) => {
    if (!rating) return <span className="text-muted-foreground">-</span>;
    
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Icon
            key={i}
            name="star"
            className={`h-3 w-3 ${
              i < rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-1 text-sm">({rating})</span>
      </div>
    );
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <>
      {/* Header apenas no primeiro item */}
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg font-semibold text-sm text-inverse-foreground">
          <div className="w-4/12">Aluno</div>
          <div className="w-4/12">Avaliação</div>
          <div className="w-3/12">Exposição/status</div>
          <div className="w-1/12">Ações</div>
        </div>
      )}

      {/* Conteúdo do item */}
      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        {/* Avatar e Nome */}
        <div className="w-full lg:w-4/12 flex items-center space-x-4 md:pr-2">
          <Avatar className="border rounded-md">
            <AvatarImage src={item?.trainee?.imageUrl || undefined} alt={item?.trainee?.name} />
            <AvatarFallback className="rounded-md">{item?.trainee?.name[0]}</AvatarFallback>
          </Avatar>
          <div className="break-words w-9/12 md:w-full">
            <h2 className="text-sm font-semibold">{item?.trainee?.name}</h2>
            <p className="text-xs text-muted-foreground dark:text-gray-100">
              {item?.trainee?.email}
            </p>
          </div>
        </div>
        
        {/* Detalhes */}
        <div className="lg:w-4/12 flex items-baseline gap-2 md:pr-2 break-all">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Avaliação: </p>
          <div className="flex flex-col items-start gap-0.5">
            <div>{renderStars(item.generalRating)}</div>
            <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
            <p className="text-xs text-muted-foreground dark:text-gray-100">
              {item?.opinionRating ? `${item.opinionRating}` : 'Sem justificativa'}
            </p>
          </div>
        </div>

         {/* Exposição/Status */}
        <div className="lg:w-3/12 flex items-baseline gap-2 md:pr-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Status: </p>
          <Badge variant="outline">
            {item.authorizationExposeReview ? "Exposto na LP" : "Oculto na LP"}
          </Badge>
          <Badge
            variant="outline"
            className={`${
              !item.inactiveAt
              ? "bg-green-200 text-green-900 dark:bg-green-900 dark:text-green-200"
              : "bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-200"
            } rounded-full px-2 py-1 text-xs`}
          >
            {!item.inactiveAt ? "Ativo" : "Inativo"}
          </Badge>
        </div>
        
          <div className="w-1/12">
            <DropdownMenu modal={true}>
              <DropdownMenuTrigger asChild>
                <Button
                  className="h-8 w-8 rounded-full p-0 text-gray-700 cursor-pointer"
                  variant="outline"
                  size="sm">
                  <Icon name="ellipsis-vertical" className="text-foreground dark:text-primary w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Inativar/Ativar */}
                {
                !item.inactiveAt ? (
                  can(`inactive_${entity.ability}`) && (
                      <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                        <ConfirmDialog
                          title={`Inativar o ${entity.name}?`}
                          description={`Ao prosseguir, o ${entity.name} será inativo e não poderá acessar a plataforma.`}
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
                        title={`Reativar o ${entity.name}?`}
                        description={`Ao prosseguir, o ${entity.name} será reativado e poderá acessar a plataforma.`}
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