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
import { BOTS_KEY, BotFull, BotsConfig, CatalogTool, RISK_CLASS, RISK_LABEL, aiApi, dateTimeBr } from "../-shared/bots";

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
          <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-1">
              {data.bots.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelected(item.id)} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${item.id === bot?.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
                  <Icon name={item.icon} className="h-4 w-4" />
                  <span className="flex-1">{item.name}</span>
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
      </div>
      <p className="mt-2 text-xs text-muted-foreground">As chaves ficam nas variáveis do servidor (GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY...), nunca na tela. Um bot cujo fornecedor está sem chave avisa quem tenta conversar.</p>
    </div>
  );
}

function BotEditor({ bot, config }: { bot: BotFull; config: BotsConfig }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => ({
    name: bot.name, description: bot.description, active: bot.active, instructions: bot.instructions, tools: bot.tools,
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
  const providers = config.providers.map((provider) => ({ id: provider.id, name: `${provider.label}${provider.available ? "" : " (sem chave)"}` }));
  const byRisk = (risk: CatalogTool["risk"]) => config.tools.filter((tool) => tool.risk === risk);

  return (
    <div className="grid min-w-0 gap-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Icon name={bot.icon} className="h-5 w-5 text-primary" />
        <h2 className="flex-1 font-semibold">{bot.name} <span className="text-xs font-normal text-muted-foreground">· versão {bot.version} · permissão "{bot.permissionKey}"</span></h2>
        <label className="flex items-center gap-2 text-sm"><Switch checked={draft.active} onCheckedChange={(value) => set("active", value)} /> Ligado</label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div><Label htmlFor="botName">Nome</Label><Input id="botName" name="botName" className="mt-1" value={draft.name} maxLength={80} onValueChange={(_, value) => set("name", String(value))} /></div>
        <div><Label htmlFor="botDescription">Descrição</Label><Input id="botDescription" name="botDescription" className="mt-1" value={draft.description} maxLength={300} onValueChange={(_, value) => set("description", String(value))} /></div>
        <div><Label>Fornecedor de IA</Label><Select name="botProvider" modal options={providers} state={draft.provider} onChange={(_, value) => set("provider", String(value))} /></div>
        <div><Label htmlFor="botModel">Modelo</Label><Input id="botModel" name="botModel" className="mt-1" value={draft.model} maxLength={80} onValueChange={(_, value) => set("model", String(value))} placeholder="Ex.: gemini-3.1-pro-preview" /></div>
        <div><Label>Reserva (se o principal falhar)</Label><Select name="botFallbackProvider" modal clearable options={providers} state={draft.fallbackProvider} onChange={(_, value) => set("fallbackProvider", String(value ?? ""))} placeholder="Sem reserva" /></div>
        <div><Label htmlFor="botFallbackModel">Modelo da reserva</Label><Input id="botFallbackModel" name="botFallbackModel" className="mt-1" value={draft.fallbackModel} maxLength={80} onValueChange={(_, value) => set("fallbackModel", String(value))} placeholder="Ex.: claude-sonnet-5-5" /></div>
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
        <div className="mt-2 grid gap-3 md:grid-cols-3">
          {(["read", "draft", "sensitive"] as const).map((risk) => (
            <div key={risk} className="rounded-md border p-2">
              <p className={`mb-2 w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${RISK_CLASS[risk]}`}>{RISK_LABEL[risk]}</p>
              {byRisk(risk).map((tool) => (
                <label key={tool.name} className="flex cursor-pointer items-start gap-2 py-1 text-xs">
                  <Checkbox checked={draft.tools.includes(tool.name)} onCheckedChange={(checked) => set("tools", checked ? [...draft.tools, tool.name] : draft.tools.filter((name) => name !== tool.name))} className="mt-0.5" />
                  <span><span className="font-medium">{tool.name}</span><span className="block text-muted-foreground">exige: {tool.permissions.join(", ") || "nada"}</span></span>
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
