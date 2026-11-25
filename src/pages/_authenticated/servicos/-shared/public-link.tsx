import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { errorMessage } from "../../comercial/-shared/commercial";
import { ORDER_KEY, ORDER_PUBLIC_KEY, ordersApi } from "./orders";

/** Link do cliente (espelha `GET service-orders/:id/public`). */
export interface PublicOptions { reports: boolean; photos: boolean; occurrences: boolean; teamNames: boolean }
export interface PublicState { enabled: boolean; key: string | null; url: string | null; path: string | null; options: PublicOptions; daysAfterClose: number }

const OPTIONS: Array<{ key: keyof PublicOptions; label: string; hint: string }> = [
  { key: "reports", label: "Diário da obra", hint: "Os RDOs fechados: data, clima, o que foi feito e o avanço. Rascunho nunca aparece." },
  { key: "photos", label: "Fotos dos RDOs", hint: "As fotos dos RDOs fechados." },
  { key: "occurrences", label: "Ocorrências", hint: "Paralisações, pendências do cliente, quase acidentes." },
  { key: "teamNames", label: "Primeiro nome da equipe", hint: "Sem isto, o cliente vê só a função de cada um." },
];

/**
 * Liga o acompanhamento pelo cliente: um link aberto, só leitura, sem valores
 * nem nada interno. Desligar ou trocar a chave fecha o link na hora.
 */
export function PublicLinkDialog({ orderId, orderNumber, canEdit, onClose }: { orderId: number; orderNumber: string; canEdit: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: [ORDER_PUBLIC_KEY, orderId], queryFn: () => ordersApi.get<PublicState>(`${orderId}/public`) });
  const apply = (result: PublicState) => { queryClient.setQueryData([ORDER_PUBLIC_KEY, orderId], result); queryClient.invalidateQueries({ queryKey: [ORDER_KEY, String(orderId)] }); };
  const fail = (err: unknown) => toast({ title: "Não foi possível salvar", description: errorMessage(err), variant: "destructive" });
  const { mutate: save, isPending: saving } = useMutation({ mutationFn: (body: Record<string, unknown>) => ordersApi.put<PublicState>(`${orderId}/public`, body), onSuccess: apply, onError: fail });
  const { mutate: renew, isPending: renewing } = useMutation({
    mutationFn: () => ordersApi.post<PublicState>(`${orderId}/public/renew`),
    onSuccess: (result) => { apply(result); toast({ title: "Link trocado: o anterior não abre mais", variant: "success" }); },
    onError: fail,
  });
  // sem domínio da empresa configurado, o link vale no próprio endereço do sistema
  const link = data?.url ?? (data?.path ? `${window.location.origin}${data.path}` : null);
  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); toast({ title: "Link copiado", variant: "success" }); } catch { toast({ title: "Copie o link no campo", variant: "destructive" }); }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link do cliente · {orderNumber}</DialogTitle>
          <DialogDescription>O cliente acompanha a obra pelo celular: situação, avanço, cronograma e o que você escolher abaixo. Valores, custos e observações internas nunca aparecem.</DialogDescription>
        </DialogHeader>
        {isLoading || !data ? <Skeleton className="h-40 w-full" /> : (
          <div className="grid gap-4">
            <label className="flex items-center justify-between gap-3 rounded-md border p-3">
              <span><b className="text-sm">Acompanhamento ligado</b><span className="block text-xs text-muted-foreground">Depois de encerrada, a OS ainda abre por {data.daysAfterClose} dias.</span></span>
              <Switch checked={data.enabled} disabled={!canEdit || saving} onCheckedChange={(checked) => save({ enabled: checked })} aria-label="Ligar o acompanhamento pelo cliente" />
            </label>
            {data.enabled && link && (
              <div className="grid gap-2">
                <div className="flex gap-2">
                  <input readOnly value={link} className="flex-1 min-w-0 rounded-md border bg-muted/40 px-3 py-2 text-sm" aria-label="Link do cliente" onFocus={(event) => event.target.select()} />
                  <Button type="button" variant="outline" onClick={copy}><Icon name="copy" className="w-4 h-4 mr-1" /> Copiar</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="ghost" size="sm" className="h-8 px-2"><a href={link} target="_blank" rel="noopener noreferrer"><Icon name="external-link" className="w-3.5 h-3.5 mr-1" /> Ver como o cliente vê</a></Button>
                  {canEdit && (
                    <ConfirmDialog title="Trocar o link?" description="O link atual para de abrir na hora. Mande o novo para quem deve continuar acompanhando." onConfirm={() => renew()}>
                      <Button variant="ghost" size="sm" className="h-8 px-2" disabled={renewing}><Icon name="refresh-cw" className="w-3.5 h-3.5 mr-1" /> Trocar o link</Button>
                    </ConfirmDialog>
                  )}
                </div>
              </div>
            )}
            <div className="grid gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">O que o cliente vê além da situação e do cronograma</p>
              {OPTIONS.map((option) => (
                <label key={option.key} className="flex items-start justify-between gap-3 py-2 border-b last:border-0">
                  <span className="text-sm"><span className="font-medium">{option.label}</span><span className="block text-xs text-muted-foreground">{option.hint}</span></span>
                  <Switch checked={data.options[option.key]} disabled={!canEdit || saving || (option.key === "photos" && !data.options.reports)}
                    onCheckedChange={(checked) => save({ options: { [option.key]: checked } })} aria-label={option.label} />
                </label>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
