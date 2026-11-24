import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { useBackToList } from "@/hooks/use-back-to-list";
import { ALLOCATION_ABILITY, ALLOCATION_KEY } from "../-shared/allocation";
import { Activity, ActivityForm, activitiesApi } from "../-shared/activities";
import { useActivityEmployees } from "./-components/useActivityEmployees";

export const Route = createFileRoute("/_authenticated/rh/_alocacao/mapa-de-alocacao_/atividades/$activityId")({
  component: EditActivity,
});

/** Uma atividade fora de OS, em tela cheia: quem pode alterar edita; quem só vê o mapa consulta. */
function EditActivity() {
  const { can } = useVerify();
  const { activityId } = Route.useParams();
  const back = useBackToList("/rh/mapa-de-alocacao");
  const { data: employees } = useActivityEmployees();
  const { data, isLoading, isError } = useQuery({
    queryKey: [ALLOCATION_KEY, "activity", activityId],
    queryFn: () => activitiesApi.get<Activity>(activityId),
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
  });
  if (!can(`view_${ALLOCATION_ABILITY}`)) return null;
  const canWrite = can(`update_${ALLOCATION_ABILITY}`);
  return (
    <>
      <FormPageHeader backTo="/rh/mapa-de-alocacao" backLabel="Mapa de alocação" title={data ? data.typeName : "Atividade"}
        description={canWrite ? "Altere a atividade ou cancele-a." : "Os dados da atividade."} />
      {isLoading || !employees ? <FormPageSkeleton />
        : isError || !data ? <EmptyState icon="search-x" title="Atividade não encontrada." />
          : <ActivityForm key={data.id} activity={data} employees={employees} canWrite={canWrite} close={back} />}
    </>
  );
}
