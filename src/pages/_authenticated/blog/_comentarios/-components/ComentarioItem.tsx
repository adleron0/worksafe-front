import useVerify from "@/hooks/use-verify";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    mutationFn: (status: 'published' | 'rejected') => {
      showLoader(`${status === 'published' ? 'Aprovando' : 'Rejeitando'} ${entity.name}...`);
      return patch(`${entity.model}/${item.id}`, '', { status });
    },
    onSuccess: (_, status) => {
      hideLoader();
      toast({
        title: `${entity.name} ${status === 'published' ? 'aprovado' : 'rejeitado'}!`,
        description: `${entity.name} ${status === 'published' ? 'aprovado' : 'rejeitado'} com sucesso.`,
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

  const handleModeration = (status: 'published' | 'rejected') => {
    updateStatus(status);
  };

  const getStatusBadge = () => {
    switch (item.status) {
      case 'published':
        return <Badge className="bg-green-500">Aprovado</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{item.status}</Badge>;
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "";
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const renderRating = () => {
    if (!item.rating) return <span className="text-muted-foreground text-sm">Sem rating</span>;

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            name="star"
            className={`w-4 h-4 ${star <= item.rating! ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
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

        {/* Conteúdo */}
        <div className="w-full lg:w-3/12 flex flex-col md:pr-2">
          <p className="text-sm line-clamp-2">{item.content}</p>
          <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
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
          {getStatusBadge()}
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

              {item.status === 'pending' && (
                <>
                  {can(`update_${entity.ability}`) && (
                    <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                      <ConfirmDialog
                        title={`Aprovar comentário?`}
                        description={`Ao prosseguir, o comentário será aprovado e ficará visível no post.`}
                        onConfirm={() => handleModeration("published")}
                        titleBttn="Aprovar"
                        iconBttn="check"
                      />
                    </DropdownMenuItem>
                  )}

                  {can(`update_${entity.ability}`) && (
                    <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                      <ConfirmDialog
                        title={`Rejeitar comentário?`}
                        description={`Ao prosseguir, o comentário será rejeitado e não ficará visível no post.`}
                        onConfirm={() => handleModeration("rejected")}
                        titleBttn="Rejeitar"
                        iconBttn="x"
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
