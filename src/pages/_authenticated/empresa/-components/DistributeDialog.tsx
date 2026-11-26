import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Select from "@/components/general-components/Select";
import SlideConfirm from "@/components/general-components/SlideConfirm";
import { CompanyEntity, ENTITY_KINDS, EntityKind } from "@/components/general-components/EntitySelect";
import { Label } from "@/components/ui/label";
import { errorMessage } from "../../comercial/-shared/commercial";

type Result = { preview: boolean; scope: EntityKind; items: Array<{ key: string; label: string; count: number }> };

/**
 * "Trazer registros para cá": passa para este CNPJ tudo de uma frente (propostas,
 * contratos, cursos, turmas, OS, OL e as contas ligadas). Mostra as contagens antes.
 */
export default function DistributeDialog({ entity, open, onOpenChange }: { entity: CompanyEntity; open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<EntityKind | "">("");
  const [preview, setPreview] = useState<Result | null>(null);
  useEffect(() => { if (!open) { setScope(""); setPreview(null); } }, [open]);

  const check = useMutation({
    mutationFn: async (kind: EntityKind) => (await api.post<Result>(`company-entities/${entity.id}/assign`, { scope: kind, preview: true })).data,
    onSuccess: setPreview,
    onError: (error) => toast({ title: "Não foi possível contar", description: errorMessage(error), variant: "destructive" }),
  });
  const apply = useMutation({
    mutationFn: async () => (await api.post<Result>(`company-entities/${entity.id}/assign`, { scope })).data,
    onSuccess: (result) => {
      queryClient.invalidateQueries();
      const moved = result.items.reduce((s, i) => s + i.count, 0);
      toast({ title: `${moved} registro(s) passaram para ${entity.tradeName}`, variant: "success" });
      onOpenChange(false);
    },
    onError: (error) => toast({ title: "Não foi possível distribuir", description: errorMessage(error), variant: "destructive" }),
  });
  const total = preview?.items.reduce((s, i) => s + i.count, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Trazer registros para {entity.tradeName}</DialogTitle>
        <DialogDescription>Escolha a frente. Os registros dela que estão em outro CNPJ passam para este, e os novos já nascem aqui.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Frente</Label>
          <Select name="scope" options={ENTITY_KINDS} state={scope}
            onChange={(_, v) => { const kind = String(v) as EntityKind; setScope(kind); setPreview(null); if (kind) check.mutate(kind); }} />
        </div>
        {check.isPending && <p className="text-sm text-muted-foreground">Contando…</p>}
        {preview && (
          <div className="rounded-lg border divide-y text-sm">
            {preview.items.map((i) => (
              <div key={i.key} className="flex justify-between px-3 py-1.5"><span>{i.label}</span><span className="tabular-nums font-medium">{i.count}</span></div>
            ))}
          </div>
        )}
        {preview && (
          <p className="text-xs text-muted-foreground">
            Notas fiscais já emitidas continuam no CNPJ que as emitiu. Contas bancárias e funcionários se escolhem um a um, no cadastro de cada um.
          </p>
        )}
        {preview && (
          <SlideConfirm label={total ? `Deslize para mover ${total} registro(s)` : "Deslize para tornar a frente deste CNPJ"} pending={apply.isPending}
            onConfirm={() => { apply.mutate(); }} />
        )}
      </div>
      </DialogContent>
    </Dialog>
  );
}
