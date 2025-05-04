import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Courses as EntityInterface } from "./interfaces/courses.interface";
import useVerify from "@/hooks/use-verify";
import { patch } from "@/services/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import Loader from "@/components/general-components/Loader";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";

interface ItemsProps {
  item: EntityInterface;
  index: number;
  entity: IDefaultEntity;
  setFormData: (data: EntityInterface) => void;
  setOpenForm: (open: boolean) => void;
}

const CustomerItem = ({ item, index, entity, setFormData, setOpenForm }: ItemsProps) => {
  const { can } = useVerify();
  const queryClient = useQueryClient();

   // Mutation para inativar
  const { mutate: deactivate, isPending: isInactivating } = useMutation({
    mutationFn: (id: number) => patch<EntityInterface>(entity.model, `inactive/${id}`),
    onSuccess: () => {
      toast({
        title: `${entity.name} ${item.name} inativado!`,
        description: `${entity.name} inativado com sucesso.`,
        variant: "success",
      })
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: { response: { data: { message: string } } }) => {
      toast({
        title: `Erro ao inativar ${entity.name}`,
        description: `${error.response.data.message}`,
        variant: "destructive",
      })
    }
  });

  // Mutation para ativar
  const { mutate: activate, isPending: isActivating } = useMutation({
    mutationFn: (id: number) => patch<EntityInterface>(entity.model, `active/${id}`),
    onSuccess: () => {
      toast({
        title: `${entity.name} ${item.name} reativado!`,
        description: `O ${entity.name} foi reativado com sucesso.`,
        variant: "success",
      })
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: { response: { data: { message: string } } }) => {
      toast({
        title: `Erro ao reativar ${entity.name}`,
        description: `${error.response.data.message}`,
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
          <div className="w-4/12">Curso</div>
          <div className="w-5/12">Descrição</div>
          <div className="w-2/12">Status</div>
          <div className="w-1/12">Ações</div>
        </div>
      )}

      {/* Conteúdo do item */}
      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        {/* Badges */}
        <div className="absolute -top-1 left-4 flex items-center gap-2">
          {item.flag?.split('#').map((flag: string, index: number) => (
            <Badge key={index} variant="outline" className="text-2xs h-4 rounded-sm font-medium text-inverse-foreground bg-primary">
              <Icon name="flag" className="w-3 h-3" />
              {flag}
            </Badge>
          ))}
        </div>

        {/* Avatar e Nome */}
        <div className="w-full lg:w-4/12 flex items-center space-x-4">
          <Avatar className="border rounded-md">
            <AvatarImage src={item.imageUrl || undefined} alt={item.name} />
            <AvatarFallback>{item.name[0]}</AvatarFallback>
          </Avatar>
          <div className="break-words">
            <h2 className="text-sm font-semibold">{item.name}</h2>
          </div>
        </div>

        {/* Descrição */}
        <div className="lg:w-5/12 flex items-baseline gap-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Descrição: </p>
          <div className="flex flex-wrap gap-0.5">
            <p className="text-xs text-muted-foreground dark:text-gray-100 rounded-sm">
              {item.description}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="lg:w-2/12 flex items-baseline gap-2">
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

              { can(`update_${entity.ability}`) && (
                  <Button 
                    variant="ghost" 
                    className="flex justify-start gap-2 p-2 items-baseline w-full h-fit"
                    onClick={() => {
                      setFormData({...item, formType: 'exam'});
                      setOpenForm(true);
                    }}
                  >
                    <Icon name="file-text" className="w-3 h-3" /> 
                    <p>Exame do Curso</p>
                  </Button>
                )
              }
              
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
      {isInactivating && <Loader title={"Inativando..."} />}
      {isActivating && <Loader title={"Ativando..."} />}
    </>
  )
};

export default CustomerItem;
