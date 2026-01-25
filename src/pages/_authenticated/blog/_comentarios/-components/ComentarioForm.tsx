import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/kibo-ui/status";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import useVerify from "@/hooks/use-verify";
import Icon from "@/components/general-components/Icon";
import { IComentario } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { useLoader } from "@/context/GeneralContext";

interface FormProps {
  formData?: IComentario;
  openSheet: (open: boolean) => void;
  entity: IDefaultEntity;
}

const ComentarioForm = ({ formData, openSheet, entity }: FormProps) => {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  const { mutate: updateStatus } = useMutation({
    mutationFn: (action: 'approve' | 'disapprove') => {
      showLoader(`${action === 'approve' ? 'Aprovando' : 'Desaprovando'} comentário...`);
      return patch(`${entity.model}/${action}`, `${formData?.id}`);
    },
    onSuccess: (_, action) => {
      hideLoader();
      toast({
        title: `Comentário ${action === 'approve' ? 'aprovado' : 'desaprovado'}!`,
        description: `Comentário ${action === 'approve' ? 'aprovado' : 'desaprovado'} com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      openSheet(false);
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

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "Não informado";
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getStatusComponent = () => {
    switch (formData?.status) {
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
            <StatusLabel>{formData?.status}</StatusLabel>
          </Status>
        );
    }
  };

  const renderRating = () => {
    if (!formData?.rating) return <span className="text-muted-foreground text-sm">Sem rating</span>;

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            name="star"
            className={`w-5 h-5 ${star <= formData.rating! ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
          />
        ))}
        <span className="ml-2 text-sm text-muted-foreground">({formData.rating}/5)</span>
      </div>
    );
  };

  if (!formData) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Nenhum comentário selecionado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Visitante */}
      <div className="flex items-center space-x-4">
        <Avatar className="h-12 w-12 border">
          <AvatarImage src={formData.visitor?.avatarUrl || undefined} alt={formData.visitor?.name} />
          <AvatarFallback className="uppercase">
            {formData.visitor?.name?.[0] || "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold">{formData.visitor?.name || "Anônimo"}</h2>
          <p className="text-sm text-muted-foreground">{formData.visitor?.email}</p>
        </div>
      </div>

      {/* Post relacionado */}
      <div>
        <Label className="text-muted-foreground">Post</Label>
        <p className="text-sm mt-1 font-medium">{formData.post?.title || "Post não encontrado"}</p>
      </div>

      {/* Conteúdo do comentário */}
      <div>
        <Label className="text-muted-foreground">Comentário</Label>
        <div className="mt-2 p-4 bg-muted rounded-lg">
          <p className="text-sm whitespace-pre-wrap">{formData.content}</p>
        </div>
      </div>

      {/* Rating */}
      <div>
        <Label className="text-muted-foreground">Avaliação</Label>
        <div className="mt-2">{renderRating()}</div>
      </div>

      {/* Status e Data */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-muted-foreground">Status</Label>
          <div className="mt-2">{getStatusComponent()}</div>
        </div>
        <div>
          <Label className="text-muted-foreground">Data</Label>
          <p className="text-sm mt-2">{formatDate(formData.createdAt)}</p>
        </div>
      </div>

      {/* Informações adicionais */}
      {formData.parentId && (
        <div>
          <Label className="text-muted-foreground">Resposta ao comentário</Label>
          <p className="text-sm mt-1">ID: {formData.parentId}</p>
        </div>
      )}

      {/* Respostas */}
      {formData.replies && formData.replies.length > 0 && (
        <div>
          <Label className="text-muted-foreground">Respostas ({formData.replies.length})</Label>
          <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
            {formData.replies.map((reply) => (
              <div key={reply.id} className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={reply.visitor?.avatarUrl || undefined} alt={reply.visitor?.name} />
                    <AvatarFallback className="text-xs uppercase">
                      {reply.visitor?.name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{reply.visitor?.name || "Anônimo"}</span>
                  <Badge variant="outline" className="text-xs h-5">
                    {reply.status === 'published' ? 'Aprovado' : reply.status === 'pending' ? 'Pendente' : 'Rejeitado'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{reply.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex gap-2 pt-4 border-t">
        {can(`update_${entity.ability}`) && (
          <>
            {formData.status !== 'published' && (
              <Button
                type="button"
                className="flex-1 bg-green-500 hover:bg-green-600"
                onClick={() => updateStatus('approve')}
              >
                <Icon name="check" className="w-4 h-4 mr-2" />
                Aprovar
              </Button>
            )}
            {formData.status !== 'hidden' && (
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                onClick={() => updateStatus('disapprove')}
              >
                <Icon name="eye-off" className="w-4 h-4 mr-2" />
                Desaprovar
              </Button>
            )}
          </>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => openSheet(false)}
        >
          Fechar
        </Button>
      </div>
    </div>
  );
};

export default ComentarioForm;
