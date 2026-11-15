import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { get } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SEALS } from "../-lib/art";
import { SETTINGS_KEY, useMarketingSettings } from "../-lib/data";
import { THEMES } from "../-lib/themes";
import type { MarketingSettings } from "../-lib/types";

const LINK_OPTIONS = [
  { id: "turma", name: "Página de inscrição da turma (/turma/…)" },
  { id: "pagina_curso", name: "Página do curso no site (/cursos/…)" },
  { id: "site", name: "Página inicial do site" },
  { id: "personalizado", name: "Outro link (ex.: link da bio)" },
];

export default function SettingsPanel({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useMarketingSettings();
  const [form, setForm] = useState<MarketingSettings | null>(null);
  const courses = useQuery({
    queryKey: ["marketing-courses"],
    queryFn: async () =>
      (await get<{ rows: { id: number; name: string }[] }>("courses", "", [
        { key: "limit", value: 100 },
        { key: "active", value: "true" },
        { key: "order-name", value: "asc" },
      ]))?.rows ?? [],
  });

  useEffect(() => {
    if (data && !form) setForm(data.settings);
  }, [data, form]);

  const save = useMutation({
    // JSON (não FormData): a configuração tem listas e um mapa por curso
    mutationFn: async (body: MarketingSettings) => (await api.put("marketing/settings", body)).data,
    onSuccess: (res) => {
      queryClient.setQueryData(SETTINGS_KEY, res);
      setForm(res.settings);
      toast({ title: "Configurações salvas", variant: "success" });
    },
    onError: (err: any) =>
      toast({ title: "Não foi possível salvar", description: err?.response?.data?.message, variant: "destructive" }),
  });

  if (isLoading || !form) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon name="loader-circle" className="w-4 h-4 animate-spin" /> Carregando…
      </div>
    );
  }

  const set = <K extends keyof MarketingSettings>(key: K, value: MarketingSettings[K]) => setForm((f) => ({ ...(f ?? {}), [key]: value }));
  const sealOn = (id: string) => (form.selos ?? []).includes(id);

  return (
    <div className="space-y-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Contatos e chamada</CardTitle>
          <CardDescription>Aparecem na arte (WhatsApp em destaque) e nas legendas.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp de inscrições">
            <Input value={form.whatsapp ?? ""} disabled={!canEdit} onChange={(e) => set("whatsapp", e.target.value)} placeholder="(81) 98947-9259" />
          </Field>
          <Field label="E-mail">
            <Input value={form.email ?? ""} disabled={!canEdit} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Site">
            <Input value={form.site ?? ""} disabled={!canEdit} onChange={(e) => set("site", e.target.value)} placeholder="https://www.worksafebrasil.com.br" />
          </Field>
          <Field label="Link de inscrição nas legendas">
            <Select name="linkInscricao" state={form.linkInscricao ?? "turma"} options={LINK_OPTIONS} disabled={!canEdit} onChange={(_, v) => set("linkInscricao", v as MarketingSettings["linkInscricao"])} />
          </Field>
          {form.linkInscricao === "personalizado" && (
            <Field label="Link" className="sm:col-span-2">
              <Input value={form.linkPersonalizado ?? ""} disabled={!canEdit} onChange={(e) => set("linkPersonalizado", e.target.value)} placeholder="https://beacons.ai/worksafebrasil" />
            </Field>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados padrão das turmas</CardTitle>
          <CardDescription>Usados quando a turma não tem o dado. Dá para ajustar na hora de divulgar.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Horário">
            <Input value={form.horarioPadrao ?? ""} disabled={!canEdit} onChange={(e) => set("horarioPadrao", e.target.value)} placeholder="Das 08h às 17h" />
          </Field>
          <Field label="Local (sem endereço na turma)">
            <Input value={form.localPadrao ?? ""} disabled={!canEdit} onChange={(e) => set("localPadrao", e.target.value)} placeholder="Centro de Treinamentos da WorkSafe Brasil" />
          </Field>
          <Field label="Incluso" hint="Um item por linha. A turma pode ter o seu no campo “Brindes do Curso”.">
            <Textarea rows={4} value={(form.inclusoPadrao ?? []).join("\n")} disabled={!canEdit} onChange={(e) => set("inclusoPadrao", e.target.value.split("\n"))} />
          </Field>
          <Field label="“Últimas vagas” a partir de" hint="Quantas vagas livres (ou menos) para o selo mudar sozinho.">
            <Input type="number" min={0} max={100} value={form.ultimasVagasLimite ?? 5} disabled={!canEdit} onChange={(e) => set("ultimasVagasLimite", Number(e.target.value))} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Arte</CardTitle>
          <CardDescription>Cores que abrem por padrão e selos de certificação do rodapé.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Cores padrão</Label>
            <div className="flex flex-wrap gap-3">
              {THEMES.map((t) => (
                <Tooltip key={t.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => set("temaPadrao", t.id)}
                      className={cn(
                        "h-10 w-10 rounded-full border-2 transition-transform",
                        form.temaPadrao === t.id ? "border-primary scale-110" : "border-transparent hover:scale-105",
                      )}
                      style={{ background: `linear-gradient(135deg, ${t.bg} 0 55%, ${t.accent} 55% 100%)` }}
                      aria-label={t.name}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{t.name}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Selos no rodapé</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {SEALS.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-lg border p-2">
                  <Checkbox
                    id={`selo-${s.id}`}
                    checked={sealOn(s.id)}
                    disabled={!canEdit}
                    onCheckedChange={(v) => set("selos", v ? [...(form.selos ?? []), s.id] : (form.selos ?? []).filter((x) => x !== s.id))}
                  />
                  <span className="h-8 w-16 rounded bg-neutral-900 flex items-center justify-center p-1">
                    <img src={s.dark} alt="" className="max-h-full max-w-full object-contain" />
                  </span>
                  <Label htmlFor={`selo-${s.id}`} className="text-sm font-normal cursor-pointer">{s.name}</Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hashtags</CardTitle>
          <CardDescription>A variável {"{{hashtags}}"} usa as do curso; se o curso não tiver, usa as padrão.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Padrão">
            <Textarea rows={2} value={form.hashtagsPadrao ?? ""} disabled={!canEdit} onChange={(e) => set("hashtagsPadrao", e.target.value)} />
          </Field>
          <div className="space-y-2">
            <Label>Por curso</Label>
            {(courses.data ?? []).map((c) => (
              <div key={c.id} className="grid gap-2 sm:grid-cols-[220px_1fr] items-center">
                <span className="text-sm truncate">{c.name}</span>
                <Input
                  value={form.hashtagsPorCurso?.[String(c.id)] ?? ""}
                  disabled={!canEdit}
                  placeholder="Usar as padrão"
                  onChange={(e) => set("hashtagsPorCurso", { ...(form.hashtagsPorCurso ?? {}), [String(c.id)]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end sticky bottom-2">
          <Button onClick={() => save.mutate({ ...form, inclusoPadrao: (form.inclusoPadrao ?? []).map((s) => s.trim()).filter(Boolean) })} disabled={save.isPending}>
            {save.isPending ? <Icon name="loader-circle" className="w-4 h-4 animate-spin" /> : <Icon name="save" className="w-4 h-4" />}
            Salvar configurações
          </Button>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
