import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { get, patch } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CAPTION_KIND_LABELS, renderCaption } from "../-lib/caption";
import { CAPTIONS_KEY, useCaptionTemplates, useMarketingSettings } from "../-lib/data";
import type { CaptionTemplate, MarketingClass } from "../-lib/types";
import { buildVariables, defaultOverrides, VARIABLES } from "../-lib/variables";

const KIND_OPTIONS = Object.entries(CAPTION_KIND_LABELS).map(([id, name]) => ({ id, name }));
const EMPTY = { name: "", kind: "turma_nova", body: "" };

export default function CaptionTemplatesPanel({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const { data: templates = [], isLoading } = useCaptionTemplates();
  const settings = useMarketingSettings();
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<{ name: string; kind: string; body: string }>(EMPTY);
  const [sampleId, setSampleId] = useState<string>("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const samples = useQuery({
    queryKey: ["marketing-sample-classes"],
    queryFn: async () =>
      (await get<{ rows: MarketingClass[] }>("classes", "", [
        { key: "limit", value: 20 },
        { key: "active", value: "true" },
        { key: "order-initialDate", value: "desc" },
        { key: "show", value: ["course", "_count"] },
      ]))?.rows ?? [],
  });
  const sample = samples.data?.find((c) => String(c.id) === sampleId) ?? samples.data?.[0];

  const values = useMemo(() => {
    if (sample && settings.data) {
      const s = settings.data.settings;
      return buildVariables(sample, s, defaultOverrides(sample, s), settings.data.company.name, settings.data.company.siteDomain).values;
    }
    return Object.fromEntries(VARIABLES.map((v) => [v.key, v.example]));
  }, [sample, settings.data]);

  const select = (t: CaptionTemplate | "new") => {
    if (t === "new") {
      setSelectedId("new");
      setForm(EMPTY);
    } else {
      setSelectedId(t.id);
      setForm({ name: t.name, kind: t.kind, body: t.body });
    }
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: CAPTIONS_KEY });
  const save = useMutation({
    mutationFn: async () => {
      const body = { name: form.name, kind: form.kind, body: form.body };
      if (selectedId === "new") return (await api.post("marketing-captions", body)).data;
      return (await api.put(`marketing-captions/${selectedId}`, body)).data;
    },
    onSuccess: (res: CaptionTemplate) => {
      refresh();
      setSelectedId(res?.id ?? selectedId);
      toast({ title: "Modelo salvo", variant: "success" });
    },
    onError: (err: any) => toast({ title: "Não foi possível salvar", description: err?.response?.data?.message, variant: "destructive" }),
  });
  const archive = useMutation({
    mutationFn: async (id: number) => patch("marketing-captions", `inactive/${id}`),
    onSuccess: () => {
      refresh();
      setSelectedId(null);
      toast({ title: "Modelo removido", variant: "success" });
    },
    onError: (err: any) => toast({ title: "Não foi possível remover", description: err?.response?.data?.message, variant: "destructive" }),
  });
  const restore = useMutation({
    mutationFn: async () => (await api.post("marketing/captions/restore-defaults")).data as { created: number },
    onSuccess: (res) => {
      refresh();
      toast({ title: res?.created ? `${res.created} modelo(s) padrão de volta` : "Todos os modelos padrão já existem", variant: "success" });
    },
  });

  const insertVariable = (key: string) => {
    const el = bodyRef.current;
    const token = `{{${key}}}`;
    if (!el) return setForm((f) => ({ ...f, body: f.body + token }));
    const start = el.selectionStart ?? form.body.length;
    const end = el.selectionEnd ?? start;
    const next = form.body.slice(0, start) + token + form.body.slice(end);
    setForm((f) => ({ ...f, body: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const preview = useMemo(() => renderCaption(form.body, values), [form.body, values]);
  const current = typeof selectedId === "number" ? templates.find((t) => t.id === selectedId) : null;
  const dirty = selectedId === "new" ? !!(form.name || form.body) : !!current && (current.name !== form.name || current.kind !== form.kind || current.body !== form.body);

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="space-y-2">
        {isLoading ? (
          <div className="h-40 rounded-lg bg-muted animate-pulse" />
        ) : (
          templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => select(t)}
              className={cn(
                "w-full text-left rounded-card border bg-card p-3 transition-colors",
                selectedId === t.id ? "border-primary bg-primary/5" : "hover:bg-muted",
              )}
            >
              <p className="font-medium text-sm">{t.name}</p>
              {(CAPTION_KIND_LABELS[t.kind] ?? t.kind) !== t.name && (
                <p className="text-xs text-muted-foreground">{CAPTION_KIND_LABELS[t.kind] ?? t.kind}</p>
              )}
            </button>
          ))
        )}
        {canEdit && (
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" onClick={() => select("new")}>
              <Icon name="plus" className="w-4 h-4" /> Novo modelo
            </Button>
            <Button variant="ghost" size="sm" onClick={() => restore.mutate()} disabled={restore.isPending}>
              <Icon name="rotate-ccw" className="w-3.5 h-3.5" /> Recriar modelos padrão
            </Button>
          </div>
        )}
      </div>

      {selectedId === null ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-2">
            <Icon name="text-quote" className="w-8 h-8 mx-auto opacity-60" />
            <p>Escolha um modelo para ver e editar.</p>
            <p className="text-xs max-w-md mx-auto">
              Use variáveis como <code>{"{{curso}}"}</code> e <code>{"{{datas}}"}</code>. Linha com variável vazia some sozinha;
              {" "}<code>{"{{#preco}} … {{/preco}}"}</code> mostra um trecho só quando há valor.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={form.name} disabled={!canEdit} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select name="kind" state={form.kind} options={KIND_OPTIONS} disabled={!canEdit} onChange={(_, v) => setForm((f) => ({ ...f, kind: String(v) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Texto</Label>
              <Textarea ref={bodyRef} rows={18} value={form.body} disabled={!canEdit} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} className="font-mono text-xs leading-relaxed" />
            </div>
            {canEdit && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Inserir variável (clique)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <Tooltip key={v.key}>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="cursor-pointer hover:bg-muted font-mono text-[11px]" onClick={() => insertVariable(v.key)}>
                          {v.key}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {v.label}: <span className="opacity-80">{v.example}</span>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}
            {canEdit && (
              <div className="flex items-center justify-between gap-2 pt-1">
                {typeof selectedId === "number" ? (
                  <ConfirmDialog
                    title="Remover este modelo?"
                    description="Ele deixa de aparecer na divulgação. Dá para recriar os modelos padrão depois."
                    onConfirm={() => archive.mutate(selectedId)}
                  >
                    <Button variant="ghost" className="text-destructive">
                      <Icon name="trash-2" className="w-4 h-4" /> Remover
                    </Button>
                  </ConfirmDialog>
                ) : <span />}
                <Button onClick={() => save.mutate()} disabled={save.isPending || !dirty || form.name.trim().length < 2 || !form.body.trim()}>
                  {save.isPending ? <Icon name="loader-circle" className="w-4 h-4 animate-spin" /> : <Icon name="save" className="w-4 h-4" />}
                  Salvar modelo
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label>Prévia</Label>
              <div className="w-64">
                <Select
                  name="sample"
                  placeholder="Turma de exemplo"
                  state={sample ? String(sample.id) : ""}
                  options={(samples.data ?? []).map((c) => ({ id: String(c.id), name: c.name }))}
                  onChange={(_, v) => setSampleId(String(v))}
                />
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 whitespace-pre-wrap text-sm leading-relaxed min-h-[300px]">
              {preview || <span className="text-muted-foreground">A prévia aparece aqui.</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
