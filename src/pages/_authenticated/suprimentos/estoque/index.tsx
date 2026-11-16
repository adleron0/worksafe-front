import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import { errorMessage, money } from "../../comercial/-shared/commercial";
import { Overview, STOCK_ABILITY, STOCK_KEYS, stockApi } from "../-shared/stock";

export const Route = createFileRoute("/_authenticated/suprimentos/estoque/")({
  component: StockOverviewPage,
});

interface Card { icon: string; label: string; value: string; hint: string; alert?: boolean }

/** Painel do almoxarifado: o que pede atenção, cada cartão leva à lista filtrada. */
function StockOverviewPage() {
  const { can } = useVerify();
  const { data, isLoading, error } = useQuery({ queryKey: [STOCK_KEYS.overview], queryFn: () => stockApi.get<Overview>("overview") });
  if (!can(`view_${STOCK_ABILITY}`)) return null;

  const box = "flex flex-col gap-1 rounded-lg border p-4 h-full transition-colors";
  const cards: Array<Card & { to?: string; search?: Record<string, string> }> = data ? [
    { icon: "triangle-alert", label: "Abaixo do mínimo", value: String(data.low), hint: "Itens com saldo disponível menor que o mínimo", alert: data.low > 0, to: "/suprimentos/estoque/itens", search: { low: "1" } },
    { icon: "hard-hat", label: "Obras com material", value: String(data.atOrders), hint: "OS com material ou equipamento na obra agora", to: "/suprimentos/estoque/saldos", search: { holderType: "os" } },
    { icon: "package-check", label: "Recebimentos pendentes", value: String(data.pendingReceipts), hint: "Pedidos comprados com itens do estoque ainda por receber", alert: data.pendingReceipts > 0, to: "/suprimentos/pedidos-de-compra" },
    { icon: "users", label: "Peças fora", value: String(data.outside), hint: "Com funcionários, em locação ou no fornecedor", to: "/suprimentos/estoque/saldos", search: { outside: "1" } },
    { icon: "list-checks", label: "Inspeções", value: String(data.inspections), hint: "Peças com inspeção vencida ou a vencer em 30 dias (tela de Equipamentos na próxima etapa)", alert: data.inspections > 0 },
    { icon: "gauge", label: "Calibrações", value: String(data.calibrations), hint: "Instrumentos com calibração vencida ou a vencer em 30 dias", alert: data.calibrations > 0 },
    { icon: "handshake", label: "Locações ativas", value: String(data.rentalsActive), hint: data.rentalsLate ? `${data.rentalsLate} atrasada(s)` : "Nenhuma atrasada", alert: data.rentalsLate > 0 },
    ...(data.value !== null ? [{ icon: "wallet", label: "Valor em estoque", value: money(data.value), hint: "Saldo de todos os itens pelo custo médio", to: "/suprimentos/estoque/itens" }] : []),
  ] : [];

  return (
    <>
      <div>
        <h1 className="text-xl font-bold">Estoque</h1>
        <p className="text-sm text-muted-foreground">O que pede atenção no almoxarifado. Clique num cartão para ver a lista.</p>
      </div>
      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      <div className="mt-4 grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {isLoading && Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        {cards.map((card) => {
          const body = (
            <>
              <span className="flex items-center gap-2 text-sm text-muted-foreground"><Icon name={card.icon} className="w-4 h-4" /> {card.label}</span>
              <span className={cn("text-2xl font-bold tabular-nums", card.alert && "text-red-600 dark:text-red-400")}>{card.value}</span>
              <span className="text-xs text-muted-foreground">{card.hint}</span>
            </>
          );
          return card.to
            ? <Link key={card.label} to={card.to as never} search={card.search as never} className={cn(box, "hover:bg-muted/40")}>{body}</Link>
            : <div key={card.label} className={box}>{body}</div>;
        })}
      </div>
      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link to="/suprimentos/estoque/itens" className="rounded border px-3 py-1.5 hover:bg-muted/40 inline-flex items-center gap-2"><Icon name="package" className="w-4 h-4" /> Itens</Link>
        <Link to="/suprimentos/estoque/saldos" className="rounded border px-3 py-1.5 hover:bg-muted/40 inline-flex items-center gap-2"><Icon name="boxes" className="w-4 h-4" /> Saldos</Link>
        <Link to="/suprimentos/estoque/movimentacoes" className="rounded border px-3 py-1.5 hover:bg-muted/40 inline-flex items-center gap-2"><Icon name="arrow-left-right" className="w-4 h-4" /> Movimentações</Link>
        <Link to="/suprimentos/compras/reposicao" className="rounded border px-3 py-1.5 hover:bg-muted/40 inline-flex items-center gap-2"><Icon name="list-restart" className="w-4 h-4" /> Reposição</Link>
      </div>
    </>
  );
}
