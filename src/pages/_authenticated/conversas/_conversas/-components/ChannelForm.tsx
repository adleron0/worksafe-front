import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { FormPageGrid, FormSection, SummaryRow } from "@/components/general-components/FormPage";
import { cn } from "@/lib/utils";
import { BotAvatar } from "../../../bots/-shared/avatar";
import { NumField, errorMessage } from "../../../comercial/-shared/commercial";
import { BotMode, CHAT_KEY, Channel, ChatMeta, ChatSettings, ContactAvatar, DAYS, PAGES, chatApi } from "../../-shared/chat";

/** Cores da identidade (verde, azul-aço, amarelo, vermelho, grafite): só a bolinha do número na caixa. */
const COLORS = ["#149E5E", "#3E6F98", "#F0C419", "#E52127", "#78716C"];
const MAX = { novosPorDia: 30, porMinuto: 20, porHora: 300, porDia: 1500 };
const MODE_ICON: Record<BotMode, string> = { desligado: "user-round", sugere: "pencil-line", triagem: "route", atende: "bot-message-square" };

interface Draft { name: string; color: string; sector: string; defaultBotId: number | null; botMode: BotMode; memberIds: number[]; settings: ChatSettings; historyDays: number }

/** Cadastro e configuração de um número (tela própria, em seções). */
export default function ChannelForm({ channel, meta, close }: { channel?: Channel; meta: ChatMeta; close: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draft, setDraft] = useState<Draft>(() => ({
    name: channel?.name ?? "",
    color: channel?.color ?? COLORS[0],
    sector: channel?.sector ?? "",
    defaultBotId: channel?.defaultBotId ?? null,
    botMode: channel?.botMode ?? "sugere",
    memberIds: channel?.memberIds ?? (user?.sub ? [Number(user.sub)] : []),
    settings: channel?.settings ?? meta.defaults,
    historyDays: channel?.historyDays ?? 30,
  }));
  const [error, setError] = useState("");
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setLimit = (key: keyof ChatSettings["limites"], value: number) => setDraft((current) => ({ ...current, settings: { ...current.settings, limites: { ...current.settings.limites, [key]: Math.min(MAX[key], Math.max(key === "novosPorDia" ? 0 : 1, Math.round(value))) } } }));
  const assinatura = draft.settings.assinatura ?? { enabled: true, formato: "primeiro" as const };
  const setSignature = (patch: Partial<ChatSettings["assinatura"]>) => setDraft((current) => ({ ...current, settings: { ...current.settings, assinatura: { ...assinatura, ...patch } } }));
  const myName = meta.users.find((u) => u.id === Number(user?.sub))?.name?.trim() || "Seu nome";
  const shownName = assinatura.formato === "completo" ? myName : myName.split(" ")[0];
  const setHours = (patch: Partial<ChatSettings["horario"]>) => setDraft((current) => ({ ...current, settings: { ...current.settings, horario: { ...current.settings.horario, ...patch } } }));

  const save = useMutation({
    mutationFn: () => {
      const body = { ...draft, name: draft.name.trim(), sector: draft.sector || null };
      return channel ? chatApi.put<Channel>(`channels/${channel.id}`, body) : chatApi.post<Channel>("channels", body);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: [CHAT_KEY] });
      toast({ title: channel ? "Número salvo" : "Número criado", description: channel ? undefined : "Agora é só conectar pelo QR code.", variant: "success" });
      if (channel) close();
      else navigate({ to: PAGES.channels, search: { conectar: saved.id } });
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.name.trim().length < 2) return setError("Dê um nome para o número (ex.: WhatsApp Serviços).");
    if (!draft.sector) return setError("Escolha o setor para onde as conversas deste número vão.");
    setError(""); save.mutate();
  };

  const bot = meta.bots.find((b) => b.id === draft.defaultBotId);
  const sectorName = meta.sectors.find((s) => s.id === draft.sector)?.name;
  const toggleMember = (id: number) => set("memberIds", draft.memberIds.includes(id) ? draft.memberIds.filter((m) => m !== id) : [...draft.memberIds, id]);
  const { horario, limites } = draft.settings;
  const instagram = channel?.type === "instagram";

  return (
    <form onSubmit={submit}>
      <FormPageGrid aside={<>
        <section className="rounded-card border bg-card">
          <div className="flex flex-col gap-2.5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Resumo</p>
            <SummaryRow label="Número"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: draft.color }} />{draft.name.trim() || "—"}</span></SummaryRow>
            <SummaryRow label="Setor">{sectorName ?? "—"}</SummaryRow>
            {!instagram && <SummaryRow label="Bot">{bot ? `${bot.persona ?? bot.name} · ${meta.botModes.find((m) => m.id === draft.botMode)?.name}` : "Sem bot"}</SummaryRow>}
            <SummaryRow label="Assinatura">{assinatura.enabled ? (assinatura.formato === "completo" ? "Nome completo" : "Primeiro nome") : "Sem nome"}</SummaryRow>
            <SummaryRow label="Equipe">{draft.memberIds.length ? `${draft.memberIds.length} ${draft.memberIds.length === 1 ? "pessoa" : "pessoas"}` : "—"}</SummaryRow>
            {!instagram && <SummaryRow label="Horário">{horario.enabled ? `${horario.inicio}–${horario.fim}` : "Sempre"}</SummaryRow>}
            {!instagram && <SummaryRow label="Novos por dia">{limites.novosPorDia}</SummaryRow>}
          </div>
        </section>
        {error && <p className="px-1 text-sm text-red-500">{error}</p>}
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : channel ? "Salvar" : "Criar e conectar"}</Button>
          <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
        </div>
      </>}>

        <FormSection title="Identificação" description="Como o número aparece na caixa de entrada. A cor é a bolinha que identifica as conversas dele.">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <Label htmlFor="channelName">Nome <span>*</span></Label>
              <Input id="channelName" name="channelName" value={draft.name} maxLength={120} onValueChange={(_, value) => set("name", String(value))} className="mt-1" placeholder="Ex.: WhatsApp Serviços" />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="mt-1 flex h-10 items-center gap-1.5">
                {COLORS.map((color) => (
                  <button key={color} type="button" aria-label={`Cor ${color}`} onClick={() => set("color", color)}
                    className={cn("h-6 w-6 cursor-pointer rounded-full", draft.color === color && "ring-2 ring-offset-2 ring-offset-card")} style={{ background: color, ["--tw-ring-color" as string]: color }} />
                ))}
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection title="Atendimento" description="As conversas que chegam neste número já caem no setor escolhido, e só a equipe marcada vê (além de quem vê todas).">
          <div className="sm:max-w-sm">
            <Label>Setor <span>*</span></Label>
            <div className="mt-1"><Select name="sector" options={meta.sectors} state={draft.sector} placeholder="Escolha o setor" onChange={(_, value) => set("sector", String(value))} /></div>
          </div>
          <div>
            <Label>Equipe</Label>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {meta.users.map((user) => {
                const on = draft.memberIds.includes(user.id);
                return (
                  <label key={user.id} className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors", on ? "border-primary/40 bg-primary/5" : "hover:bg-muted/60")}>
                    <Checkbox checked={on} onCheckedChange={() => toggleMember(user.id)} />
                    <ContactAvatar name={user.name} url={user.imageUrl} size={26} />
                    <span className="truncate text-sm">{user.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </FormSection>

        <FormSection title="Assinatura" description="O cliente vê quem está respondendo: o nome vai na frente de cada mensagem enviada pelo sistema. Se for o bot, vai o nome dele.">
          <label className="flex items-center gap-3">
            <Switch checked={assinatura.enabled} onCheckedChange={(checked) => setSignature({ enabled: checked })} />
            <span className="text-sm">{assinatura.enabled ? "Mensagens saem com o nome de quem respondeu" : "Mensagens saem sem nome"}</span>
          </label>
          {assinatura.enabled && (
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
              <div className="flex rounded-lg border bg-background p-0.5 text-xs font-medium sm:max-w-xs">
                {([["primeiro", "Primeiro nome"], ["completo", "Nome completo"]] as const).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setSignature({ formato: key })}
                    className={cn("flex-1 cursor-pointer rounded-md px-2 py-1.5 transition-colors", assinatura.formato === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{label}</button>
                ))}
              </div>
              <div className="chat-wallpaper flex justify-end rounded-xl border p-3">
                <div className="max-w-[90%] rounded-2xl rounded-br-md bg-primary-soft px-3 py-1.5 text-[13px] leading-snug shadow-xs">
                  {!instagram ? <i>{shownName}:</i> : <span>{shownName}:</span>}<br />Bom dia! Temos turma no dia 10.
                </div>
              </div>
            </div>
          )}
          {assinatura.enabled && <p className="text-xs text-muted-foreground">Assim o cliente vê. Na caixa de entrada a mensagem aparece sem o nome, que já fica no balão. Mensagens pelo celular e a resposta automática de fora do horário não levam nome.</p>}
        </FormSection>

        {instagram ? (
          <p className="flex items-start gap-2 rounded-card border bg-card px-4 py-3 text-sm text-muted-foreground"><Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />No Instagram, a resposta automática da Nina, o horário e o limite do dia ficam em Bots → Conectores. Aqui você escolhe o nome, o setor e quem da equipe atende.</p>
        ) : (<>
        <FormSection title="Bot deste número" description="Recomendado começar com &quot;Sugere resposta&quot;: o bot escreve, e a equipe decide se envia.">
          <div className="sm:max-w-sm">
            <Label>Bot</Label>
            <div className="mt-1">
              <Select name="bot" clearable placeholder="Sem bot" state={draft.defaultBotId ? String(draft.defaultBotId) : ""}
                options={meta.bots.map((b) => ({ id: String(b.id), name: `${b.persona ?? b.name}${b.role ? ` · ${b.role}` : ""}` }))}
                onChange={(_, value) => set("defaultBotId", value ? Number(value) : null)} />
            </div>
          </div>
          {bot && (
            <div className="grid gap-2 sm:grid-cols-2">
              {meta.botModes.map((mode) => {
                const on = draft.botMode === mode.id;
                const soon = mode.id === "triagem" || mode.id === "atende";
                return (
                  <button key={mode.id} type="button" onClick={() => set("botMode", mode.id)}
                    className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-all", on ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-foreground/20 hover:bg-muted/40")}>
                    <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      {mode.id === "desligado" ? <Icon name={MODE_ICON[mode.id]} className="h-4 w-4" /> : on ? <Icon name={MODE_ICON[mode.id]} className="h-4 w-4" /> : <BotAvatar look={bot.avatar} size={24} still />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-medium">{mode.name}{mode.id === "sugere" && <span className="rounded-full bg-primary/12 px-1.5 text-[10px] font-semibold text-primary">recomendado</span>}{soon && <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">em breve</span>}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{mode.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </FormSection>

        <FormSection title="Horário de atendimento" description="Fora do horário, o cliente recebe a mensagem abaixo (uma vez por conversa).">
          <label className="flex items-center gap-3">
            <Switch checked={horario.enabled} onCheckedChange={(checked) => setHours({ enabled: checked })} />
            <span className="text-sm">{horario.enabled ? "Atende só no horário abaixo" : "Atende a qualquer hora"}</span>
          </label>
          {horario.enabled && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((label, day) => {
                  const on = horario.dias.includes(day);
                  return (
                    <button key={label} type="button" onClick={() => setHours({ dias: on ? horario.dias.filter((d) => d !== day) : [...horario.dias, day].sort() })}
                      className={cn("h-9 w-12 cursor-pointer rounded-lg border text-xs font-medium transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{label}</button>
                  );
                })}
              </div>
              <div className="grid gap-4 sm:max-w-sm sm:grid-cols-2">
                <TimeField label="Começa às" value={horario.inicio} onChange={(inicio) => setHours({ inicio })} />
                <TimeField label="Termina às" value={horario.fim} onChange={(fim) => setHours({ fim })} />
              </div>
              <div>
                <Label htmlFor="outOfHours">Mensagem fora do horário</Label>
                <Textarea id="outOfHours" value={horario.mensagemFora} maxLength={1000} onChange={(event) => setHours({ mensagemFora: event.target.value })} className="mt-1 min-h-20"
                  placeholder="Olá! Nosso atendimento é de segunda a sexta, das 8h às 18h. Assim que abrirmos, respondemos você." />
              </div>
            </>
          )}
        </FormSection>

        <FormSection title="Proteção contra bloqueio" description="Limites deste número. Os tetos não podem ser passados: eles existem para o WhatsApp não bloquear o número.">
          <div className="grid gap-4 sm:grid-cols-2">
            <LimitField label="Contatos novos por dia" hint="Quem nunca escreveu para este número" value={limites.novosPorDia} max={MAX.novosPorDia} onChange={(v) => setLimit("novosPorDia", v)} />
            <LimitField label="Mensagens por minuto" value={limites.porMinuto} max={MAX.porMinuto} onChange={(v) => setLimit("porMinuto", v)} />
            <LimitField label="Mensagens por hora" value={limites.porHora} max={MAX.porHora} onChange={(v) => setLimit("porHora", v)} />
            <LimitField label="Mensagens por dia" value={limites.porDia} max={MAX.porDia} onChange={(v) => setLimit("porDia", v)} />
          </div>
          <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <Icon name="shield-check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            Sempre ativos: intervalo de {draft.settings.intervalo.min} a {draft.settings.intervalo.max} s entre mensagens com "digitando…", sem link na primeira mensagem, sem encurtadores, sem o mesmo texto para muitos contatos e quem pede "parar" não recebe mais.
          </p>
        </FormSection>
        </>)}
      </FormPageGrid>
    </form>
  );
}

function LimitField({ label, hint, value, max, onChange }: { label: string; hint?: string; value: number; max: number; onChange: (value: number) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <NumField value={value} digits={0} ariaLabel={label} onChange={onChange} className="w-28" />
        <span className="text-xs text-muted-foreground">teto {max.toLocaleString("pt-BR")}</span>
      </div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`).map((t) => ({ id: t, name: t }));
function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1"><Select name={label} options={TIMES} state={value} searchable onChange={(_, next) => onChange(String(next))} /></div>
    </div>
  );
}
