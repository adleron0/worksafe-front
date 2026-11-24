import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { errorMessage } from "../../comercial/-shared/commercial";
import { BotAvatar } from "../-shared/avatar";
import { FaceEditor } from "../-shared/face-editor";
import { PersonalityPicker } from "../-shared/personality-picker";
import { BOTS_KEY, BUDGET_KEY, BotFull, BotsConfig, BudgetView, CatalogModel, CatalogTool, RISK_CLASS, RISK_LABEL, STATUS_KEY, TEAM_KEY, aiApi, dateTimeBr } from "../-shared/bots";
import api from "@/services/api";

export const Route = createFileRoute("/_authenticated/bots/_admin/configuracao")({
  component: ConfigPage,
});

const CONFIG_KEY = "aiBotsConfig";

/** Configurar os bots: instruções (com versões), ferramentas, modelo e atalhos. */
function ConfigPage() {
  const { can } = useVerify();
  const { data, isLoading, error } = useQuery({ queryKey: [CONFIG_KEY], enabled: can("update_bots"), queryFn: () => aiApi.get<BotsConfig>("bots/config") });
  const [selected, setSelected] = useState<number | "novo" | null>(null);
  if (!can("update_bots")) return null;
  const creating = selected === "novo" && !!data;
  const bot = creating ? undefined : data?.bots.find((item) => item.id === selected) ?? data?.bots[0];

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-bold">Configurar bots</h1>
        <p className="text-sm text-muted-foreground">Cada bot tem instruções fixas, as ferramentas que pode usar e o modelo de IA. Toda mudança nas instruções vira uma versão, e dá para voltar. Quem conversa com o bot precisa da permissão dele (por exemplo, "usar_bot_comercial").</p>
      </div>
      {error && <p className="text-destructive">Erro: {errorMessage(error)}</p>}
      {isLoading && <Skeleton className="h-64 w-full" />}
      {data && (
        <>
          <ProvidersCard config={data} />
          <ModelForAllCard config={data} />
          <EconomyCard config={data} />
          <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-1">
              {data.bots.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelected(item.id)} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${item.id === bot?.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
                  <BotAvatar look={item.avatar} size={28} />
                  <span className="flex-1">{item.persona} <span className="text-xs text-muted-foreground">· {item.name}</span></span>
                  {!item.active && <span className="text-[10px] text-muted-foreground">desligado</span>}
                </button>
              ))}
              <button type="button" onClick={() => setSelected("novo")} className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm ${creating ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <Icon name="plus" className="h-4 w-4" /> Criar bot
              </button>
            </div>
            {creating && <BotEditor key="novo" bot={newBot(data)} config={data} isNew onCreated={(id) => setSelected(id)} onCancel={() => setSelected(null)} />}
            {bot && <BotEditor key={`${bot.id}-${bot.version}-${bot.updatedAt}`} bot={bot} config={data} onArchived={() => setSelected(null)} />}
          </div>
        </>
      )}
    </div>
  );
}

function ProvidersCard({ config }: { config: BotsConfig }) {
  const { can } = useVerify();
  const [keysOpen, setKeysOpen] = useState(false);
  return (
    <div className="rounded-card border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">Fornecedores de IA:</span>
        {config.providers.map((provider) => (
          <span key={provider.id} className={`rounded-full px-2 py-0.5 text-xs font-medium ${provider.available ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
            {provider.label}: {provider.available ? "chave configurada" : "sem chave"}
          </span>
        ))}
        {!config.enabled && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Bots desligados (AI_BOTS_ENABLED)</span>}
        {can("chaves_ia_bots") && (
          <Button type="button" size="sm" variant="outline" className="ml-auto" onClick={() => setKeysOpen(true)}>
            <Icon name="key-round" className="h-4 w-4" /> Chaves de IA
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">A chave cadastrada aqui vale antes da variável do servidor (GEMINI_API_KEY, ANTHROPIC_API_KEY...). Ela fica guardada criptografada e a tela só mostra o final. Um bot cujo fornecedor está sem chave avisa quem tenta conversar.</p>
      {keysOpen && <ProviderKeysDialog onClose={() => setKeysOpen(false)} />}
    </div>
  );
}

const money = (value: number) => `US$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dayBr = (iso: string) => iso.split("-").reverse().join("/");
const OTHER = "__outro__";
const NONE = "__nenhum__";

function modelOption(model: CatalogModel) {
  const tags = [model.recommended ? "recomendado" : "", model.upcoming ? `dobra de preço em ${dayBr(model.upcoming.from)}` : "", model.available ? "" : "sem chave"].filter(Boolean).join(", ");
  return { id: `${model.provider}:${model.id}`, name: `${model.label} · ~${money(model.perThousand)} por mil perguntas${tags ? ` (${tags})` : ""}` };
}

/**
 * Escolha do modelo pela lista (com preço e para que serve). "Outro modelo"
 * abre fornecedor e nome para digitar, para um modelo que não está na lista.
 */
function ModelPicker({ name, config, provider, model, optional, noneLabel = "Sem reserva", onChange }: { name: string; config: BotsConfig; provider: string; model: string; optional?: boolean; noneLabel?: string; onChange: (provider: string, model: string) => void }) {
  const known = config.models.find((item) => item.provider === provider && item.id === model);
  const [custom, setCustom] = useState(!known && !!model);
  const value = !model && optional && !custom ? NONE : custom ? OTHER : `${provider}:${model}`;
  const options = [
    ...(optional ? [{ id: NONE, name: noneLabel }] : []),
    ...config.models.map(modelOption),
    { id: OTHER, name: "Outro modelo (digitar o nome)" },
  ];
  const providers = config.providers.map((item) => ({ id: item.id, name: `${item.label}${item.available ? "" : " (sem chave)"}` }));
  const pick = (next: string) => {
    if (next === OTHER) { setCustom(true); return; }
    setCustom(false);
    if (next === NONE) { onChange("", ""); return; }
    const [nextProvider, ...rest] = next.split(":");
    onChange(nextProvider, rest.join(":"));
  };
  return (
    <div className="mt-1 grid gap-2">
      <Select name={name} modal options={options} state={value} onChange={(_, next) => pick(String(next))} />
      {known && !custom && <ModelNote model={known} />}
      {custom && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Select name={`${name}Provider`} modal options={providers} state={provider} onChange={(_, next) => onChange(String(next), model)} placeholder="Fornecedor" />
          <Input name={`${name}Name`} value={model} maxLength={80} onValueChange={(_, next) => onChange(provider, String(next))} placeholder="Nome do modelo, ex.: gemini-3.1-pro-preview" />
        </div>
      )}
    </div>
  );
}

function ModelNote({ model }: { model: CatalogModel }) {
  return (
    <p className="text-xs text-muted-foreground">
      {model.note} Preço por milhão de tokens: {money(model.price.input)} de entrada e {money(model.price.output)} de saída.
      {model.upcoming && <span className="font-medium text-amber-700 dark:text-amber-400"> Atenção: o preço dobra em {dayBr(model.upcoming.from)} (~{money(model.upcoming.perThousand)} por mil perguntas).</span>}
      {!model.available && <span className="text-amber-700 dark:text-amber-400"> O {model.providerLabel} está sem chave: cadastre em "Chaves de IA".</span>}
    </p>
  );
}

/** Um modelo para todos os bots de uma vez (cada bot ganha uma versão nova, dá para voltar). */
function ModelForAllCard({ config }: { config: BotsConfig }) {
  const queryClient = useQueryClient();
  const recommended = config.models.find((item) => item.recommended) ?? config.models[0];
  const [choice, setChoice] = useState({ provider: recommended?.provider ?? "", model: recommended?.id ?? "" });
  const counts = new Map<string, number>();
  for (const bot of config.bots) counts.set(`${bot.provider}:${bot.model}`, (counts.get(`${bot.provider}:${bot.model}`) ?? 0) + 1);
  const labelOf = (key: string) => {
    const [provider, ...rest] = key.split(":");
    return config.models.find((item) => item.provider === provider && item.id === rest.join(":"))?.label ?? rest.join(":");
  };
  const today = [...counts.entries()].map(([key, count]) => `${count} no ${labelOf(key)}`).join(", ");
  const target = config.models.find((item) => item.provider === choice.provider && item.id === choice.model);
  const apply = useMutation({
    mutationFn: () => aiApi.put<{ changed: number; total: number }>("bots/model", choice),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [CONFIG_KEY] });
      queryClient.invalidateQueries({ queryKey: [BOTS_KEY] });
      toast({ title: result.changed ? `${result.changed} bot${result.changed > 1 ? "s" : ""} trocado${result.changed > 1 ? "s" : ""}` : "Todos já usavam esse modelo", variant: "success" });
    },
    onError: (error) => toast({ title: "Não foi possível trocar", description: errorMessage(error), variant: "destructive" }),
  });
  return (
    <div className="rounded-card border bg-card p-4 text-sm">
      <Label>Modelo de todos os bots</Label>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <ModelPicker name="allModel" config={config} provider={choice.provider} model={choice.model} onChange={(provider, model) => setChoice({ provider, model })} />
        </div>
        <ConfirmDialog
          title={`Usar ${target?.label ?? choice.model} em todos os bots?`}
          description="Cada bot passa a responder com esse modelo na próxima mensagem e ganha uma versão nova, então dá para voltar pelo histórico. A reserva de cada bot não muda."
          onConfirm={() => apply.mutate()}
        >
          <Button type="button" disabled={!choice.provider || choice.model.length < 3 || apply.isPending} className="mt-1">{apply.isPending ? "Trocando..." : "Usar em todos"}</Button>
        </ConfirmDialog>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Hoje: {today || "nenhum bot"}. Para um bot só, troque no cadastro dele abaixo. O custo por mil perguntas é estimativa com o tamanho médio das conversas dos bots.</p>
    </div>
  );
}

/**
 * Economia: precisão máxima (tudo no principal), o modelo econômico em vários
 * bots de uma vez e o teto mensal de gasto com IA (com a barra do mês).
 */
function EconomyCard({ config }: { config: BotsConfig }) {
  const queryClient = useQueryClient();
  const { data: budget } = useQuery({ queryKey: [BUDGET_KEY], queryFn: () => aiApi.get<BudgetView>("budget") });
  const cheapest = config.models.find((item) => item.id === "gemini-3.1-flash-lite") ?? config.models[config.models.length - 1];
  const [eco, setEco] = useState({ provider: cheapest?.provider ?? "", model: cheapest?.id ?? "" });
  const [selectedBots, setSelectedBots] = useState<number[]>(() => config.bots.map((bot) => bot.id));
  const [turnOn, setTurnOn] = useState(true);
  const [showBotBudgets, setShowBotBudgets] = useState(false);
  const [form, setForm] = useState<{ value: string; warn: string; onExceed: "parar" | "economico"; provider: string; model: string; botBudgets: Record<string, string> } | null>(null);
  useEffect(() => {
    if (!budget || form) return;
    setForm({
      value: budget.monthlyBudgetUsd != null ? String(budget.monthlyBudgetUsd) : "", warn: String(budget.warnPercent), onExceed: budget.onExceed,
      provider: budget.economyProvider ?? cheapest?.provider ?? "", model: budget.economyModel ?? cheapest?.id ?? "",
      botBudgets: Object.fromEntries(Object.entries(budget.botBudgets ?? {}).map(([id, value]) => [id, String(value)])),
    });
  }, [budget, form, cheapest]);
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [BUDGET_KEY] });
    queryClient.invalidateQueries({ queryKey: [CONFIG_KEY] });
    queryClient.invalidateQueries({ queryKey: [STATUS_KEY] });
  };
  const precision = useMutation({
    mutationFn: (value: boolean) => aiApi.put<BudgetView>("budget", { maxPrecision: value }),
    onSuccess: (saved) => { refresh(); toast({ title: saved.maxPrecision ? "Precisão máxima ligada: todos os bots no modelo principal" : "Precisão máxima desligada: vale o modo econômico de cada bot", variant: "success" }); },
    onError: (error) => toast({ title: "Não foi possível salvar", description: errorMessage(error), variant: "destructive" }),
  });
  const applyEco = useMutation({
    mutationFn: () => aiApi.put<{ changed: number }>("bots/economy", { botIds: selectedBots, economyProvider: eco.provider, economyModel: eco.model, economyMode: turnOn }),
    onSuccess: (result) => { refresh(); queryClient.invalidateQueries({ queryKey: [BOTS_KEY] }); toast({ title: `Econômico aplicado em ${result.changed} bot${result.changed === 1 ? "" : "s"}`, variant: "success" }); },
    onError: (error) => toast({ title: "Não foi possível aplicar", description: errorMessage(error), variant: "destructive" }),
  });
  const saveBudget = useMutation({
    mutationFn: () => {
      const f = form!;
      const number = (text: string) => (text.trim() === "" ? null : Number(text.replace(",", ".")));
      return aiApi.put<BudgetView>("budget", {
        monthlyBudgetUsd: number(f.value), warnPercent: Number(f.warn), onExceed: f.onExceed,
        economyProvider: f.provider || null, economyModel: f.model || null,
        botBudgets: Object.fromEntries(Object.entries(f.botBudgets).map(([id, value]) => [id, number(value)]).filter(([, value]) => value != null)),
      });
    },
    onSuccess: () => { refresh(); toast({ title: "Teto salvo", variant: "success" }); },
    onError: (error) => toast({ title: "Não foi possível salvar o teto", description: errorMessage(error), variant: "destructive" }),
  });
  const ecoLabel = config.models.find((item) => item.provider === eco.provider && item.id === eco.model)?.label ?? eco.model;
  const usingEco = config.bots.filter((bot) => bot.economyMode && bot.economyModel).length;
  const percent = budget?.percent ?? 0;
  const setF = (patch: Partial<NonNullable<typeof form>>) => setForm((current) => (current ? { ...current, ...patch } : current));

  return (
    <div className="grid gap-4 rounded-card border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-base">Economia</Label>
        <span className="text-xs text-muted-foreground">· {usingEco} de {config.bots.length} bots com o modo econômico ligado</span>
      </div>

      <label className="flex items-start gap-2">
        <Switch checked={!!budget?.maxPrecision} disabled={!budget || precision.isPending} onCheckedChange={(value) => precision.mutate(value)} className="mt-0.5" />
        <span>
          <span className="font-medium">Precisão máxima: usar sempre o modelo principal</span>
          <span className="block text-xs text-muted-foreground">Ligada, todos os bots respondem só com o modelo principal de cada um, sem apagar o econômico configurado (desligou, volta como estava). Exceção: se o teto do mês estourar com "passar para o econômico", os bots passam para o econômico mesmo assim, porque o teto é uma proteção de gasto.</span>
        </span>
      </label>

      <div className="grid gap-2 border-t pt-3">
        <p className="font-medium">Aplicar o modelo econômico a vários bots</p>
        <ModelPicker name="ecoForMany" config={config} provider={eco.provider} model={eco.model} onChange={(provider, model) => setEco({ provider, model })} />
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {config.bots.map((bot) => (
            <label key={bot.id} className="flex items-center gap-2 text-xs">
              <Checkbox checked={selectedBots.includes(bot.id)} onCheckedChange={(checked) => setSelectedBots((current) => (checked ? [...current, bot.id] : current.filter((id) => id !== bot.id)))} />
              {bot.persona} <span className="text-muted-foreground">· {bot.name}{bot.economyMode && bot.economyModel ? " · econômico ligado" : ""}</span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs"><Switch checked={turnOn} onCheckedChange={setTurnOn} /> Ligar o modo econômico nesses bots</label>
          <ConfirmDialog
            title={`Usar ${ecoLabel} como econômico em ${selectedBots.length} bot${selectedBots.length === 1 ? "" : "s"}?`}
            description={turnOn ? "Consultas e conversa passam a ir no econômico; quando for gravar no sistema, o modelo principal de cada bot decide. O modelo principal não muda." : "O econômico fica escolhido, mas o modo econômico desses bots fica desligado (tudo no principal)."}
            onConfirm={() => applyEco.mutate()}
          >
            <Button type="button" size="sm" variant="outline" className="ml-auto" disabled={!selectedBots.length || eco.model.length < 3 || applyEco.isPending}>{applyEco.isPending ? "Aplicando..." : "Aplicar"}</Button>
          </ConfirmDialog>
        </div>
      </div>

      <div className="grid gap-3 border-t pt-3">
        <p className="font-medium">Teto mensal de gasto com IA</p>
        {budget && (
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
              <span>Gasto em {budget.month}: <span className="font-semibold">{money(budget.spent)}</span> de {money(budget.budget)} {budget.percent !== null ? `(${budget.percent}%)` : ""}</span>
              {budget.mode === "stop" && <span className="font-medium text-destructive">Teto atingido: bots parados até virar o mês</span>}
              {budget.mode === "economy" && <span className="font-medium text-amber-700 dark:text-amber-400">Teto atingido: todos os bots no econômico até virar o mês</span>}
              {budget.mode === "ok" && budget.warning && <span className="font-medium text-amber-700 dark:text-amber-400">Passou de {budget.warnPercent}% do teto</span>}
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full ${percent >= 100 ? "bg-destructive" : budget.warning ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min(100, percent)}%` }} />
            </div>
          </div>
        )}
        {form && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><Label htmlFor="budgetValue">Teto do mês (US$)</Label><Input id="budgetValue" name="budgetValue" className="mt-1" inputMode="decimal" value={form.value} onValueChange={(_, value) => setF({ value: String(value) })} placeholder={budget?.envCap != null ? `Servidor: ${budget.envCap}` : "Padrão: 50"} /></div>
              <div><Label htmlFor="budgetWarn">Avisar ao chegar em (%)</Label><Input id="budgetWarn" name="budgetWarn" className="mt-1" inputMode="numeric" value={form.warn} onValueChange={(_, value) => setF({ warn: String(value) })} /></div>
              <div><Label>Ao estourar</Label><div className="mt-1"><Select name="budgetOnExceed" options={[{ id: "parar", name: "Parar os bots" }, { id: "economico", name: "Passar todos para o econômico" }]} state={form.onExceed} onChange={(_, value) => setF({ onExceed: String(value) === "economico" ? "economico" : "parar" })} /></div></div>
            </div>
            {form.onExceed === "economico" && (
              <div>
                <Label>Modelo econômico da empresa (depois do teto)</Label>
                <ModelPicker name="budgetEconomy" config={config} provider={form.provider} model={form.model} onChange={(provider, model) => setF({ provider, model })} />
                {budget && !budget.economyReady && <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">O fornecedor desse modelo está sem chave: ao estourar, os bots param.</p>}
              </div>
            )}
            <div className="text-xs">
              <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setShowBotBudgets((value) => !value)}>
                <Icon name={showBotBudgets ? "chevron-down" : "chevron-right"} className="h-3 w-3" /> Teto por bot (opcional)
              </Button>
              {showBotBudgets && <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {config.bots.map((bot) => (
                  <div key={bot.id} className="flex items-center gap-2">
                    <span className="flex-1 truncate">{bot.persona} <span className="text-muted-foreground">· {bot.name}</span></span>
                    <Input name={`botBudget${bot.id}`} className="w-28" inputMode="decimal" value={form.botBudgets[String(bot.id)] ?? ""} onValueChange={(_, value) => setF({ botBudgets: { ...form.botBudgets, [String(bot.id)]: String(value) } })} placeholder="sem teto" />
                  </div>
                ))}
              </div>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="flex-1 text-xs text-muted-foreground">
                O aviso aparece aqui e como relatório no sistema, uma vez por mês. {budget?.envCap != null ? `O servidor limita o teto a ${money(budget.envCap)}: passou disso, os bots param sempre. ` : ""}O teto por bot faz o mesmo que o da empresa, só para aquele bot.
              </p>
              <Button type="button" size="sm" onClick={() => saveBudget.mutate()} disabled={saveBudget.isPending}>{saveBudget.isPending ? "Salvando..." : "Salvar teto"}</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface ProviderKeyRow { provider: string; label: string; envName: string; source: "tela" | "servidor" | null; hint: string | null; updatedAt: string | null; unavailableReason: string | null }
const KEYS_KEY = "aiProviderKeys";

/** Cadastrar, trocar ou remover a chave de cada fornecedor. A chave é testada no fornecedor antes de salvar. */
function ProviderKeysDialog({ onClose }: { onClose: () => void }) {
  const { data, isLoading, error } = useQuery({ queryKey: [KEYS_KEY], queryFn: () => aiApi.get<ProviderKeyRow[]>("provider-keys") });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chaves de IA</DialogTitle>
          <DialogDescription>Cole a chave nova e salve: ela é testada no fornecedor antes de valer e passa a ser usada por todos os bots na hora. Remover volta a usar a variável do servidor, se houver.</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">Erro: {errorMessage(error)}</p>}
        {isLoading && <Skeleton className="h-40 w-full" />}
        <div className="grid gap-3">
          {data?.map((row) => <ProviderKeyItem key={row.provider} row={row} />)}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProviderKeyItem({ row }: { row: ProviderKeyRow }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [KEYS_KEY] });
    queryClient.invalidateQueries({ queryKey: [CONFIG_KEY] });
    queryClient.invalidateQueries({ queryKey: [STATUS_KEY] });
    queryClient.invalidateQueries({ queryKey: [BOTS_KEY] });
    queryClient.invalidateQueries({ queryKey: [TEAM_KEY] });
  };
  const save = useMutation({
    mutationFn: () => aiApi.put<ProviderKeyRow>(`provider-keys/${row.provider}`, { key: value }),
    onSuccess: () => { setValue(""); setEditing(false); refresh(); toast({ title: `Chave do ${row.label} salva`, description: "Testada no fornecedor e já em uso.", variant: "success" }); },
    onError: (err) => toast({ title: "A chave não foi salva", description: errorMessage(err), variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: async () => (await api.delete<ProviderKeyRow>(`ai/provider-keys/${row.provider}`)).data,
    onSuccess: () => { refresh(); toast({ title: `Chave do ${row.label} removida`, variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível remover", description: errorMessage(err), variant: "destructive" }),
  });
  const badge = row.source === "tela"
    ? { text: `Cadastrada aqui ${row.hint ?? ""}`, cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" }
    : row.source === "servidor"
      ? { text: `Variável do servidor (${row.envName})`, cls: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" }
      : { text: "Sem chave", cls: "bg-muted text-muted-foreground" };

  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{row.label}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.text}</span>
        {row.source === "tela" && row.updatedAt && <span className="text-xs text-muted-foreground">desde {dateTimeBr(row.updatedAt)}</span>}
        <div className="ml-auto flex gap-2">
          {!editing && <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>{row.source ? "Trocar chave" : "Cadastrar chave"}</Button>}
          {row.source === "tela" && !editing && (
            <ConfirmDialog title={`Remover a chave do ${row.label}?`} description={row.envName ? `Os bots voltam a usar a variável ${row.envName} do servidor; se ela não existir, quem usa ${row.label} fica sem chave.` : "Os bots que usam este fornecedor ficam sem chave."} onConfirm={() => remove.mutate()}>
              <Button type="button" size="sm" variant="ghost" disabled={remove.isPending}>Remover</Button>
            </ConfirmDialog>
          )}
        </div>
      </div>
      {row.unavailableReason && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{row.unavailableReason}</p>}
      {editing && (
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); if (value.trim()) save.mutate(); }}>
          <Input id={`key-${row.provider}`} name={`key-${row.provider}`} type="password" autoComplete="off" className="flex-1" value={value} onValueChange={(_, next) => setValue(String(next))} placeholder={`Cole aqui a chave do ${row.label}`} autoFocus />
          <div className="flex gap-2">
            <Button type="submit" disabled={!value.trim() || save.isPending}>{save.isPending ? "Testando..." : "Testar e salvar"}</Button>
            <Button type="button" variant="ghost" onClick={() => { setEditing(false); setValue(""); }} disabled={save.isPending}>Cancelar</Button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Rascunho de um bot novo: rosto montado, modelo recomendado e as ferramentas de conversar com os colegas. */
function newBot(config: BotsConfig): BotFull {
  const recommended = config.models.find((item) => item.recommended) ?? config.models[0];
  return {
    id: 0, key: "", name: "", persona: "", role: "", avatar: "r:bola.ciano.nenhum.n.normal", description: "", icon: "bot", active: true, shortcuts: [],
    provider: recommended?.provider ?? "gemini", providerLabel: recommended?.providerLabel ?? "", model: recommended?.id ?? "", providerReady: !!recommended?.available,
    capabilities: [], hiddenCount: 0, instructions: "", tools: config.tools.filter((tool) => ["pedir_ao_colega", "passar_para_colega"].includes(tool.name)).map((tool) => tool.name),
    permissionKey: "", version: 0, fallbackProvider: null, fallbackModel: null, economyProvider: null, economyModel: null, economyMode: false, updatedAt: "", custom: true,
  };
}

/** Área de cada ferramenta, pela permissão que ela exige e pelo nome (o catálogo não guarda isso). */
const TOOL_AREAS = [
  { id: "financeiro", label: "Financeiro", test: (name: string, perms: string) => name.startsWith("fin_") || name.startsWith("contas_") || /_financeiro\b/.test(perms) },
  { id: "comercial", label: "Comercial", test: (name: string, perms: string) => /_comercial\b|update_acompanhamento/.test(perms) || /proposta|cliente|acompanhamento/.test(name) },
  { id: "rh", label: "RH e Departamento Pessoal", test: (name: string, perms: string) => /funcionarios|hr_activities/.test(perms) || /funcionario|documento|ausencia|mapa_alocacao|tipos_de_documento/.test(name) },
  { id: "obras", label: "Obras e serviços", test: (name: string, perms: string) => /ordens_de_servico|view_alocacao/.test(perms) || /(^|_)(os|rdos?|obras?)(_|$)/.test(name) },
  { id: "marketing", label: "Marketing", test: (name: string, perms: string) => /blog|instagram/.test(perms) || /imagem|imagens|blog|instagram/.test(name) },
  { id: "treinamentos", label: "Treinamentos", test: (name: string, perms: string) => /_classes\b|list_treinamentos|instrutores/.test(perms) || /turma|aluno|inscri|curso|instrutor|certificad|presenca|prova/.test(name) },
  { id: "compras", label: "Suprimentos (compras e estoque)", test: (name: string, perms: string) => /pedidos_de_compra|estoque|entregas_epi|equipamentos|locacoes/.test(perms) || /compra|estoque|epi|equipamento|locac|inspec/.test(name) },
] as const;
const GENERAL = { id: "geral", label: "Gerais (agenda, colegas, memória)" };
const toolArea = (tool: CatalogTool) => {
  const perms = tool.permissions.join(" ");
  return TOOL_AREAS.find((area) => area.test(tool.name, perms))?.id ?? GENERAL.id;
};

function BotEditor({ bot, config, isNew, onCreated, onCancel, onArchived }: { bot: BotFull; config: BotsConfig; isNew?: boolean; onCreated?: (id: number) => void; onCancel?: () => void; onArchived?: () => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => ({
    name: bot.name, persona: bot.persona, role: bot.role, avatar: bot.avatar, description: bot.description, active: bot.active, instructions: bot.instructions, tools: bot.tools,
    provider: bot.provider, model: bot.model, fallbackProvider: bot.fallbackProvider ?? "", fallbackModel: bot.fallbackModel ?? "", shortcuts: bot.shortcuts,
    economyProvider: bot.economyProvider ?? "", economyModel: bot.economyModel ?? "", economyMode: !!bot.economyMode,
  }));
  const budget = useQuery({ queryKey: [BUDGET_KEY], queryFn: () => aiApi.get<BudgetView>("budget") });
  const [versionsOpen, setVersionsOpen] = useState(false);
  useEffect(() => { setVersionsOpen(false); }, [bot.id]);
  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const done = (title: string) => { queryClient.invalidateQueries({ queryKey: [CONFIG_KEY] }); queryClient.invalidateQueries({ queryKey: [BOTS_KEY] }); toast({ title, variant: "success" }); };
  const save = useMutation({
    mutationFn: async () => {
      const body = { ...draft, fallbackProvider: draft.fallbackProvider || null, fallbackModel: draft.fallbackModel || null, economyProvider: draft.economyProvider || null, economyModel: draft.economyModel || null, economyMode: draft.economyMode && !!draft.economyModel };
      if (!isNew) return aiApi.put<BotFull>(`bots/${bot.id}`, body);
      const created = await aiApi.post<BotFull>("bots", body);
      // a reserva e o "desligado" vão no cadastro normal, depois de criado
      if (body.fallbackModel || body.economyModel || !body.active) return aiApi.put<BotFull>(`bots/${created.id}`, { fallbackProvider: body.fallbackProvider, fallbackModel: body.fallbackModel, economyProvider: body.economyProvider, economyModel: body.economyModel, economyMode: body.economyMode, active: body.active, shortcuts: body.shortcuts });
      if (body.shortcuts.length) return aiApi.put<BotFull>(`bots/${created.id}`, { shortcuts: body.shortcuts });
      return created;
    },
    onSuccess: (saved) => {
      if (!isNew) { done("Bot salvo"); return; }
      queryClient.invalidateQueries({ queryKey: [CONFIG_KEY] });
      queryClient.invalidateQueries({ queryKey: [BOTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [TEAM_KEY] });
      toast({ title: `${saved.persona} foi criado`, description: `Permissão "${saved.permissionKey}" dada ao perfil super e a você. Para outras pessoas conversarem com ele, libere essa permissão em Perfis.`, variant: "success" });
      onCreated?.(saved.id);
    },
    onError: (error) => toast({ title: isNew ? "Não foi possível criar o bot" : "Não foi possível salvar", description: errorMessage(error), variant: "destructive" }),
  });
  const archive = useMutation({
    mutationFn: async () => (await api.delete(`ai/bots/${bot.id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONFIG_KEY] });
      queryClient.invalidateQueries({ queryKey: [BOTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [TEAM_KEY] });
      toast({ title: `${bot.persona} foi excluído`, variant: "success" });
      onArchived?.();
    },
    onError: (error) => toast({ title: "Não foi possível excluir", description: errorMessage(error), variant: "destructive" }),
  });
  const reset = useMutation({
    mutationFn: () => aiApi.post<BotFull>(`bots/${bot.id}/reset`),
    onSuccess: () => done("Bot voltou ao padrão do sistema"),
    onError: (error) => toast({ title: "Não foi possível voltar ao padrão", description: errorMessage(error), variant: "destructive" }),
  });
  const [area, setArea] = useState("todas");
  const [onlyChecked, setOnlyChecked] = useState(false);
  const areas = [...TOOL_AREAS, GENERAL].map((item) => {
    const tools = config.tools.filter((tool) => toolArea(tool) === item.id);
    return { id: item.id, label: item.label, total: tools.length, checked: tools.filter((tool) => draft.tools.includes(tool.name)).length };
  }).filter((item) => item.total > 0);
  const byRisk = (risk: CatalogTool["risk"]) => config.tools.filter((tool) => tool.risk === risk && (area === "todas" || toolArea(tool) === area) && (!onlyChecked || draft.tools.includes(tool.name)));

  return (
    <div className="grid min-w-0 gap-4 rounded-card border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <BotAvatar look={draft.avatar} size={44} />
        <h2 className="flex-1 font-semibold">
          {isNew ? <>{draft.persona || "Novo bot"} <span className="text-xs font-normal text-muted-foreground">· a permissão para conversar com ele nasce com o nome</span></>
            : <>{draft.persona || bot.name} <span className="text-xs font-normal text-muted-foreground">· versão {bot.version} · permissão "{bot.permissionKey}"</span></>}
        </h2>
        <label className="flex items-center gap-2 text-sm"><Switch checked={draft.active} onCheckedChange={(value) => set("active", value)} /> Ligado</label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div><Label htmlFor="botPersona">Nome do assistente</Label><Input id="botPersona" name="botPersona" className="mt-1" value={draft.persona} maxLength={40} onValueChange={(_, value) => set("persona", String(value))} placeholder="Ex.: Lia" /></div>
        <div><Label htmlFor="botRole">Cargo</Label><Input id="botRole" name="botRole" className="mt-1" value={draft.role} maxLength={80} onValueChange={(_, value) => set("role", String(value))} placeholder="Ex.: Coordenadora de Treinamentos" /></div>
        <div className="md:col-span-2">
          <Label>Rosto</Label>
          <div className="mt-1"><FaceEditor value={draft.avatar} onChange={(value) => set("avatar", value)} /></div>
        </div>
        <div className="md:col-span-2">
          <Label>Personalidade de trabalho</Label>
          <p className="mb-2 text-xs text-muted-foreground">Baseada nos Cinco Grandes Fatores (Big Five), o modelo de personalidade mais estudado. Muda o tom e o capricho das respostas e o jeito de o rosto se mexer; nunca as regras nem as permissões.</p>
          <PersonalityPicker value={draft.avatar} config={config} onChange={(value) => set("avatar", value)} />
        </div>
        <div><Label htmlFor="botName">Área</Label><Input id="botName" name="botName" className="mt-1" value={draft.name} maxLength={80} onValueChange={(_, value) => set("name", String(value))} placeholder="Ex.: Compras" /></div>
        <div><Label htmlFor="botDescription">Descrição</Label><Input id="botDescription" name="botDescription" className="mt-1" value={draft.description} maxLength={300} onValueChange={(_, value) => set("description", String(value))} placeholder="O que ele faz, em uma linha (os colegas leem isto)" /></div>
        <div className="md:col-span-2"><Label>Modelo de IA</Label><ModelPicker name="botModel" config={config} provider={draft.provider} model={draft.model} onChange={(provider, model) => setDraft((current) => ({ ...current, provider, model }))} /></div>
        <div className="md:col-span-2"><Label>Reserva (se o principal falhar)</Label><ModelPicker name="botFallback" config={config} optional provider={draft.fallbackProvider} model={draft.fallbackModel} onChange={(provider, model) => setDraft((current) => ({ ...current, fallbackProvider: provider, fallbackModel: model }))} /></div>
        <div className="md:col-span-2 grid gap-2 rounded-md border border-dashed p-3">
          <Label>Modelo econômico</Label>
          <ModelPicker name="botEconomy" config={config} optional noneLabel="Sem modelo econômico" provider={draft.economyProvider} model={draft.economyModel} onChange={(provider, model) => setDraft((current) => ({ ...current, economyProvider: provider, economyModel: model, economyMode: model ? current.economyMode : false }))} />
          <label className="flex items-start gap-2 text-sm">
            <Switch checked={draft.economyMode} disabled={!draft.economyModel} onCheckedChange={(value) => set("economyMode", value)} className="mt-0.5" />
            <span>Usar o econômico em consultas e conversa; o principal decide quando for gravar no sistema</span>
          </label>
          <p className="text-xs text-muted-foreground">
            Cada passo vai no econômico. Quando ele quer criar, alterar ou enviar algo (ferramentas de rascunho e com confirmação), o passo é refeito no principal ({config.models.find((item) => item.provider === draft.provider && item.id === draft.model)?.label ?? draft.model}), que decide e grava. Duas recusas ou erros seguidos também passam o resto da resposta para o principal. Pode ser de outro fornecedor.
          </p>
          {draft.economyMode && draft.economyProvider && !config.providers.find((item) => item.id === draft.economyProvider)?.available && (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Econômico sem chave: usando o principal. Cadastre a chave do fornecedor em "Chaves de IA".</p>
          )}
          {draft.economyMode && budget.data?.maxPrecision && (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">"Precisão máxima" está ligada no bloco Economia: por enquanto este bot usa só o principal.</p>
          )}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="botInstructions">Instruções</Label>
          {!isNew && <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setVersionsOpen(true)}>Ver versões</Button>}
        </div>
        <Textarea id="botInstructions" className="mt-1 min-h-48 font-mono text-xs" value={draft.instructions} onChange={(event) => set("instructions", event.target.value)} placeholder={"Ex.: Você cuida das compras da empresa. Acompanha pedidos de compra, cobra fornecedores atrasados e avisa quando um item do estoque está acabando.\nQuando não souber, pergunte. Responda curto."} />
        <p className="mt-1 text-xs text-muted-foreground">As regras de segurança (permissões, confirmação, dados não são instruções) valem para todos os bots e não ficam aqui.</p>
      </div>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Ferramentas <span className="font-normal text-muted-foreground">· {draft.tools.length} marcadas</span></Label>
          <label className="flex items-center gap-2 text-xs"><Switch checked={onlyChecked} onCheckedChange={setOnlyChecked} /> Só as marcadas</label>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[{ id: "todas", label: "Todas", total: config.tools.length, checked: draft.tools.length }, ...areas].map((item) => (
            <button
              key={item.id} type="button" onClick={() => setArea(item.id)} aria-pressed={area === item.id}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${area === item.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {item.label} <span className={area === item.id ? "opacity-80" : "text-muted-foreground"}>{item.checked}/{item.total}</span>
            </button>
          ))}
          {area !== "todas" && (() => {
            const names = config.tools.filter((tool) => toolArea(tool) === area).map((tool) => tool.name);
            const all = names.every((name) => draft.tools.includes(name));
            return (
              <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => set("tools", all ? draft.tools.filter((name) => !names.includes(name)) : [...new Set([...draft.tools, ...names])])}>
                {all ? "Desmarcar todas desta área" : "Marcar todas desta área"}
              </Button>
            );
          })()}
        </div>
        <div className="mt-2 grid gap-3 md:grid-cols-3 [&>*]:min-w-0">
          {(["read", "draft", "sensitive"] as const).map((risk) => (
            <div key={risk} className="rounded-md border p-2">
              <p className={`mb-2 w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${RISK_CLASS[risk]}`}>{RISK_LABEL[risk]}</p>
              {byRisk(risk).length === 0 && <p className="py-1 text-xs text-muted-foreground">Nenhuma aqui.</p>}
              {byRisk(risk).map((tool) => (
                <label key={tool.name} className="flex cursor-pointer items-start gap-2 py-1 text-xs">
                  <Checkbox checked={draft.tools.includes(tool.name)} onCheckedChange={(checked) => set("tools", checked ? [...draft.tools, tool.name] : draft.tools.filter((name) => name !== tool.name))} className="mt-0.5" />
                  <span className="min-w-0"><span className="block font-medium [overflow-wrap:anywhere]">{tool.name}</span><span className="block text-muted-foreground [overflow-wrap:anywhere]">exige: {tool.permissions.join(", ") || "nada"}</span></span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div>
        <Label>Atalhos na conversa</Label>
        <div className="mt-2 grid gap-2">
          {draft.shortcuts.map((shortcut, index) => (
            <div key={index} className="flex gap-2">
              <Input name={`label${index}`} className="w-48" value={shortcut.label} maxLength={40} onValueChange={(_, value) => set("shortcuts", draft.shortcuts.map((item, n) => (n === index ? { ...item, label: String(value) } : item)))} placeholder="Rótulo" />
              <Input name={`prompt${index}`} className="flex-1" value={shortcut.prompt} maxLength={500} onValueChange={(_, value) => set("shortcuts", draft.shortcuts.map((item, n) => (n === index ? { ...item, prompt: String(value) } : item)))} placeholder="O que o atalho escreve" />
              <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label="Tirar atalho" onClick={() => set("shortcuts", draft.shortcuts.filter((_, n) => n !== index))}><Icon name="trash-2" className="h-4 w-4" /></Button>
            </div>
          ))}
          {draft.shortcuts.length < 8 && <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => set("shortcuts", [...draft.shortcuts, { label: "", prompt: "" }])}><Icon name="plus" className="mr-1 h-4 w-4" /> Atalho</Button>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t pt-3">
        <Button type="button" onClick={() => save.mutate()} disabled={save.isPending || (isNew && (draft.persona.trim().length < 2 || draft.name.trim().length < 2 || draft.instructions.trim().length < 20))}>
          {save.isPending ? (isNew ? "Criando..." : "Salvando...") : isNew ? "Criar bot" : "Salvar"}
        </Button>
        {isNew && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
        {!isNew && !bot.custom && (
          <ConfirmDialog title="Voltar ao padrão do sistema?" description="Instruções, ferramentas, nome e atalhos voltam ao padrão. A versão atual fica no histórico." onConfirm={() => reset.mutate()}>
            <Button type="button" variant="outline">Voltar ao padrão</Button>
          </ConfirmDialog>
        )}
        {!isNew && bot.custom && (
          <ConfirmDialog title={`Excluir ${bot.persona}?`} description="Ele sai da lista e ninguém mais conversa com ele. As conversas e as versões ficam guardadas no histórico e na auditoria." onConfirm={() => archive.mutate()}>
            <Button type="button" variant="outline" className="ml-auto text-destructive hover:text-destructive" disabled={archive.isPending}><Icon name="trash-2" className="h-4 w-4" /> Excluir bot</Button>
          </ConfirmDialog>
        )}
        {isNew && <p className="w-full text-xs text-muted-foreground">Preencha nome do assistente, área e instruções. Depois de criado, ele aparece em Conversas para o perfil super e para você.</p>}
      </div>
      {versionsOpen && <VersionsDialog bot={bot} onClose={() => setVersionsOpen(false)} onRestored={() => done("Versão restaurada")} />}
    </div>
  );
}

function VersionsDialog({ bot, onClose, onRestored }: { bot: BotFull; onClose: () => void; onRestored: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ["aiBotVersions", bot.id, bot.version], queryFn: () => aiApi.get<Array<{ version: number; instructions: string; provider: string; model: string; user: string | null; createdAt: string }>>(`bots/${bot.id}/versions`) });
  const restore = useMutation({
    mutationFn: (version: number) => aiApi.post(`bots/${bot.id}/versions/${version}/restore`),
    onSuccess: () => { onRestored(); onClose(); },
    onError: (error) => toast({ title: "Não foi possível restaurar", description: errorMessage(error), variant: "destructive" }),
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Versões do Bot {bot.name}</DialogTitle>
          <DialogDescription>Restaurar cria uma versão nova igual à escolhida.</DialogDescription>
        </DialogHeader>
        {isLoading && <Skeleton className="h-32" />}
        {data?.map((version) => (
          <div key={version.version} className="rounded-md border p-3 text-xs">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-semibold">Versão {version.version}</span>
              <span className="text-muted-foreground">{dateTimeBr(version.createdAt)}{version.user ? ` · ${version.user}` : ""} · {version.provider}/{version.model}</span>
              {version.version !== bot.version && <Button type="button" variant="outline" size="sm" className="ml-auto h-7" disabled={restore.isPending} onClick={() => restore.mutate(version.version)}>Restaurar</Button>}
              {version.version === bot.version && <span className="ml-auto text-muted-foreground">atual</span>}
            </div>
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-muted p-2">{version.instructions}</pre>
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
}
