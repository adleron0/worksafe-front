import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import StatusBadge from "@/components/general-components/StatusBadge";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { useBackToList } from "@/hooks/use-back-to-list";
import Form from "./-components/InstructorsForm";
import { INSTRUCTOR_ENTITY } from "./-entity";
import { IEntity } from "./-interfaces/entity.interface";

export const Route = createFileRoute("/_authenticated/treinamentos/_instrutores/instrutores_/$instructorId")({
  component: EditInstructor,
});

/** Edição de instrutor, em tela cheia. */
function EditInstructor() {
  const { can } = useVerify();
  const { instructorId } = Route.useParams();
  const back = useBackToList("/treinamentos/instrutores");
  const { data, isLoading, isError } = useQuery<IEntity | undefined>({
    queryKey: ["instructor", instructorId],
    queryFn: () => get<IEntity>(INSTRUCTOR_ENTITY.model, instructorId),
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
  });
  if (!can(`update_${INSTRUCTOR_ENTITY.ability}`)) return null;
  const badge = data && (data.active === false ? <StatusBadge>Inativo</StatusBadge> : <StatusBadge tone="success">Ativo</StatusBadge>);
  return (
    <>
      <FormPageHeader backTo="/treinamentos/instrutores" backLabel="Instrutores" title={data ? `Editar instrutor ${data.name}` : "Editar instrutor"}
        description={data ? `Atenção com a ação a seguir, ela irá alterar os dados do instrutor ${data.name}.` : undefined} badge={badge} />
      {isLoading ? <FormPageSkeleton />
        : isError || !data ? <EmptyState icon="search-x" title="Instrutor não encontrado." />
          : <Form key={data.id} formData={data} close={back} entity={INSTRUCTOR_ENTITY} />}
    </>
  );
}
