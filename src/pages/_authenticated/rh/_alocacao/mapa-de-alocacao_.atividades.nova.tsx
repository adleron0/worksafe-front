import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { useBackToList } from "@/hooks/use-back-to-list";
import { ALLOCATION_ABILITY } from "../-shared/allocation";
import { ActivityForm } from "../-shared/activities";
import { useActivityEmployees } from "./-components/useActivityEmployees";

export const Route = createFileRoute("/_authenticated/rh/_alocacao/mapa-de-alocacao_/atividades/nova")({
  component: NewActivity,
});

/** Nova atividade fora de OS (aula, treinamento, atividade no CT...). */
function NewActivity() {
  const { can } = useVerify();
  const back = useBackToList("/rh/mapa-de-alocacao");
  const { data: employees } = useActivityEmployees();
  if (!can(`update_${ALLOCATION_ABILITY}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/rh/mapa-de-alocacao" backLabel="Mapa de alocação" title="Nova atividade"
        description="O que não é ordem de serviço: aula, treinamento, atividade no centro de treinamento, deslocamento." />
      {!employees ? <FormPageSkeleton /> : <ActivityForm employees={employees} canWrite close={back} />}
    </>
  );
}
