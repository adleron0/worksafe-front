import useVerify from "@/hooks/use-verify";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/kibo-ui/status";
import ResponsiveBadge from "@/components/general-components/ResponsiveBadge";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import HeaderRow from "@/components/general-components/HeaderRow";
import { IComentario } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { useLoader } from "@/context/GeneralContext";

interface ItemsProps {
  item: IComentario;
  index: number;
  entity: IDefaultEntity;
  setFormData: (data: IComentario) => void;
  setOpenForm: (open: boolean) => void;
}

const ComentarioItem = ({ item, index, entity, setFormData, setOpenForm }: ItemsProps) => {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  const { mutate: updateStatus } = useMutation({
    mutationFn: (action: 'approve' | 'disapprove') => {
      showLoader(`${action === 'approve' ? 'Aprovando' : 'Desaprovando'} ${entity.name}...`);
      return patch(`${entity.model}/${action}`, `${item.id}`);
    },
    onSuccess: (_, action) => {
      hideLoader();
      toast({
        title: `${entity.name} ${action === 'approve' ? 'aprovado' : 'desaprovado'}!`,
        description: `${entity.name} ${action === 'approve' ? 'aprovado' : 'desaprovado'} com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({
        title: `Erro ao moderar comentário`,
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const handleModeration = (action: 'approve' | 'disapprove') => {
    updateStatus(action);
  };

  const getStatusComponent = () => {
    switch (item.status) {
      case 'published':
        return (
          <Status status="online" className="w-fit">
            <StatusIndicator />
            <StatusLabel>Aprovado</StatusLabel>
          </Status>
        );
      case 'pending':
        return (
          <Status status="waiting" className="w-fit">
            <StatusIndicator />
            <StatusLabel>Pendente</StatusLabel>
          </Status>
        );
      case 'hidden':
        return (
          <Status status="offline" className="w-fit">
            <StatusIndicator />
            <StatusLabel>Oculto</StatusLabel>
          </Status>
        );
      default:
        return (
          <Status status="waiting" className="w-fit">
            <StatusIndicator />
            <StatusLabel>{item.status}</StatusLabel>
          </Status>
        );
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "";
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const renderRating = () => {
    if (!item.rating) return <span className="text-muted-foreground text-xs">-</span>;

    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            name="star"
            className={`w-3 h-3 ${star <= item.rating! ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <HeaderRow show={index === 0}>
        <div className="w-3/12">Comentário</div>
        <div className="w-2/12">Visitante</div>
        <div className="w-2/12">Post</div>
        <div className="w-1/12">Rating</div>
        <div className="w-2/12">Status</div>
        <div className="w-2/12 text-right">Ações</div>
      </HeaderRow>

      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>

        {/* Data Badge Flutuante */}
        <div className="absolute -top-1 left-4 right-14 lg:right-auto lg:left-4 flex gap-1">
          <ResponsiveBadge
            icon="clock"
            text={formatDate(item.createdAt)}
            colorClass="bg-background text-muted-foreground"
          />
        </div>

        {/* Conteúdo */}
        <div className="w-full lg:w-3/12 flex flex-col md:pr-2">
          <p className="text-sm max-h-16 overflow-y-auto">{item.content}</p>
        </div>

        {/* Visitante */}
        <div className="lg:w-2/12 flex items-center space-x-2 md:pr-2">
          <Avatar className="h-8 w-8 border rounded-full">
            <AvatarImage src={item.visitor?.avatarUrl || undefined} alt={item.visitor?.name} />
            <AvatarFallback className="rounded-full uppercase text-xs">
              {item.visitor?.name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm text-muted-foreground truncate">
            {item.visitor?.name || "Anônimo"}
          </p>
        </div>

        {/* Post */}
        <div className="lg:w-2/12 flex items-baseline gap-2 md:pr-2">
          <p className="lg:hidden text-sm font-medium">Post: </p>
          <p className="text-sm text-muted-foreground truncate">
            {item.post?.title || "Post não encontrado"}
          </p>
        </div>

        {/* Rating */}
        <div className="lg:w-1/12 flex items-baseline gap-2">
          <p className="lg:hidden text-sm font-medium">Rating: </p>
          {renderRating()}
        </div>

        {/* Status */}
        <div className="flex flex-col lg:w-2/12">
          <p className="text-xs text-muted-foreground lg:hidden">Status</p>
          {getStatusComponent()}
        </div>

        {/* Ações */}
        <div className="absolute top-2 right-2 lg:static lg:w-2/12 flex justify-end">
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

              {can(`update_${entity.ability}`) && (
                <>
                  {item.status !== 'published' && (
                    <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                      <ConfirmDialog
                        title={`Aprovar comentário?`}
                        description={`Ao prosseguir, o comentário será aprovado e ficará visível no post.`}
                        onConfirm={() => handleModeration("approve")}
                        titleBttn="Aprovar"
                        iconBttn="check"
                      />
                    </DropdownMenuItem>
                  )}

                  {item.status !== 'hidden' && (
                    <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                      <ConfirmDialog
                        title={`Desaprovar comentário?`}
                        description={`Ao prosseguir, o comentário será desaprovado e ficará oculto no post.`}
                        onConfirm={() => handleModeration("disapprove")}
                        titleBttn="Desaprovar"
                        iconBttn="eye-off"
                      />
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
};

export default ComentarioItem;
