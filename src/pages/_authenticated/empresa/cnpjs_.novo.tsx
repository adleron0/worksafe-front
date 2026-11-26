import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader } from "@/components/general-components/FormPage";
import EntityForm from "./-components/EntityForm";

export const Route = createFileRoute("/_authenticated/empresa/cnpjs_/novo")({
  component: NewEntity,
});

function NewEntity() {
  const { can } = useVerify();
  if (!can("config_empresas_grupo")) return null;
  return (
    <>
      <FormPageHeader backTo="/empresa/cnpjs" backLabel="Empresas do grupo" title="Novo CNPJ" description="Digite o CNPJ: a razão social e o endereço vêm dos dados públicos." />
      <EntityForm entity={null} />
    </>
  );
}
