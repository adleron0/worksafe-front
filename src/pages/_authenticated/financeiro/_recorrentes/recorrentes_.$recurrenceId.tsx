import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import StatusBadge from "@/components/general-components/StatusBadge";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { useBackToList } from "@/hooks/use-back-to-list";
import { FINANCIAL_ABILITY } from "../-shared/financial";
import RecurrenceForm, { Recurrence } from "./-components/RecurrenceForm";

export const Route = createFileRoute("/_authenticated/financeiro/_recorrentes/recorrentes_/$recurrenceId")({
  component: EditRecurrence,
});

/** Edição de um recorrente, em tela cheia. A API não tem GET por id: o registro sai da mesma listagem da tela. */
function EditRecurrence() {
  const { can } = useVerify();
  const { recurrenceId } = Route.useParams();
  const back = useBackToList("/financeiro/recorrentes");
  const { data, isLoading, isError } = useQuery<Recurrence | null>({
    queryKey: ["financialRecurrence", recurrenceId],
    queryFn: async () => ((await get<Recurrence[]>("financial", "recurrences")) ?? []).find((r) => String(r.id) === recurrenceId) ?? null,
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
  });
  if (!can(`update_${FINANCIAL_ABILITY}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/financeiro/recorrentes" backLabel="Recorrentes" title={data ? data.description : "Editar recorrente"}
        description="A mudança vale para os lançamentos em aberto de hoje em diante. Os já vencidos e os pagos não mudam."
        badge={data && (data.inactiveAt ? <StatusBadge>Encerrado</StatusBadge> : <StatusBadge tone="primary">{data.kind === "payable" ? "A pagar" : "A receber"}</StatusBadge>)} />
      {isLoading ? <FormPageSkeleton />
        : isError || !data ? <EmptyState icon="search-x" title="Recorrente não encontrado." />
          : data.inactiveAt ? <EmptyState title="Este recorrente foi encerrado." description="Recorrentes encerrados não podem ser editados." />
            : <RecurrenceForm key={data.id} kind={data.kind} item={data} close={back} />}
    </>
  );
}
