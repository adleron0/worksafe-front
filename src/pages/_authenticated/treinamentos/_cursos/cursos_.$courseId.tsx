import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import StatusBadge from "@/components/general-components/StatusBadge";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { useBackToList } from "@/hooks/use-back-to-list";
import Form from "./-components/CoursesForm";
import { COURSE_ENTITY } from "./-entity";
import { IEntity } from "./-interfaces/entity.interface";

export const Route = createFileRoute("/_authenticated/treinamentos/_cursos/cursos_/$courseId")({
  component: EditCourse,
});

/** Edição de curso, em tela cheia. */
function EditCourse() {
  const { can } = useVerify();
  const { courseId } = Route.useParams();
  const back = useBackToList("/treinamentos/cursos");
  const { data, isLoading, isError } = useQuery<IEntity | undefined>({
    queryKey: ["course", courseId],
    queryFn: () => get<IEntity>(COURSE_ENTITY.model, courseId),
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
  });
  if (!can(`update_${COURSE_ENTITY.ability}`)) return null;
  const badge = data && (data.active === false ? <StatusBadge>Inativo</StatusBadge> : <StatusBadge tone="success">Ativo</StatusBadge>);
  return (
    <>
      <FormPageHeader backTo="/treinamentos/cursos" backLabel="Cursos" title={data ? `Editar curso ${data.name}` : "Editar curso"}
        description={data ? `Atenção com a ação a seguir, ela irá alterar os dados do curso ${data.name}.` : undefined} badge={badge} />
      {isLoading ? <FormPageSkeleton />
        : isError || !data ? <EmptyState icon="search-x" title="Curso não encontrado." />
          : <Form key={data.id} formData={data} close={back} entity={COURSE_ENTITY} />}
    </>
  );
}
