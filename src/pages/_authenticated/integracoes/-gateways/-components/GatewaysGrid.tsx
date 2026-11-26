import React from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import GatewayCard from "./GatewayCard";
import { ICompanyGateway } from "../-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { Skeleton } from "@/components/ui/skeleton";
import asaasLogo from "./images/asaas.png";
import Icon from "@/components/general-components/Icon";
import { useEntities } from "@/components/general-components/EntitySelect";

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
  const { multi, entities } = useEntities();

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
        { key: "order-createdAt", value: "desc" },
        { key: "show", value: "entity" },
      ]);
    },
  });

  /**
   * Cada CNPJ do grupo pode ter a própria conta no gateway: um cartão por conta
   * conectada e, com mais de um CNPJ, mais um cartão para conectar os que faltam.
   */
  const cardsFor = (gateway: (typeof AVAILABLE_GATEWAYS)[number]) => {
    const configs = (data?.rows ?? []).filter((g) => g.gateway === gateway.id);
    const used = new Set(configs.map((c) => c.entityId));
    const free = entities.filter((e) => !used.has(e.id));
    // conta sem CNPJ vale para o grupo todo: não dá para conectar outra
    const canAddAnother = multi && free.length > 0 && !configs.some((c) => !c.entityId);
    const cards = configs.map((config) => (
      <GatewayCard key={config.id} gatewayInfo={gateway} gatewayData={config} entity={entity} />
    ));
    if (!configs.length || canAddAnother) {
      cards.push(
        <GatewayCard key={`${gateway.id}-novo`} gatewayInfo={gateway} entity={entity}
          newEntityId={configs.length ? free[0]?.id : undefined} additional={configs.length > 0} />,
      );
    }
    return cards;
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
          AVAILABLE_GATEWAYS.flatMap(cardsFor)
        )}
      </div>
    </div>
  );
};

export default GatewaysGrid;
