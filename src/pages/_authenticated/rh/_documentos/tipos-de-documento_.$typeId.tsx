import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { useBackToList } from "@/hooks/use-back-to-list";
import { DOCS_ABILITY, DOC_TYPES_KEY, DocTypes, documentsApi } from "../-shared/documents";
import DocumentTypeForm from "./-components/DocumentTypeForm";

export const Route = createFileRoute("/_authenticated/rh/_documentos/tipos-de-documento_/$typeId")({
  component: EditDocumentType,
});

/** Edição de um tipo de documento, em tela cheia (o tipo vem da mesma lista da tela de tipos). */
function EditDocumentType() {
  const { can } = useVerify();
  const { typeId } = Route.useParams();
  const back = useBackToList("/rh/tipos-de-documento");
  const { data, isLoading, isError } = useQuery({
    queryKey: [DOC_TYPES_KEY, "edit", typeId],
    queryFn: () => documentsApi.get<DocTypes>("types"),
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
  });
  const type = data?.rows.find((row) => String(row.id) === typeId);
  if (!can(`update_${DOCS_ABILITY}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/rh/tipos-de-documento" backLabel="Tipos de documento" title={type ? type.name : "Tipo de documento"}
        description="Altere as regras do tipo de documento." />
      {isLoading ? <FormPageSkeleton />
        : isError || !data || !type ? <EmptyState icon="search-x" title="Tipo de documento não encontrado." />
          : <DocumentTypeForm key={type.id} type={type} options={data} close={back} />}
    </>
  );
}
