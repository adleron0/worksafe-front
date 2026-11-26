import type { ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPageHeader } from "@/components/general-components/FormPage";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import { Tip, errorMessage } from "../../comercial/-shared/commercial";
import { ChannelHealth, ChannelStatusBadge, PAGES, channelStatusLabel, duration, formatPhone, useChannelHealth, when } from "../-shared/chat";

export const Route = createFileRoute("/_authenticated/conversas/_conversas/numeros_/$channelId_/saude")({
  component: HealthPage,
});

const LEVEL = {
  ok: { icon: "shield-check", title: "Tudo certo com este número", tone: "border-emerald-500/30 bg-emerald-500/8", iconTone: "text-emerald-600" },
  atencao: { icon: "triangle-alert", title: "Pontos de atenção", tone: "border-amber-500/30 bg-amber-500/8", iconTone: "text-amber-600" },
  erro: { icon: "octagon-alert", title: "O número precisa de você", tone: "border-red-500/30 bg-red-500/8", iconTone: "text-red-600" },
} as const;

const EVENT_TONE: Record<string, string> = { conectado: "bg-emerald-500", aguardando: "bg-amber-400", caiu: "bg-amber-500", banido: "bg-red-500", desconectado: "bg-muted-foreground/50" };

/** Saúde de um número: conexão, uso perto dos limites e sinais de risco de bloqueio. */
function HealthPage() {
  const { can } = useVerify();
  const { channelId } = Route.useParams();
  const allowed = can("canais_conversas") || can("todas_conversas");
  const health = useChannelHealth(Number(channelId), allowed);
  if (!allowed) return null;
  const h = health.data;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <FormPageHeader backTo={PAGES.channels} backLabel="Números" title={h ? `Saúde · ${h.name}` : "Saúde do número"}
        description={h?.phone ? (h.type === "instagram" ? `@${h.phone}` : formatPhone(h.phone)) : "Conexão, uso e sinais de risco"}
        badge={h && <ChannelStatusBadge status={h.status} />} />
      {health.error && <p className="text-sm text-destructive">{errorMessage(health.error)}</p>}
      {!h && !health.error && <div className="grid gap-4"><Skeleton className="h-24 rounded-card" /><Skeleton className="h-40 rounded-card" /><Skeleton className="h-64 rounded-card" /></div>}
      {h && <HealthBody h={h} />}
    </div>
  );
}

function HealthBody({ h }: { h: ChannelHealth }) {
  const level = LEVEL[h.level];
  const whatsapp = h.type === "whatsapp";
  const l = h.usage.limits;
  return (
    <div className="grid gap-4">
      <section className={cn("rounded-card border p-4", level.tone)}>
        <div className="flex items-start gap-3">
          <Icon name={level.icon} className={cn("mt-0.5 h-5 w-5 shrink-0", level.iconTone)} />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">{level.title}</h2>
            {h.warnings.length ? (
              <ul className="mt-2 grid gap-1.5 text-sm">
                {h.warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", w.level === "erro" ? "bg-red-500" : "bg-amber-500")} />
                    <span>{w.text}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-1 text-sm text-muted-foreground">Conectado, dentro dos limites e com o pessoal respondendo. Continue conversando só com quem procurou a empresa.</p>}
          </div>
          {(h.status === "caiu" || h.status === "desconectado") && whatsapp && (
            <Button asChild size="sm" className="shrink-0"><Link to={PAGES.channels} search={{ conectar: h.id }}><Icon name="qr-code" className="mr-1.5 h-4 w-4" />Conectar de novo</Link></Button>
          )}
        </div>
      </section>

      {whatsapp && (
        <section className="rounded-card border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground/80"><Icon name="gauge" className="h-4 w-4 text-muted-foreground" />Uso agora</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Usage label="No último minuto" value={h.usage.minute} max={l.porMinuto} hint="Mensagens enviadas no último minuto. Passando, a fila espera." />
            <Usage label="Na última hora" value={h.usage.hour} max={l.porHora} hint="Mensagens enviadas na última hora." />
            <Usage label="Hoje" value={h.usage.day} max={l.porDia} hint="Mensagens enviadas hoje. Passando do limite, o resto espera até amanhã." />
            <Usage label="Contatos novos hoje" value={h.usage.newToday} max={l.novosPorDia} hint="Primeira mensagem para quem nunca escreveu. É o que mais pesa para bloquear." />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t pt-3 text-[13px] text-muted-foreground">
            <span>Na fila: <b className="font-semibold text-foreground tabular-nums">{h.queue.queued}</b>{h.queue.oldestAt && h.queue.queued > 0 && <> · a mais antiga {when(h.queue.oldestAt)}</>}</span>
            <span>Falharam em 24 h: <b className={cn("font-semibold tabular-nums", h.failed24 ? "text-red-600" : "text-foreground")}>{h.failed24}</b></span>
            <span>Última recebida: <b className="font-medium text-foreground">{h.lastInboundAt ? when(h.lastInboundAt) : "—"}</b></span>
            <span>Última enviada: <b className="font-medium text-foreground">{h.lastOutboundAt ? when(h.lastOutboundAt) : "—"}</b></span>
          </div>
        </section>
      )}

      <section className="rounded-card border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground/80"><Icon name="calendar-range" className="h-4 w-4 text-muted-foreground" />Últimos 7 dias</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Figure label="Tempo conectado" value={h.week.uptime === null ? "—" : `${h.week.uptime.toLocaleString("pt-BR")}%`} hint="Quanto do tempo o número ficou conectado, pelo histórico de conexão." tone={h.week.uptime !== null && h.week.uptime < 95 ? "warn" : undefined} />
          <Figure label="Quedas" value={String(h.week.drops)} hint="Vezes que a conexão caiu ou o número foi bloqueado." tone={h.week.drops >= 3 ? "warn" : undefined} />
          <Figure label="Recebidas" value={h.week.inbound.toLocaleString("pt-BR")} hint="Mensagens dos clientes." />
          <Figure label="Enviadas" value={h.week.outbound.toLocaleString("pt-BR")} hint="Mensagens da empresa (pessoas, bot e respostas automáticas)." />
          <Figure label="Responderam" value={h.week.replyRate === null ? "—" : `${h.week.replyRate}%`} hint={`De ${h.week.talked} pessoas que receberam mensagem, ${h.week.answered} responderam. Pouca resposta parece disparo e aumenta o risco de bloqueio.`} tone={h.week.replyRate !== null && h.week.talked >= 15 && h.week.replyRate < 30 ? "warn" : undefined} />
          <Figure label="Pediram para parar" value={String(h.week.optOuts)} hint="Clientes que responderam “parar”, “sair” ou “não quero”. Quem pede para parar costuma denunciar." tone={h.week.optOuts >= 3 ? "warn" : undefined} />
        </div>
      </section>

      <section className="rounded-card border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground/80"><Icon name="history" className="h-4 w-4 text-muted-foreground" />Histórico da conexão</h3>
        {h.events.length ? (
          <ol className="grid gap-0">
            {h.events.map((ev, i) => (
              <li key={ev.id} className="relative flex gap-3 pb-3 last:pb-0">
                {i < h.events.length - 1 && <span className="absolute top-3 left-[5px] h-full w-px bg-border" />}
                <span className={cn("relative mt-1 h-[11px] w-[11px] shrink-0 rounded-full ring-2 ring-card", EVENT_TONE[ev.status] ?? "bg-muted")} />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="flex flex-wrap items-baseline gap-x-2"><span className="font-medium">{channelStatusLabel(ev.status)}</span><span className="text-xs text-muted-foreground">{new Date(ev.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></p>
                  {ev.reason && <p className="text-xs text-muted-foreground">{ev.reason}</p>}
                </div>
              </li>
            ))}
          </ol>
        ) : <p className="text-sm text-muted-foreground">Ainda sem registros. A partir de agora, cada conexão e queda fica aqui.</p>}
        {h.connectedAt && h.status === "conectado" && <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">Conectado desde {new Date(h.connectedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} ({duration((Date.now() - new Date(h.connectedAt).getTime()) / 1000)}).</p>}
      </section>

      {whatsapp && (
        <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
          <Icon name="smartphone" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          O sistema confere a conexão a cada 5 minutos e avisa em qualquer tela quando um número cai. Abra o WhatsApp no celular de vez em quando: depois de uns 14 dias sem o celular, o aparelho vinculado se desconecta.
        </p>
      )}
    </div>
  );
}

function Usage({ label, value, max, hint }: { label: string; value: number; max: number; hint: string }) {
  const ratio = max ? Math.min(1, value / max) : 0;
  return (
    <Tip text={hint}>
      <div className="grid min-w-0 gap-1.5">
        <span className="truncate text-xs text-muted-foreground">{label}</span>
        <span className="text-lg font-semibold tabular-nums leading-none">{value.toLocaleString("pt-BR")}<span className="text-xs font-normal text-muted-foreground"> / {max.toLocaleString("pt-BR")}</span></span>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", ratio >= 0.9 ? "bg-red-500" : ratio >= 0.7 ? "bg-amber-500" : "bg-primary")} style={{ width: `${Math.max(ratio * 100, value ? 3 : 0)}%` }} />
        </div>
      </div>
    </Tip>
  );
}

function Figure({ label, value, hint, tone }: { label: string; value: ReactNode; hint: string; tone?: "warn" }) {
  return (
    <Tip text={hint}>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className={cn("mt-0.5 text-lg font-semibold tabular-nums", tone === "warn" && "text-amber-600")}>{value}</p>
      </div>
    </Tip>
  );
}
