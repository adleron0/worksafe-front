import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader } from "@/components/general-components/FormPage";
import ServiceCodeForm from "./-components/ServiceCodeForm";

export const Route = createFileRoute("/_authenticated/financeiro/_fiscal/fiscal_/servicos/novo")({
  component: NewServiceCode,
});

function NewServiceCode() {
  const { can } = useVerify();
  if (!can("config_fiscal")) return null;
  return (
    <>
      <FormPageHeader backTo="/financeiro/fiscal" backLabel="Configuração fiscal" title="Novo serviço fiscal" description="O que vai no campo serviço da nota." />
      <ServiceCodeForm service={null} />
    </>
  );
}
