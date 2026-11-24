import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader } from "@/components/general-components/FormPage";
import { FINANCIAL_ABILITY } from "../-shared/financial";
import { useBackToList } from "@/hooks/use-back-to-list";
import Form from "./-components/FinancialRecordsForm";
import { RECEIVABLE_ENTITY } from "./-components/entity";

export const Route = createFileRoute("/_authenticated/financeiro/_receber/receber_/nova")({
  component: NewReceivable,
});

/** Nova conta a receber avulsa, em tela cheia. */
function NewReceivable() {
  const { can } = useVerify();
  const back = useBackToList("/financeiro/receber");
  if (!can(`create_${FINANCIAL_ABILITY}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/financeiro/receber" backLabel="Contas a receber" title="Nova conta a receber"
        description="Lance uma conta a receber avulsa. Mensalidade fixa? Use Recorrentes." />
      <Form formData={null} setOpenForm={() => back()} entity={RECEIVABLE_ENTITY} />
    </>
  );
}
