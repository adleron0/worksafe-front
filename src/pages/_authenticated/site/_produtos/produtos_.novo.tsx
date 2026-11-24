import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader } from "@/components/general-components/FormPage";
import { useBackToList } from "@/hooks/use-back-to-list";
import Form from "./-components/SiteProductsForm";
import { siteProductsEntity } from "./-interfaces/entity.interface";

export const Route = createFileRoute("/_authenticated/site/_produtos/produtos_/novo")({
  component: NewProduct,
});

/** Novo produto da loja do site, em tela cheia. */
function NewProduct() {
  const { can } = useVerify();
  const back = useBackToList("/site/produtos");
  if (!can(`create_${siteProductsEntity.ability}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/site/produtos" backLabel="Produtos do Site" title="Novo produto"
        description="Preencha com atenção todas as informações necessárias para cadastrar o produto." />
      <Form close={back} />
    </>
  );
}
