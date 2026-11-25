import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import { OrderSheet, OrderSheetData, dateFull, sheetPeriod } from "../_authenticated/servicos/-shared/sheet";
import { DayCalendar, GanttChart, ProgressCurve, ProgressStrip, Timeline, TimelineDay } from "../_authenticated/servicos/-shared/timeline";

export const Route = createFileRoute("/_index/acompanhar/$key")({
  component: FollowOrderPage,
});

interface PublicReport {
  date: string; shift: string; weather: string; weatherEnd: string | null; activities: string | null; people: number;
  progress: Array<{ title: string; percent: number }>; photos: Array<{ url: string; caption: string }>; occurrences: Array<{ type: string; description: string }>;
}
interface PublicOrder extends OrderSheetData {
  options: { reports: boolean; photos: boolean; occurrences: boolean; teamNames: boolean };
  timeline: { start: string | null; today: string; days: TimelineDay[]; curve: Timeline["curve"]; projection: Timeline["projection"]; end: string | null; done: number | null };
  reports: PublicReport[];
}
const WEATHER: Record<string, string> = { bom: "Tempo bom", nublado: "Nublado", chuva: "Chuva", impraticavel: "Sem condição de trabalho" };
const WEATHER_ICON: Record<string, string> = { bom: "sun", nublado: "cloud", chuva: "cloud-rain", impraticavel: "cloud-lightning" };
const OCCURRENCE: Record<string, string> = { paralisacao: "Paralisação", pendencia_cliente: "Pendência do cliente", quase_acidente: "Quase acidente", acidente: "Acidente", outro: "Ocorrência" };

/**
 * Acompanhamento da obra pelo cliente: link aberto, só leitura. Situação,
 * avanço, cronograma, os RDOs fechados (o que a empresa liberou) e a folha da
 * OS sem valores.
 */
function FollowOrderPage() {
  const { key } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["publicServiceOrder", key], retry: false, refetchOnWindowFocus: true,
    queryFn: async () => (await api.get<PublicOrder>(`public/service-orders/${key}`)).data,
  });

  if (isLoading) return <div className="max-w-3xl mx-auto p-4 grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (error || !data) return (
    <div className="max-w-xl mx-auto p-6 mt-16 text-center">
      <Icon name="link-2-off" className="w-10 h-10 mx-auto text-muted-foreground" />
      <h1 className="text-xl font-bold mt-3">Acompanhamento indisponível</h1>
      <p className="text-muted-foreground mt-2">O link foi desligado, trocado ou a obra foi encerrada há algum tempo. Peça um link novo a quem enviou.</p>
    </div>
  );

  const { company, order, timeline } = data;
  const color = company.color || "#149E5E";
  // os mesmos gráficos da tela interna, montados com o que a página aberta recebe
  const asTimeline: Timeline = {
    start: timeline.start, end: timeline.end, today: timeline.today, unit: data.schedule?.unit ?? "dia", replanned: false, done: timeline.done,
    days: timeline.days, curve: timeline.curve, projection: timeline.projection,
    steps: (data.schedule?.steps ?? []).map((step) => ({ ...step, percent: step.percent ?? 0, plannedPercent: null, baseline: null })),
    summary: undefined as unknown as Timeline["summary"],
  };
  const running = timeline.done !== null;
  const contact = [company.phone && { icon: "phone", label: company.phone, href: `tel:${company.phone.replace(/[^\d+]/g, "")}` }, company.email && { icon: "mail", label: company.email, href: `mailto:${company.email}` }].filter(Boolean) as Array<{ icon: string; label: string; href: string }>;

  return (
    <div className="min-h-full bg-muted/40" style={{ ["--brand" as string]: color }}>
      <header className="bg-background border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {company.logoUrl ? <img src={company.logoUrl} alt={company.name} className="h-9 max-w-[140px] object-contain" /> : <span className="font-bold">{company.name}</span>}
          <span className="ml-auto text-xs text-muted-foreground text-right">Acompanhamento da obra<br /><span className="tabular-nums">{order.number}</span></span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 grid gap-4">
        <section className="rounded-card border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>{order.statusLabel}</p>
          <h1 className="text-xl font-bold mt-0.5">{order.title}</h1>
          <p className="text-sm text-muted-foreground">{data.customer?.name}{order.location ? ` · ${order.location}` : ""}</p>
          <p className="text-sm mt-2"><Icon name="calendar" className="inline w-4 h-4 mr-1 text-muted-foreground" />{sheetPeriod(order, data.schedule)}</p>
          {running && <div className="mt-3"><ProgressStrip timeline={asTimeline} /></div>}
          {contact.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {contact.map((item) => (
                <a key={item.href} href={item.href} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"><Icon name={item.icon} className="w-4 h-4" /> {item.label}</a>
              ))}
            </div>
          )}
        </section>

        {asTimeline.steps.length > 0 && (
          <section className="rounded-card border bg-card p-4 grid gap-3">
            <h2 className="font-semibold">Cronograma</h2>
            <GanttChart timeline={asTimeline} />
          </section>
        )}

        {running && (
          <div className="grid md:grid-cols-2 gap-4">
            <section className="rounded-card border bg-card p-4">
              <h2 className="font-semibold mb-3">Dias de obra</h2>
              <DayCalendar timeline={asTimeline} />
            </section>
            <section className="rounded-card border bg-card p-4">
              <h2 className="font-semibold mb-2">Previsto × feito</h2>
              <ProgressCurve timeline={asTimeline} />
            </section>
          </div>
        )}

        {data.options.reports && (
          <section className="rounded-card border bg-card p-4">
            <h2 className="font-semibold">Diário da obra</h2>
            {data.reports.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Nenhum relatório publicado ainda.</p>}
            <ol className="mt-3 grid gap-4">
              {data.reports.map((report, index) => (
                <li key={`${report.date}-${index}`} className="border-l-2 pl-3" style={{ borderColor: color }}>
                  <p className="font-medium flex flex-wrap items-center gap-x-2">
                    {dateFull(report.date)}
                    <span className="text-xs font-normal text-muted-foreground inline-flex items-center gap-1"><Icon name={WEATHER_ICON[report.weather] ?? "sun"} className="w-3.5 h-3.5" /> {WEATHER[report.weather] ?? report.weather}</span>
                    {report.people > 0 && <span className="text-xs font-normal text-muted-foreground">· {report.people} pessoa{report.people === 1 ? "" : "s"}</span>}
                  </p>
                  {report.activities && <p className="text-sm whitespace-pre-wrap mt-0.5">{report.activities}</p>}
                  {report.progress.length > 0 && <p className="text-xs text-muted-foreground mt-1">{report.progress.map((item) => `${item.title} ${item.percent}%`).join(" · ")}</p>}
                  {report.occurrences.length > 0 && (
                    <ul className="mt-1 grid gap-0.5">
                      {report.occurrences.map((item, i) => <li key={i} className="text-xs text-amber-800 dark:text-amber-300"><b>{OCCURRENCE[item.type] ?? "Ocorrência"}:</b> {item.description}</li>)}
                    </ul>
                  )}
                  {report.photos.length > 0 && (
                    <div className={cn("mt-2 grid gap-2", report.photos.length === 1 ? "grid-cols-1 max-w-sm" : "grid-cols-2 sm:grid-cols-3")}>
                      {report.photos.map((photo) => (
                        <a key={photo.url} href={photo.url} target="_blank" rel="noopener noreferrer" className="block">
                          <img src={photo.url} alt={photo.caption || `Foto de ${dateFull(report.date)}`} loading="lazy" className="aspect-[4/3] w-full rounded-md border object-cover" />
                          {photo.caption && <span className="block text-xs text-muted-foreground mt-0.5 truncate">{photo.caption}</span>}
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="grid gap-2">
          <h2 className="font-semibold px-1">Ordem de serviço</h2>
          <OrderSheet data={data} audience="cliente" />
        </section>
        <p className="text-center text-xs text-muted-foreground pb-4">{company.corporateName || company.name}{company.address ? ` · ${company.address}` : ""}</p>
      </main>
    </div>
  );
}
