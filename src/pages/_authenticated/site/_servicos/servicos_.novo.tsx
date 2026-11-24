import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader } from "@/components/general-components/FormPage";
import { useBackToList } from "@/hooks/use-back-to-list";
import Form from "./-components/SiteServicesForm";
import { siteServicesEntity } from "./-interfaces/entity.interface";

export const Route = createFileRoute("/_authenticated/site/_servicos/servicos_/novo")({
  component: NewService,
});

/** Novo serviço do site, em tela cheia. */
function NewService() {
  const { can } = useVerify();
  const back = useBackToList("/site/servicos");
  if (!can(`create_${siteServicesEntity.ability}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/site/servicos" backLabel="Serviços do Site" title="Novo serviço"
        description="Preencha com atenção todas as informações necessárias para cadastrar o serviço." />
      <Form close={back} />
    </>
  );
}
