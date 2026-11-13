import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import ProposalClientView, { ClientProposal } from "./-components/ProposalClientView";

export const Route = createFileRoute("/_index/proposta_/rascunho/$proposalId")({
  component: ProposalDraftPreviewPage,
});

/**
 * "Ver como o cliente": a página do link, montada com a proposta como está
 * salva, para quem está logado no sistema. Mostra a tarja de rascunho e não
 * registra nada (nem visualização, nem aceite).
 */
function ProposalDraftPreviewPage() {
  const { proposalId } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["proposalClientView", proposalId], retry: false, refetchOnWindowFocus: true,
    queryFn: async () => (await api.get<ClientProposal>(`commercial/proposals/${proposalId}/client-view`)).data,
  });

  if (isLoading) return <div className="max-w-4xl mx-auto p-4 grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-[60vh] w-full" /></div>;
  if (error || !data) {
    const text = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
    return (
      <div className="max-w-xl mx-auto p-6 mt-16 text-center">
        <h1 className="text-xl font-bold">Não foi possível abrir a pré-visualização</h1>
        <p className="text-muted-foreground mt-2">{text || "Entre no sistema e abra a pré-visualização a partir da proposta."}</p>
      </div>
    );
  }
  return <ProposalClientView data={data} />;
}
