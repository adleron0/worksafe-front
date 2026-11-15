import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { errorMessage } from "../../comercial/-shared/commercial";
import { aiApi, dateTimeBr } from "../-shared/bots";

interface Connection { id: number; client: string; user: string; mine: boolean; createdAt: string; lastUsedAt: string | null; expiresAt: string | null }

export const Route = createFileRoute("/_authenticated/bots/_bots/conexoes")({
  component: ConnectionsPage,
});

/** Conectar apps de IA (Claude, ChatGPT…) ao sistema pelo MCP, e ver/revogar as conexões. */
function ConnectionsPage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const admin = can("update_bots");
  const info = useQuery({ queryKey: ["mcpInfo"], enabled: can("usar_mcp"), queryFn: () => aiApi.get<{ url: string; enabled: boolean }>("mcp/info") });
  const list = useQuery({ queryKey: ["mcpConnections", admin], enabled: can("usar_mcp") || admin, queryFn: () => aiApi.get<Connection[]>(admin ? "mcp/connections/all" : "mcp/connections") });
  const done = (title: string) => { queryClient.invalidateQueries({ queryKey: ["mcpConnections"] }); toast({ title, variant: "success" }); };
  const revoke = useMutation({
    mutationFn: (row: Connection) => aiApi.patch(`mcp/connections/${row.id}/${row.mine ? "revoke" : "revoke-any"}`),
    onSuccess: () => done("Conexão revogada"),
    onError: (error) => toast({ title: "Não foi possível revogar", description: errorMessage(error), variant: "destructive" }),
  });
  const revokeAll = useMutation({
    mutationFn: () => aiApi.post<{ revoked: number }>("mcp/connections/revoke-all"),
    onSuccess: (data) => done(`${data.revoked} conexão(ões) revogada(s)`),
    onError: (error) => toast({ title: "Não foi possível revogar", description: errorMessage(error), variant: "destructive" }),
  });
  if (!can("usar_mcp") && !admin) return null;
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast({ title: "Endereço copiado", variant: "success" }); } catch { toast({ title: "Copie o endereço manualmente", variant: "destructive" }); }
  };

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-bold">Conectar apps de IA</h1>
        <p className="text-sm text-muted-foreground">Use o sistema de dentro do Claude, do ChatGPT ou de outro app compatível com MCP, com a assinatura que você já tem. O app usa as mesmas ferramentas dos bots, com as suas permissões. O que sai para fora espera a sua confirmação em Bots → Ações pendentes.</p>
      </div>
      {can("usar_mcp") && info.data && (
        <div className="rounded-lg border p-4 text-sm">
          {!info.data.enabled && <p className="mb-2 font-medium text-destructive">A conexão de apps de IA está desligada no servidor (MCP_ENABLED).</p>}
          <p className="font-medium">Endereço do conector</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs">{info.data.url}</code>
            <Button type="button" variant="outline" size="sm" onClick={() => copy(info.data!.url)}><Icon name="copy" className="mr-1 h-4 w-4" /> Copiar</Button>
          </div>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
            <li>No app de IA, procure "Conectores" (ou "Integrações / MCP") e adicione um conector personalizado com o endereço acima.</li>
            <li>O app abre uma página do WorkSafe: confira o nome do app e clique em "Permitir".</li>
            <li>Pronto: peça coisas como "quais turmas têm vaga?" ou "o que tenho atrasado hoje?".</li>
          </ol>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{admin ? "Conexões da empresa" : "Suas conexões"}</h2>
        {admin && (
          <ConfirmDialog title="Revogar todas as conexões?" description="Todos os apps de IA conectados perdem o acesso na hora. Cada pessoa precisará conectar de novo." slideLabel="Deslize para revogar todas" onConfirm={() => revokeAll.mutate()}>
            <Button type="button" variant="outline" size="sm" className="text-destructive"><Icon name="shield-off" className="mr-1 h-4 w-4" /> Revogar todas</Button>
          </ConfirmDialog>
        )}
      </div>
      {list.error && <p className="text-destructive">Erro: {errorMessage(list.error)}</p>}
      {list.isLoading && <Skeleton className="h-24 w-full" />}
      {list.data && !list.data.length && <p className="rounded-lg border p-6 text-sm text-muted-foreground">Nenhum app conectado.</p>}
      {list.data && list.data.length > 0 && (
        <div className="rounded-lg border">
          {list.data.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0">
              <Icon name="plug" className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{row.client}{admin ? ` · ${row.user}` : ""}</p>
                <p className="text-xs text-muted-foreground">Conectado em {dateTimeBr(row.createdAt)} · último uso {dateTimeBr(row.lastUsedAt)}</p>
              </div>
              <ConfirmDialog title="Revogar esta conexão?" description="O app perde o acesso na hora." onConfirm={() => revoke.mutate(row)}>
                <Button type="button" variant="outline" size="sm">Revogar</Button>
              </ConfirmDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
