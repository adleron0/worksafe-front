import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/general-components/Icon";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import { ICompanyGateway } from "../-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

interface GatewayInfo {
  id: string;
  name: string;
  description: string;
  signupUrl: string;
  logo: React.ReactNode;
}

interface GatewayCardProps {
  gatewayInfo: GatewayInfo;
  gatewayData?: ICompanyGateway;
  onActivate: () => void;
  onEdit: () => void;
  entity: any;
}

const GatewayCard: React.FC<GatewayCardProps> = ({
  gatewayInfo,
  gatewayData,
  onActivate,
  onEdit,
  entity,
}) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const isConnected = !!gatewayData;
  const isActive = gatewayData?.active || false;

  // Mutation para inativar
  const { mutate: deactivate } = useMutation({
    mutationFn: (id: number) => {
      showLoader(`Inativando ${gatewayInfo.name}...`);
      return patch<ICompanyGateway>(`${entity.model}/inactive`, id.toString());
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${gatewayInfo.name} inativado!`,
        description: `Gateway inativado com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({
        title: `Erro ao inativar ${gatewayInfo.name}`,
        description:
          error instanceof Error
            ? error.message
            : typeof error === "object" && error !== null && "response" in error
              ? (error as ApiError).response?.data?.message ||
                `Erro ao inativar gateway`
              : `Erro ao inativar gateway`,
        variant: "destructive",
      });
    },
  });

  // Mutation para ativar
  const { mutate: activate } = useMutation({
    mutationFn: (id: number) => {
      showLoader(`Ativando ${gatewayInfo.name}...`);
      return patch<ICompanyGateway>(`${entity.model}/active`, id.toString());
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${gatewayInfo.name} reativado!`,
        description: `O gateway foi reativado com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({
        title: `Erro ao reativar ${gatewayInfo.name}`,
        description:
          error instanceof Error
            ? error.message
            : typeof error === "object" && error !== null && "response" in error
              ? (error as ApiError).response?.data?.message ||
                `Erro ao reativar gateway`
              : `Erro ao reativar gateway`,
        variant: "destructive",
      });
    },
  });

  const handleToggle = (checked: boolean) => {
    if (!isConnected && checked) {
      // Se não está conectado e tenta ativar, abre o modal de configuração
      onActivate();
    }
  };

  const handleConfirmAction = (actionType: "activate" | "deactivate") => {
    if (!gatewayData?.id) return;

    if (actionType === "activate") {
      activate(gatewayData.id);
    } else {
      deactivate(gatewayData.id);
    }
  };

  return (
    <Card className="relative hover:shadow-lg transition-shadow duration-200 h-full min-h-[220px]">
      <CardContent className="p-6 h-full flex flex-col">
        {/* Header com Logo e Controles */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-shrink-0">{gatewayInfo.logo}</div>

          <div className="flex items-center gap-2">
            {isConnected && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="h-8 w-8"
              >
                <Icon name="edit" className="h-4 w-4" />
              </Button>
            )}

            {/* Switch - sempre visível */}
            {!isConnected ? (
              <Switch checked={false} onCheckedChange={handleToggle} />
            ) : isActive ? (
              <ConfirmDialog
                title="Desativar Gateway"
                description={`Tem certeza que deseja desativar o ${gatewayInfo.name}? Isso impedirá o processamento de novos pagamentos.`}
                onConfirm={() => handleConfirmAction("deactivate")}
              >
                <div className="cursor-pointer">
                  <Switch checked={true} onCheckedChange={() => {}} />
                </div>
              </ConfirmDialog>
            ) : (
              <ConfirmDialog
                title="Ativar Gateway"
                description={`Tem certeza que deseja ativar o ${gatewayInfo.name}? Isso permitirá o processamento de pagamentos.`}
                onConfirm={() => handleConfirmAction("activate")}
              >
                <div className="cursor-pointer">
                  <Switch checked={false} onCheckedChange={() => {}} />
                </div>
              </ConfirmDialog>
            )}
          </div>
        </div>

        {/* Informações do Gateway */}
        <div className="space-y-3 flex-1 flex flex-col">
          <div>
            <h3 className="font-semibold text-lg mb-2">{gatewayInfo.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {gatewayInfo.description}
            </p>
          </div>

          {/* Status Badge - empurrado para o fundo */}
          <div className="flex items-center justify-between mt-auto pt-4">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  isConnected
                    ? isActive
                      ? "bg-green-500"
                      : "bg-yellow-500"
                    : "bg-gray-400"
                }`}
              />
              <span className="text-xs text-muted-foreground">
                {isConnected
                  ? isActive
                    ? "Ativo"
                    : "Inativo"
                  : "Não conectado"}
              </span>
            </div>

            {!isConnected && (
              <a
                href={gatewayInfo.signupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Criar conta
                <Icon name="external-link" className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GatewayCard;
