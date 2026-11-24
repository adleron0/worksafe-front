import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { useBackToList } from "@/hooks/use-back-to-list";
import SubscriptionForm from "./-components/SubscriptionForm";
import { SUBSCRIPTION_ENTITY } from "./-entity";

export const Route = createFileRoute("/_authenticated/treinamentos/_inscricoes/inscricoes_/nova")({
  component: NewSubscription,
  validateSearch: (search: Record<string, unknown>): { turma?: string } => (search.turma ? { turma: String(search.turma) } : {}),
});

/** Nova inscrição numa turma (?turma=ID), em tela cheia. */
function NewSubscription() {
  const { can } = useVerify();
  const { turma } = Route.useSearch();
  const back = useBackToList("/treinamentos/inscricoes");
  const { data: turmaData } = useQuery<{ id: number; name: string } | undefined>({
    queryKey: ["subscriptionClass", turma],
    queryFn: () => get<{ id: number; name: string }>("classes", String(turma)),
    enabled: Boolean(turma),
  });
  if (!can(`create_${SUBSCRIPTION_ENTITY.ability}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/treinamentos/inscricoes" backLabel="Inscrições" title="Nova inscrição"
        description={turmaData?.name ? `Turma ${turmaData.name}.` : "Por favor, preencha com atenção todas as informações necessárias para cadastrar a inscrição."} />
      {turma
        ? <SubscriptionForm layout="page" openSheet={back} entity={SUBSCRIPTION_ENTITY} classId={Number(turma)} />
        : <EmptyState icon="list-filter" title="Escolha o curso e a turma na lista de inscrições antes de cadastrar." />}
    </>
  );
}
