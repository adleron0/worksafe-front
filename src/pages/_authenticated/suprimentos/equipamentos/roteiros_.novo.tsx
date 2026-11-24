import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader } from "@/components/general-components/FormPage";
import { useBackToList } from "@/hooks/use-back-to-list";
import { PERM_INSPECT } from "../-shared/equipment";
import TemplateForm from "./-TemplateForm";

export const Route = createFileRoute("/_authenticated/suprimentos/equipamentos/roteiros_/novo")({
  component: NewTemplate,
});

/** Novo roteiro de inspeção. */
function NewTemplate() {
  const { can } = useVerify();
  const back = useBackToList("/suprimentos/equipamentos/roteiros");
  if (!can(PERM_INSPECT)) return null;
  return (
    <>
      <FormPageHeader backTo="/suprimentos/equipamentos/roteiros" backLabel="Roteiros de inspeção" title="Novo roteiro de inspeção"
        description="As perguntas que o inspetor responde num tipo de equipamento." />
      <TemplateForm close={back} />
    </>
  );
}
