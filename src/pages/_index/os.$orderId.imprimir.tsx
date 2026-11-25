import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import { OrderSheet, OrderSheetData } from "../_authenticated/servicos/-shared/sheet";

type Search = { valores?: 1; auto?: 1 };
export const Route = createFileRoute("/_index/os/$orderId/imprimir")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(String(search.valores) === "1" ? { valores: 1 as const } : {}),
    ...(String(search.auto) === "1" ? { auto: 1 as const } : {}),
  }),
  component: PrintOrderPage,
});

/**
 * Impressão da OS: só a folha, sem o menu do sistema. "Com valores" pede a
 * permissão (a API recusa sem ela). Com `auto=1` abre o diálogo de impressão
 * assim que a folha carrega.
 */
function PrintOrderPage() {
  const { orderId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const withValues = search.valores === 1;
  const { data, isLoading, error } = useQuery({
    queryKey: ["serviceOrderSheet", orderId, withValues], retry: false,
    queryFn: async () => (await api.get<OrderSheetData>(`service-orders/${orderId}/document`, { params: withValues ? { values: 1 } : {} })).data,
  });
  const printed = useRef(false);
  useEffect(() => {
    if (!data || printed.current || search.auto !== 1) return;
    printed.current = true;
    // espera as imagens (logo, QR) entrarem antes de abrir a impressão
    const timer = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(timer);
  }, [data, search.auto]);

  if (isLoading) return <div className="max-w-4xl mx-auto p-4 grid gap-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-[80vh] w-full" /></div>;
  if (error || !data) {
    const text = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
    return (
      <div className="max-w-xl mx-auto p-6 mt-16 text-center">
        <h1 className="text-xl font-bold">Não foi possível abrir a OS para imprimir</h1>
        <p className="text-muted-foreground mt-2">{text || "Entre no sistema e abra a impressão pela ordem de serviço."}</p>
        <Link to="/servicos/ordens-de-servico/$orderId" params={{ orderId }} className="underline text-sm mt-4 inline-block">Voltar para a OS</Link>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-muted/40 print:bg-white">
      <div className="no-print sticky top-0 z-10 border-b bg-background">
        <div className="max-w-[860px] mx-auto px-4 py-2 flex flex-wrap items-center gap-2">
          <Link to="/servicos/ordens-de-servico/$orderId" params={{ orderId }} className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1 mr-auto">
            <Icon name="arrow-left" className="w-4 h-4" /> Voltar para a OS {data.order.number}
          </Link>
          {data.canSeeValues && (
            <div className="inline-flex rounded-md border p-0.5 text-sm" role="group" aria-label="Valores na folha">
              <button type="button" className={`rounded px-2.5 py-1 ${!withValues ? "bg-primary text-primary-foreground" : ""}`} onClick={() => navigate({ search: {} })}>Sem valores</button>
              <button type="button" className={`rounded px-2.5 py-1 ${withValues ? "bg-primary text-primary-foreground" : ""}`} onClick={() => navigate({ search: { valores: 1 } })}>Com valores</button>
            </div>
          )}
          <Button type="button" size="sm" onClick={() => window.print()}><Icon name="printer" className="w-4 h-4 mr-1" /> Imprimir ou salvar em PDF</Button>
        </div>
      </div>
      <main className="max-w-[860px] mx-auto p-4 print:p-0">
        <OrderSheet data={data} />
      </main>
    </div>
  );
}
