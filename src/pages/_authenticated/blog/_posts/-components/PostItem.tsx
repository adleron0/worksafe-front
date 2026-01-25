import useVerify from "@/hooks/use-verify";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/kibo-ui/status";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import HeaderRow from "@/components/general-components/HeaderRow";
import { IPost } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { useLoader } from "@/context/GeneralContext";

interface ItemsProps {
  item: IPost;
  index: number;
  entity: IDefaultEntity;
  setFormData: (data: IPost) => void;
  setOpenForm: (open: boolean) => void;
}

const PostItem = ({ item, index, entity, setFormData, setOpenForm }: ItemsProps) => {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  const { mutate: changeStatus } = useMutation({
    mutationFn: (action: 'publish' | 'archive' | 'draft') => {
      const actionLabels = {
        publish: 'Publicando',
        archive: 'Arquivando',
        draft: 'Voltando para rascunho'
      };
      showLoader(`${actionLabels[action]} ${entity.name}...`);
      return patch(`${entity.model}/${action}/${item.id}`, '');
    },
    onSuccess: (_, action) => {
      hideLoader();
      const successLabels = {
        publish: 'publicado',
        archive: 'arquivado',
        draft: 'movido para rascunho'
      };
      toast({
        title: `${entity.name} ${successLabels[action]}!`,
        description: `${entity.name} ${successLabels[action]} com sucesso.`,
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

  const handleStatusChange = (action: 'publish' | 'archive' | 'draft') => {
    changeStatus(action);
  };

  const getStatusBadge = () => {
    switch (item.status) {
      case 'published':
        return <Badge className="bg-green-500">Publicado</Badge>;
      case 'draft':
        return <Badge variant="secondary">Rascunho</Badge>;
      case 'archived':
        return <Badge variant="outline">Arquivado</Badge>;
      default:
        return <Badge variant="secondary">{item.status}</Badge>;
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "Não publicado";
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <>
      <HeaderRow show={index === 0}>
        <div className="w-3/12">Post</div>
        <div className="w-2/12">Autor</div>
        <div className="w-2/12">Categoria</div>
        <div className="w-1/12">Destaque</div>
        <div className="w-1/12">Views</div>
        <div className="w-1/12">Status</div>
        <div className="w-2/12 text-right">Ações</div>
      </HeaderRow>

      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>

        {/* Imagem e Título */}
        <div className="w-full lg:w-3/12 flex items-center space-x-4 md:pr-2">
          {item.coverImage ? (
            <img
              src={item.coverImage}
              alt={item.title}
              className="h-16 w-24 object-cover rounded"
            />
          ) : (
            <div className="h-16 w-24 bg-muted rounded flex items-center justify-center">
              <Icon name="image" className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="break-words flex-1">
            <h2 className="text-sm font-semibold line-clamp-2">{item.title}</h2>
            <p className="text-xs text-muted-foreground">{formatDate(item.publishedAt)}</p>
          </div>
        </div>

        {/* Autor */}
        <div className="lg:w-2/12 flex items-center space-x-2 md:pr-2">
          <Avatar className="h-8 w-8 border rounded-full">
            <AvatarImage src={item.author?.imageUrl || undefined} alt={item.author?.name} />
            <AvatarFallback className="rounded-full uppercase text-xs">
              {item.author?.name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm text-muted-foreground truncate">
            {item.author?.name || "Não informado"}
          </p>
        </div>

        {/* Categoria */}
        <div className="lg:w-2/12 flex items-baseline gap-2 md:pr-2">
          <p className="lg:hidden text-sm font-medium">Categoria: </p>
          {item.category ? (
            <Badge variant="outline">{item.category.name}</Badge>
          ) : (
            <p className="text-sm text-muted-foreground">Sem categoria</p>
          )}
        </div>

        {/* Destaque */}
        <div className="lg:w-1/12 flex items-baseline gap-2">
          <p className="lg:hidden text-sm font-medium">Destaque: </p>
          {item.featured ? (
            <Icon name="star" className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          ) : (
            <Icon name="star" className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        {/* Views */}
        <div className="lg:w-1/12 flex items-baseline gap-2 md:pr-2">
          <p className="lg:hidden text-sm font-medium">Views: </p>
          <div className="flex items-center gap-1">
            <Icon name="eye" className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{item.viewCount || 0}</p>
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col lg:w-1/12">
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

              {/* Se rascunho → Publicar */}
              {item.status === 'draft' && can(`update_${entity.ability}`) && (
                <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                  <ConfirmDialog
                    title={`Publicar "${item.title}"?`}
                    description={`Ao prosseguir, o post será publicado e ficará visível no blog.`}
                    onConfirm={() => handleStatusChange("publish")}
                    titleBttn="Publicar"
                    iconBttn="send"
                  />
                </DropdownMenuItem>
              )}

              {/* Se publicado → Arquivar */}
              {item.status === 'published' && can(`update_${entity.ability}`) && (
                <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                  <ConfirmDialog
                    title={`Arquivar "${item.title}"?`}
                    description={`Ao prosseguir, o post será arquivado e não ficará mais visível no blog.`}
                    onConfirm={() => handleStatusChange("archive")}
                    titleBttn="Arquivar"
                    iconBttn="archive"
                  />
                </DropdownMenuItem>
              )}

              {/* Se arquivado → Publicar novamente */}
              {item.status === 'archived' && can(`update_${entity.ability}`) && (
                <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                  <ConfirmDialog
                    title={`Republicar "${item.title}"?`}
                    description={`Ao prosseguir, o post será publicado novamente e ficará visível no blog.`}
                    onConfirm={() => handleStatusChange("publish")}
                    titleBttn="Republicar"
                    iconBttn="refresh-cw"
                  />
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
};

export default PostItem;
