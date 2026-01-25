import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
    mutationFn: (status: 'published' | 'rejected') => {
      showLoader(`${status === 'published' ? 'Aprovando' : 'Rejeitando'} comentário...`);
      return patch(`${entity.model}/${status}`, `${formData?.id}`);
    },
    onSuccess: (_, status) => {
      hideLoader();
      toast({
        title: `Comentário ${status === 'published' ? 'aprovado' : 'rejeitado'}!`,
        description: `Comentário ${status === 'published' ? 'aprovado' : 'rejeitado'} com sucesso.`,
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

  const getStatusBadge = () => {
    switch (formData?.status) {
      case 'published':
        return <Badge className="bg-green-500">Aprovado</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{formData?.status}</Badge>;
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
          <div className="mt-2">{getStatusBadge()}</div>
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

      {/* Botões de Ação */}
      <div className="flex gap-2 pt-4 border-t">
        {formData.status === 'pending' && can(`update_${entity.ability}`) && (
          <>
            <Button
              type="button"
              className="flex-1 bg-green-500 hover:bg-green-600"
              onClick={() => updateStatus('published')}
            >
              <Icon name="check" className="w-4 h-4 mr-2" />
              Aprovar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={() => updateStatus('rejected')}
            >
              <Icon name="x" className="w-4 h-4 mr-2" />
              Rejeitar
            </Button>
          </>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => openSheet(false)}
          className={formData.status === 'pending' ? "" : "flex-1"}
        >
          Fechar
        </Button>
      </div>
    </div>
  );
};

export default ComentarioForm;
