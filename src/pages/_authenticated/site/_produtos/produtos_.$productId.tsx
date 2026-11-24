import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { useBackToList } from "@/hooks/use-back-to-list";
import Form from "./-components/SiteProductsForm";
import { siteProductsEntity } from "./-interfaces/entity.interface";
import { IEntity } from "./-interfaces/entity.interface";

export const Route = createFileRoute("/_authenticated/site/_produtos/produtos_/$productId")({
  component: EditProduct,
});

/** Edição de um produto da loja do site, em tela cheia. */
function EditProduct() {
  const { can } = useVerify();
  const { productId } = Route.useParams();
  const back = useBackToList("/site/produtos");
  const { data, isLoading, isError } = useQuery<IEntity | undefined>({
    queryKey: ["siteProduct", productId],
    queryFn: () => get<IEntity>(siteProductsEntity.model, productId),
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
  });
  if (!can(`update_${siteProductsEntity.ability}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/site/produtos" backLabel="Produtos do Site" title={data ? `Editar ${data.name}` : "Editar produto"}
        description="Atenção: as alterações mudam o produto na loja do site." />
      {isLoading ? <FormPageSkeleton />
        : isError || !data ? <EmptyState icon="search-x" title="Produto não encontrado." />
          : <Form key={data.id} formData={data} close={back} />}
    </>
  );
}
