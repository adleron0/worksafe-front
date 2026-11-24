import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { useBackToList } from "@/hooks/use-back-to-list";
import { PLACES_ABILITY, usePlaces } from "../-shared/places";
import PlaceForm from "./-components/PlaceForm";

export const Route = createFileRoute("/_authenticated/rh/_locais/locais_/novo")({
  component: NewPlace,
});

/** Novo local da empresa. */
function NewPlace() {
  const { can } = useVerify();
  const back = useBackToList("/rh/locais");
  const { data } = usePlaces();
  if (!can(`update_${PLACES_ABILITY}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/rh/locais" backLabel="Locais" title="Novo local"
        description="Centro de treinamento, base temporária ou outro ponto da empresa. É o que o mapa de alocação mostra." />
      {!data ? <FormPageSkeleton /> : <PlaceForm options={data} close={back} />}
    </>
  );
}
