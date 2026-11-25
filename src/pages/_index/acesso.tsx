import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, LogOut, ShieldCheck, XCircle } from "lucide-react";
import { VscLoading } from "react-icons/vsc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import DynamicLogo from "@/components/general-components/DynamicLogo";
import {
  enterAfterApproval,
  getMyAccessRequest,
  pendingToken,
  sendAccessRequest,
} from "@/services/auth/googleService";

export const Route = createFileRoute("/_index/acesso")({
  component: PedirAcesso,
});

/**
 * Quem entrou com o Google da empresa mas ainda não tem perfil. Só mostra o
 * próprio nome e o pedido: nenhum dado da empresa aparece aqui.
 */
function PedirAcesso() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setAccessTokenState, setIsLogged, reloadUser } = useAuth();
  const [message, setMessage] = useState("");
  const hasToken = Boolean(pendingToken.get());

  useEffect(() => {
    if (!hasToken) navigate({ to: "/" });
  }, [hasToken, navigate]);

  const leave = () => {
    pendingToken.clear();
    navigate({ to: "/" });
  };

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ["my-access-request"],
    queryFn: getMyAccessRequest,
    enabled: hasToken,
    refetchInterval: 30_000, // aprovado enquanto a tela está aberta: entra sozinho
    retry: false,
  });

  useEffect(() => {
    if (error) {
      toast({ title: "Sessão expirada", description: "Entre com o Google de novo.", variant: "destructive" });
      leave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const enter = useMutation({
    mutationFn: enterAfterApproval,
    onSuccess: (res) => {
      if (res.status !== "ok") return;
      pendingToken.clear();
      localStorage.removeItem("secretWord");
      localStorage.setItem("accessToken", res.accessToken);
      setAccessTokenState(res.accessToken);
      setIsLogged(true);
      reloadUser();
      navigate({ to: "/home" });
    },
  });

  useEffect(() => {
    if (data?.approved && !enter.isPending && !enter.isSuccess) enter.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.approved]);

  const send = useMutation({
    mutationFn: () => sendAccessRequest(message.trim()),
    onSuccess: () => {
      toast({ title: "Pedido enviado", description: "Você recebe acesso assim que um gestor aprovar.", variant: "success" });
      refetch();
    },
    onError: (e: any) =>
      toast({ title: "Não foi possível enviar", description: e?.response?.data?.message ?? "Tente de novo.", variant: "destructive" }),
  });

  const req = data?.request;
  const status = data?.approved ? "approved" : req?.status;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <DynamicLogo width={150} height={48} />
        </div>
        <div className="rounded-2xl border bg-background p-6 shadow-sm">
          {isLoading || !data ? (
            <div className="flex justify-center py-10 text-muted-foreground">
              <VscLoading className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                {data.user.imageUrl ? (
                  <img src={data.user.imageUrl} alt="" referrerPolicy="no-referrer" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                    {data.user.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold">{data.user.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{data.user.email}</p>
                </div>
              </div>

              <div className="mt-6">
                {status === "approved" ? (
                  <StatusLine icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} title="Acesso liberado" text="Entrando no sistema…" />
                ) : status === "pending" ? (
                  <StatusLine
                    icon={<Clock className="h-5 w-5 text-amber-500" />}
                    title="Pedido enviado"
                    text={`Aguardando um gestor liberar o seu perfil. Enviado em ${new Date(req!.createdAt).toLocaleString("pt-BR")}.`}
                  />
                ) : (
                  <>
                    {status === "rejected" && (
                      <StatusLine
                        icon={<XCircle className="h-5 w-5 text-destructive" />}
                        title="Pedido recusado"
                        text={req?.reason ? `Motivo: ${req.reason}` : "Você pode pedir de novo explicando o que precisa."}
                      />
                    )}
                    <div className={status === "rejected" ? "mt-5" : ""}>
                      <h1 className="text-lg font-semibold">Você ainda não tem perfil de acesso</h1>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Peça o acesso: um gestor recebe o pedido e escolhe o seu perfil.
                      </p>
                      <Label htmlFor="msg" className="mt-4 block">Setor ou função (opcional)</Label>
                      <Textarea
                        id="msg"
                        value={message}
                        maxLength={500}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Ex.: técnico de campo, equipe de obras"
                        className="mt-1.5 min-h-[80px]"
                      />
                      <Button className="mt-4 h-11 w-full rounded-xl" disabled={send.isPending} onClick={() => send.mutate()}>
                        {send.isPending ? <VscLoading className="animate-spin" /> : "Pedir perfil"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Acesso registrado</span>
          <button type="button" onClick={leave} className="flex items-center gap-1 hover:text-foreground">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </div>
    </main>
  );
}

function StatusLine({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-xl border bg-muted/40 p-4">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
