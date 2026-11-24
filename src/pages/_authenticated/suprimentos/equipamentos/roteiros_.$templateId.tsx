import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import StatusBadge from "@/components/general-components/StatusBadge";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { useBackToList } from "@/hooks/use-back-to-list";
import { stockApi } from "../-shared/stock";
import { EQUIP_KEYS, PERM_INSPECT, Template } from "../-shared/equipment";
import TemplateForm from "./-TemplateForm";

export const Route = createFileRoute("/_authenticated/suprimentos/equipamentos/roteiros_/$templateId")({
  component: EditTemplate,
});

/** Edição de um roteiro de inspeção, em tela cheia (o roteiro vem da mesma lista da tela de roteiros). */
function EditTemplate() {
  const { can } = useVerify();
  const { templateId } = Route.useParams();
  const back = useBackToList("/suprimentos/equipamentos/roteiros");
  const { data, isLoading, isError } = useQuery({
    queryKey: [EQUIP_KEYS.templates, "edit", templateId],
    queryFn: () => stockApi.get<Template[]>("inspection-templates", { all: "1" }),
    select: (rows) => rows.find((row) => String(row.id) === templateId),
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
  });
  if (!can(PERM_INSPECT)) return null;
  return (
    <>
      <FormPageHeader backTo="/suprimentos/equipamentos/roteiros" backLabel="Roteiros de inspeção" title={data ? data.name : "Roteiro de inspeção"}
        description="Altere o nome e as perguntas do roteiro." badge={data && !data.active ? <StatusBadge tone="neutral">Inativo</StatusBadge> : undefined} />
      {isLoading ? <FormPageSkeleton />
        : isError || !data ? <EmptyState icon="search-x" title="Roteiro não encontrado." />
          : <TemplateForm key={data.id} template={data} close={back} />}
    </>
  );
}
