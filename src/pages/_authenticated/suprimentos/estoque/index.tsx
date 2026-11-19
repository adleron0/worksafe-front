import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import { errorMessage, money } from "../../comercial/-shared/commercial";
import { Overview, PERM_ADJUST, PERM_MOVE, STOCK_ABILITY, STOCK_KEYS, stockApi } from "../-shared/stock";
import { NewMovementDialog } from "../-shared/stock-movements";

export const Route = createFileRoute("/_authenticated/suprimentos/estoque/")({
  component: StockOverviewPage,
});

interface Card { icon: string; label: string; value: string; hint: string; alert?: boolean }

/** Painel do almoxarifado: o que pede atenção, cada cartão leva à lista filtrada. */
function StockOverviewPage() {
  const { can } = useVerify();
  const [entering, setEntering] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: [STOCK_KEYS.overview], queryFn: () => stockApi.get<Overview>("overview") });
  if (!can(`view_${STOCK_ABILITY}`)) return null;
  // o que se faz no dia a dia, em botões grandes
  const actions: Array<{ icon: string; label: string; hint: string; onClick?: () => void; to?: string; search?: Record<string, string> }> = [
    ...(can(PERM_MOVE) || can(PERM_ADJUST) ? [{ icon: "package-plus", label: "Dar entrada", hint: "Chegou material sem pedido de compra", onClick: () => setEntering(true) }] : []),
    ...(can("create_entregas_epi") ? [{ icon: "hard-hat", label: "Entregar EPI", hint: "Com assinatura do funcionário", to: "/suprimentos/estoque/epi" }] : []),
    ...(can(PERM_ADJUST) ? [{ icon: "clipboard-check", label: "Nova contagem", hint: "Inventário de um local", to: "/suprimentos/estoque/inventario", search: { novo: "1" } }] : []),
    { icon: "list-restart", label: "Reposição", hint: "Itens abaixo do mínimo e pedido de compra", to: "/suprimentos/compras/reposicao" },
  ];

  const box = "flex flex-col gap-1 rounded-lg border p-4 h-full transition-colors";
  const cards: Array<Card & { to?: string; search?: Record<string, string> }> = data ? [
    { icon: "triangle-alert", label: "Abaixo do mínimo", value: String(data.low), hint: "Itens com saldo disponível menor que o mínimo", alert: data.low > 0, to: "/suprimentos/estoque/itens", search: { low: "1" } },
    { icon: "hard-hat", label: "Obras com material", value: String(data.atOrders), hint: "OS com material ou equipamento na obra agora", to: "/suprimentos/estoque/saldos", search: { holderType: "os" } },
    { icon: "package-check", label: "Recebimentos pendentes", value: String(data.pendingReceipts), hint: "Pedidos comprados com itens do estoque ainda por receber", alert: data.pendingReceipts > 0, to: "/suprimentos/pedidos-de-compra", search: { status: "comprado" } },
    { icon: "users", label: "Peças fora", value: String(data.outside), hint: "Com funcionários, em locação ou no fornecedor", to: "/suprimentos/estoque/saldos", search: { outside: "1" } },
    { icon: "list-checks", label: "Inspeções", value: String(data.inspections), hint: "Peças com inspeção vencida ou a vencer em 30 dias", alert: data.inspections > 0, to: "/suprimentos/equipamentos/inspecoes" },
    { icon: "gauge", label: "Calibrações", value: String(data.calibrations), hint: "Instrumentos com calibração vencida ou a vencer em 30 dias", alert: data.calibrations > 0, to: "/suprimentos/equipamentos/calibracao" },
    { icon: "handshake", label: "Ordens de locação ativas", value: String(data.rentalsActive), hint: data.rentalsLate ? `${data.rentalsLate} atrasada(s)` : "Nenhuma atrasada", alert: data.rentalsLate > 0, to: "/suprimentos/locacoes" },
    ...(data.value !== null ? [{ icon: "wallet", label: "Valor em estoque", value: money(data.value), hint: "Saldo de todos os itens pelo custo médio", to: "/suprimentos/estoque/itens" }] : []),
  ] : [];

  return (
    <>
      <div>
        <h1 className="text-xl font-bold">Estoque</h1>
        <p className="text-sm text-muted-foreground">O que fazer agora e o que pede atenção no almoxarifado.</p>
      </div>
      {actions.length > 0 && (
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {actions.map((action) => {
            const body = (
              <>
                <Icon name={action.icon} className="w-6 h-6 text-primary" />
                <span className="font-semibold">{action.label}</span>
                <span className="text-xs text-muted-foreground hidden sm:block">{action.hint}</span>
              </>
            );
            const box = "flex flex-col items-start gap-1 rounded-lg border-2 border-primary/30 p-4 text-left hover:bg-primary/5 transition-colors";
            return action.onClick
              ? <button key={action.label} type="button" className={box} onClick={action.onClick}>{body}</button>
              : <Link key={action.label} to={action.to as never} search={action.search as never} className={box}>{body}</Link>;
          })}
        </div>
      )}
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
        <Link to="/suprimentos/estoque/relatorios" className="rounded border px-3 py-1.5 hover:bg-muted/40 inline-flex items-center gap-2"><Icon name="chart-column" className="w-4 h-4" /> Relatórios</Link>
        <Link to="/suprimentos/estoque/saldos" className="rounded border px-3 py-1.5 hover:bg-muted/40 inline-flex items-center gap-2"><Icon name="boxes" className="w-4 h-4" /> Ver por local</Link>
      </div>
      {entering && <NewMovementDialog initialType="entrada" onClose={() => setEntering(false)} />}
    </>
  );
}
