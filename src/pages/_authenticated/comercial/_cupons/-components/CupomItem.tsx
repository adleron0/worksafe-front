import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/kibo-ui/status";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { ICupom } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ItemsProps {
  item: ICupom;
  index: number;
  entity: IDefaultEntity;
  setFormData: (data: ICupom) => void;
  setOpenForm: (open: boolean) => void;
}

const CupomItem = ({ item, index, entity, setFormData, setOpenForm }: ItemsProps) => {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  const activateMutation = useMutation({
    mutationFn: async (id: number) => {
      showLoader(`Ativando ${entity.name}...`);
      return patch<ICupom>(entity.model, `active/${id}`);
    },
    onSuccess: () => {
      hideLoader();
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      toast({
        title: `${entity.name} ativado`,
        description: `${entity.name} foi ativado com sucesso.`,
      });
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: "Erro ao ativar",
        description: error?.response?.data?.message || "Ocorreu um erro ao ativar.",
        variant: "destructive",
      });
    },
  });

  const inactivateMutation = useMutation({
    mutationFn: async (id: number) => {
      showLoader(`Inativando ${entity.name}...`);
      return patch<ICupom>(entity.model, `inactive/${id}`);
    },
    onSuccess: () => {
      hideLoader();
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      toast({
        title: `${entity.name} inativado`,
        description: `${entity.name} foi inativado com sucesso.`,
      });
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: "Erro ao inativar",
        description: error?.response?.data?.message || "Ocorreu um erro ao inativar.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    setFormData(item);
    setOpenForm(true);
  };

  const formatDiscount = () => {
    if (item.discountType === 'percentage') {
      return `${item.discountValue}%`;
    }
    return `R$ ${item.discountValue.toFixed(2).replace('.', ',')}`;
  };

  const formatUsage = () => {
    const actualUsage = item._count?.financialRecords || 0;
    if (item.usageLimit) {
      return `${actualUsage}/${item.usageLimit}`;
    }
    return `${actualUsage}/∞`;
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return 'Sem prazo';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const isExpired = () => {
    if (!item.validUntil) return false;
    const validDate = typeof item.validUntil === 'string' ? new Date(item.validUntil) : item.validUntil;
    return validDate < new Date();
  };

  return (
    <>
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg font-semibold text-sm text-inverse-foreground">
          <p className="lg:w-3/12">Cupom</p>
          <p className="lg:w-2/12">Desconto</p>
          <p className="lg:w-3/12">Vendedor</p>
          <p className="lg:w-1/12">Uso</p>
          <p className="lg:w-2/12">Validade</p>
          <p className="lg:w-1/12">Status</p>
          <p className="lg:w-1/12 text-center">Ações</p>
        </div>
      )}

      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        <div className="flex flex-col lg:w-3/12">
          <p className="text-xs text-muted-foreground lg:hidden">Cupom</p>
          <p className="font-semibold text-primary">{item.code}</p>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
          )}
          {(item.course || item.class) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.course?.name}{item.class ? ` - ${item.class.name}` : ''}
            </p>
          )}
        </div>

        <div className="flex flex-col lg:w-2/12">
          <p className="text-xs text-muted-foreground lg:hidden">Desconto</p>
          <p className="font-medium">{formatDiscount()}</p>
          {item.minPurchaseValue && (
            <p className="text-xs text-muted-foreground">
              Mín: R$ {item.minPurchaseValue.toFixed(2).replace('.', ',')}
            </p>
          )}
        </div>

        <div className="flex flex-col lg:w-3/12">
          <p className="text-xs text-muted-foreground lg:hidden">Vendedor</p>
          {item.seller ? (
            <div>
              <p className="text-sm font-medium">{item.seller.name}</p>
              {item.commissionType && item.commissionValue && (
                <p className="text-xs text-muted-foreground">
                  Comissão: {item.commissionType === 'percentage' ? `${item.commissionValue}%` : `R$ ${item.commissionValue.toFixed(2).replace('.', ',')}`}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">-</p>
          )}
        </div>

        <div className="flex flex-col lg:w-1/12">
          <p className="text-xs text-muted-foreground lg:hidden">Uso</p>
          <p className="text-sm">{formatUsage()}</p>
        </div>

        <div className="flex flex-col lg:w-2/12">
          <p className="text-xs text-muted-foreground lg:hidden">Validade</p>
          <p className={`text-sm ${isExpired() ? 'text-destructive' : ''}`}>
            {formatDate(item.validUntil)}
          </p>
        </div>

        <div className="flex flex-col lg:w-1/12">
          <p className="text-xs text-muted-foreground lg:hidden">Status</p>
          <Status status={item.active ? "online" : "offline"} className="w-fit">
            <StatusIndicator />
            <StatusLabel>
              {item.active ? 'Ativo' : 'Inativo'}
            </StatusLabel>
          </Status>
        </div>

        <div className="absolute top-2 right-2 lg:static lg:w-1/12">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-8 w-8 rounded-full p-0 text-gray-700 cursor-pointer"
                variant="outline"
                size="sm">
                <Icon name="ellipsis-vertical" className="text-foreground dark:text-primary w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {can(`update_${entity.ability}`) && (
                <DropdownMenuItem onClick={handleEdit}>
                  <Icon name="edit" className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              {item.active ? (
                can(`inactive_${entity.ability}`) && (
                  <ConfirmDialog
                    title="Inativar cupom"
                    description={`Tem certeza que deseja inativar o cupom ${item.code}?`}
                    onConfirm={() => inactivateMutation.mutate(item.id)}
                  >
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Icon name="x-circle" className="mr-2 h-4 w-4" />
                      Inativar
                    </DropdownMenuItem>
                  </ConfirmDialog>
                )
              ) : (
                can(`activate_${entity.ability}`) && (
                  <ConfirmDialog
                    title="Ativar cupom"
                    description={`Tem certeza que deseja ativar o cupom ${item.code}?`}
                    onConfirm={() => activateMutation.mutate(item.id)}
                  >
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Icon name="check-circle" className="mr-2 h-4 w-4" />
                      Ativar
                    </DropdownMenuItem>
                  </ConfirmDialog>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
};

export default CupomItem;