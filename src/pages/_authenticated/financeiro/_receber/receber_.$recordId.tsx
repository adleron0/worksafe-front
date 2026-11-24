import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import StatusBadge from "@/components/general-components/StatusBadge";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { FINANCIAL_ABILITY } from "../-shared/financial";
import { useBackToList } from "@/hooks/use-back-to-list";
import Form from "./-components/FinancialRecordsForm";
import { RECEIVABLE_ENTITY } from "./-components/entity";
import { IFinancialRecord } from "./-interfaces/entity.interface";
import { receivableStatus } from "./-components/receivableColumns";

export const Route = createFileRoute("/_authenticated/financeiro/_receber/receber_/$recordId")({
  component: EditReceivable,
});

/** Edição de uma conta a receber (ou só a nota fiscal, quando a cobrança é do gateway), em tela cheia. */
function EditReceivable() {
  const { can } = useVerify();
  const { recordId } = Route.useParams();
  const back = useBackToList("/financeiro/receber");
  const { data, isLoading, isError } = useQuery<IFinancialRecord | undefined>({
    queryKey: ["financialRecord", recordId],
    queryFn: () => get<IFinancialRecord>("financial-records", recordId),
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
  });
  if (!can(`view_${FINANCIAL_ABILITY}`)) return null;
  const status = data && (data.inactiveAt ? { label: "Inativa", tone: "neutral" as const } : receivableStatus(data));
  return (
    <>
      <FormPageHeader backTo="/financeiro/receber" backLabel="Contas a receber" title={data ? `Conta a receber #${data.id}` : "Conta a receber"}
        description={data && data.gateway !== "manual" ? "Cobrança do gateway: registre a nota fiscal e as anotações." : "Altere os dados da conta."}
        badge={status && <StatusBadge tone={status.tone}>{status.label}</StatusBadge>} />
      {isLoading ? <FormPageSkeleton />
        : isError || !data ? <EmptyState icon="search-x" title="Conta não encontrada." />
          : <Form key={data.id} formData={data} setOpenForm={() => back()} entity={RECEIVABLE_ENTITY} />}
    </>
  );
}
