import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_index/negociacao/$key")({
  component: PublicDealPage,
});

type Status = "enviada" | "visualizada" | "aceita" | "recusada" | "expirada" | "cancelada" | "rascunho" | "substituida";
interface PublicDeal {
  number: string; title: string; customer: string; condition: "todas" | "marcadas" | null; discount: number; total: number;
  brand: { logoUrl: string | null; color: string } | null;
  proposals: Array<{ number: string; title: string; kind: "servico" | "treinamento" | "locacao"; status: Status; total: number; dealDiscount: number; required: boolean; key: string }>;
}
const KIND: Record<string, string> = { servico: "Serviço", treinamento: "Treinamento", locacao: "Locação" };
const STATUS: Record<string, string> = { enviada: "Aguardando sua decisão", visualizada: "Aguardando sua decisão", aceita: "Aceita", recusada: "Recusada", expirada: "Validade vencida", cancelada: "Cancelada" };
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Link único da negociação: o cliente vê as propostas juntas e abre cada uma
 * para ler e aceitar (o aceite continua por proposta: cada uma vira um contrato).
 */
function PublicDealPage() {
  const { key } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["publicDeal", key], retry: false, refetchOnWindowFocus: false,
    queryFn: async () => (await api.get<PublicDeal>(`commercial/public/deals/${key}`)).data,
  });
  if (isLoading) return <div className="max-w-3xl mx-auto p-4 grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto p-6 mt-16 text-center">
        <h1 className="text-xl font-bold">Negociação não encontrada</h1>
        <p className="text-muted-foreground mt-2">O link pode estar incompleto ou não está mais disponível. Fale com quem enviou.</p>
      </div>
    );
  }
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 grid gap-6">
      <header className="grid gap-1">
        {data.brand?.logoUrl && <img src={data.brand.logoUrl} alt="" className="h-10 w-auto object-contain object-left" />}
        <p className="text-sm text-muted-foreground">{data.number}</p>
        <h1 className="text-2xl font-bold">{data.title}</h1>
        <p className="text-muted-foreground">{data.customer}</p>
      </header>
      <p className="text-sm">
        Estas são as propostas que preparamos para você. Abra cada uma para ler os detalhes e aceitar: cada proposta vira um contrato e uma nota fiscal próprios.
        {data.condition === "todas" && " O desconto pelo fechamento conjunto vale se todas forem aceitas."}
        {data.condition === "marcadas" && " O desconto pelo fechamento conjunto vale se as marcadas forem aceitas."}
      </p>
      {data.proposals.length === 0 ? <p className="rounded-lg border p-6 text-center text-muted-foreground">Nenhuma proposta disponível ainda.</p> : (
        <ul className="grid gap-3">
          {data.proposals.map((p) => (
            <li key={p.key} className="rounded-lg border p-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{KIND[p.kind] ?? p.kind} · {p.number}{p.required ? " · necessária para o desconto" : ""}</p>
                <p className="font-semibold">{p.title}</p>
                <p className="text-sm text-muted-foreground">{STATUS[p.status] ?? p.status}</p>
              </div>
              <div className="sm:text-right grid gap-1">
                <p className="text-lg font-bold tabular-nums">{money(p.total)}</p>
                {p.dealDiscount > 0 && <p className="text-xs text-muted-foreground">com {money(p.dealDiscount)} de desconto conjunto</p>}
                <Button asChild size="sm" variant={p.status === "enviada" || p.status === "visualizada" ? "default" : "outline"}>
                  <Link to="/proposta/$key" params={{ key: p.key }}>{p.status === "enviada" || p.status === "visualizada" ? "Ler e aceitar" : "Ver proposta"}</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-lg border p-4 flex flex-wrap justify-between gap-2">
        <span className="text-muted-foreground">Total das propostas</span>
        <span className="text-lg font-bold tabular-nums">{money(data.total)}</span>
      </div>
    </div>
  );
}
