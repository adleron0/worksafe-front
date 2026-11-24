import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import Icon from "@/components/general-components/Icon";
import { Kpi, moneyShort, pct } from "./-dashboard/ui";
import {
  ActionsCard,
  CashFlowCard,
  ClassesCard,
  FunnelCard,
  GoalCard,
  OrdersCard,
  OverdueCard,
  RevenueByAreaCard,
  StalledCard,
  StockCard,
  TeamCard,
  WeekCard,
} from "./-dashboard/cards";
import type { Dashboard } from "./-dashboard/types";

export const Route = createFileRoute("/_authenticated/home")({
  component: Home,
});

/**
 * Tela inicial do gestor. Cada seção vem de `GET /dashboard`, que só devolve o
 * que a pessoa pode ver; "Precisa de você" vem da Minha esteira (`my-pipeline`).
 */
function Home() {
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["dashboard"],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => (await api.get<Dashboard>("dashboard")).data,
  });

  const month = new Date().toLocaleDateString("pt-BR", { month: "long" });

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-sm text-muted-foreground">
        <Icon name="cloud-off" className="w-8 h-8" />
        Não foi possível carregar o resumo da empresa.
        <button type="button" onClick={() => refetch()} className="text-primary hover:underline">Tentar de novo</button>
      </div>
    );
  }

  const { finance, commercial, operations, team, training, week } = data;
  const kpis = [
    finance && (
      <Kpi
        key="profit"
        label="Lucro do mês"
        value={moneyShort(finance.profit.value)}
        hint={finance.profit.margin === null ? "sem receita no mês" : `margem ${pct(finance.profit.margin)}${finance.profit.marginDelta !== null ? ` · ${finance.profit.marginDelta >= 0 ? "+" : ""}${Math.round(finance.profit.marginDelta * 100)} p.p.` : ""}`}
        hintTone={finance.profit.value < 0 ? "danger" : finance.profit.marginDelta !== null && finance.profit.marginDelta < 0 ? "warning" : "success"}
        trend={finance.profit.trend}
        link={finance.profit.link}
      />
    ),
    finance && (
      <Kpi
        key="cash"
        label="Caixa daqui a 30 dias"
        value={moneyShort(finance.cash.projected30)}
        hint={`hoje ${moneyShort(finance.cash.today)} · +${moneyShort(finance.cash.in30)} −${moneyShort(finance.cash.out30)}`}
        hintTone={finance.cash.projected30 < 0 ? "danger" : "muted"}
        trend={finance.cash.trend}
        link={finance.cash.link}
      />
    ),
    commercial && (
      <Kpi
        key="weighted"
        label="Carteira comercial ponderada"
        value={moneyShort(commercial.weighted)}
        hint={`${moneyShort(commercial.open)} em ${commercial.openCount} ${commercial.openCount === 1 ? "proposta" : "propostas"} × chance`}
        trend={commercial.trend}
        trendColor="#2563eb"
        link={commercial.link}
      />
    ),
    operations && (
      <Kpi
        key="backlog"
        label="Serviço contratado a executar"
        value={moneyShort(operations.backlog.value)}
        hint={`${operations.backlog.count} ${operations.backlog.count === 1 ? "obra aberta" : "obras abertas"}`}
        trend={operations.backlog.trend}
        trendColor="#7c3aed"
        link={operations.link}
      />
    ),
  ].filter(Boolean);

  const nothing = !finance && !commercial && !operations && !team && !training && !week?.length && !data.stock;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-baseline gap-2">
        <h1 className="text-lg font-semibold">Resumo de {month}</h1>
        <span className="text-xs text-muted-foreground">
          dia {data.monthDay} de {data.monthDays} · atualizado às {new Date(dataUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* Linha 1: o que pede ação + indicadores */}
      <div className="grid gap-4 xl:grid-cols-3">
        <ActionsCard />
        {kpis.length > 0 && (
          <div className={`grid gap-4 content-start sm:grid-cols-2 xl:col-span-2 ${kpis.length > 2 ? "lg:grid-cols-4 xl:grid-cols-2" : ""}`}>{kpis}</div>
        )}
      </div>

      {finance && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2"><CashFlowCard cashFlow={finance.cashFlow} /></div>
          <OverdueCard overdue={finance.overdue} />
        </div>
      )}

      {(commercial || finance) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {commercial && <FunnelCard commercial={commercial} />}
          {commercial && <StalledCard commercial={commercial} />}
          {finance && <GoalCard goal={finance.goal} monthDay={data.monthDay} monthDays={data.monthDays} />}
        </div>
      )}

      {(operations || finance) && (
        <div className="grid gap-4 lg:grid-cols-3">
          {operations && <div className={finance ? "lg:col-span-2" : "lg:col-span-3"}><OrdersCard operations={operations} /></div>}
          {finance && <div className={operations ? "" : "lg:col-span-3"}><RevenueByAreaCard areas={finance.revenueByArea} link="/financeiro/relatorios" /></div>}
        </div>
      )}

      {(team || training || week || data.stock) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.stock && <StockCard stock={data.stock} />}
          {team && <TeamCard team={team} />}
          {training && <ClassesCard training={training} />}
          {week && <WeekCard week={week} today={data.today} />}
        </div>
      )}

      {nothing && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Seu perfil ainda não tem acesso a nenhum resumo. Use o menu ao lado para abrir suas telas.
        </p>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  const box = "rounded-card border bg-card animate-pulse";
  return (
    <div className="space-y-4">
      <div className="h-6 w-56 rounded bg-muted animate-pulse" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${box} h-56`} />
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">{[0, 1, 2, 3].map((i) => <div key={i} className={`${box} h-24`} />)}</div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3"><div className={`${box} h-72 lg:col-span-2`} /><div className={`${box} h-72`} /></div>
    </div>
  );
}
