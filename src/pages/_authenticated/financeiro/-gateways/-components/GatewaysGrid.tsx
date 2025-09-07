import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import GatewayCard from "./GatewayCard";
import GatewaysModal from "./GatewaysModal";
import { ICompanyGateway } from "../-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { Skeleton } from "@/components/ui/skeleton";
import asaasLogo from "./images/asaas.png";
import Icon from "@/components/general-components/Icon";

// Lista de gateways disponíveis
const AVAILABLE_GATEWAYS = [
  {
    id: "asaas",
    name: "Asaas",
    description:
      "Gateway de pagamento completo com boleto, cartão e PIX. Ideal para empresas de todos os tamanhos.",
    signupUrl: "https://www.asaas.com",
    logo: (
      <img src={asaasLogo} alt="Asaas" className="w-10 h-10 object-contain" />
    ),
  },
  // Preparado para futuros gateways
  // {
  //   id: 'stripe',
  //   name: 'Stripe',
  //   description: 'Plataforma global de pagamentos online com suporte a múltiplas moedas.',
  //   signupUrl: 'https://stripe.com',
  //   logo: <StripeLogo className="w-16 h-16" />
  // },
];

interface GatewaysGridProps {
  showHeader?: boolean;
}

const GatewaysGrid: React.FC<GatewaysGridProps> = ({ showHeader = true }) => {
  const { can } = useVerify();
  const [openModal, setOpenModal] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [formData, setFormData] = useState<ICompanyGateway | null>(null);

  const entity = {
    name: "Gateway",
    pluralName: "Gateways",
    model: "company-gateways",
    ability: "financeiro",
  };

  interface Response {
    rows: ICompanyGateway[];
    total: number;
  }

  const { data, isLoading, isError, error } = useQuery<
    Response | undefined,
    ApiError
  >({
    queryKey: [`list${entity.pluralName}`],
    queryFn: async () => {
      return get(entity.model, "", [
        { key: "show", value: ["company"] },
        { key: "order-createdAt", value: "desc" },
      ]);
    },
  });

  const handleActivate = (gatewayId: string) => {
    setSelectedGateway(gatewayId);
    setFormData(null);
    setOpenModal(true);
  };

  const handleEdit = (gateway: ICompanyGateway) => {
    setSelectedGateway(gateway.gateway);
    setFormData(gateway);
    setOpenModal(true);
  };

  const getGatewayData = (gatewayId: string): ICompanyGateway | undefined => {
    return data?.rows.find((g) => g.gateway === gatewayId);
  };

  if (!can(`view_${entity.ability}`)) return null;

  const CardSkeleton = () => (
    <div className="p-6 border rounded-lg">
      <div className="flex justify-between items-start mb-4">
        <Skeleton className="w-16 h-16 rounded" />
        <div className="flex gap-2">
          <Skeleton className="w-8 h-8 rounded" />
          <Skeleton className="w-12 h-6 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-6 w-32 mb-2" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-3/4 mb-4" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="space-y-2 py-4 px-8 rounded-md bg-muted">
          <div className="flex gap-2">
            <Icon name="wallet" className="w-6 h-6 mr-2" />
            <h2 className="text-xl font-bold">Gateways de Pagamento</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Configure e gerencie os gateways de pagamento para processar
            transações em sua plataforma..
          </p>
        </div>
      )}

      {isError && (
        <div className="w-full flex justify-center items-center font-medium text-destructive py-8 rounded border border-destructive">
          <p>
            Erro:{" "}
            {error?.response?.data?.message || "Erro ao carregar gateways"}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          AVAILABLE_GATEWAYS.map((gateway) => (
            <GatewayCard
              key={gateway.id}
              gatewayInfo={gateway}
              gatewayData={getGatewayData(gateway.id)}
              onActivate={() => handleActivate(gateway.id)}
              onEdit={() => {
                const data = getGatewayData(gateway.id);
                if (data) handleEdit(data);
              }}
              entity={entity}
            />
          ))
        )}
      </div>

      {/* Modal para formulário */}
      <GatewaysModal
        open={openModal}
        onOpenChange={setOpenModal}
        formData={formData}
        selectedGateway={selectedGateway}
        entity={entity}
      />
    </div>
  );
};

export default GatewaysGrid;
