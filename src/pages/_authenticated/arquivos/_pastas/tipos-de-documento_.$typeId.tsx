import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { useBackToList } from "@/hooks/use-back-to-list";
import { FILES_ABILITY, FILES_KEY, FileType, filesApi } from "../-shared/files";
import FileTypeForm from "./-components/FileTypeForm";

export const Route = createFileRoute("/_authenticated/arquivos/_pastas/tipos-de-documento_/$typeId")({
  component: EditFileType,
});

/** Edição de um tipo de documento da empresa, em tela cheia (o tipo vem da mesma lista da tela de tipos). */
function EditFileType() {
  const { can } = useVerify();
  const { typeId } = Route.useParams();
  const back = useBackToList("/arquivos/tipos-de-documento");
  const { data, isLoading, isError } = useQuery({
    queryKey: [FILES_KEY, "types", "edit", typeId],
    queryFn: () => filesApi.get<{ rows: FileType[] }>("types"),
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
  });
  const type = data?.rows.find((row) => String(row.id) === typeId);
  if (!can(`manage_${FILES_ABILITY}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/arquivos/tipos-de-documento" backLabel="Tipos de documento" title={type ? type.name : "Tipo de documento"}
        description="Altere as regras do tipo de documento." />
      {isLoading ? <FormPageSkeleton />
        : isError || !type ? <EmptyState icon="search-x" title="Tipo de documento não encontrado." />
          : <FileTypeForm key={type.id} type={type} close={back} />}
    </>
  );
}
