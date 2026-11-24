import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { useBackToList } from "@/hooks/use-back-to-list";
import { DOCS_ABILITY, DOC_TYPES_KEY, DocTypes, documentsApi } from "../-shared/documents";
import DocumentTypeForm from "./-components/DocumentTypeForm";

export const Route = createFileRoute("/_authenticated/rh/_documentos/tipos-de-documento_/novo")({
  component: NewDocumentType,
});

/** Novo tipo de documento do funcionário. */
function NewDocumentType() {
  const { can } = useVerify();
  const back = useBackToList("/rh/tipos-de-documento");
  const { data } = useQuery({ queryKey: [DOC_TYPES_KEY], queryFn: () => documentsApi.get<DocTypes>("types") });
  if (!can(`update_${DOCS_ABILITY}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/rh/tipos-de-documento" backLabel="Tipos de documento" title="Novo tipo de documento"
        description="O que o funcionário pode ter na pasta: se vence, quando avisar e se é obrigatório." />
      {!data ? <FormPageSkeleton /> : <DocumentTypeForm options={data} close={back} />}
    </>
  );
}
