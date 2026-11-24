import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import StatusBadge from "@/components/general-components/StatusBadge";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { useBackToList } from "@/hooks/use-back-to-list";
import { Location, STOCK_ABILITY, STOCK_KEYS, stockApi } from "../-shared/stock";
import LocationForm from "./-LocationForm";

export const Route = createFileRoute("/_authenticated/suprimentos/estoque/locais_/$locationId")({
  component: EditLocation,
});

/** Edição de um local de estoque, em tela cheia (o local vem da mesma lista da tela de locais). */
function EditLocation() {
  const { can } = useVerify();
  const { locationId } = Route.useParams();
  const back = useBackToList("/suprimentos/estoque/locais");
  const { data, isLoading, isError } = useQuery({
    queryKey: [STOCK_KEYS.locations, "edit", locationId],
    queryFn: () => stockApi.get<Location[]>("locations", { all: "1" }),
    select: (rows) => rows.find((row) => String(row.id) === locationId),
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
  });
  if (!can(`update_${STOCK_ABILITY}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/suprimentos/estoque/locais" backLabel="Locais de estoque" title={data ? data.name : "Local de estoque"}
        description="Altere os dados do local." badge={data && !data.active ? <StatusBadge tone="neutral">Inativo</StatusBadge> : undefined} />
      {isLoading ? <FormPageSkeleton />
        : isError || !data ? <EmptyState icon="search-x" title="Local não encontrado." />
          : <LocationForm key={data.id} location={data} close={back} />}
    </>
  );
}
