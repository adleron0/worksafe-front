import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import { FormSection } from "@/components/general-components/FormPage";
import { errorMessage } from "../../../comercial/-shared/commercial";
import { CHAT_KEY, chatApi, formatPhone } from "../../-shared/chat";

interface Hidden { id: number; name: string | null; pushName: string | null; phone: string | null; hiddenAt: string | null }

/** Contatos ocultos do número: assunto pessoal, nada deles é gravado no sistema. */
export default function HiddenContacts({ channelId, whatsapp }: { channelId: number; whatsapp: boolean }) {
  const queryClient = useQueryClient();
  const key = [CHAT_KEY, "hidden", channelId];
  const list = useQuery({ queryKey: key, queryFn: () => chatApi.get<Hidden[]>(`channels/${channelId}/hidden`) });
  const [phone, setPhone] = useState("");
  const [confirm, setConfirm] = useState(false);
  const digits = phone.replace(/\D/g, "");

  const add = useMutation({
    mutationFn: () => chatApi.post<Hidden[]>(`channels/${channelId}/hidden`, { phone: digits.startsWith("55") ? digits : `55${digits}` }),
    onSuccess: (rows) => { queryClient.setQueryData(key, rows); queryClient.invalidateQueries({ queryKey: [CHAT_KEY] }); setPhone(""); toast({ title: "Número oculto", variant: "success" }); },
    onError: (err) => toast({ title: "Não deu para ocultar", description: errorMessage(err), variant: "destructive" }),
  });
  const show = useMutation({
    mutationFn: (contactId: number) => chatApi.delete<Hidden[]>(`channels/${channelId}/hidden/${contactId}`),
    onSuccess: (rows) => { queryClient.setQueryData(key, rows); toast({ title: "Volta a aparecer a partir de agora", variant: "success" }); },
    onError: (err) => toast({ title: "Não deu certo", description: errorMessage(err), variant: "destructive" }),
  });

  const rows = list.data ?? [];
  return (
    <FormSection title="Contatos ocultos" description="Conversas pessoais que não devem aparecer no sistema. Nada desses contatos é gravado; no celular continua tudo igual.">
      {whatsapp && (
        <div className="flex gap-2 sm:max-w-md">
          <Input name="hiddenPhone" format="phone" value={phone} placeholder="(11) 91234-5678" onValueChange={(_, value) => setPhone(String(value))} className="flex-1" />
          <Button type="button" variant="outline" disabled={add.isPending || digits.length < 10} onClick={() => setConfirm(true)}><Icon name="eye-off" className="mr-1.5 h-4 w-4" />Ocultar</Button>
        </div>
      )}
      {rows.length ? (
        <ul className="divide-y rounded-xl border">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><Icon name="eye-off" className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{row.name || row.pushName || formatPhone(row.phone) || "Contato"}</span>
                <span className="text-xs text-muted-foreground">{[row.phone && (row.name || row.pushName) ? formatPhone(row.phone) : null, row.hiddenAt ? `oculto em ${new Date(row.hiddenAt).toLocaleDateString("pt-BR")}` : null].filter(Boolean).join(" · ")}</span>
              </span>
              <Button type="button" size="sm" variant="ghost" disabled={show.isPending} onClick={() => show.mutate(row.id)}><Icon name="eye" className="mr-1.5 h-4 w-4" />Mostrar de novo</Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{list.isLoading ? "Carregando…" : "Nenhum contato oculto. Para ocultar um que já escreveu, use o menu ⋯ dentro da conversa."}</p>
      )}
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Ocultar ${formatPhone(digits.startsWith("55") ? digits : `55${digits}`)}?`}
        description="Se já existir conversa com este número, ela é apagada do sistema. As próximas mensagens dele não são gravadas."
        slideLabel="Deslize para ocultar" onConfirm={() => add.mutate()} />
    </FormSection>
  );
}
