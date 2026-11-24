import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader } from "@/components/general-components/FormPage";
import { useBackToList } from "@/hooks/use-back-to-list";
import CupomForm from "./-components/CupomForm";
import { cupomEntity } from "./-interfaces/entity.interface";

export const Route = createFileRoute("/_authenticated/comercial/_cupons/cupons_/novo")({
  component: NewCoupon,
});

/** Novo cupom de desconto, em tela cheia. */
function NewCoupon() {
  const { can } = useVerify();
  const back = useBackToList("/comercial/cupons");
  if (!can(`create_${cupomEntity.ability}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/comercial/cupons" backLabel="Cupons" title="Novo cupom"
        description="Preencha os dados do novo cupom." />
      <CupomForm formData={null} close={back} />
    </>
  );
}
