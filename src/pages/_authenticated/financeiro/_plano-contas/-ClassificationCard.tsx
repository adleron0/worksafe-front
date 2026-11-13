import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import Select from "@/components/general-components/Select";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { ApiError } from "@/general-interfaces/api.interface";
import AccountSelect from "../-shared/AccountSelect";
import { CHART_KEY, ChartAccount, FINANCIAL_ABILITY, financialApi, useCostCenters } from "../-shared/financial";

interface DefaultRow { origin: string; label: string; chartAccountId: number | null; costCenterId: number | null }
interface DefaultsResponse { pendingSubscriptionRecords: number; rows: DefaultRow[] }
const KEY = "financialClassificationDefaults";

/**
 * Classificação automática: a conta e o centro de custo que um recebível
 * ganha sozinho conforme a origem, para ninguém classificar à mão o que o
 * sistema já sabe.
 */
export default function ClassificationCard({ accounts }: { accounts: ChartAccount[] }) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const canEdit = can(`update_${FINANCIAL_ABILITY}`);
  const { data } = useQuery<DefaultsResponse | undefined>({ queryKey: [KEY], queryFn: () => get("financial", "classification-defaults") });
  const { data: centers } = useCostCenters(open);

  const onError = (error: ApiError) => toast({
    title: "Não foi possível salvar", description: error.response?.data?.message || "Erro desconhecido.", variant: "destructive",
  });
  const { mutate: save } = useMutation({
    mutationFn: (row: DefaultRow) => financialApi.put(`classification-defaults/${row.origin}`, { chartAccountId: row.chartAccountId, costCenterId: row.costCenterId }),
    onSuccess: () => { toast({ title: "Classificação padrão salva!", variant: "success" }); queryClient.invalidateQueries({ queryKey: [KEY] }); },
    onError,
  });
  const { mutate: apply, isPending: applying } = useMutation({
    mutationFn: () => financialApi.post<{ chartAccount: number; costCenter: number }>("classification-defaults/apply"),
    onSuccess: (result) => {
      toast({ title: "Recebíveis antigos classificados!", description: `${result.chartAccount} com conta e ${result.costCenter} com centro de custo.`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: [KEY] });
      queryClient.invalidateQueries({ queryKey: [CHART_KEY] });
    },
    onError,
  });

  const pending = data?.pendingSubscriptionRecords ?? 0;

  return (
    <div className="rounded-lg border mt-6">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 p-4 text-left">
        <span>
          <span className="font-semibold block">Classificação automática</span>
          <span className="text-sm text-muted-foreground">
            Conta e centro de custo que cada recebível ganha sozinho conforme a origem.
            {pending > 0 && ` ${pending} recebível(is) de inscrição ainda sem conta.`}
          </span>
        </span>
        <Icon name={open ? "chevron-up" : "chevron-down"} className="w-4 h-4 shrink-0" />
      </button>
      {open && (
        <div className="border-t p-4 flex flex-col gap-4">
          {(data?.rows ?? []).map((row) => (
            <div key={row.origin} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:items-end">
              <p className="md:col-span-3 text-sm font-medium md:pb-2">{row.label}</p>
              <div className="md:col-span-5">
                <p className="text-xs text-muted-foreground">Conta</p>
                <AccountSelect accounts={accounts} value={row.chartAccountId ? String(row.chartAccountId) : ""} disabled={!canEdit}
                  nature="receita" clearable placeholder="Sem conta padrão"
                  onChange={(value) => save({ ...row, chartAccountId: value ? Number(value) : null })} />
              </div>
              <div className="md:col-span-4">
                <p className="text-xs text-muted-foreground mb-1">Centro de custo</p>
                <Select name={`center-${row.origin}`} options={(centers?.rows ?? []) as never[]} disabled={!canEdit}
                  state={row.costCenterId ? String(row.costCenterId) : ""} placeholder="Sem centro padrão" clearable
                  onChange={(_, value) => save({ ...row, costCenterId: value ? Number(value) : null })} />
              </div>
            </div>
          ))}
          {canEdit && pending > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded border p-3">
              <p className="text-sm">
                {pending} recebível(is) de inscrição foram criados antes desta configuração e estão sem conta.
              </p>
              <ConfirmDialog
                title="Classificar os recebíveis antigos?"
                description="Aplica a conta e o centro de custo padrão de inscrição aos recebíveis de inscrição que estão sem classificação. Quem já tem classificação não é alterado."
                onConfirm={() => apply()}
              >
                <Button type="button" variant="outline" disabled={applying}>Classificar antigos</Button>
              </ConfirmDialog>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
