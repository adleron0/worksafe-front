import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader } from "@/components/general-components/FormPage";
import { useBackToList } from "@/hooks/use-back-to-list";
import { STOCK_ABILITY } from "../-shared/stock";
import LocationForm from "./-LocationForm";

export const Route = createFileRoute("/_authenticated/suprimentos/estoque/locais_/novo")({
  component: NewLocation,
});

/** Novo local de estoque. */
function NewLocation() {
  const { can } = useVerify();
  const back = useBackToList("/suprimentos/estoque/locais");
  if (!can(`create_${STOCK_ABILITY}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/suprimentos/estoque/locais" backLabel="Locais de estoque" title="Novo local de estoque"
        description="Onde o material fica guardado: almoxarifado, container, veículo..." />
      <LocationForm close={back} />
    </>
  );
}
