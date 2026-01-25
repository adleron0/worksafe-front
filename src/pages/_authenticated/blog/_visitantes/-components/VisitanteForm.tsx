import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Icon from "@/components/general-components/Icon";
import { IVisitante } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";

interface FormProps {
  formData?: IVisitante;
  openSheet: (open: boolean) => void;
  entity: IDefaultEntity;
}

const VisitanteForm = ({ formData, openSheet }: FormProps) => {
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "Não informado";
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  if (!formData) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Nenhum visitante selecionado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Avatar e Nome */}
      <div className="flex items-center space-x-4">
        <Avatar className="h-16 w-16 border">
          <AvatarImage src={formData.avatarUrl || undefined} alt={formData.name} />
          <AvatarFallback className="text-xl uppercase">
            {formData.name?.[0] || "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-lg font-semibold">{formData.name}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon name="mail" className="w-4 h-4" />
            {formData.email}
          </div>
        </div>
      </div>

      {/* Status */}
      <div>
        <Label>Status</Label>
        <div className="mt-2">
          {formData.blocked ? (
            <Badge variant="destructive" className="text-sm">
              <Icon name="ban" className="w-4 h-4 mr-1" />
              Bloqueado
            </Badge>
          ) : (
            <Badge className="bg-green-500 text-sm">
              <Icon name="check-circle" className="w-4 h-4 mr-1" />
              Ativo
            </Badge>
          )}
        </div>
      </div>

      {/* Motivo do Bloqueio */}
      {formData.blocked && formData.blockedReason && (
        <div>
          <Label>Motivo do Bloqueio</Label>
          <Textarea
            value={formData.blockedReason}
            readOnly
            className="mt-2 bg-muted"
            rows={3}
          />
        </div>
      )}

      {/* Usuário Vinculado */}
      {formData.user && (
        <div className="border-t pt-4">
          <Label className="text-muted-foreground">Usuário do Sistema Vinculado</Label>
          <div className="flex items-center space-x-3 mt-2 p-3 bg-muted/50 rounded-lg">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={formData.user.imageUrl || undefined} alt={formData.user.name} />
              <AvatarFallback className="uppercase">
                {formData.user.name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{formData.user.name}</p>
              <p className="text-xs text-muted-foreground">{formData.user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Informações adicionais */}
      <div className="space-y-4 border-t pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">Google ID</Label>
            <p className="text-sm mt-1">{formData.googleId || "Não informado"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Total de Comentários</Label>
            <p className="text-sm mt-1">{formData._count?.comments || 0}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">Criado em</Label>
            <p className="text-sm mt-1">{formatDate(formData.createdAt)}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Atualizado em</Label>
            <p className="text-sm mt-1">{formatDate(formData.updatedAt ?? undefined)}</p>
          </div>
        </div>
      </div>

      {/* Botão Fechar */}
      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => openSheet(false)}
          className="flex-1"
        >
          Fechar
        </Button>
      </div>
    </div>
  );
};

export default VisitanteForm;
