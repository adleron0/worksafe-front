import type { ReactNode } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import useVerify from "@/hooks/use-verify";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { Empty, Panel, shortDate } from "../../-dashboard/ui";
import { Tip, errorMessage } from "../../comercial/-shared/commercial";
import { CHAT_KEY, ChatMetrics, ContactAvatar, PAGES, chatApi, duration } from "../-shared/chat";

interface Search { dias?: number; numero?: number }

export const Route = createFileRoute("/_authenticated/conversas/_conversas/metricas")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    dias: [1, 7, 30, 90].includes(Number(search.dias)) ? Number(search.dias) : undefined,
    numero: Number(search.numero) > 0 ? Number(search.numero) : undefined,
  }),
  component: MetricsPage,
});

const PERIODS = [{ id: 1, name: "Hoje" }, { id: 7, name: "7 dias" }, { id: 30, name: "30 dias" }, { id: 90, name: "90 dias" }];
const IN = "#3E6F98";
const OUT = "#149E5E";

/** Conversas → Métricas: tempo da 1ª resposta, volume por setor, por atendente e por número. */
function MetricsPage() {
  const { can } = useVerify();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/conversas/metricas" });
  const days = search.dias ?? 30;
  const allowed = can("todas_conversas") || can("canais_conversas");
  const metrics = useQuery({ queryKey: [CHAT_KEY, "metrics", days, search.numero ?? 0], enabled: allowed, refetchInterval: 60000, queryFn: () => chatApi.get<ChatMetrics>("metrics", { days, channelId: search.numero }) });
  if (!allowed) return null;
  const m = metrics.data;
  const set = (next: Search) => navigate({ search: (prev) => ({ ...prev, ...next }) });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Métricas"
        description="Quanto tempo o cliente espera, quem atende e por onde chegam as conversas."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border bg-card p-0.5">
              {PERIODS.map((p) => (
                <button key={p.id} type="button" onClick={() => set({ dias: p.id === 30 ? undefined : p.id })}
                  className={cn("cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors", days === p.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{p.name}</button>
              ))}
            </div>
            {m && m.channels.length > 1 || search.numero ? (
              <div className="w-48">
                <Select name="metricChannel" options={[{ id: "0", name: "Todos os números" }, ...(m?.channels ?? []).map((c) => ({ id: String(c.id), name: c.name }))]}
                  state={String(search.numero ?? 0)} onChange={(_, value) => set({ numero: Number(value) > 0 ? Number(value) : undefined })} />
              </div>
            ) : null}
          </div>
        }
      />

      {metrics.error && <p className="text-sm text-destructive">{errorMessage(metrics.error)}</p>}
      {metrics.isLoading && <div className="grid gap-4"><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-card" />)}</div><Skeleton className="h-72 rounded-card" /></div>}
      {m && !m.totals && <div className="rounded-card border bg-card p-10 text-center text-sm text-muted-foreground">Nenhum número conectado ainda. <Link to={PAGES.channels} className="font-medium text-primary hover:underline">Conectar um número</Link></div>}
      {m?.totals && <MetricsBody m={m} days={days} />}
    </div>
  );
}

function Stat({ label, value, hint, tip, tone }: { label: string; value: ReactNode; hint?: ReactNode; tip: string; tone?: "warn" | "good" }) {
  return (
    <Tip text={tip}>
      <div className="min-w-0 rounded-card border bg-card p-4">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className={cn("mt-1 text-xl font-semibold tabular-nums leading-tight whitespace-nowrap 2xl:text-2xl", tone === "warn" && "text-amber-600", tone === "good" && "text-emerald-600")}>{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </Tip>
  );
}

function MetricsBody({ m, days }: { m: ChatMetrics; days: number }) {
  const t = m.totals!;
  const fr = m.firstResponse!;
  const peak = Math.max(1, ...m.byHour.map((h) => h.inbound));
  const busiest = m.byHour.reduce((a, b) => (b.inbound > a.inbound ? b : a), m.byHour[0]);
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Tempo da 1ª resposta" value={duration(fr.medianSec)} hint={fr.turns ? `${fr.within5m ?? 0}% em até 5 min · ${fr.within1h ?? 0}% em até 1 h` : "Sem mensagens no período"}
          tip="Metade das vezes que um cliente escreveu, a empresa respondeu dentro desse tempo (mediana). Conta o tempo corrido, inclusive fora do horário; respostas automáticas não contam."
          tone={fr.medianSec !== null && fr.medianSec > 3600 ? "warn" : fr.medianSec !== null && fr.medianSec <= 300 ? "good" : undefined} />
        <Stat label="Sem resposta" value={fr.unanswered.toLocaleString("pt-BR")} hint={fr.turns ? `de ${fr.turns} vezes que o cliente escreveu` : undefined}
          tip="Vezes em que o cliente escreveu e ninguém respondeu depois (até agora)." tone={fr.unanswered > 0 ? "warn" : undefined} />
        <Stat label="Conversas" value={t.conversations.toLocaleString("pt-BR")} hint={`${t.newContacts} contatos novos · ${t.resolved} resolvidas`}
          tip="Conversas com alguma mensagem no período. Contatos novos: quem escreveu pela primeira vez." />
        <Stat label="Abertas agora" value={t.open.toLocaleString("pt-BR")} hint={t.waiting ? `${t.waiting} sem ninguém atendendo` : "todas com alguém atendendo"}
          tip="Conversas que ainda não foram resolvidas, e quantas delas estão sem dono." tone={t.waiting > 0 ? "warn" : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={days === 1 ? "Mensagens de hoje" : "Mensagens por dia"} icon="chart-column" className="lg:col-span-2"
          aside={<span className="flex items-center gap-3"><Legend color={IN} label={`Recebidas ${t.inbound.toLocaleString("pt-BR")}`} /><Legend color={OUT} label={`Enviadas ${t.outbound.toLocaleString("pt-BR")}`} /></span>}>
          {t.inbound + t.outbound === 0 ? <Empty>Nenhuma mensagem no período.</Empty> : (
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={m.byDay} margin={{ top: 4, right: 4, bottom: 0, left: -18 }} barGap={1}>
                  <CartesianGrid vertical={false} strokeOpacity={0.15} />
                  <XAxis dataKey="day" tickFormatter={shortDate} tickLine={false} axisLine={false} fontSize={11} minTickGap={16} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                  <ChartTooltip cursor={{ fillOpacity: 0.06 }} labelFormatter={(v) => shortDate(String(v))} formatter={(value: number, name: string) => [value, name === "inbound" ? "Recebidas" : "Enviadas"]}
                    contentStyle={{ borderRadius: 8, fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="inbound" fill={IN} radius={[3, 3, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="outbound" fill={OUT} radius={[3, 3, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {t.outbound > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Das enviadas: {t.outHuman.toLocaleString("pt-BR")} pelo sistema · {t.outPhone.toLocaleString("pt-BR")} pelo celular · {t.outBot.toLocaleString("pt-BR")} pelo bot{t.outAuto ? ` · ${t.outAuto.toLocaleString("pt-BR")} automáticas` : ""}.
            </p>
          )}
        </Panel>

        <Panel title="Quando os clientes escrevem" icon="clock-3" aside={busiest?.inbound ? `pico às ${busiest.hour}h` : undefined}>
          {t.inbound === 0 ? <Empty>Sem mensagens recebidas.</Empty> : (
            <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
              {m.byHour.map((h) => (
                <Tip key={h.hour} text={`${h.hour}h: ${h.inbound} mensagens`}>
                  <div className="grid gap-1 text-center">
                    <div className="flex h-32 items-end overflow-hidden rounded-sm bg-muted/50">
                      <div className="w-full rounded-sm" style={{ height: `${(h.inbound / peak) * 100}%`, background: IN, opacity: h.inbound ? 0.35 + (h.inbound / peak) * 0.65 : 0 }} />
                    </div>
                    <span className="text-[9px] text-muted-foreground tabular-nums">{h.hour % 6 === 0 ? h.hour : ""}</span>
                  </div>
                </Tip>
              ))}
            </div>
          )}
          {t.inbound > 0 && <p className="mt-2 text-xs text-muted-foreground">Ajuda a montar a escala e o horário de atendimento.</p>}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Por setor" icon="layers">
          {m.bySector.length ? (
            <Table head={["Setor", "Conversas", "Abertas", "1ª resposta", "Sem resposta"]}>
              {m.bySector.map((s) => (
                <tr key={s.sector ?? "none"} className="border-t">
                  <td className="py-2 pr-2 font-medium">{s.name}</td>
                  <Num>{s.conversations}</Num>
                  <Num>{s.open}</Num>
                  <Num>{duration(s.medianSec)}</Num>
                  <Num tone={s.unanswered ? "warn" : undefined}>{s.unanswered}</Num>
                </tr>
              ))}
            </Table>
          ) : <Empty>Sem conversas no período.</Empty>}
        </Panel>

        <Panel title="Por atendente" icon="users">
          {m.byUser.length ? (
            <Table head={["Atendente", "Conversas", "Mensagens", "1ª resposta", "Abertas"]}>
              {m.byUser.map((u) => (
                <tr key={u.userId} className="border-t">
                  <td className="py-2 pr-2"><span className="flex min-w-0 items-center gap-2"><ContactAvatar name={u.name} url={u.imageUrl} size={22} className="rounded-full" /><span className="truncate font-medium">{u.name}</span></span></td>
                  <Num>{u.conversations}</Num>
                  <Num>{u.messages}</Num>
                  <Num>{u.firstResponses ? duration(u.medianSec) : "—"}</Num>
                  <Num>{u.open}</Num>
                </tr>
              ))}
            </Table>
          ) : <Empty>Ninguém respondeu pelo sistema no período.</Empty>}
          {fr.byBot > 0 && <p className="mt-2 text-xs text-muted-foreground">O bot deu a 1ª resposta {fr.byBot} {fr.byBot === 1 ? "vez" : "vezes"}{fr.humanMedianSec !== null ? `; só pessoas: ${duration(fr.humanMedianSec)}` : ""}.</p>}
        </Panel>
      </div>

      {m.byChannel.length > 1 && (
        <Panel title="Por número" icon="smartphone">
          <Table head={["Número", "Conversas", "Recebidas", "Enviadas", "1ª resposta", "Sem resposta"]}>
            {m.byChannel.map((c) => (
              <tr key={c.channelId} className="border-t">
                <td className="py-2 pr-2"><span className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color ?? OUT }} /><span className="truncate font-medium">{c.name}</span></span></td>
                <Num>{c.conversations}</Num>
                <Num>{c.inbound}</Num>
                <Num>{c.outbound}</Num>
                <Num>{duration(c.medianSec)}</Num>
                <Num tone={c.unanswered ? "warn" : undefined}>{c.unanswered}</Num>
              </tr>
            ))}
          </Table>
        </Panel>
      )}

      <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
        <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        O setor é o atual da conversa. O histórico importado ao conectar não entra nas contas.
      </p>
    </div>
  );
}

const Legend = ({ color, label }: { color: string; label: string }) => (
  <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-sm" style={{ background: color }} />{label}</span>
);

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            {head.map((h, i) => <th key={h} className={cn("pb-2 font-normal", i === 0 ? "text-left" : "text-right")}>{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const Num = ({ children, tone }: { children: ReactNode; tone?: "warn" }) => (
  <td className={cn("py-2 pl-2 text-right tabular-nums", tone === "warn" && "font-medium text-amber-600")}>{typeof children === "number" ? children.toLocaleString("pt-BR") : children}</td>
);
