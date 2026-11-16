import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import api from "@/services/api";
import Icon from "@/components/general-components/Icon";
import Dialog from "@/components/general-components/Dialog";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Empty, Kpi, linkTo, moneyShort, Panel, pct, shortDate, toneText } from "../-dashboard/ui";
import type { ActionTone, RenewalItem, TrainingPanel, UpcomingClass } from "./-painel/types";

export const Route = createFileRoute("/_authenticated/treinamentos/")({
  component: TrainingDashboard,
});

/**
 * Painel de treinamentos. Tudo vem pronto de `GET /dashboard/training`: o que
 * pede ação, quatro indicadores, as próximas turmas, as reciclagens a vencer e
 * a tendência de 6 meses. Segue o desenho da Home (`-dashboard/ui`).
 */
function TrainingDashboard() {
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["dashboard-training"],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => (await api.get<TrainingPanel>("dashboard/training")).data,
  });
  const [renewalsOpen, setRenewalsOpen] = useState(false);

  if (isLoading) return <PanelSkeleton />;
  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-sm text-muted-foreground">
        <Icon name="cloud-off" className="w-8 h-8" />
        Não foi possível carregar o painel de treinamentos.
        <button type="button" onClick={() => refetch()} className="text-primary hover:underline">Tentar de novo</button>
      </div>
    );
  }

  const { kpis } = data;
  const month = new Date(`${data.today}T12:00:00`).toLocaleDateString("pt-BR", { month: "long" });
  const delta = (now: number, before: number) => now - before;
  const trainedDelta = delta(kpis.trained.value, kpis.trained.previous);

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="text-lg font-semibold">Treinamentos · {month}</h1>
        <span className="text-xs text-muted-foreground">
          atualizado às {new Date(dataUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
        <Link {...linkTo(data.links.newClass)} className="ml-auto inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50">
          <Icon name="plus" className="w-3.5 h-3.5" /> Nova turma
        </Link>
      </div>

      {/* Linha 1: o que pede ação | indicadores + tendência */}
      <div className="grid gap-4 xl:grid-cols-3">
        <ActionsPanel data={data} />
        <div className="flex flex-col gap-4 xl:col-span-2 min-w-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <Kpi
              label="Alunos treinados no mês"
              value={String(kpis.trained.value)}
              hint={kpis.trained.previous || kpis.trained.value ? `${trainedDelta >= 0 ? "+" : ""}${trainedDelta} vs mês passado` : "nenhuma turma encerrada ainda"}
              hintTone={trainedDelta > 0 ? "success" : trainedDelta < 0 ? "warning" : "muted"}
              trend={kpis.trained.trend}
              trendColor="#7c3aed"
              link={data.links.classes}
            />
            <Kpi
              label="Ocupação das próximas turmas"
              value={pct(kpis.occupancy.ratio)}
              hint={kpis.occupancy.seats ? `${kpis.occupancy.taken} de ${kpis.occupancy.seats} vagas em ${kpis.occupancy.classes} ${kpis.occupancy.classes === 1 ? "turma" : "turmas"}` : "nenhuma turma com vagas limitadas"}
              hintTone={kpis.occupancy.ratio !== null && kpis.occupancy.ratio < 0.5 ? "warning" : "muted"}
              link={data.links.classes}
            />
            {kpis.revenue && (
              <Kpi
                label="Recebido de inscrições no mês"
                value={moneyShort(kpis.revenue.month)}
                hint={kpis.revenue.open ? `${moneyShort(kpis.revenue.open)} a receber (${kpis.revenue.openCount})` : "nada em aberto"}
                hintTone={kpis.revenue.month >= kpis.revenue.previous ? "success" : "muted"}
                trend={kpis.revenue.trend}
                link={kpis.revenue.link}
              />
            )}
            <Kpi
              label="Satisfação · aprovação na prova"
              value={`${kpis.quality.rating !== null ? `${kpis.quality.rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/5` : "—"} · ${pct(kpis.quality.approval)}`}
              hint={`${kpis.quality.reviews} ${kpis.quality.reviews === 1 ? "avaliação" : "avaliações"}, ${kpis.quality.exams} ${kpis.quality.exams === 1 ? "prova" : "provas"} · ${kpis.quality.days} dias`}
              hintTone={kpis.quality.rating !== null && kpis.quality.rating < 4 ? "warning" : "muted"}
              link={data.links.reviews}
            />
          </div>
          <TrendPanel trend={data.trend} />
        </div>
      </div>

      {/* Linha 2: turmas + reciclagem */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><UpcomingPanel classes={data.upcoming} link={data.links.classes} /></div>
        <RenewalsPanel renewals={data.renewals} onOpen={() => setRenewalsOpen(true)} />
      </div>

      <RenewalsDialog open={renewalsOpen} onOpenChange={setRenewalsOpen} renewals={data.renewals} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

const TONE_STYLE: Record<ActionTone, { icon: string; box: string }> = {
  danger: { icon: "triangle-alert", box: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
  warning: { icon: "clock", box: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  info: { icon: "info", box: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
};

function ActionsPanel({ data }: { data: TrainingPanel }) {
  const extra = data.actionsTotal - data.actions.length;
  return (
    <Panel title="Precisa de você" icon="hand" aside={data.actionsTotal || undefined} className="h-full">
      {data.actions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 py-6 text-sm text-muted-foreground">
          <Icon name="circle-check" className="w-6 h-6 text-emerald-600" />
          Nada pendente nas turmas agora.
        </div>
      ) : (
        <ul className="divide-y">
          {data.actions.map((action) => (
            <li key={action.key}>
              <Link {...linkTo(action.link)} className="flex items-center gap-3 py-2 text-sm hover:bg-muted/50 -mx-2 px-2 rounded-md">
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", TONE_STYLE[action.tone].box)}>
                  <Icon name={TONE_STYLE[action.tone].icon} className="w-3.5 h-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{action.title}</span>
                  <span className="block text-xs text-muted-foreground truncate">{action.detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {extra > 0 && <p className="mt-2 text-xs text-muted-foreground">e mais {extra} {extra === 1 ? "aviso" : "avisos"} nas turmas</p>}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */

function UpcomingPanel({ classes, link }: { classes: UpcomingClass[]; link: string }) {
  return (
    <Panel title="Próximas turmas" icon="graduation-cap" aside="60 dias" link={link} linkLabel="Ver todas as turmas" className="h-full">
      {classes.length === 0 ? <Empty>Nenhuma turma marcada para os próximos 60 dias.</Empty> : (
        <ul className="divide-y">
          {classes.map((c) => <UpcomingRow key={c.id} turma={c} />)}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-emerald-600" />no caminho</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-amber-500" />menos da metade</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-red-500" />abaixo do quórum</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-px bg-foreground/60" />quórum mínimo</span>
      </div>
    </Panel>
  );
}

function UpcomingRow({ turma }: { turma: UpcomingClass }) {
  const ratio = turma.seats ? Math.min(1, turma.enrolled / turma.seats) : null;
  const belowQuorum = turma.quorum !== null && turma.enrolled < turma.quorum;
  const tone = belowQuorum ? "danger" : ratio !== null && ratio < 0.5 ? "warning" : "success";
  const bar = tone === "danger" ? "bg-red-500" : tone === "warning" ? "bg-amber-500" : "bg-emerald-600";
  const quorumAt = turma.seats && turma.quorum ? Math.min(1, turma.quorum / turma.seats) : null;
  const flags = [
    turma.ongoing && "acontecendo",
    turma.pending > 0 && `${turma.pending} a confirmar`,
    turma.instructors === 0 && "sem instrutor",
  ].filter(Boolean) as string[];

  return (
    <li>
      <Link {...linkTo(turma.link)} className="grid grid-cols-[3.25rem_minmax(0,1fr)] sm:grid-cols-[3.25rem_minmax(0,1fr)_9rem_3.5rem] items-center gap-x-3 gap-y-1 py-2 -mx-2 px-2 rounded-md hover:bg-muted/50 text-sm">
        <span className="text-xs text-muted-foreground tabular-nums">{shortDate(turma.date)}</span>
        <span className="min-w-0">
          <span className="block truncate">{turma.name}</span>
          {flags.length > 0 && <span className="block truncate text-xs text-muted-foreground">{flags.join(" · ")}</span>}
        </span>
        <span className="col-start-2 sm:col-start-auto">
          {ratio !== null ? (
            <span className="relative block h-1.5 rounded-full bg-muted">
              <span className={cn("absolute inset-y-0 left-0 rounded-full", bar)} style={{ width: `${ratio * 100}%` }} />
              {quorumAt !== null && <span className="absolute -top-1 h-3.5 w-px bg-foreground/60" style={{ left: `${quorumAt * 100}%` }} />}
            </span>
          ) : <span className="text-xs text-muted-foreground">vagas livres</span>}
        </span>
        <span className={cn("hidden sm:block text-right tabular-nums", toneText(tone === "success" ? undefined : tone))}>
          {turma.enrolled}{turma.seats ? `/${turma.seats}` : ""}
        </span>
      </Link>
    </li>
  );
}

/* ------------------------------------------------------------------ */

function RenewalsPanel({ renewals, onOpen }: { renewals: TrainingPanel["renewals"]; onOpen: () => void }) {
  const top = renewals.byCourse.slice(0, 5);
  const rest = renewals.byCourse.slice(5).reduce((sum, c) => sum + c.count, 0);
  return (
    <Panel title="Reciclagens a vencer" icon="refresh-cw" aside={`${renewals.days} dias`} className="h-full">
      {renewals.total === 0 ? <Empty>Nenhum certificado vencendo nos próximos {renewals.days} dias.</Empty> : (
        <>
          <p className="text-2xl font-semibold tabular-nums leading-tight">{renewals.total} {renewals.total === 1 ? "aluno" : "alunos"}</p>
          <p className="text-xs text-muted-foreground mb-3">com certificado vencendo e sem turma nova marcada</p>
          <ul className="space-y-1.5 text-sm">
            {top.map((c) => (
              <li key={c.courseId} className="flex items-center gap-2">
                <span className="truncate flex-1">{c.name}</span>
                <span className="tabular-nums text-muted-foreground">{c.count}</span>
              </li>
            ))}
            {rest > 0 && <li className="flex text-sm text-muted-foreground"><span className="flex-1">outros cursos</span><span className="tabular-nums">{rest}</span></li>}
          </ul>
          <button type="button" onClick={onOpen} className="mt-3 text-xs text-primary hover:underline w-fit">Ver lista e contatos →</button>
        </>
      )}
    </Panel>
  );
}

const onlyDigits = (value: string) => value.replace(/\D/g, "");
const whatsappUrl = (phone: string) => {
  const digits = onlyDigits(phone);
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
};

function RenewalsDialog({ open, onOpenChange, renewals }: { open: boolean; onOpenChange: (open: boolean) => void; renewals: TrainingPanel["renewals"] }) {
  const [courseId, setCourseId] = useState<number | null>(null);
  const items = useMemo(() => renewals.items.filter((item) => courseId === null || item.courseId === courseId), [renewals.items, courseId]);
  const phones = items.map((item) => item.phone).filter(Boolean) as string[];

  const copyPhones = async () => {
    try {
      await navigator.clipboard.writeText(items.filter((i) => i.phone).map((i) => `${i.trainee}\t${i.phone}\t${i.course}\t${shortDate(i.expiresAt)}`).join("\n"));
      toast({ title: "Contatos copiados", description: `${phones.length} ${phones.length === 1 ? "telefone" : "telefones"} na área de transferência.` });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  return (
    <Dialog
      showBttn={false}
      open={open}
      onOpenChange={onOpenChange}
      title="Reciclagens a vencer"
      description={`Alunos com certificado vencendo nos próximos ${renewals.days} dias e sem turma nova do mesmo curso.`}
      className="w-[min(94vw,760px)] sm:max-w-[94vw]"
      classNameContent="h-auto max-h-[65vh] pb-2"
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Chip active={courseId === null} onClick={() => setCourseId(null)}>Todos ({renewals.total})</Chip>
        {renewals.byCourse.map((c) => (
          <Chip key={c.courseId} active={courseId === c.courseId} onClick={() => setCourseId(c.courseId)}>{c.name} ({c.count})</Chip>
        ))}
        {phones.length > 0 && (
          <Button variant="outline" size="sm" className="ml-auto h-7" onClick={copyPhones}>
            <Icon name="copy" className="w-3.5 h-3.5" /> Copiar contatos
          </Button>
        )}
      </div>
      <ul className="divide-y">
        {items.map((item) => <RenewalRow key={item.id} item={item} />)}
      </ul>
      {renewals.items.length < renewals.total && (
        <p className="pt-2 text-xs text-muted-foreground">Mostrando os {renewals.items.length} que vencem primeiro.</p>
      )}
    </Dialog>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded-full border px-2.5 py-0.5 text-xs transition-colors", active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted/60")}
    >
      {children}
    </button>
  );
}

function RenewalRow({ item }: { item: RenewalItem }) {
  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <span className="min-w-0 flex-1">
        <span className="block truncate">{item.trainee}</span>
        <span className="block truncate text-xs text-muted-foreground">{item.course} · vence {shortDate(item.expiresAt)}</span>
      </span>
      {item.phone && (
        <a href={whatsappUrl(item.phone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted/60">
          <Icon name="message-circle" className="w-3.5 h-3.5" /> WhatsApp
        </a>
      )}
      {item.email && (
        <a href={`mailto:${item.email}`} className="inline-flex items-center rounded-md border p-1.5 hover:bg-muted/60" aria-label={`E-mail para ${item.trainee}`}>
          <Icon name="mail" className="w-3.5 h-3.5" />
        </a>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */

const trendConfig = {
  trained: { label: "Alunos treinados", color: "hsl(var(--primary))" },
  enrolled: { label: "Inscrições recebidas", color: "#f97316" },
} satisfies ChartConfig;

function TrendPanel({ trend }: { trend: TrainingPanel["trend"] }) {
  const points = trend.map((t) => ({
    ...t,
    label: new Date(`${t.month}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
  }));
  const hasData = trend.some((t) => t.trained || t.enrolled);
  return (
    <Panel title="Últimos 6 meses" icon="chart-column">
      {!hasData ? <Empty>Ainda sem turmas nos últimos 6 meses.</Empty> : (
        <>
          <ChartContainer config={trendConfig} className="aspect-auto h-40 w-full">
            <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} />
              <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="trained" fill="var(--color-trained)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
              <Line dataKey="enrolled" type="monotone" stroke="var(--color-enrolled)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            </ComposedChart>
          </ChartContainer>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-primary" />Alunos treinados (turmas encerradas)</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-orange-500" />Inscrições recebidas</span>
          </div>
        </>
      )}
    </Panel>
  );
}

function PanelSkeleton() {
  const box = "rounded-xl border bg-card animate-pulse";
  return (
    <div className="space-y-4">
      <div className="h-6 w-56 rounded bg-muted animate-pulse" />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className={`${box} h-56`} />
        <div className="grid gap-4 sm:grid-cols-2 xl:col-span-2">{[0, 1, 2, 3].map((i) => <div key={i} className={`${box} h-24`} />)}</div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3"><div className={`${box} h-72 lg:col-span-2`} /><div className={`${box} h-72`} /></div>
    </div>
  );
}
