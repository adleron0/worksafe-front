import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import { rememberAfterLogin } from "@/lib/after-login";
import { errorMessage } from "../_authenticated/comercial/-shared/commercial";

interface Search { pedido?: string }
interface RequestInfo { clientName: string; redirectHost: string; expiresAt: string }

export const Route = createFileRoute("/_index/conectar-ia")({
  validateSearch: (search: Record<string, unknown>): Search => ({ pedido: typeof search.pedido === "string" ? search.pedido : undefined }),
  component: ConnectAiPage,
});

/**
 * Tela de aprovação do OAuth do MCP: um app de IA pediu para acessar o sistema
 * em nome da pessoa. Fica fora da área logada para poder mandar ao login e
 * voltar para cá depois.
 */
function ConnectAiPage() {
  const { pedido } = Route.useSearch();
  const navigate = useNavigate();
  const [token] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("accessToken") : null));

  useEffect(() => {
    if (!token && pedido) {
      rememberAfterLogin(`/conectar-ia?pedido=${encodeURIComponent(pedido)}`);
      navigate({ to: "/" });
    }
  }, [token, pedido, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["mcpRequest", pedido], enabled: !!token && !!pedido, retry: false,
    queryFn: async () => (await api.get<RequestInfo>("ai/mcp/requests", { params: { pedido } })).data,
  });
  const decide = useMutation({
    mutationFn: async (approve: boolean) => (await api.post<{ redirectUrl: string }>("ai/mcp/requests/decide", { pedido, approve })).data,
    onSuccess: (out) => { window.location.href = out.redirectUrl; },
  });

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon name="plug" className="h-5 w-5" /></span>
          <h1 className="text-lg font-semibold">Conectar app de IA</h1>
        </div>
        {!pedido && <p className="mt-4 text-sm text-muted-foreground">Link incompleto. Comece de novo pelo app de IA.</p>}
        {pedido && isLoading && <Skeleton className="mt-4 h-24" />}
        {error && <p className="mt-4 text-sm text-destructive">{errorMessage(error)}</p>}
        {data && (
          <>
            <p className="mt-4 text-sm"><strong>{data.clientName}</strong> quer acessar o WorkSafe em seu nome.</p>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Ele vê e faz só o que as suas permissões deixam.</li>
              <li className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Enviar, publicar ou mudar etapa espera a sua confirmação no sistema.</li>
              <li className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Você revoga quando quiser em Bots → Conexões MCP.</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Depois de permitir, você volta para {data.redirectHost}.</p>
            {decide.error && <p className="mt-3 text-sm text-destructive">{errorMessage(decide.error)}</p>}
            <div className="mt-5 flex gap-2">
              <Button type="button" className="flex-1" disabled={decide.isPending} onClick={() => decide.mutate(true)}>Permitir</Button>
              <Button type="button" variant="outline" className="flex-1" disabled={decide.isPending} onClick={() => decide.mutate(false)}>Recusar</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
