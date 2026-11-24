import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader } from "@/components/general-components/FormPage";
import { useBackToList } from "@/hooks/use-back-to-list";
import { FILES_ABILITY } from "../-shared/files";
import FileTypeForm from "./-components/FileTypeForm";

export const Route = createFileRoute("/_authenticated/arquivos/_pastas/tipos-de-documento_/novo")({
  component: NewFileType,
});

/** Novo tipo de documento da empresa. */
function NewFileType() {
  const { can } = useVerify();
  const back = useBackToList("/arquivos/tipos-de-documento");
  if (!can(`manage_${FILES_ABILITY}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/arquivos/tipos-de-documento" backLabel="Tipos de documento" title="Novo tipo de documento"
        description="Um documento da empresa que tem validade ou que não pode faltar." />
      <FileTypeForm close={back} />
    </>
  );
}
