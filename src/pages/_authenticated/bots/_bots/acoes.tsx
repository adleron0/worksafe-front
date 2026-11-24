import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "../../comercial/-shared/commercial";
import { ActionCard } from "../-shared/action-card";
import { usePendingActions } from "../-shared/bots";

export const Route = createFileRoute("/_authenticated/bots/_bots/acoes")({
  component: ActionsPage,
});

/**
 * Ações preparadas por bots (aqui ou num app de IA conectado pelo MCP) que
 * esperam o seu clique. Valem por 30 minutos.
 */
function ActionsPage() {
  const { can } = useVerify();
  const { data, isLoading, error } = usePendingActions();
  if (!can("usar_bots") && !can("usar_mcp")) return null;
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-bold">Ações pendentes</h1>
        <p className="text-sm text-muted-foreground max-sm:line-clamp-3">O que os bots prepararam e só acontece quando você confirma: envio de proposta, publicação, mudança de etapa. Inclui o que veio de apps de IA conectados (Claude, ChatGPT…). Cada ação vale por 30 minutos.</p>
      </div>
      {error && <p className="text-destructive">Erro: {errorMessage(error)}</p>}
      {isLoading && <Skeleton className="h-32 w-full" />}
      {data && !data.length && <p className="rounded-lg border p-6 text-sm text-muted-foreground">Nenhuma ação esperando por você.</p>}
      {data?.map((action) => <ActionCard key={action.id} action={action} />)}
    </div>
  );
}
