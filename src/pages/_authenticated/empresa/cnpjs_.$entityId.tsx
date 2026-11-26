import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader } from "@/components/general-components/FormPage";
import TagBadge from "@/components/general-components/TagBadge";
import { CompanyEntity, ENTITIES_KEY, formatCnpj } from "@/components/general-components/EntitySelect";
import { Skeleton } from "@/components/ui/skeleton";
import EntityForm from "./-components/EntityForm";

export const Route = createFileRoute("/_authenticated/empresa/cnpjs_/$entityId")({
  component: EditEntity,
});

function EditEntity() {
  const { can } = useVerify();
  const { entityId } = Route.useParams();
  const { data } = useQuery({
    queryKey: [ENTITIES_KEY, "one", entityId],
    queryFn: async () => (await api.get<CompanyEntity>(`company-entities/${entityId}`)).data,
  });
  if (!can("config_empresas_grupo")) return null;
  return (
    <>
      <FormPageHeader backTo="/empresa/cnpjs" backLabel="Empresas do grupo" title={data?.tradeName ?? "CNPJ"}
        description={data ? formatCnpj(data.cnpj) : undefined} badge={data?.isDefault ? <TagBadge icon="star">padrão</TagBadge> : undefined} />
      {data ? <EntityForm entity={data} /> : <Skeleton className="h-96 w-full" />}
    </>
  );
}
