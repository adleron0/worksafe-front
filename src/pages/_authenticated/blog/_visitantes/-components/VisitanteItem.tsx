import useVerify from "@/hooks/use-verify";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/kibo-ui/status";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import HeaderRow from "@/components/general-components/HeaderRow";
import { IVisitante } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { useLoader } from "@/context/GeneralContext";

interface ItemsProps {
  item: IVisitante;
  index: number;
  entity: IDefaultEntity;
  setFormData: (data: IVisitante) => void;
  setOpenForm: (open: boolean) => void;
}

const VisitanteItem = ({ item, index, entity, setFormData, setOpenForm }: ItemsProps) => {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  const { mutate: toggleBlock } = useMutation({
    mutationFn: (action: 'block' | 'unblock') => {
      showLoader(`${action === 'block' ? 'Bloqueando' : 'Desbloqueando'} ${entity.name}...`);
      return patch(`${entity.model}/${action}/${item.id}`, '');
    },
    onSuccess: (_, action) => {
      hideLoader();
      toast({
        title: `${entity.name} ${action === 'block' ? 'bloqueado' : 'desbloqueado'}!`,
        description: `${entity.name} ${action === 'block' ? 'bloqueado' : 'desbloqueado'} com sucesso.`,
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

  const handleBlockAction = (action: "block" | "unblock") => {
    toggleBlock(action);
  };

  return (
    <>
      <HeaderRow show={index === 0}>
        <div className="w-3/12">Visitante</div>
        <div className="w-3/12">Email</div>
        <div className="w-2/12">Comentários</div>
        <div className="w-2/12">Status</div>
        <div className="w-2/12">Ações</div>
      </HeaderRow>

      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>

        {/* Avatar e Nome */}
        <div className="w-full lg:w-3/12 flex items-center space-x-4 md:pr-2">
          <Avatar className="h-12 w-12 border rounded-full">
            <AvatarImage src={item.avatarUrl || undefined} alt={item.name} />
            <AvatarFallback className="rounded-full uppercase">
              {item.name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="break-words flex-1">
            <h2 className="text-sm font-semibold">{item.name}</h2>
          </div>
        </div>

        {/* Email */}
        <div className="lg:w-3/12 flex items-baseline gap-2 md:pr-2">
          <p className="lg:hidden text-sm font-medium">Email: </p>
          <div className="flex items-center gap-2">
            <Icon name="mail" className="w-3 h-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground truncate">{item.email}</p>
          </div>
        </div>

        {/* Comentários */}
        <div className="lg:w-2/12 flex items-baseline gap-2">
          <p className="lg:hidden text-sm font-medium">Comentários: </p>
          <Badge variant="secondary">{item._count?.comments || 0}</Badge>
        </div>

        {/* Status */}
        <div className="flex flex-col lg:w-2/12">
          <p className="text-xs text-muted-foreground lg:hidden">Status</p>
          {item.blocked ? (
            <Status status="offline" className="w-fit">
              <StatusIndicator />
              <StatusLabel>Bloqueado</StatusLabel>
            </Status>
          ) : (
            <Status status="online" className="w-fit">
              <StatusIndicator />
              <StatusLabel>Ativo</StatusLabel>
            </Status>
          )}
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
              {can(`view_${entity.ability}`) && (
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Button
                    variant="ghost"
                    className="flex justify-start gap-2 p-0 items-baseline w-full h-fit"
                    onClick={() => {
                      setFormData(item);
                      setOpenForm(true);
                    }}
                  >
                    <Icon name="eye" className="w-3 h-3" />
                    <p>Visualizar</p>
                  </Button>
                </DropdownMenuItem>
              )}

              {!item.blocked ? (
                can(`update_${entity.ability}`) && (
                  <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                    <ConfirmDialog
                      title={`Bloquear ${entity.name} ${item.name}?`}
                      description={`Ao prosseguir, ${entity.name} ${item.name} será bloqueado e não poderá mais comentar.`}
                      onConfirm={() => handleBlockAction("block")}
                      titleBttn="Bloquear"
                      iconBttn="ban"
                    />
                  </DropdownMenuItem>
                )
              ) : (
                can(`update_${entity.ability}`) && (
                  <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                    <ConfirmDialog
                      title={`Desbloquear ${entity.name} ${item.name}?`}
                      description={`Ao prosseguir, ${entity.name} ${item.name} será desbloqueado e poderá comentar novamente.`}
                      onConfirm={() => handleBlockAction("unblock")}
                      titleBttn="Desbloquear"
                      iconBttn="check-circle"
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

export default VisitanteItem;
