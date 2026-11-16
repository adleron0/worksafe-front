import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Area, CartesianGrid, ComposedChart, Line, Pie, PieChart, ReferenceDot, XAxis, YAxis, Cell } from "recharts";
import api from "@/services/api";
import Icon from "@/components/general-components/Icon";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { Empty, linkTo, Meter, moneyShort, Panel, pct, RowLink, shortDate, toneText } from "./ui";
import type { CommercialSection, Dashboard, FinanceSection, OperationsSection, StockSection, TeamSection, TrainingSection, WeekItem } from "./types";

/* ------------------------------------------------------------------ */
/* Precisa de você — reaproveita a "Minha esteira" (my-pipeline)       */
/* ------------------------------------------------------------------ */

interface PipelineBlock { key: string; area: string; title: string; hint: string; count: number; total: number | null; link: string; items: { late: boolean }[] }
export const PIPELINE_KEY = "myPipeline";
const AREA_ICON: Record<string, string> = { Comercial: "handshake", "Operação": "drill", Suprimentos: "shopping-cart", Financeiro: "circle-dollar-sign", RH: "id-card", Empresa: "folder-open", Bots: "bot" };

export function ActionsCard() {
  const { data, isLoading } = useQuery({
    queryKey: [PIPELINE_KEY],
    staleTime: 60 * 1000,
    queryFn: async () => (await api.get<{ blocks: PipelineBlock[] }>("my-pipeline")).data,
  });
  if (isLoading) return <div className="rounded-xl border bg-card p-4 h-full animate-pulse" />;
  // quem não atua em nenhuma área da esteira não vê o cartão
  if (!data || data.blocks.length === 0) return null;
  const waiting = data.blocks.filter((block) => block.count > 0);
  const total = waiting.reduce((sum, block) => sum + block.count, 0);

  return (
    <Panel title="Precisa de você" icon="hand" aside={total || undefined} className="h-full">
      {waiting.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 py-6 text-sm text-muted-foreground">
          <Icon name="circle-check" className="w-6 h-6 text-emerald-600" />
          Nada esperando por você agora.
        </div>
      ) : (
        <ul className="divide-y">
          {waiting.map((block) => {
            const late = block.items.some((item) => item.late);
            return (
              <li key={block.key}>
                <Link {...linkTo(block.link)} className="flex items-center gap-3 py-2 text-sm hover:bg-muted/50 -mx-2 px-2 rounded-md">
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted", late && "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300")}>
                    <Icon name={AREA_ICON[block.area] ?? "circle"} className="w-3.5 h-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{block.title}</span>
                    <span className={cn("block text-xs truncate", late ? toneText("danger") : "text-muted-foreground")}>
                      {late ? "tem item atrasado" : block.hint}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block font-semibold tabular-nums">{block.count}</span>
                    {block.total !== null && <span className="block text-xs text-muted-foreground tabular-nums">{moneyShort(block.total)}</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Financeiro                                                          */
/* ------------------------------------------------------------------ */

const cashConfig = {
  real: { label: "Saldo realizado", color: "hsl(var(--primary))" },
  projected: { label: "Saldo projetado", color: "hsl(var(--primary) / 0.55)" },
} satisfies ChartConfig;

export function CashFlowCard({ cashFlow }: { cashFlow: FinanceSection["cashFlow"] }) {
  const { points, lowest } = cashFlow;
  const hasData = points.some((p) => p.real !== null || p.projected !== null);
  const lowPoint = lowest ? points.find((p) => p.key === lowest.key) : undefined;
  return (
    <Panel title="Caixa: realizado e próximos 60 dias" icon="chart-line" link={cashFlow.link} linkLabel="Abrir fluxo de caixa" className="h-full">
      {!hasData ? (
        <Empty>Sem movimento suficiente para desenhar o caixa.</Empty>
      ) : (
        <>
          <ChartContainer config={cashConfig} className="aspect-auto h-52 w-full">
            <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fill-real" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-real)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--color-real)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} minTickGap={16} />
              <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => moneyShort(v).replace("R$ ", "")} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => (
                <div className="flex w-full justify-between gap-4"><span className="text-muted-foreground">{cashConfig[name as keyof typeof cashConfig]?.label}</span><span className="font-medium tabular-nums">{moneyShort(Number(value))}</span></div>
              )} />} />
              <Area dataKey="real" type="monotone" stroke="var(--color-real)" strokeWidth={2} fill="url(#fill-real)" connectNulls={false} isAnimationActive={false} />
              <Line dataKey="projected" type="monotone" stroke="var(--color-projected)" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} isAnimationActive={false} />
              {lowPoint && lowest && <ReferenceDot x={lowPoint.label} y={lowest.value} r={5} fill="#f97316" stroke="hsl(var(--card))" strokeWidth={2} />}
            </ComposedChart>
          </ChartContainer>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-primary" />Realizado</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 border-t-2 border-dashed border-primary/60" />Projetado (a receber e a pagar)</span>
            {lowest && (
              <span className={cn("ml-auto flex items-center gap-1", lowest.value < 0 ? toneText("danger") : "")}>
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                Ponto mais baixo: {moneyShort(lowest.value)} em {lowest.label}
              </span>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}

export function OverdueCard({ overdue }: { overdue: FinanceSection["overdue"] }) {
  const { buckets, total } = overdue;
  const parts = [
    { key: "upTo15", label: "até 15 dias", value: buckets.upTo15, className: "bg-amber-400" },
    { key: "upTo30", label: "15 a 30", value: buckets.upTo30, className: "bg-orange-500" },
    { key: "over30", label: "mais de 30", value: buckets.over30, className: "bg-red-600" },
  ];
  return (
    <Panel title="Quem está devendo" icon="clock-alert" aside={total ? moneyShort(total) : undefined} link={overdue.link} linkLabel="Ver contas a receber" className="h-full">
      {total <= 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 py-6 text-sm text-muted-foreground">
          <Icon name="circle-check" className="w-6 h-6 text-emerald-600" />
          Nenhum título vencido.
        </div>
      ) : (
        <>
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
            {parts.filter((p) => p.value > 0).map((p) => <div key={p.key} className={p.className} style={{ flexGrow: p.value }} />)}
          </div>
          <div className="mt-1.5 mb-2 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            {parts.map((p) => (
              <span key={p.key} className="flex items-center gap-1"><span className={cn("h-2 w-2 rounded-sm", p.className)} />{p.label} {moneyShort(p.value)}</span>
            ))}
          </div>
          <ul className="divide-y">
            {overdue.items.map((item) => (
              <RowLink key={item.id} link={item.link} detail={`${item.days} dias`} value={moneyShort(item.value)} tone={item.days > 30 ? "danger" : undefined}>
                {item.customer}
              </RowLink>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

/** Medidor circular da meta, com um tracinho na posição do dia do mês. */
export function GoalCard({ goal, monthDay, monthDays }: { goal: FinanceSection["goal"]; monthDay: number; monthDays: number }) {
  const ratio = goal.target ? goal.achieved / goal.target : null;
  const r = 34;
  const length = 2 * Math.PI * r;
  const behind = ratio !== null && ratio < monthDay / monthDays;
  return (
    <Panel title="Meta de faturamento" icon="target" link={goal.link} linkLabel={goal.target ? "Ver o faturado" : "Definir a meta"} className="h-full">
      {goal.target === null ? (
        <div className="py-3 text-center text-sm text-muted-foreground">
          <p className="text-2xl font-semibold text-foreground tabular-nums">{moneyShort(goal.achieved)}</p>
          <p>faturado no mês</p>
          <p className="mt-2 text-xs">Defina uma meta mensal em Empresa para acompanhar aqui.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 90 90" className="h-28 w-28" role="img" aria-label={`${pct(ratio)} da meta`}>
            <circle cx="45" cy="45" r={r} fill="none" className="stroke-muted" strokeWidth="8" />
            <circle
              cx="45" cy="45" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
              className={behind ? "stroke-amber-500" : "stroke-primary"}
              strokeDasharray={`${length * Math.min(1, ratio ?? 0)} ${length}`}
              transform="rotate(-90 45 45)"
            />
            <line x1="45" y1="5" x2="45" y2="14" className="stroke-foreground/40" strokeWidth="1.5" transform={`rotate(${(360 * monthDay) / monthDays} 45 45)`} />
            <text x="45" y="50" textAnchor="middle" className="fill-foreground text-[15px] font-semibold">{pct(ratio)}</text>
          </svg>
          <p className="text-sm tabular-nums">{moneyShort(goal.achieved)} de {moneyShort(goal.target)}</p>
          <p className={cn("text-xs", behind ? toneText("warning") : "text-muted-foreground")}>
            {goal.achieved >= goal.target
              ? "Meta batida"
              : `Faltam ${moneyShort(goal.target - goal.achieved)} em ${goal.daysLeft} ${goal.daysLeft === 1 ? "dia" : "dias"}`}
          </p>
        </div>
      )}
    </Panel>
  );
}

/** Cor por posição (a maior área primeiro); "sem classificação" fica cinza. */
const AREA_PALETTE = ["#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#db2777", "#0891b2"];
const areaColor = (key: string, index: number) => (key === "sem" ? "#94a3b8" : AREA_PALETTE[index % AREA_PALETTE.length]);

export function RevenueByAreaCard({ areas, link }: { areas: FinanceSection["revenueByArea"]; link: string }) {
  const total = areas.reduce((sum, a) => sum + a.value, 0);
  return (
    <Panel title="De onde vem a receita · 12 meses" icon="chart-pie" link={link} linkLabel="Ver relatórios" className="h-full">
      {total <= 0 ? (
        <Empty>Ainda sem receita classificada por área.</Empty>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative h-28 w-28 shrink-0">
            <ChartContainer config={{}} className="aspect-square h-28 w-28">
              <PieChart>
                <Pie data={areas} dataKey="value" nameKey="label" innerRadius={36} outerRadius={54} strokeWidth={2} stroke="hsl(var(--card))" isAnimationActive={false}>
                  {areas.map((a, i) => <Cell key={a.key} fill={areaColor(a.key, i)} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-semibold tabular-nums">{moneyShort(total)}</span>
            </div>
          </div>
          <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
            {areas.map((a, i) => (
              <li key={a.key} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: areaColor(a.key, i) }} />
                <span className="truncate">{a.label}</span>
                <span className="ml-auto tabular-nums text-muted-foreground">{pct(a.value / total)}</span>
                {a.margin !== null && <span className={cn("w-16 text-right text-xs tabular-nums", a.margin < 0.15 ? toneText("warning") : toneText("success"))}>margem {pct(a.margin)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Comercial                                                           */
/* ------------------------------------------------------------------ */

export function FunnelCard({ commercial }: { commercial: CommercialSection }) {
  const max = Math.max(1, ...commercial.funnel.map((f) => f.value));
  return (
    <Panel title="Funil comercial · em aberto e aceitas no mês" icon="filter" link={commercial.link} linkLabel="Ver propostas" className="h-full">
      {commercial.funnel.every((f) => f.count === 0) ? (
        <Empty>Nenhuma proposta em andamento.</Empty>
      ) : (
        <>
          <ul className="space-y-2.5">
            {commercial.funnel.map((f, i) => (
              <li key={f.key}>
                <div className="mb-1 flex text-sm"><span>{f.label} <span className="text-muted-foreground">· {f.count}</span></span><span className="ml-auto tabular-nums">{moneyShort(f.value)}</span></div>
                <div className="h-2.5 rounded-r-md bg-primary" style={{ width: `${Math.max(4, (f.value / max) * 100)}%`, opacity: 1 - i * 0.2 }} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Conversão {pct(commercial.conversion)} nos últimos 90 dias
            {commercial.avgDaysToAccept !== null && ` · ${Math.round(commercial.avgDaysToAccept)} dias em média até o aceite`}
          </p>
        </>
      )}
    </Panel>
  );
}

export function StalledCard({ commercial }: { commercial: CommercialSection }) {
  return (
    <Panel title="Propostas paradas há mais de 7 dias" icon="hourglass" aside={commercial.stalled.length || undefined} link="/comercial/acompanhamento" linkLabel="Registrar retornos" className="h-full">
      {commercial.stalled.length === 0 ? (
        <Empty>Nenhuma proposta esquecida.</Empty>
      ) : (
        <ul className="divide-y">
          {commercial.stalled.map((p) => (
            <RowLink key={p.id} link={p.link} detail={`${p.days}d`} value={moneyShort(p.value)} tone={p.days > 14 ? "danger" : undefined}>
              <span className="font-medium">{p.customer}</span> <span className="text-muted-foreground">· {p.title}</span>
            </RowLink>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Operação                                                            */
/* ------------------------------------------------------------------ */

export function OrdersCard({ operations }: { operations: OperationsSection }) {
  return (
    <Panel title="Obras em andamento" icon="drill" aside={operations.orders.length || undefined} link={operations.link} linkLabel="Ver ordens de serviço" className="h-full">
      {operations.orders.length === 0 ? (
        <Empty>Nenhuma obra em andamento.</Empty>
      ) : (
        <div className="text-sm">
          <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_4.5rem_4.5rem] gap-3 pb-1 text-xs text-muted-foreground">
            <span>Obra</span><span>Executado</span><span className="text-right">Margem</span><span className="text-right">Prazo</span>
          </div>
          <ul className="divide-y">
            {operations.orders.map((o) => (
              <li key={o.id}>
                <Link {...linkTo(o.link)} className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_4.5rem_4.5rem] items-center gap-3 py-2 hover:bg-muted/50 -mx-2 px-2 rounded-md">
                  <span className="min-w-0">
                    <span className="block truncate">{o.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{o.customer}</span>
                  </span>
                  {o.progress === null ? <span className="text-xs text-muted-foreground">sem RDO</span> : (
                    <span className="flex items-center gap-2"><Meter value={o.progress} className="flex-1" /><span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{pct(o.progress)}</span></span>
                  )}
                  <span className={cn("text-right tabular-nums", o.margin === null ? "text-muted-foreground" : o.margin < 0 ? toneText("danger") : o.margin < 0.2 ? toneText("warning") : toneText("success"))}>
                    {pct(o.margin)}
                  </span>
                  <span className={cn("text-right text-xs", o.lateDays > 0 ? toneText("danger") : "text-muted-foreground")}>
                    {o.lateDays > 0 ? `${o.lateDays}d atraso` : "no prazo"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Equipe, turmas e semana                                             */
/* ------------------------------------------------------------------ */

export function TeamCard({ team }: { team: TeamSection }) {
  const parts = [
    { label: "Em obra", value: team.inField, className: "bg-violet-600" },
    { label: "Em turma", value: team.inClass, className: "bg-emerald-600" },
    { label: "Em atividade", value: team.atBase, className: "bg-sky-500" },
    { label: "Livres", value: team.free, className: "bg-slate-300 dark:bg-slate-600" },
    { label: "Ausentes", value: team.away, className: "bg-amber-400" },
  ];
  return (
    <Panel title="Equipe hoje" icon="users" aside={`${team.total} pessoas`} link={team.link} linkLabel="Abrir mapa de alocação" className="h-full">
      {team.total === 0 ? <Empty>Nenhum funcionário ativo.</Empty> : (
        <>
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
            {parts.filter((p) => p.value > 0).map((p) => <div key={p.label} className={p.className} style={{ flexGrow: p.value }} />)}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {parts.filter((p) => p.value > 0 || p.label !== "Ausentes").map((p) => <span key={p.label} className="flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-sm", p.className)} />{p.label} <span className="ml-auto tabular-nums text-foreground">{p.value}</span></span>)}
          </div>
          {team.docsExpired !== null && team.docsExpiring !== null && (
            <ul className="mt-3 divide-y border-t">
              <RowLink link={team.docsLink} value={team.docsExpired} tone={team.docsExpired ? "danger" : "muted"}>Documentos vencidos ou faltando</RowLink>
              <RowLink link={team.docsLink} value={team.docsExpiring} tone={team.docsExpiring ? "warning" : "muted"}>Documentos a vencer</RowLink>
            </ul>
          )}
        </>
      )}
    </Panel>
  );
}

export function ClassesCard({ training }: { training: TrainingSection }) {
  return (
    <Panel title="Próximas turmas" icon="graduation-cap" link={training.link} linkLabel="Ver turmas" className="h-full">
      {training.classes.length === 0 ? <Empty>Nenhuma turma marcada.</Empty> : (
        <ul className="space-y-2.5">
          {training.classes.map((c) => {
            const ratio = c.seats ? c.enrolled / c.seats : null;
            const weak = ratio !== null && ratio < 0.5;
            return (
              <li key={c.id}>
                <Link {...linkTo(c.link)} className="block hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md">
                  <div className="mb-1 flex text-sm">
                    <span className="truncate">{c.name} <span className="text-muted-foreground">· {shortDate(c.date)}</span></span>
                    <span className={cn("ml-auto pl-2 tabular-nums", weak && toneText("warning"))}>{c.enrolled}{c.seats ? `/${c.seats}` : ""}</span>
                  </div>
                  {ratio !== null && <Meter value={ratio} barClassName={weak ? "bg-amber-500" : "bg-emerald-600"} />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Estoque                                                             */
/* ------------------------------------------------------------------ */

export function StockCard({ stock }: { stock: StockSection }) {
  const calm = !stock.low && !stock.inspections && !stock.calibrations && !stock.rentalsLate && !stock.pendingReceipts;
  return (
    <Panel title="Estoque" icon="warehouse" aside={stock.value !== null ? moneyShort(stock.value) : undefined} link={stock.link} linkLabel="Abrir o estoque" className="h-full">
      {calm && (
        <div className="flex items-center gap-2 pb-2 text-sm text-muted-foreground">
          <Icon name="circle-check" className="w-4 h-4 text-emerald-600" /> Nada pedindo atenção no estoque.
        </div>
      )}
      <ul className="divide-y">
        <RowLink link="/suprimentos/compras/reposicao" value={stock.low} tone={stock.low ? "danger" : "muted"}>Itens abaixo do mínimo</RowLink>
        <RowLink link="/suprimentos/equipamentos/inspecoes" value={stock.inspections} tone={stock.inspections ? "warning" : "muted"}>Inspeções vencidas ou a vencer</RowLink>
        <RowLink link="/suprimentos/equipamentos/calibracao" value={stock.calibrations} tone={stock.calibrations ? "warning" : "muted"}>Calibrações vencidas ou a vencer</RowLink>
        <RowLink link="/suprimentos/locacoes" value={stock.rentalsLate} detail={stock.rentalsActive ? `${stock.rentalsActive} ativa(s)` : undefined} tone={stock.rentalsLate ? "danger" : "muted"}>Locações atrasadas</RowLink>
        {stock.pendingReceipts > 0 && <RowLink link="/suprimentos/pedidos-de-compra?status=comprado" value={stock.pendingReceipts} tone="warning">Compras para receber no estoque</RowLink>}
      </ul>
    </Panel>
  );
}

const KIND_ICON: Record<WeekItem["kind"], string> = { os: "drill", turma: "graduation-cap", retorno: "phone", pagar: "arrow-up-right", receber: "arrow-down-left", documento: "id-card" };

export function WeekCard({ week, today }: { week: WeekItem[]; today: string }) {
  const weekday = (iso: string) => (iso.slice(0, 10) === today.slice(0, 10) ? "hoje" : new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""));
  return (
    <Panel title="Próximos 7 dias" icon="calendar-days" className="h-full">
      {week.length === 0 ? <Empty>Semana tranquila: nada agendado.</Empty> : (
        <ul className="divide-y">
          {week.map((item, i) => (
            <li key={`${item.kind}-${i}`}>
              <Link {...linkTo(item.link)} className="flex items-center gap-2 py-1.5 text-sm hover:bg-muted/50 -mx-2 px-2 rounded-md">
                <span className="w-10 shrink-0 text-xs text-muted-foreground">{weekday(item.date)}</span>
                <Icon name={KIND_ICON[item.kind]} className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export type { Dashboard };
