import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import StatusBadge from "@/components/general-components/StatusBadge";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { FINANCIAL_ABILITY } from "../-shared/financial";
import { Payable } from "../-shared/payables";
import { useBackToList } from "@/hooks/use-back-to-list";
import PayableForm from "./-PayableForm";

export const Route = createFileRoute("/_authenticated/financeiro/_pagar/pagar_/$payableId")({
  component: EditPayable,
});

/** Edição de uma conta a pagar, em tela cheia. */
function EditPayable() {
  const { can } = useVerify();
  const { payableId } = Route.useParams();
  const back = useBackToList("/financeiro/pagar");
  const { data, isLoading, isError } = useQuery<Payable | undefined>({
    queryKey: ["financialPayable", payableId],
    queryFn: () => get<Payable>("financial-payables", payableId),
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
  });
  if (!can(`view_${FINANCIAL_ABILITY}`)) return null;
  const badge = data && (data.inactiveAt ? <StatusBadge>Excluída</StatusBadge> : data.status === "paga" ? <StatusBadge tone="success">Paga</StatusBadge> : <StatusBadge tone="primary">Em aberto</StatusBadge>);
  return (
    <>
      <FormPageHeader backTo="/financeiro/pagar" backLabel="Contas a pagar" title={data ? `Conta a pagar #${data.id}` : "Conta a pagar"}
        description="Altere os dados da conta." badge={badge} />
      {isLoading ? <FormPageSkeleton />
        : isError || !data ? <EmptyState icon="search-x" title="Conta não encontrada." />
          : <PayableForm key={data.id} formData={data} close={back} />}
    </>
  );
}
