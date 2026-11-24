import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader } from "@/components/general-components/FormPage";
import { useBackToList } from "@/hooks/use-back-to-list";
import Form from "./-components/InstructorsForm";
import { INSTRUCTOR_ENTITY } from "./-entity";

export const Route = createFileRoute("/_authenticated/treinamentos/_instrutores/instrutores_/novo")({
  component: NewInstructor,
});

/** Cadastro de instrutor, em tela cheia. */
function NewInstructor() {
  const { can } = useVerify();
  const back = useBackToList("/treinamentos/instrutores");
  if (!can(`create_${INSTRUCTOR_ENTITY.ability}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/treinamentos/instrutores" backLabel="Instrutores" title="Novo instrutor"
        description="Por favor, preencha com atenção todas as informações necessárias para cadastrar o instrutor." />
      <Form close={back} entity={INSTRUCTOR_ENTITY} />
    </>
  );
}
