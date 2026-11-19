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
import { AVATAR_LOOKS, BotAvatar } from "../-shared/avatar";
import { BOTS_KEY, BotFull, BotsConfig, CatalogModel, CatalogTool, RISK_CLASS, RISK_LABEL, STATUS_KEY, TEAM_KEY, aiApi, dateTimeBr } from "../-shared/bots";
import api from "@/services/api";

export const Route = createFileRoute("/_authenticated/bots/_admin/configuracao")({
  component: ConfigPage,
});

const CONFIG_KEY = "aiBotsConfig";

/** Configurar os bots: instruções (com versões), ferramentas, modelo e atalhos. */
function ConfigPage() {
  const { can } = useVerify();
  const { data, isLoading, error } = useQuery({ queryKey: [CONFIG_KEY], enabled: can("update_bots"), queryFn: () => aiApi.get<BotsConfig>("bots/config") });
  const [selected, setSelected] = useState<number | null>(null);
  if (!can("update_bots")) return null;
  const bot = data?.bots.find((item) => item.id === selected) ?? data?.bots[0];

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
          <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-1">
              {data.bots.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelected(item.id)} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${item.id === bot?.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
                  <BotAvatar look={item.avatar} size={28} />
                  <span className="flex-1">{item.persona} <span className="text-xs text-muted-foreground">· {item.name}</span></span>
                  {!item.active && <span className="text-[10px] text-muted-foreground">desligado</span>}
                </button>
              ))}
            </div>
            {bot && <BotEditor key={`${bot.id}-${bot.version}-${bot.updatedAt}`} bot={bot} config={data} />}
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
    <div className="rounded-lg border p-4 text-sm">
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
  const tags = [model.recommended ? "recomendado" : "", model.available ? "" : "sem chave"].filter(Boolean).join(", ");
  return { id: `${model.provider}:${model.id}`, name: `${model.label} · ~${money(model.perThousand)} por mil perguntas${tags ? ` (${tags})` : ""}` };
}

/**
 * Escolha do modelo pela lista (com preço e para que serve). "Outro modelo"
 * abre fornecedor e nome para digitar, para um modelo que não está na lista.
 */
function ModelPicker({ name, config, provider, model, optional, onChange }: { name: string; config: BotsConfig; provider: string; model: string; optional?: boolean; onChange: (provider: string, model: string) => void }) {
  const known = config.models.find((item) => item.provider === provider && item.id === model);
  const [custom, setCustom] = useState(!known && !!model);
  const value = !model && optional && !custom ? NONE : custom ? OTHER : `${provider}:${model}`;
  const options = [
    ...(optional ? [{ id: NONE, name: "Sem reserva" }] : []),
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
      {model.upcoming && <> A partir de {dayBr(model.upcoming.from)}, ~{money(model.upcoming.perThousand)} por mil perguntas.</>}
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
    <div className="rounded-lg border p-4 text-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <Label>Modelo de todos os bots</Label>
          <ModelPicker name="allModel" config={config} provider={choice.provider} model={choice.model} onChange={(provider, model) => setChoice({ provider, model })} />
        </div>
        <ConfirmDialog
          title={`Usar ${target?.label ?? choice.model} em todos os bots?`}
          description="Cada bot passa a responder com esse modelo na próxima mensagem e ganha uma versão nova, então dá para voltar pelo histórico. A reserva de cada bot não muda."
          onConfirm={() => apply.mutate()}
        >
          <Button type="button" disabled={!choice.provider || choice.model.length < 3 || apply.isPending} className="mb-[2px]">{apply.isPending ? "Trocando..." : "Usar em todos"}</Button>
        </ConfirmDialog>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Hoje: {today || "nenhum bot"}. Para um bot só, troque no cadastro dele abaixo. O custo por mil perguntas é estimativa com o tamanho médio das conversas dos bots.</p>
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

function BotEditor({ bot, config }: { bot: BotFull; config: BotsConfig }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => ({
    name: bot.name, persona: bot.persona, role: bot.role, avatar: bot.avatar, description: bot.description, active: bot.active, instructions: bot.instructions, tools: bot.tools,
    provider: bot.provider, model: bot.model, fallbackProvider: bot.fallbackProvider ?? "", fallbackModel: bot.fallbackModel ?? "", shortcuts: bot.shortcuts,
  }));
  const [versionsOpen, setVersionsOpen] = useState(false);
  useEffect(() => { setVersionsOpen(false); }, [bot.id]);
  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const done = (title: string) => { queryClient.invalidateQueries({ queryKey: [CONFIG_KEY] }); queryClient.invalidateQueries({ queryKey: [BOTS_KEY] }); toast({ title, variant: "success" }); };
  const save = useMutation({
    mutationFn: () => aiApi.put<BotFull>(`bots/${bot.id}`, { ...draft, fallbackProvider: draft.fallbackProvider || null, fallbackModel: draft.fallbackModel || null }),
    onSuccess: () => done("Bot salvo"),
    onError: (error) => toast({ title: "Não foi possível salvar", description: errorMessage(error), variant: "destructive" }),
  });
  const reset = useMutation({
    mutationFn: () => aiApi.post<BotFull>(`bots/${bot.id}/reset`),
    onSuccess: () => done("Bot voltou ao padrão do sistema"),
    onError: (error) => toast({ title: "Não foi possível voltar ao padrão", description: errorMessage(error), variant: "destructive" }),
  });
  const byRisk = (risk: CatalogTool["risk"]) => config.tools.filter((tool) => tool.risk === risk);

  return (
    <div className="grid min-w-0 gap-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <BotAvatar look={draft.avatar} size={44} />
        <h2 className="flex-1 font-semibold">{draft.persona || bot.name} <span className="text-xs font-normal text-muted-foreground">· versão {bot.version} · permissão "{bot.permissionKey}"</span></h2>
        <label className="flex items-center gap-2 text-sm"><Switch checked={draft.active} onCheckedChange={(value) => set("active", value)} /> Ligado</label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div><Label htmlFor="botPersona">Nome do assistente</Label><Input id="botPersona" name="botPersona" className="mt-1" value={draft.persona} maxLength={40} onValueChange={(_, value) => set("persona", String(value))} placeholder="Ex.: Lia" /></div>
        <div><Label htmlFor="botRole">Cargo</Label><Input id="botRole" name="botRole" className="mt-1" value={draft.role} maxLength={80} onValueChange={(_, value) => set("role", String(value))} placeholder="Ex.: Coordenadora de Treinamentos" /></div>
        <div className="md:col-span-2">
          <Label>Rosto</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(AVATAR_LOOKS).map(([key, look]) => (
              <button key={key} type="button" onClick={() => set("avatar", key)} className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border p-2 text-[11px] ${draft.avatar === key ? "border-primary bg-primary/5" : "hover:bg-muted"}`} aria-label={`Rosto ${look.label}`}>
                <BotAvatar look={key} size={44} />
                {look.label}
              </button>
            ))}
          </div>
        </div>
        <div><Label htmlFor="botName">Área</Label><Input id="botName" name="botName" className="mt-1" value={draft.name} maxLength={80} onValueChange={(_, value) => set("name", String(value))} /></div>
        <div><Label htmlFor="botDescription">Descrição</Label><Input id="botDescription" name="botDescription" className="mt-1" value={draft.description} maxLength={300} onValueChange={(_, value) => set("description", String(value))} /></div>
        <div className="md:col-span-2"><Label>Modelo de IA</Label><ModelPicker name="botModel" config={config} provider={draft.provider} model={draft.model} onChange={(provider, model) => setDraft((current) => ({ ...current, provider, model }))} /></div>
        <div className="md:col-span-2"><Label>Reserva (se o principal falhar)</Label><ModelPicker name="botFallback" config={config} optional provider={draft.fallbackProvider} model={draft.fallbackModel} onChange={(provider, model) => setDraft((current) => ({ ...current, fallbackProvider: provider, fallbackModel: model }))} /></div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="botInstructions">Instruções</Label>
          <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setVersionsOpen(true)}>Ver versões</Button>
        </div>
        <Textarea id="botInstructions" className="mt-1 min-h-48 font-mono text-xs" value={draft.instructions} onChange={(event) => set("instructions", event.target.value)} />
        <p className="mt-1 text-xs text-muted-foreground">As regras de segurança (permissões, confirmação, dados não são instruções) valem para todos os bots e não ficam aqui.</p>
      </div>
      <div>
        <Label>Ferramentas</Label>
        <div className="mt-2 grid gap-3 md:grid-cols-3 [&>*]:min-w-0">
          {(["read", "draft", "sensitive"] as const).map((risk) => (
            <div key={risk} className="rounded-md border p-2">
              <p className={`mb-2 w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${RISK_CLASS[risk]}`}>{RISK_LABEL[risk]}</p>
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
        <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
        <ConfirmDialog title="Voltar ao padrão do sistema?" description="Instruções, ferramentas, nome e atalhos voltam ao padrão. A versão atual fica no histórico." onConfirm={() => reset.mutate()}>
          <Button type="button" variant="outline">Voltar ao padrão</Button>
        </ConfirmDialog>
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
