import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { useBackToList } from "@/hooks/use-back-to-list";
import { PAGES, useChatMeta } from "../-shared/chat";
import ChannelForm from "./-components/ChannelForm";

export const Route = createFileRoute("/_authenticated/conversas/_conversas/numeros_/novo")({
  component: NewChannel,
});

/** Novo número de WhatsApp: cadastra e já abre a conexão pelo QR code. */
function NewChannel() {
  const { can } = useVerify();
  const back = useBackToList(PAGES.channels);
  const meta = useChatMeta();
  if (!can("canais_conversas")) return null;
  return (
    <>
      <FormPageHeader backTo={PAGES.channels} backLabel="Números" title="Novo número"
        description="Dê um nome, escolha o setor, o bot e quem atende. Depois é só ler o QR code com o celular." />
      {meta.data ? <ChannelForm meta={meta.data} close={back} /> : <FormPageSkeleton />}
    </>
  );
}
