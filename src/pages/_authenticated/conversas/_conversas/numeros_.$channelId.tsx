import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { useBackToList } from "@/hooks/use-back-to-list";
import { errorMessage } from "../../comercial/-shared/commercial";
import { CHAT_KEY, Channel, ChannelStatusBadge, PAGES, chatApi, formatPhone, useChatMeta } from "../-shared/chat";
import ChannelForm from "./-components/ChannelForm";

export const Route = createFileRoute("/_authenticated/conversas/_conversas/numeros_/$channelId")({
  component: EditChannel,
});

/** Configurar um número: setor, bot, equipe, horário e limites. */
function EditChannel() {
  const { can } = useVerify();
  const { channelId } = Route.useParams();
  const back = useBackToList(PAGES.channels);
  const meta = useChatMeta();
  const channel = useQuery({ queryKey: [CHAT_KEY, "channel", channelId], queryFn: () => chatApi.get<Channel>(`channels/${channelId}`) });
  if (!can("canais_conversas")) return null;
  return (
    <>
      <FormPageHeader backTo={PAGES.channels} backLabel="Números" title={channel.data?.name ?? "Número"}
        description={channel.data?.phone ? formatPhone(channel.data.phone) : "Ainda não conectado"}
        badge={channel.data && <ChannelStatusBadge status={channel.data.status} />} />
      {channel.error && <p className="text-sm text-destructive">{errorMessage(channel.error)}</p>}
      {meta.data && channel.data ? <ChannelForm key={channel.data.id} channel={channel.data} meta={meta.data} close={back} /> : !channel.error && <FormPageSkeleton />}
    </>
  );
}
