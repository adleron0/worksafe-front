import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader } from "@/components/general-components/FormPage";
import InvoiceForm from "./-components/InvoiceForm";

export const Route = createFileRoute("/_authenticated/financeiro/_notas/notas_/nova")({
  validateSearch: (search: Record<string, unknown>): { externa?: string } => ({ externa: search.externa === "1" || search.externa === 1 ? "1" : undefined }),
  component: NewInvoice,
});

/** Nota nova (avulsa) ou registro de nota emitida fora do sistema, em tela cheia. */
function NewInvoice() {
  const { can } = useVerify();
  const { externa } = Route.useSearch();
  const external = externa === "1";
  if (!can("emitir_nfse")) return null;
  return (
    <>
      <FormPageHeader backTo="/financeiro/notas" backLabel="Notas fiscais" title={external ? "Registrar nota emitida fora" : "Nova nota fiscal"}
        description={external ? "A nota já existe: registre para ela entrar no financeiro." : "Nota fiscal de serviço avulsa: tomador, serviço e valor. A prévia ao lado mostra o líquido e o que falta."} />
      <InvoiceForm key={external ? "externa" : "nova"} invoice={null} external={external} />
    </>
  );
}
