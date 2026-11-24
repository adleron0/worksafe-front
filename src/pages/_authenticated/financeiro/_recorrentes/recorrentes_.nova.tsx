import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader } from "@/components/general-components/FormPage";
import { useBackToList } from "@/hooks/use-back-to-list";
import { FINANCIAL_ABILITY } from "../-shared/financial";
import RecurrenceForm from "./-components/RecurrenceForm";

export const Route = createFileRoute("/_authenticated/financeiro/_recorrentes/recorrentes_/nova")({
  component: NewRecurrence,
  validateSearch: (search: Record<string, unknown>): { tipo?: string } => (search.tipo === "receivable" ? { tipo: "receivable" } : {}),
});

/** Novo recorrente: despesa fixa (a pagar) ou mensalidade (a receber, com ?tipo=receivable). */
function NewRecurrence() {
  const { can } = useVerify();
  const { tipo } = Route.useSearch();
  const back = useBackToList("/financeiro/recorrentes");
  const kind = tipo === "receivable" ? "receivable" : "payable";
  if (!can(`create_${FINANCIAL_ABILITY}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/financeiro/recorrentes" backLabel="Recorrentes"
        title={kind === "payable" ? "Nova despesa fixa" : "Nova mensalidade"}
        description="Lance uma vez; o sistema cria um lançamento por mês." />
      <RecurrenceForm key={kind} kind={kind} item={null} close={back} />
    </>
  );
}
