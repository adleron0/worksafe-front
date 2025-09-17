// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { patch } from "@/services/api";
// import { useLoader } from "@/context/GeneralContext";
// import { toast } from "@/hooks/use-toast";
// import useVerify from "@/hooks/use-verify";
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
// import { Button } from "@/components/ui/button";
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/kibo-ui/status";
// import ConfirmDialog from "@/components/general-components/ConfirmDialog";
// import Icon from "@/components/general-components/Icon";
import ResponsiveBadge from "@/components/general-components/ResponsiveBadge";
import { IFinancialRecord } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";

interface ItemsProps {
  item: IFinancialRecord;
  index: number;
  entity: IDefaultEntity;
  setFormData: (data: IFinancialRecord) => void;
  setOpenForm: (open: boolean) => void;
}

const Item = ({ 
  item, 
  index, 
  // entity, 
  // setFormData, 
  // setOpenForm 
}: ItemsProps) => {
  // const { can } = useVerify();
  // const queryClient = useQueryClient();
  // const { showLoader, hideLoader } = useLoader();

  // const activateMutation = useMutation({
  //   mutationFn: async (id: number) => {
  //     showLoader();
  //     const response = await patch(entity.model, id.toString(), { active: true });
  //     return response;
  //   },
  //   onSuccess: () => {
  //     hideLoader();
  //     toast({
  //       title: "Sucesso",
  //       description: `${entity.name} reativada com sucesso!`,
  //       variant: "success",
  //     });
  //     queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
  //   },
  //   onError: (error: any) => {
  //     hideLoader();
  //     toast({
  //       title: "Erro",
  //       description: error.response?.data?.message || `Erro ao reativar ${entity.name}`,
  //       variant: "destructive",
  //     });
  //   },
  // });

  // const inactivateMutation = useMutation({
  //   mutationFn: async (id: number) => {
  //     showLoader();
  //     const response = await patch(entity.model, id.toString(), { active: false });
  //     return response;
  //   },
  //   onSuccess: () => {
  //     hideLoader();
  //     toast({
  //       title: "Sucesso",
  //       description: `${entity.name} inativada com sucesso!`,
  //       variant: "success",
  //     });
  //     queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
  //   },
  //   onError: (error: any) => {
  //     hideLoader();
  //     toast({
  //       title: "Erro",
  //       description: error.response?.data?.message || `Erro ao inativar ${entity.name}`,
  //       variant: "destructive",
  //     });
  //   },
  // });

  // const handleEdit = () => {
  //   setFormData(item);
  //   setOpenForm(true);
  // };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing':
        return 'processing';
      case 'waiting':
        return 'waiting';
      case 'received':
        return 'received';
      case 'declined':
        return 'declined';
      case 'chargeback':
        return 'chargeback';
      case 'cancelled':
        return 'cancelled';
      case 'overdue':
        return 'overdue';
      default:
        return 'processing';
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <>
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg font-semibold text-sm text-inverse-foreground">
          <div className="lg:w-3/12">Cliente/Aluno</div>
          <div className="lg:w-2/12">Valor</div>
          <div className="lg:w-2/12">Datas</div>
          <div className="lg:w-2/12">Status</div>
          <div className="lg:w-2/12">Descrição</div>
          {/* <div className="lg:w-1/12">Ações</div> */}
        </div>
      )}

      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        {/* Badge Gateway flutuante */}
        <div className="absolute -top-1 left-4 right-14 lg:right-auto lg:left-4">
          <div className="flex items-center gap-2">
            <ResponsiveBadge
              icon="credit-card"
              text={item.gateway.toUpperCase()}
              colorClass="text-inverse-foreground bg-primary"
              iconClassName="w-3 h-3"
            />
          </div>
        </div>
        
        {/* Avatar e Nome */}
        <div className="flex flex-col lg:w-3/12">
          <p className="text-xs text-muted-foreground lg:hidden">Cliente/Aluno</p>
          <p className="font-medium">
            {item.trainee?.name || item.subscription?.name || item.customer?.name || '-'}
          </p>
          {(item.trainee?.email || item.subscription?.email || item.customer?.email) && (
            <p className="text-xs text-muted-foreground">
              {item.trainee?.email || item.subscription?.email || item.customer?.email}
            </p>
          )}
        </div>

        {/* Valor */}
        <div className="flex flex-col lg:w-2/12">
          <p className="text-xs text-muted-foreground lg:hidden">Valor</p>
          <p className="font-medium">{formatCurrency(item.value)}</p>
          {item.originalValue && Number(item.originalValue) !== Number(item.value) && (
            <p className="text-xs text-muted-foreground">
              Original: {formatCurrency(Number(item.originalValue))}
            </p>
          )}
          {item.discount && Number(item.discount) > 0 && (
            <p className="text-xs text-muted-foreground">
              Desconto: -{formatCurrency(Number(item.discount))}
            </p>
          )}
          {item.commissionValue && Number(item.commissionValue) > 0 && (
            <p className="text-xs text-muted-foreground">
              Comissão: {formatCurrency(Number(item.commissionValue))} ({item.commissionPercentage}%)
            </p>
          )}
        </div>

        {/* Datas */}
        <div className="flex flex-col lg:w-2/12">
          <p className="text-xs text-muted-foreground lg:hidden">Datas</p>
          <div className="space-y-1">
            <p className="font-medium text-sm">
              <span className="text-xs text-muted-foreground">Venc:</span> {formatDate(item.dueDate)}
            </p>
            {item.paidAt && (
              <p className="font-medium text-sm text-green-600">
                <span className="text-xs text-muted-foreground">Pago:</span> {formatDate(item.paidAt)}
              </p>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col lg:w-2/12">
          <p className="text-xs text-muted-foreground lg:hidden">Status</p>
          <Status status={getStatusColor(item.status)} className="w-fit">
            <StatusIndicator />
            <StatusLabel />
          </Status>
        </div>

        {/* Descrição */}
        <div className="flex flex-col lg:w-2/12 break-all">
          <p className="text-xs text-muted-foreground lg:hidden">Descrição</p>
          <p className="font-medium text-sm">{item.description || '-'}</p>
        </div>

        {/* <div className="absolute top-2 right-2 lg:static lg:w-1/12">
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
                  <Icon name="pencil" className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}

              {can(`inactive_${entity.ability}`) && !item.inactiveAt && (
                <ConfirmDialog
                  title={`Inativar ${entity.name}`}
                  description={`Tem certeza que deseja inativar esta ${entity.name}?`}
                  onConfirm={() => inactivateMutation.mutate(item.id)}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Icon name="x" className="mr-2 h-4 w-4" />
                      Inativar
                    </DropdownMenuItem>
                  }
                />
              )}

              {can(`activate_${entity.ability}`) && item.inactiveAt && (
                <ConfirmDialog
                  title={`Reativar ${entity.name}`}
                  description={`Tem certeza que deseja reativar esta ${entity.name}?`}
                  onConfirm={() => activateMutation.mutate(item.id)}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Icon name="check" className="mr-2 h-4 w-4" />
                      Reativar
                    </DropdownMenuItem>
                  }
                />
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div> */}
      </div>
    </>
  );
};

export default Item;