import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { useBackToList } from "@/hooks/use-back-to-list";
import { PLACES_ABILITY, PLACES_KEY, PlaceList, placesApi } from "../-shared/places";
import PlaceForm from "./-components/PlaceForm";

export const Route = createFileRoute("/_authenticated/rh/_locais/locais_/$placeId")({
  component: EditPlace,
});

/** Edição de um local da empresa, em tela cheia (o local vem da mesma lista da tela de locais). */
function EditPlace() {
  const { can } = useVerify();
  const { placeId } = Route.useParams();
  const back = useBackToList("/rh/locais");
  const { data, isLoading, isError } = useQuery({
    queryKey: [PLACES_KEY, "edit", placeId],
    queryFn: () => placesApi.get<PlaceList>(),
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
  });
  const place = data?.rows.find((row) => String(row.id) === placeId);
  if (!can(`update_${PLACES_ABILITY}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/rh/locais" backLabel="Locais" title={place ? place.name : "Local"} description="Altere os dados do local." />
      {isLoading ? <FormPageSkeleton />
        : isError || !data || !place ? <EmptyState icon="search-x" title="Local não encontrado." />
          : <PlaceForm key={place.id} place={place} options={data} close={back} />}
    </>
  );
}
