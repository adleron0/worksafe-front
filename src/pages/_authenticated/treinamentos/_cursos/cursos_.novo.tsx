import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader } from "@/components/general-components/FormPage";
import { useBackToList } from "@/hooks/use-back-to-list";
import Form from "./-components/CoursesForm";
import { COURSE_ENTITY } from "./-entity";

export const Route = createFileRoute("/_authenticated/treinamentos/_cursos/cursos_/novo")({
  component: NewCourse,
});

/** Cadastro de curso, em tela cheia. */
function NewCourse() {
  const { can } = useVerify();
  const back = useBackToList("/treinamentos/cursos");
  if (!can(`create_${COURSE_ENTITY.ability}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/treinamentos/cursos" backLabel="Cursos" title="Novo curso"
        description="Por favor, preencha com atenção todas as informações necessárias para cadastrar o curso." />
      <Form close={back} entity={COURSE_ENTITY} />
    </>
  );
}
