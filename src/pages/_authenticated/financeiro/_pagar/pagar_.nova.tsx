import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { FINANCIAL_ABILITY } from "../-shared/financial";
import { Payable } from "../-shared/payables";
import { useBackToList } from "@/hooks/use-back-to-list";
import PayableForm from "./-PayableForm";

export const Route = createFileRoute("/_authenticated/financeiro/_pagar/pagar_/nova")({
  component: NewPayable,
  validateSearch: (search: Record<string, unknown>): { duplicar?: string } => (search.duplicar ? { duplicar: String(search.duplicar) } : {}),
});

/** Nova conta a pagar (ou cópia de uma existente, com ?duplicar=ID). */
function NewPayable() {
  const { can } = useVerify();
  const { duplicar } = Route.useSearch();
  const back = useBackToList("/financeiro/pagar");
  const { data: source, isLoading } = useQuery<Payable | undefined>({
    queryKey: ["financialPayable", duplicar],
    queryFn: () => get<Payable>("financial-payables", String(duplicar)),
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
    enabled: Boolean(duplicar),
  });
  if (!can(`create_${FINANCIAL_ABILITY}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/financeiro/pagar" backLabel="Contas a pagar"
        title={duplicar ? "Duplicar conta a pagar" : "Nova conta a pagar"}
        description={duplicar ? "Uma conta nova com os mesmos dados; ajuste o que mudar." : "Lance uma conta, um parcelamento ou uma despesa fixa."} />
      {duplicar && isLoading ? <FormPageSkeleton />
        : <PayableForm key={duplicar ?? "new"} formData={duplicar ? source ?? null : null} duplicate={Boolean(duplicar)} close={back} />}
    </>
  );
}
