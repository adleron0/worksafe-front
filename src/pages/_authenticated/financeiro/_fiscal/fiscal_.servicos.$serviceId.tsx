import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { useServiceCodes } from "../_notas/-shared/fiscal";
import ServiceCodeForm from "./-components/ServiceCodeForm";

export const Route = createFileRoute("/_authenticated/financeiro/_fiscal/fiscal_/servicos/$serviceId")({
  component: EditServiceCode,
});

function EditServiceCode() {
  const { can } = useVerify();
  const { serviceId } = Route.useParams();
  const { data, isLoading } = useServiceCodes(true);
  const service = data?.find((s) => String(s.id) === serviceId) ?? null;
  if (!can("config_fiscal")) return null;
  return (
    <>
      <FormPageHeader backTo="/financeiro/fiscal" backLabel="Configuração fiscal" title={service?.name ?? "Serviço fiscal"} description="O que vai no campo serviço da nota." />
      {isLoading && <FormPageSkeleton />}
      {!isLoading && !service && <p className="text-destructive">Serviço fiscal não encontrado.</p>}
      {service && <ServiceCodeForm key={service.id} service={service} />}
    </>
  );
}
