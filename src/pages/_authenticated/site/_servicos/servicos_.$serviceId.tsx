import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { useBackToList } from "@/hooks/use-back-to-list";
import Form from "./-components/SiteServicesForm";
import { siteServicesEntity } from "./-interfaces/entity.interface";
import { IEntity } from "./-interfaces/entity.interface";

export const Route = createFileRoute("/_authenticated/site/_servicos/servicos_/$serviceId")({
  component: EditService,
});

/** Edição de um serviço do site, em tela cheia. */
function EditService() {
  const { can } = useVerify();
  const { serviceId } = Route.useParams();
  const back = useBackToList("/site/servicos");
  const { data, isLoading, isError } = useQuery<IEntity | undefined>({
    queryKey: ["siteService", serviceId],
    queryFn: () => get<IEntity>(siteServicesEntity.model, serviceId),
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
  });
  if (!can(`update_${siteServicesEntity.ability}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/site/servicos" backLabel="Serviços do Site" title={data ? `Editar ${data.name}` : "Editar serviço"}
        description="Atenção: as alterações mudam o serviço no site." />
      {isLoading ? <FormPageSkeleton />
        : isError || !data ? <EmptyState icon="search-x" title="Serviço não encontrado." />
          : <Form key={data.id} formData={data} close={back} />}
    </>
  );
}
