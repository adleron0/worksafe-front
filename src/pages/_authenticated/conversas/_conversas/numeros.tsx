import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import { cn } from "@/lib/utils";
import { BotAvatar } from "../../bots/-shared/avatar";
import { Tip, errorMessage } from "../../comercial/-shared/commercial";
import { CHAT_KEY, Channel, ChannelLogo, ChannelStatusBadge, ChatMeta, ContactAvatar, PAGES, WhatsAppLogo, chatApi, formatPhone, useChannels, useChatMeta } from "../-shared/chat";
import ConnectDialog from "../-shared/connect-dialog";

interface Search { conectar?: number }

export const Route = createFileRoute("/_authenticated/conversas/_conversas/numeros")({
  validateSearch: (search: Record<string, unknown>): Search => ({ conectar: Number(search.conectar) > 0 ? Number(search.conectar) : undefined }),
  component: ChannelsPage,
});

/** Conversas → Números: cada WhatsApp conectado, com setor, bot, equipe e o uso do dia. */
function ChannelsPage() {
  const { can } = useVerify();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/conversas/numeros" });
  const manage = can("canais_conversas");
  const channels = useChannels(true, 10000);
  const meta = useChatMeta();
  const [connecting, setConnecting] = useState<number | null>(null);

  useEffect(() => { if (search.conectar) setConnecting(search.conectar); }, [search.conectar]);
  const current = useMemo(() => channels.data?.find((c) => c.id === connecting) ?? null, [channels.data, connecting]);
  const closeConnect = (open: boolean) => { if (!open) { setConnecting(null); if (search.conectar) navigate({ search: {} }); } };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Números"
        description="Cada número tem o seu setor, o seu bot e a sua equipe. Se um for bloqueado, os outros continuam."
        actions={manage && <Button asChild><Link to={PAGES.newChannel}><Icon name="plus" className="mr-1.5 h-4 w-4" />Novo número</Link></Button>}
      />

      {meta.data && !meta.data.serverReady && (
        <div className="mb-4 flex items-start gap-3 rounded-card border border-amber-500/30 bg-amber-500/8 p-4 text-sm">
          <Icon name="server-off" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p><span className="font-medium">O servidor do WhatsApp ainda não está ligado.</span> <span className="text-muted-foreground">Dá para cadastrar os números agora; o botão Conectar funciona assim que o servidor estiver no ar.</span></p>
        </div>
      )}

      {channels.isLoading && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-card" />)}</div>}
      {channels.error && <p className="text-sm text-destructive">{errorMessage(channels.error)}</p>}

      {channels.data && !channels.data.length && <EmptyState manage={manage} />}

      {channels.data && channels.data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {channels.data.map((channel) => <ChannelCard key={channel.id} channel={channel} meta={meta.data} manage={manage} onConnect={() => setConnecting(channel.id)} />)}
          {manage && (
            <Link to={PAGES.newChannel} className="group grid min-h-56 place-items-center rounded-card border border-dashed text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
              <span className="grid justify-items-center gap-2 text-sm font-medium">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-muted"><Icon name="plus" className="h-5 w-5" /></span>
                Conectar outro número
              </span>
            </Link>
          )}
        </div>
      )}

      <ConnectDialog channel={current} open={!!current} onOpenChange={closeConnect} />
    </div>
  );
}

function EmptyState({ manage }: { manage: boolean }) {
  return (
    <div className="grid justify-items-center gap-4 rounded-card border bg-card px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-muted"><WhatsAppLogo className="h-8 w-8" /></span>
      <div className="max-w-md">
        <h2 className="text-lg font-semibold">Converse com os clientes pelo sistema</h2>
        <p className="mt-1 text-sm text-muted-foreground">Conecte um número de WhatsApp e as mensagens chegam aqui, no setor certo, com o bot ajudando. Pode ser um número para serviços, outro para treinamentos…</p>
      </div>
      {manage
        ? <Button asChild size="lg"><Link to={PAGES.newChannel}><Icon name="plus" className="mr-1.5 h-4 w-4" />Conectar o primeiro número</Link></Button>
        : <p className="text-sm text-muted-foreground">Peça para quem administra conectar um número.</p>}
    </div>
  );
}

/** Uso do dia: número pequeno + barra fina; só ganha cor quando chega perto do limite. */
function Meter({ label, value, max, hint }: { label: string; value: number; max: number; hint: string }) {
  const pct = Math.min(100, max ? (value / max) * 100 : 0);
  return (
    <Tip text={hint}>
      <div className="grid min-w-0 gap-1.5">
        <span className="truncate text-[11px] text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums leading-none">{value.toLocaleString("pt-BR")}<span className="text-xs font-normal text-muted-foreground"> / {max.toLocaleString("pt-BR")}</span></span>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-foreground/40")} style={{ width: `${Math.max(pct, value ? 3 : 0)}%` }} />
        </div>
      </div>
    </Tip>
  );
}

function ChannelCard({ channel, meta, manage, onConnect }: { channel: Channel; meta?: ChatMeta; manage: boolean; onConnect: () => void }) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<"desconectar" | "remover" | null>(null);
  const bot = meta?.bots.find((b) => b.id === channel.defaultBotId);
  const mode = meta?.botModes.find((m) => m.id === channel.botMode);
  const sector = meta?.sectors.find((s) => s.id === channel.sector);
  const members = (meta?.users ?? []).filter((u) => channel.memberIds.includes(u.id));
  const stats = channel.stats ?? { sentToday: 0, newToday: 0, open: 0, unread: 0 };
  const connected = channel.status === "conectado";
  const instagram = channel.type === "instagram";

  const action = useMutation({
    mutationFn: (kind: "desconectar" | "remover") => kind === "remover" ? chatApi.delete(`channels/${channel.id}`) : chatApi.post(`channels/${channel.id}/disconnect`),
    onSuccess: (_, kind) => { queryClient.invalidateQueries({ queryKey: [CHAT_KEY] }); toast({ title: kind === "remover" ? "Número removido" : "Número desconectado", variant: "success" }); },
    onError: (err) => toast({ title: "Não deu certo", description: errorMessage(err), variant: "destructive" }),
  });

  return (
    <article className="flex flex-col rounded-card border bg-card">
      <header className="flex items-start gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted"><ChannelLogo type={channel.type} className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 font-semibold leading-tight">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: channel.color ?? "#149E5E" }} />
            <span className="truncate">{channel.name}</span>
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
            <span className="truncate">{channel.phone ? (instagram ? `@${channel.phone}` : formatPhone(channel.phone)) : "Ainda não conectado"}</span>
            <ChannelStatusBadge status={channel.status} />
          </p>
        </div>
        {manage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="-mt-1 -mr-2 h-8 w-8 p-0" aria-label="Mais ações"><Icon name="ellipsis-vertical" className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild><Link to="/conversas/numeros/$channelId" params={{ channelId: String(channel.id) }}><Icon name="settings-2" className="mr-2 h-4 w-4" />Configurar</Link></DropdownMenuItem>
              {instagram && <DropdownMenuItem asChild><Link to="/bots/conectores" search={{ instagram: undefined, motivo: undefined }}><Icon name="cable" className="mr-2 h-4 w-4" />Conexão em Conectores</Link></DropdownMenuItem>}
              {connected && !instagram && <DropdownMenuItem onSelect={() => setConfirm("desconectar")}><Icon name="unplug" className="mr-2 h-4 w-4" />Desconectar</DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600" onSelect={() => setConfirm("remover")}><Icon name="trash-2" className="mr-2 h-4 w-4" />{instagram ? "Tirar da caixa de entrada" : "Remover número"}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {channel.statusReason && !connected && <p className="mx-4 -mt-1 mb-3 rounded-lg bg-muted px-2.5 py-1.5 text-[11px] leading-snug text-muted-foreground">{channel.statusReason}</p>}

      <dl className="grid gap-2 border-t px-4 py-3 text-[13px]">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Setor</dt>
          <dd className="truncate font-medium">{sector?.name ?? "—"}</dd>
        </div>
        {!instagram && <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Bot</dt>
          <dd className="flex min-w-0 items-center gap-1.5">
            {bot ? <><BotAvatar look={bot.avatar} size={18} still /><span className="truncate font-medium">{bot.persona ?? bot.name}</span><span className="truncate text-muted-foreground">· {channel.botMode === "desligado" ? "desligado" : mode?.name.toLowerCase()}</span></> : <span className="text-muted-foreground">Sem bot</span>}
          </dd>
        </div>}
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Equipe</dt>
          <dd className="flex items-center gap-1.5">
            {members.length ? (
              <span className="flex -space-x-1.5">
                {members.slice(0, 4).map((user) => <Tip key={user.id} text={user.name}><span><ContactAvatar name={user.name} url={user.imageUrl} size={20} className="rounded-full ring-2 ring-card" /></span></Tip>)}
                {members.length > 4 && <span className="grid h-5 w-5 place-items-center rounded-full bg-muted text-[9px] font-semibold ring-2 ring-card">+{members.length - 4}</span>}
              </span>
            ) : <span className="text-muted-foreground">Ninguém ainda</span>}
          </dd>
        </div>
      </dl>

      {instagram ? (
        <p className="flex items-start gap-2 border-t px-4 py-3 text-[12px] leading-snug text-muted-foreground">
          <Icon name="clock-3" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>O Instagram só deixa responder até 24 h depois da última mensagem do cliente. Limites do dia e resposta da Nina ficam em <Link to="/bots/conectores" search={{ instagram: undefined, motivo: undefined }} className="font-medium text-primary hover:underline">Conectores</Link>.</span>
        </p>
      ) : (
      <div className="grid grid-cols-2 gap-4 border-t px-4 py-3">
        <Meter label="Enviadas hoje" value={stats.sentToday} max={channel.settings.limites.porDia} hint="Mensagens que o sistema mandou hoje por este número. Passando do limite, as próximas esperam na fila até amanhã." />
        <Meter label="Contatos novos hoje" value={stats.newToday} max={channel.settings.limites.novosPorDia} hint="Pessoas que nunca escreveram para este número e receberam a primeira mensagem hoje. É o que mais pesa para o WhatsApp bloquear." />
      </div>
      )}

      <footer className="mt-auto flex items-center gap-2 border-t px-4 py-3">
        {connected ? (
          <>
            <Button asChild size="sm" variant="outline" className="flex-1">
              <Link to={PAGES.inbox} search={{ numero: channel.id }}>
                <Icon name="messages-square" className="mr-1.5 h-4 w-4" />Abrir conversas
                {stats.unread > 0 && <span className="ml-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{stats.unread}</span>}
              </Link>
            </Button>
            {manage && <Tip text="Configurar"><Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0"><Link to="/conversas/numeros/$channelId" params={{ channelId: String(channel.id) }} aria-label="Configurar"><Icon name="settings-2" className="h-4 w-4" /></Link></Button></Tip>}
          </>
        ) : instagram ? (
          <Button asChild size="sm" className="flex-1"><Link to="/bots/conectores" search={{ instagram: undefined, motivo: undefined }}><Icon name="cable" className="mr-1.5 h-4 w-4" />Conectar em Conectores</Link></Button>
        ) : manage ? (
          <Button size="sm" className="flex-1" onClick={onConnect} disabled={channel.status === "banido"}>
            <Icon name={channel.status === "banido" ? "ban" : "qr-code"} className="mr-1.5 h-4 w-4" />{channel.status === "banido" ? "Número bloqueado" : channel.status === "desconectado" ? "Conectar" : "Conectar de novo"}
          </Button>
        ) : <p className="text-xs text-muted-foreground">Aguardando quem administra conectar.</p>}
      </footer>

      <ConfirmDialog open={confirm === "desconectar"} onOpenChange={(open) => !open && setConfirm(null)} title="Desconectar este número?"
        description="As conversas ficam no sistema, mas as mensagens novas param de chegar até conectar de novo pelo QR code."
        onConfirm={() => action.mutate("desconectar")} />
      <ConfirmDialog open={confirm === "remover"} onOpenChange={(open) => !open && setConfirm(null)} title={instagram ? "Tirar o Instagram da caixa de entrada?" : `Remover ${channel.name}?`}
        description={instagram ? "As mensagens do Direct deixam de aparecer aqui. A conta continua conectada em Conectores e a Nina segue funcionando." : "O número sai do sistema e é desconectado do WhatsApp. As conversas dele deixam de aparecer na caixa de entrada."}
        slideLabel="Deslize para remover" onConfirm={() => action.mutate("remover")} />
    </article>
  );
}
