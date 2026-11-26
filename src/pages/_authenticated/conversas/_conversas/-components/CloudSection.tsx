import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import { FormSection } from "@/components/general-components/FormPage";
import { Tip, errorMessage } from "../../../comercial/-shared/commercial";
import { CHAT_KEY, Channel, chatApi } from "../../-shared/chat";

interface CloudInfo { connected: boolean; webhookUrl: string; verifyToken: string | null; phoneNumberId: string | null; wabaId: string | null; tokenHint?: string }

/**
 * WhatsApp oficial (Cloud API da Meta): em vez do QR code, o número entra com
 * as credenciais do app da Meta. Sem risco de bloqueio por cliente não oficial,
 * mas mensagem livre só até 24 h depois da última do cliente.
 */
export default function CloudSection({ channel }: { channel: Channel }) {
  const queryClient = useQueryClient();
  const key = [CHAT_KEY, "cloud", channel.id];
  const info = useQuery({ queryKey: key, queryFn: () => chatApi.get<CloudInfo>(`channels/${channel.id}/cloud`) });
  const cloud = channel.provider === "cloud";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ phoneNumberId: "", wabaId: "", token: "", appSecret: "" });
  const set = (name: keyof typeof form) => (_: string, value: unknown) => setForm((f) => ({ ...f, [name]: String(value ?? "") }));

  const save = useMutation({
    mutationFn: () => chatApi.post<CloudInfo & { phone: string | null }>(`channels/${channel.id}/cloud`, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CHAT_KEY] });
      setForm({ phoneNumberId: "", wabaId: "", token: "", appSecret: "" });
      setOpen(false);
      toast({ title: "WhatsApp oficial conectado", description: "Falta cadastrar o webhook no app da Meta (endereço e token abaixo).", variant: "success" });
    },
    onError: (err) => toast({ title: "Não deu para conectar", description: errorMessage(err), variant: "destructive" }),
  });

  const copy = (text: string, what: string) => { void navigator.clipboard?.writeText(text); toast({ title: `${what} copiado`, variant: "success" }); };
  const blocked = !cloud && channel.status === "conectado";
  const data = info.data;

  return (
    <FormSection title="WhatsApp oficial" description="Opcional: em vez do QR code, use a API oficial da Meta (WhatsApp Business). Não corre risco de bloqueio por integração não oficial, mas a Meta só deixa mandar mensagem livre até 24 h depois da última mensagem do cliente.">
      {cloud && data?.verifyToken ? (
        <div className="grid gap-3">
          <p className="flex items-center gap-2 text-sm"><Icon name="badge-check" className="h-4 w-4 text-emerald-600" />Este número usa o WhatsApp oficial · ID {data.phoneNumberId}{data.tokenHint ? ` · token ${data.tokenHint}` : ""}</p>
          <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="text-xs text-muted-foreground">No app da Meta: WhatsApp → Configuração → Webhook. Cole o endereço e o token e marque o campo <b>messages</b>.</p>
            <CopyRow label="Endereço do webhook" value={data.webhookUrl} onCopy={() => copy(data.webhookUrl, "Endereço")} />
            <CopyRow label="Token de verificação" value={data.verifyToken} onCopy={() => copy(data.verifyToken!, "Token")} />
          </div>
          {!open && <Button type="button" variant="outline" className="w-fit" onClick={() => setOpen(true)}><Icon name="key-round" className="mr-1.5 h-4 w-4" />Trocar o token de acesso</Button>}
        </div>
      ) : blocked ? (
        <p className="text-sm text-muted-foreground">Este número está conectado pelo QR code. Para passar para o oficial, desconecte primeiro em Números.</p>
      ) : !open ? (
        <Button type="button" variant="outline" className="w-fit" onClick={() => setOpen(true)}><Icon name="badge-check" className="mr-1.5 h-4 w-4" />Conectar pelo WhatsApp oficial</Button>
      ) : null}

      {open && (
        <div className="grid gap-3 rounded-lg border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>ID do número de telefone</Label><Input name="cloudPhoneId" value={form.phoneNumberId} onValueChange={set("phoneNumberId")} placeholder={cloud ? "manter o atual" : "ex.: 106540352242922"} /></div>
            <div><Label>ID da conta do WhatsApp Business</Label><Input name="cloudWaba" value={form.wabaId} onValueChange={set("wabaId")} placeholder="opcional" /></div>
            <div><Label>Token de acesso permanente</Label><Input name="cloudToken" type="password" value={form.token} onValueChange={set("token")} placeholder={cloud ? "manter o atual" : "EAAG…"} /></div>
            <div><Label>Chave secreta do app</Label><Input name="cloudSecret" type="password" value={form.appSecret} onValueChange={set("appSecret")} placeholder={cloud ? "manter a atual" : "Configurações do app → Básico"} /></div>
          </div>
          <p className="text-xs text-muted-foreground">O token deve ser de um <b>usuário do sistema</b> da Meta (não vence). Tudo fica guardado criptografado; o sistema confere com a Meta antes de salvar.</p>
          <div className="flex gap-2">
            <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Conferindo com a Meta..." : cloud ? "Salvar" : "Conectar"}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </div>
      )}
    </FormSection>
  );
}

function CopyRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-xs">{value}</p>
      </div>
      <Tip text="Copiar"><Button type="button" size="sm" variant="ghost" className="h-8 w-8 shrink-0 p-0" onClick={onCopy} aria-label={`Copiar ${label}`}><Icon name="copy" className="h-4 w-4" /></Button></Tip>
    </div>
  );
}
