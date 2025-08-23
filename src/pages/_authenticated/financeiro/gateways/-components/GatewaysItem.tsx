import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
// Componentes UI
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
// Interfaces
import { ICompanyGateway } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ItemsProps {
  item: ICompanyGateway;
  index: number;
  entity: IDefaultEntity;
  setFormData: (data: ICompanyGateway) => void;
  setOpenForm: (open: boolean) => void;
}

const GatewaysItem = ({ item, index, entity, setFormData, setOpenForm }: ItemsProps) => {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  // Mutation para ativar/inativar
  const toggleActiveMutation = useMutation({
    mutationFn: async (active: boolean) => {
      const action = active ? 'activate' : 'inactive';
      return patch(`${entity.model}/${item.id}`, action);
    },
    onSuccess: (_, active) => {
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      toast({
        title: "Sucesso!",
        description: `${entity.name} ${active ? 'ativado' : 'inativado'} com sucesso.`,
        variant: "success",
      });
      hideLoader();
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: "Erro!",
        description: error?.response?.data?.message || "Erro ao alterar status.",
        variant: "destructive",
      });
    },
  });

  const handleToggleActive = (active: boolean) => {
    showLoader('Processando...');
    toggleActiveMutation.mutate(active);
  };

  const handleEdit = () => {
    setFormData(item);
    setOpenForm(true);
  };

  // Função para formatar o nome do gateway
  const getGatewayDisplayName = (gateway: string) => {
    const names: Record<string, string> = {
      stripe: 'Stripe',
      mercadopago: 'Mercado Pago',
      pagarme: 'PagarMe',
      asaas: 'Asaas',
      other: 'Outro'
    };
    return names[gateway] || gateway;
  };

  // Função para obter cor do badge baseado no gateway
  const getGatewayColor = (gateway: string) => {
    const colors: Record<string, string> = {
      stripe: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      mercadopago: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      pagarme: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      asaas: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return colors[gateway] || colors.other;
  };

  return (
    <>
      {/* Header apenas no primeiro item */}
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg font-semibold text-sm text-inverse-foreground">
          <div className="w-4/12">Gateway</div>
          <div className="w-3/12">Status</div>
          <div className="w-4/12">Criado em</div>
          <div className="w-1/12 text-center">Ações</div>
        </div>
      )}

      {/* Conteúdo do item */}
      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        {/* Gateway */}
        <div className="lg:w-4/12">
          <span className="text-xs text-muted-foreground lg:hidden">Gateway: </span>
          <Badge className={getGatewayColor(item.gateway)}>
            {getGatewayDisplayName(item.gateway)}
          </Badge>
        </div>

        {/* Status */}
        <div className="lg:w-3/12">
          <span className="text-xs text-muted-foreground lg:hidden">Status: </span>
          <Badge variant={item.active ? "success" : "secondary"}>
            {item.active ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>

        {/* Data de criação */}
        <div className="lg:w-4/12">
          <span className="text-xs text-muted-foreground lg:hidden">Criado em: </span>
          <span className="text-sm">
            {format(new Date(item.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>

        {/* Ações */}
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
                <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                  <Icon name="edit" className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              
              {can(`inactive_${entity.ability}`) && item.active && (
                <ConfirmDialog
                  title="Inativar Gateway"
                  description={`Tem certeza que deseja inativar o gateway ${getGatewayDisplayName(item.gateway)}? Isso impedirá o processamento de novos pagamentos.`}
                  onConfirm={() => handleToggleActive(false)}
                >
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                    <Icon name="ban" className="mr-2 h-4 w-4" />
                    Inativar
                  </DropdownMenuItem>
                </ConfirmDialog>
              )}
              
              {can(`activate_${entity.ability}`) && !item.active && (
                <ConfirmDialog
                  title="Ativar Gateway"
                  description={`Tem certeza que deseja ativar o gateway ${getGatewayDisplayName(item.gateway)}? Isso permitirá o processamento de pagamentos.`}
                  onConfirm={() => handleToggleActive(true)}
                >
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                    <Icon name="check-circle" className="mr-2 h-4 w-4" />
                    Ativar
                  </DropdownMenuItem>
                </ConfirmDialog>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
};

export default GatewaysItem;