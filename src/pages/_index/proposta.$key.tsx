import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import ProposalClientView, { ClientProposal } from "./-components/ProposalClientView";

export const Route = createFileRoute("/_index/proposta/$key")({
  component: PublicProposalPage,
});

/** Link do cliente: leitura, impressão, aceite e recusa. Só a chave dá acesso. */
function PublicProposalPage() {
  const { key } = Route.useParams();
  const queryClient = useQueryClient();
  const queryKey = ["publicProposal", key];
  const { data, isLoading, error } = useQuery({
    queryKey, retry: false, refetchOnWindowFocus: false,
    queryFn: async () => (await api.get<ClientProposal>(`commercial/public/proposals/${key}`)).data,
  });

  if (isLoading) return <div className="max-w-4xl mx-auto p-4 grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-[60vh] w-full" /></div>;
  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto p-6 mt-16 text-center">
        <h1 className="text-xl font-bold">Proposta não encontrada</h1>
        <p className="text-muted-foreground mt-2">O link pode estar incompleto ou a proposta não está mais disponível. Confira o link recebido ou fale com quem enviou.</p>
      </div>
    );
  }
  return <ProposalClientView data={data} proposalKey={key} onChanged={() => queryClient.invalidateQueries({ queryKey })} />;
}
