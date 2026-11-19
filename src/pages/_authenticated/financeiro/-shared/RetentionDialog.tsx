import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errorMessage, money } from "../../comercial/-shared/commercial";
import { RetentionFields, RetentionRates, RetentionState, retentionList, retentionState, retentionSum } from "../../comercial/-shared/retentions";

interface RecordRetentions {
  financialRecordId: number; value: number; netValue: number | null; base: number;
  retentions: Array<{ tax: string; rate: number | null; value: number; declaredAt: string | null }>; suggested: RetentionRates;
}

/** Informar ou corrigir os impostos retidos de qualquer conta a receber: o líquido acompanha. */
export default function RetentionDialog({ recordId, label, onClose }: { recordId: number; label: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["recordRetentions", recordId],
    queryFn: async () => (await api.get<RecordRetentions>(`financial/receivables/${recordId}/retentions`)).data,
  });
  const [state, setState] = useState<RetentionState | null>(null);
  useEffect(() => {
    if (data && !state) setState(retentionState(data.base, data.retentions.length ? {} : data.suggested, data.retentions.length ? data.retentions : undefined));
  }, [data, state]);
  const { mutate, isPending } = useMutation({
    mutationFn: async () => (await api.put(`financial/receivables/${recordId}/retentions`, { retentions: state ? retentionList(state) : [] })).data,
    onSuccess: () => {
      toast({ title: "Retenções salvas", description: "O valor líquido da conta foi atualizado.", variant: "success" });
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0] ?? "").startsWith("list") || query.queryKey[0] === "financialRetentions" || query.queryKey[0] === "recordRetentions" });
      onClose();
    },
    onError: (err) => toast({ title: "Não foi possível salvar", description: errorMessage(err), variant: "destructive" }),
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Impostos retidos — {label}</DialogTitle>
          <DialogDescription>
            {data ? <>Nota de <b>{money(data.base)}</b>{data.base !== data.value ? <> (a receber {money(data.value)}, já sem a caução)</> : null}. </> : null}
            O que o cliente reteve sai do líquido a receber e entra no relatório de impostos retidos.
          </DialogDescription>
        </DialogHeader>
        {isLoading || !data || !state
          ? <Skeleton className="h-48 w-full" />
          : <RetentionFields base={data.base} receivable={data.value} state={state} onChange={setState} idPrefix="recRet" />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" disabled={isPending || !state || (data ? retentionSum(state) >= data.value : true)} onClick={() => mutate()}>{isPending ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
