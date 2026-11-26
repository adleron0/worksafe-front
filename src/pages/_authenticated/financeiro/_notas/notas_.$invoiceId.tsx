import { EntityBadge } from "@/components/general-components/EntitySelect";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import StatusBadge from "@/components/general-components/StatusBadge";
import TagBadge from "@/components/general-components/TagBadge";
import { errorMessage } from "../../comercial/-shared/commercial";
import { FISCAL_KEYS, Invoice, STATUS_INFO } from "./-shared/fiscal";
import InvoiceForm from "./-components/InvoiceForm";
import InvoiceView from "./-components/InvoiceView";

export const Route = createFileRoute("/_authenticated/financeiro/_notas/notas_/$invoiceId")({
  component: InvoicePage,
});

/** Rascunho e rejeitada abrem no formulário; as outras situações abrem na ficha. */
function InvoicePage() {
  const { can } = useVerify();
  const { invoiceId } = Route.useParams();
  const id = Number(invoiceId);
  const { data, isLoading, error } = useQuery({
    queryKey: [FISCAL_KEYS.invoice, id],
    queryFn: async () => (await api.get<Invoice>(`fiscal/invoices/${id}`)).data,
    enabled: can("view_nfse") && !!id,
  });
  if (!can("view_nfse")) return null;
  const editable = data && (data.status === "rascunho" || data.status === "rejeitada") && can("emitir_nfse");
  const title = data ? (data.number ? `Nota fiscal nº ${data.number}` : data.replacesId ? "Nota substituta (rascunho)" : data.status === "rejeitada" ? "Nota rejeitada" : "Rascunho de nota fiscal") : "Nota fiscal";
  return (
    <>
      <FormPageHeader backTo="/financeiro/notas" backLabel="Notas fiscais" title={title}
        badge={data && (
          <span className="flex items-center gap-1.5">
            <StatusBadge tone={STATUS_INFO[data.status].tone} pulse={STATUS_INFO[data.status].pulse}>{STATUS_INFO[data.status].label}</StatusBadge>
            {data.environment === "restrita" && data.provider === "sefin" && <TagBadge>ambiente de testes</TagBadge>}
            <EntityBadge entity={data.entity ?? null} id={data.entityId} />
          </span>
        )}
        description={data ? data.taker.name : undefined} />
      {isLoading && <FormPageSkeleton />}
      {error && <p className="text-destructive">{errorMessage(error)}</p>}
      {data && (editable ? <InvoiceForm key={`${data.id}-${data.status}`} invoice={data} /> : <InvoiceView invoice={data} />)}
    </>
  );
}
