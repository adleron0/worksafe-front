import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { errorMessage } from "../../comercial/-shared/commercial";
import { OriginDraft } from "./-shared/fiscal";
import InvoiceForm from "./-components/InvoiceForm";

type Search = { externa?: string; origem?: string; contrato?: string; parcelas?: string; boletim?: string; ol?: string };
const str = (v: unknown) => (v === undefined || v === null || v === "" ? undefined : String(v));

export const Route = createFileRoute("/_authenticated/financeiro/_notas/notas_/nova")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    externa: search.externa === "1" || search.externa === 1 ? "1" : undefined,
    origem: str(search.origem), contrato: str(search.contrato), parcelas: str(search.parcelas), boletim: str(search.boletim), ol: str(search.ol),
  }),
  component: NewInvoice,
});

/** Nota nova: avulsa, de uma origem (parcela, boletim de obra, OL) ou registro de nota emitida fora. */
function NewInvoice() {
  const { can } = useVerify();
  const search = Route.useSearch();
  const external = search.externa === "1";
  const fromOrigin = !!search.origem && !!search.contrato;
  const { data: draft, isLoading, error } = useQuery({
    queryKey: ["fiscalFromOrigin", search.origem, search.contrato, search.parcelas, search.boletim, search.ol],
    queryFn: async () => (await api.get<OriginDraft>("fiscal/invoices/from-origin", {
      params: { kind: search.origem, contractId: search.contrato, installmentIds: search.parcelas, measurementId: search.boletim, rentalId: search.ol },
    })).data,
    enabled: fromOrigin && can("emitir_nfse"),
    retry: false,
  });
  if (!can("emitir_nfse")) return null;
  return (
    <>
      <FormPageHeader backTo="/financeiro/notas" backLabel="Notas fiscais"
        title={external ? "Registrar nota emitida fora" : fromOrigin ? "Nota fiscal do faturamento" : "Nova nota fiscal"}
        description={external ? "A nota já existe: registre para ela entrar no financeiro."
          : fromOrigin ? (draft?.originLabel ?? "Carregando a origem…")
          : "Nota fiscal de serviço avulsa: tomador, serviço e valor. A prévia ao lado mostra o líquido e o que falta."} />
      {fromOrigin && isLoading && <FormPageSkeleton />}
      {fromOrigin && error && <p className="text-destructive">{errorMessage(error)}</p>}
      {(!fromOrigin || draft) && <InvoiceForm key={external ? "externa" : draft ? `origem-${draft.originLabel}` : "nova"} invoice={null} external={external} draft={draft ?? null} />}
    </>
  );
}
