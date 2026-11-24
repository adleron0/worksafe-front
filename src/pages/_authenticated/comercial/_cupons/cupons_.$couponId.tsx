import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import StatusBadge from "@/components/general-components/StatusBadge";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { useBackToList } from "@/hooks/use-back-to-list";
import CupomForm from "./-components/CupomForm";
import { cupomEntity } from "./-interfaces/entity.interface";
import { ICupom } from "./-interfaces/entity.interface";

export const Route = createFileRoute("/_authenticated/comercial/_cupons/cupons_/$couponId")({
  component: EditCoupon,
});

/** Edição de um cupom de desconto, em tela cheia. */
function EditCoupon() {
  const { can } = useVerify();
  const { couponId } = Route.useParams();
  const back = useBackToList("/comercial/cupons");
  const { data, isLoading, isError } = useQuery<ICupom | undefined>({
    queryKey: ["coupon", couponId],
    queryFn: () => get<ICupom>(cupomEntity.model, couponId),
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
  });
  if (!can(`update_${cupomEntity.ability}`)) return null;
  const badge = data && (data.active ? <StatusBadge tone="success">Ativo</StatusBadge> : <StatusBadge>Inativo</StatusBadge>);
  return (
    <>
      <FormPageHeader backTo="/comercial/cupons" backLabel="Cupons" title={data ? `Editar cupom ${data.code}` : "Editar cupom"}
        description="Edite os dados do cupom abaixo." badge={badge} />
      {isLoading ? <FormPageSkeleton />
        : isError || !data ? <EmptyState icon="search-x" title="Cupom não encontrado." />
          : <CupomForm key={data.id} formData={data} close={back} />}
    </>
  );
}
