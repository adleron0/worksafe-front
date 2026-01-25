import useVerify from "@/hooks/use-verify";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/kibo-ui/status";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import HeaderRow from "@/components/general-components/HeaderRow";
import { ITag } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { useLoader } from "@/context/GeneralContext";

interface ItemsProps {
  item: ITag;
  index: number;
  entity: IDefaultEntity;
  setFormData: (data: ITag) => void;
  setOpenForm: (open: boolean) => void;
}

const TagItem = ({ item, index, entity, setFormData, setOpenForm }: ItemsProps) => {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  const { mutate: toggleStatus } = useMutation({
    mutationFn: (action: 'active' | 'inactive') => {
      showLoader(`${action === 'active' ? 'Ativando' : 'Inativando'} ${entity.name}...`);
      return patch(`${entity.model}/${action}/${item.id}`, '');
    },
    onSuccess: (_, action) => {
      hideLoader();
      toast({
        title: `${entity.name} ${action === 'active' ? 'ativada' : 'inativada'}!`,
        description: `${entity.name} ${action === 'active' ? 'ativada' : 'inativada'} com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({
        title: `Erro ao alterar status`,
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const handleConfirmAction = (action: "activate" | "deactivate") => {
    toggleStatus(action === "activate" ? "active" : "inactive");
  };

  return (
    <>
      <HeaderRow show={index === 0}>
        <div className="w-5/12">Tag</div>
        <div className="w-3/12">Slug</div>
        <div className="w-2/12">Status</div>
        <div className="w-2/12">Ações</div>
      </HeaderRow>

      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>

        {/* Nome */}
        <div className="w-full lg:w-5/12 flex flex-col md:pr-2">
          <h2 className="text-sm font-semibold">{item.name}</h2>
        </div>

        {/* Slug */}
        <div className="lg:w-3/12 flex items-baseline gap-2 md:pr-2">
          <p className="lg:hidden text-sm font-medium">Slug: </p>
          <p className="text-sm text-muted-foreground">{item.slug}</p>
        </div>

        {/* Status */}
        <div className="flex flex-col lg:w-2/12">
          <p className="text-xs text-muted-foreground lg:hidden">Status</p>
          <Status status={!item.inactiveAt ? "online" : "offline"} className="w-fit">
            <StatusIndicator />
            <StatusLabel>
              {!item.inactiveAt ? 'Ativo' : 'Inativo'}
            </StatusLabel>
          </Status>
        </div>

        {/* Ações */}
        <div className="absolute top-2 right-2 lg:static lg:w-2/12">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-8 w-8 rounded-full p-0 text-gray-700 cursor-pointer"
                variant="outline"
                size="sm">
                <Icon name="ellipsis-vertical" className="text-foreground dark:text-primary w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {can(`update_${entity.ability}`) && (
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Button
                    variant="ghost"
                    className="flex justify-start gap-2 p-0 items-baseline w-full h-fit"
                    onClick={() => {
                      setFormData(item);
                      setOpenForm(true);
                    }}
                  >
                    <Icon name="edit-3" className="w-3 h-3" />
                    <p>Editar</p>
                  </Button>
                </DropdownMenuItem>
              )}

              {!item.inactiveAt ? (
                can(`inactive_${entity.ability}`) && (
                  <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                    <ConfirmDialog
                      title={`Inativar ${entity.name} ${item.name}?`}
                      description={`Ao prosseguir, ${entity.name} ${item.name} será inativada.`}
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
                      title={`Reativar ${entity.name} ${item.name}?`}
                      description={`Ao prosseguir, ${entity.name} ${item.name} será reativada.`}
                      onConfirm={() => handleConfirmAction("activate")}
                      titleBttn="Reativar"
                      iconBttn="power"
                    />
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
};

export default TagItem;
