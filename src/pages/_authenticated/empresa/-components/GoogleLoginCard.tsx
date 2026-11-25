import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import GoogleIcon from "@/components/general-components/GoogleIcon";
import { VscLoading } from "react-icons/vsc";

interface Settings {
  googleDomain: string | null;
  googleLoginEnabled: boolean;
  googleConfigured: boolean;
}

/** Domínio do Google Workspace e liga/desliga do "Entrar com Google". */
export default function GoogleLoginCard() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["access-settings"],
    queryFn: async () => (await api.get<Settings>("/access-settings")).data,
  });
  const [domain, setDomain] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!data) return;
    setDomain(data.googleDomain ?? "");
    setEnabled(data.googleLoginEnabled);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => (await api.put<Settings>("/access-settings", { googleDomain: domain.trim() || null, googleLoginEnabled: enabled })).data,
    onSuccess: (res) => {
      qc.setQueryData(["access-settings"], res);
      qc.invalidateQueries({ queryKey: ["google-login-enabled"] });
      toast({ title: "Login com Google salvo", variant: "success" });
    },
    onError: (e: any) => toast({ title: "Não foi possível salvar", description: e?.response?.data?.message ?? "Tente de novo.", variant: "destructive" }),
  });

  if (!data) return null;
  const dirty = (data.googleDomain ?? "") !== domain.trim() || data.googleLoginEnabled !== enabled;
  const turningOn = enabled && !data.googleLoginEnabled;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><GoogleIcon className="h-5 w-5" /> Login com Google</CardTitle>
        <CardDescription>
          Quem tem conta Google do domínio da empresa entra com um clique. Quem é novo pede o perfil, e um gestor aprova em
          Usuários → Pedidos de acesso.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!data.googleConfigured && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            As chaves do Google Cloud ainda não foram configuradas no servidor. Dá para salvar o domínio, mas não para ligar.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="google-domain">Domínio do Google Workspace</Label>
            <Input id="google-domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="suaempresa.com.br" />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Entrar com Google</p>
              <p className="text-xs text-muted-foreground">E-mails do domínio deixam de entrar por senha.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} disabled={!data.googleConfigured && !data.googleLoginEnabled} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Mantenha uma conta de emergência com e-mail fora do domínio e senha forte: se o Google ficar fora do ar, é por ela que se entra.
        </p>
        <div className="flex justify-end">
          <Button disabled={!dirty || save.isPending} onClick={() => (turningOn ? setConfirm(true) : save.mutate())}>
            {save.isPending ? <VscLoading className="animate-spin" /> : "Salvar"}
          </Button>
        </div>
      </CardContent>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Ligar o login com Google?"
        description={`A partir de agora, e-mails @${domain.trim().replace(/^@/, "")} só entram pelo botão "Entrar com Google" (a senha deles deixa de valer). Confira se existe uma conta de emergência fora desse domínio.`}
        slideLabel="Deslize para ligar"
        onConfirm={() => { setConfirm(false); save.mutate(); }}
      />
    </Card>
  );
}
