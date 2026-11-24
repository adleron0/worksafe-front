import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { useBackToList } from "@/hooks/use-back-to-list";
import SubscriptionForm from "./-components/SubscriptionForm";
import { SUBSCRIPTION_ENTITY } from "./-entity";
import { IEntity } from "./-interfaces/entity.interface";

export const Route = createFileRoute("/_authenticated/treinamentos/_inscricoes/inscricoes_/$subscriptionId")({
  component: EditSubscription,
});

/** Edição de inscrição, em tela cheia. */
function EditSubscription() {
  const { can } = useVerify();
  const { subscriptionId } = Route.useParams();
  const back = useBackToList("/treinamentos/inscricoes");
  const { data, isLoading, isError } = useQuery<IEntity | undefined>({
    queryKey: ["subscription", subscriptionId],
    queryFn: () => get<IEntity>(SUBSCRIPTION_ENTITY.model, subscriptionId),
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
  });
  if (!can(`update_${SUBSCRIPTION_ENTITY.ability}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/treinamentos/inscricoes" backLabel="Inscrições" title={data ? `Editar inscrição de ${data.name}` : "Editar inscrição"}
        description={data ? `Atenção com a ação a seguir, ela irá alterar os dados da inscrição ${data.name}.` : undefined} />
      {isLoading ? <FormPageSkeleton />
        : isError || !data ? <EmptyState icon="search-x" title="Inscrição não encontrada." />
          : <SubscriptionForm key={data.id} layout="page" formData={data} openSheet={back} entity={SUBSCRIPTION_ENTITY} classId={Number(data.classId)} />}
    </>
  );
}
