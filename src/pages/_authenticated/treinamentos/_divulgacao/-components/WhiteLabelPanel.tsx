import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { get } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import ColorPickerInput from "@/components/general-components/ColorPickerInput";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DEFAULT_LABELS, drawArt, FORMAT_SIZES, LABEL_FIELDS, LAYOUTS, SEALS } from "../-lib/art";
import { PHOTO_BANK, SETTINGS_KEY, useMarketingSettings } from "../-lib/data";
import { loadArtFonts, TEXT_FONTS, TITLE_FONTS } from "../-lib/fonts";
import { THEMES, themeById } from "../-lib/themes";
import type { ArtFormat, ArtLayout, CustomTheme, MarketingClass, MarketingCompany, MarketingImage, MarketingSettings } from "../-lib/types";
import { buildVariables, defaultOverrides } from "../-lib/variables";
import { useArtResources, useIdentity } from "./useArtResources";

const DEFAULT_IA = "um centro de treinamentos de segurança do trabalho no Brasil (trabalho em altura, espaço confinado, acesso por corda, resgate)";

const BRAND_TYPES: { id: "logo" | "padrao" | "texto"; name: string; hint: string }[] = [
  { id: "logo", name: "Logo enviado", hint: "Usa o logo da empresa (PNG com fundo transparente fica melhor)" },
  { id: "texto", name: "Só o nome", hint: "Escreve o nome da empresa no rodapé" },
  { id: "padrao", name: "Símbolo padrão", hint: "O símbolo que já vinha nas artes, com o nome ao lado" },
];

async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("image", file);
  const res = await api.post<{ url: string }>("marketing/upload", body);
  return res.data.url;
}

/**
 * Identidade visual da divulgação (white label): marca, fontes, textos,
 * temas, selos, banco de fotos e o contexto da IA, com prévia ao vivo.
 * Tudo fica nas configurações da empresa; nada é fixo no código.
 */
export default function WhiteLabelPanel({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useMarketingSettings();
  const [form, setForm] = useState<MarketingSettings | null>(null);

  useEffect(() => {
    if (data && !form) setForm(data.settings);
  }, [data, form]);

  const save = useMutation({
    mutationFn: async (body: MarketingSettings) => (await api.put("marketing/settings", body)).data,
    onSuccess: (res) => {
      queryClient.setQueryData(SETTINGS_KEY, res);
      setForm(res.settings);
      toast({ title: "Identidade visual salva", description: "As próximas artes já saem com ela.", variant: "success" });
    },
    onError: (err: any) => toast({ title: "Não foi possível salvar", description: err?.response?.data?.message, variant: "destructive" }),
  });

  if (isLoading || !form || !data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon name="loader-circle" className="w-4 h-4 animate-spin" /> Carregando…
      </div>
    );
  }

  const set = <K extends keyof MarketingSettings>(key: K, value: MarketingSettings[K]) => setForm((f) => ({ ...(f ?? {}), [key]: value }));
  const dirty = JSON.stringify(form) !== JSON.stringify(data.settings);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px] items-start">
      <div className="space-y-4 min-w-0">
        <BrandCard form={form} set={set} company={data.company} canEdit={canEdit} />
        <FontsCard form={form} set={set} canEdit={canEdit} />
        <LabelsCard form={form} set={set} canEdit={canEdit} />
        <ThemesCard form={form} set={set} company={data.company} canEdit={canEdit} />
        <SealsCard form={form} set={set} canEdit={canEdit} />
        <PhotosCard form={form} set={set} canEdit={canEdit} />
        <Card>
          <CardHeader>
            <CardTitle>Inteligência artificial</CardTitle>
            <CardDescription>Como a IA deve entender o negócio ao reescrever as legendas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Label className="text-sm">A empresa é…</Label>
            <Textarea
              rows={2}
              className="mt-1.5"
              value={form.iaContexto ?? ""}
              placeholder={DEFAULT_IA}
              disabled={!canEdit}
              onChange={(e) => set("iaContexto", e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1.5">Vazio usa: “{DEFAULT_IA}”.</p>
          </CardContent>
        </Card>
      </div>

      <div className="xl:sticky xl:top-2 space-y-3">
        <Preview form={form} company={data.company} />
        {canEdit && (
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => save.mutate(form)} disabled={save.isPending || !dirty}>
              {save.isPending ? <Icon name="loader-circle" className="w-4 h-4 animate-spin" /> : <Icon name="save" className="w-4 h-4" />}
              Salvar identidade visual
            </Button>
            {dirty && (
              <Button variant="ghost" onClick={() => setForm(data.settings)}>
                Descartar
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type SetFn = <K extends keyof MarketingSettings>(key: K, value: MarketingSettings[K]) => void;
interface CardProps {
  form: MarketingSettings;
  set: SetFn;
  canEdit: boolean;
}

// ---------------------------------------------------------------------------
// Prévia
// ---------------------------------------------------------------------------

function Preview({ form, company }: { form: MarketingSettings; company: MarketingCompany }) {
  const { themes, labels, fonts, photoBank, fontsReady } = useIdentity(form, company);
  const [themeId, setThemeId] = useState<string>(form.temaPadrao || themes[0].id);
  const [format, setFormat] = useState<ArtFormat>("feed34");
  const [layout, setLayout] = useState<ArtLayout>("destaque");
  const [classId, setClassId] = useState("");
  const theme = themeById(themeId, themes);
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
  const turma = samples.data?.find((c) => String(c.id) === classId) ?? samples.data?.[0];
  const photoUrl = turma?.imageUrl || turma?.course?.imageUrl || photoBank[0]?.src || null;
  const { photo, seals, brand } = useArtResources(form, company, theme, photoUrl);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !fontsReady || !turma) return;
    const overrides = defaultOverrides(turma, form);
    const vars = buildVariables(turma, form, overrides, company.name, company.siteDomain);
    drawArt(canvasRef.current, {
      vars, labels, brand, fonts, title: overrides.titulo, levelsLabel: "", theme, companyName: company.name,
      whatsapp: vars.values.whatsapp, email: form.email ?? "", site: vars.values.site, photo, seals,
      options: { format, layout, theme: theme.id, badge: vars.situation, photoUrl, photoX: 70, photoY: 35, photoZoom: 100, showSeals: true, showIncluso: true, showPrice: true },
    });
  }, [turma, form, company, labels, brand, fonts, theme, photo, seals, format, layout, fontsReady, photoUrl]);

  const size = FORMAT_SIZES[format];
  return (
    <Card className="py-0 overflow-hidden">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Prévia</p>
          <div className="w-48">
            <Select name="sample" placeholder="Turma" state={turma ? String(turma.id) : ""} options={(samples.data ?? []).map((c) => ({ id: String(c.id), name: c.name }))} onChange={(_, v) => setClassId(String(v))} />
          </div>
        </div>
        <div className="bg-muted/50 rounded-md flex items-center justify-center p-2">
          {turma ? (
            <canvas ref={canvasRef} width={size.w} height={size.h} className="max-h-[52vh] max-w-full rounded shadow" style={{ aspectRatio: `${size.w} / ${size.h}` }} />
          ) : (
            <p className="text-sm text-muted-foreground py-16">Cadastre uma turma para ver a prévia.</p>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-lg">
          {(Object.keys(FORMAT_SIZES) as ArtFormat[]).map((f) => (
            <Button key={f} size="sm" variant={format === f ? "default" : "ghost"} className="px-1 text-xs" onClick={() => setFormat(f)}>
              {FORMAT_SIZES[f].label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-lg">
          {LAYOUTS.map((l) => (
            <Button key={l.id} size="sm" variant={layout === l.id ? "default" : "ghost"} className="px-1 text-xs" onClick={() => setLayout(l.id)}>
              {l.name}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {themes.map((t) => (
            <Swatch key={t.id} name={t.name} bg={t.bg} accent={t.accent} active={theme.id === t.id} onClick={() => setThemeId(t.id)} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Swatch({ name, bg, accent, active, onClick, disabled }: { name: string; bg: string; accent: string; active?: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          aria-label={name}
          className={cn("h-9 w-9 rounded-full border-2 transition-transform shrink-0", active ? "border-primary scale-110" : "border-transparent hover:scale-105")}
          style={{ background: `linear-gradient(135deg, ${bg} 0 55%, ${accent} 55% 100%)` }}
        />
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Cartões
// ---------------------------------------------------------------------------

function UploadButton({ label, onDone, disabled, multiple }: { label: string; onDone: (urls: { url: string; nome: string }[]) => void; disabled?: boolean; multiple?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" size="sm" disabled={disabled || busy} onClick={() => ref.current?.click()}>
        {busy ? <Icon name="loader-circle" className="w-3.5 h-3.5 animate-spin" /> : <Icon name="upload" className="w-3.5 h-3.5" />}
        {label}
      </Button>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        multiple={multiple}
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (!files.length) return;
          setBusy(true);
          try {
            const out: { url: string; nome: string }[] = [];
            for (const f of files) out.push({ url: await uploadImage(f), nome: f.name.replace(/\.[^.]+$/, "") });
            onDone(out);
          } catch (err: any) {
            toast({ title: "Não foi possível enviar a imagem", description: err?.response?.data?.message, variant: "destructive" });
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

function BrandCard({ form, set, company, canEdit }: CardProps & { company: MarketingCompany }) {
  const marca = form.marca ?? { tipo: "texto" as const };
  const setMarca = (patch: Partial<NonNullable<MarketingSettings["marca"]>>) => set("marca", { ...marca, ...patch });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Marca</CardTitle>
        <CardDescription>O que aparece no rodapé das artes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-lg">
          {BRAND_TYPES.map((b) => (
            <Tooltip key={b.id}>
              <TooltipTrigger asChild>
                <Button size="sm" variant={marca.tipo === b.id ? "default" : "ghost"} disabled={!canEdit} onClick={() => setMarca({ tipo: b.id })}>
                  {b.name}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{b.hint}</TooltipContent>
            </Tooltip>
          ))}
        </div>
        {marca.tipo === "logo" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              { key: "logoClaroUrl", title: "Para fundo escuro", hint: "Versão clara/branca", bg: "bg-neutral-900" },
              { key: "logoEscuroUrl", title: "Para fundo claro", hint: "Versão colorida ou escura", bg: "bg-neutral-100" },
            ] as const).map((slot) => (
              <div key={slot.key} className="space-y-2">
                <Label className="text-sm">{slot.title}</Label>
                <div className={cn("h-24 rounded-lg flex items-center justify-center p-3 border", slot.bg)}>
                  {marca[slot.key] ? (
                    <img src={marca[slot.key]} alt="" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-neutral-500">{slot.hint}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <UploadButton label="Enviar" disabled={!canEdit} onDone={([f]) => setMarca({ [slot.key]: f.url })} />
                  {company.logoUrl && marca[slot.key] !== company.logoUrl && (
                    <Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => setMarca({ [slot.key]: company.logoUrl! })}>
                      Usar o do cadastro
                    </Button>
                  )}
                  {marca[slot.key] && (
                    <Button size="sm" variant="ghost" className="text-destructive" disabled={!canEdit} onClick={() => setMarca({ [slot.key]: "" })}>
                      Tirar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-sm">Nome na arte</Label>
            <Input value={marca.texto ?? ""} placeholder={company.name.toUpperCase()} disabled={!canEdit} onChange={(e) => setMarca({ texto: e.target.value })} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FontsCard({ form, set, canEdit }: CardProps) {
  const title = form.fonteTitulo || TITLE_FONTS[0].name;
  const text = form.fonteTexto || TEXT_FONTS[0].name;
  const titleWeight = TITLE_FONTS.find((f) => f.name === title)?.weight ?? 400;
  useEffect(() => {
    loadArtFonts({ title, titleWeight, text });
  }, [title, titleWeight, text]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fontes</CardTitle>
        <CardDescription>Títulos e números numa fonte forte; textos numa fonte legível.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-sm">Títulos</Label>
          <Select name="fonteTitulo" state={title} options={TITLE_FONTS.map((f) => ({ id: f.name, name: f.name }))} disabled={!canEdit} onChange={(_, v) => set("fonteTitulo", String(v))} />
          <p className="text-3xl leading-tight truncate" style={{ fontFamily: `"${title}"`, fontWeight: titleWeight }}>23 A 28 NOVEMBRO</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Textos</Label>
          <Select name="fonteTexto" state={text} options={TEXT_FONTS.map((f) => ({ id: f.name, name: f.name }))} disabled={!canEdit} onChange={(_, v) => set("fonteTexto", String(v))} />
          <p className="text-sm leading-snug" style={{ fontFamily: `"${text}"`, fontWeight: 800 }}>INCLUSO: ALOJAMENTO · CAMISA · CERTIFICADO</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LabelsCard({ form, set, canEdit }: CardProps) {
  const rotulos = form.rotulos ?? {};
  return (
    <Card>
      <CardHeader>
        <CardTitle>Textos da arte</CardTitle>
        <CardDescription>Os textos fixos que aparecem em toda arte. Vazio usa o padrão.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {LABEL_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label className="text-xs text-muted-foreground">{f.label}</Label>
            <Input
              value={rotulos[f.key] ?? ""}
              placeholder={DEFAULT_LABELS[f.key]}
              maxLength={30}
              disabled={!canEdit}
              onChange={(e) => set("rotulos", { ...rotulos, [f.key]: e.target.value })}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ThemesCard({ form, set, company, canEdit }: CardProps & { company: MarketingCompany }) {
  const temas = form.temas ?? [];
  const hidden = form.temasOcultos ?? [];
  const toggleHidden = (id: string, show: boolean) => set("temasOcultos", show ? hidden.filter((x) => x !== id) : [...hidden, id]);
  const update = (id: string, patch: Partial<CustomTheme>) => set("temas", temas.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const add = () =>
    set("temas", [
      ...temas,
      { id: `custom-${Date.now()}`, name: `Tema ${temas.length + 1}`, bg: "#0b1f3a", accent: company.primaryColor || "#ff7a1a", badge: company.secondaryColor || company.primaryColor || "#ff7a1a", light: false, listras: false },
    ]);
  const builtIn = [
    ...(company.primaryColor ? [{ id: "empresa", name: "Cores da empresa (do cadastro)", bg: "#111111", accent: company.primaryColor }] : []),
    ...THEMES.map((t) => ({ id: t.id, name: t.name, bg: t.bg, accent: t.accent })),
  ];
  const allIds = [...temas.map((t) => t.id), ...builtIn.map((t) => t.id).filter((id) => !hidden.includes(id))];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cores</CardTitle>
        <CardDescription>Crie os temas da marca e escolha quais aparecem na hora de divulgar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          {temas.map((t) => (
            <div key={t.id} className="rounded-card border bg-card p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Swatch name={t.name} bg={t.bg} accent={t.accent} />
                <Input value={t.name} maxLength={40} disabled={!canEdit} onChange={(e) => update(t.id, { name: e.target.value })} className="h-8" />
                {canEdit && (
                  <ConfirmDialog title="Remover este tema?" description="Ele deixa de aparecer na divulgação." onConfirm={() => set("temas", temas.filter((x) => x.id !== t.id))}>
                    <Button variant="ghost" size="sm" className="text-destructive">
                      <Icon name="trash-2" className="w-4 h-4" />
                    </Button>
                  </ConfirmDialog>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <ColorPickerInput label="Fundo" value={t.bg} disabled={!canEdit} onChange={(c) => update(t.id, { bg: c })} />
                <ColorPickerInput label="Destaque (datas, pílulas)" value={t.accent} disabled={!canEdit} onChange={(c) => update(t.id, { accent: c })} />
                <ColorPickerInput label="Selo (vagas abertas…)" value={t.badge} disabled={!canEdit} onChange={(c) => update(t.id, { badge: c })} />
              </div>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2 text-sm">
                  <Switch checked={t.light} disabled={!canEdit} onCheckedChange={(v) => update(t.id, { light: v })} /> Fundo claro (texto escuro)
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Switch checked={t.listras} disabled={!canEdit} onCheckedChange={(v) => update(t.id, { listras: v })} /> Faixa zebrada no rodapé
                </div>
              </div>
            </div>
          ))}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={add} disabled={temas.length >= 12}>
              <Icon name="plus" className="w-4 h-4" /> Novo tema
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Temas prontos</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {builtIn.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Swatch name={t.name} bg={t.bg} accent={t.accent} />
                  <span className="text-sm truncate">{t.name}</span>
                </div>
                <Switch checked={!hidden.includes(t.id)} disabled={!canEdit} onCheckedChange={(v) => toggleHidden(t.id, v)} />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 max-w-sm">
          <Label className="text-sm">Tema que abre por padrão</Label>
          <Select
            name="temaPadrao"
            state={allIds.includes(form.temaPadrao ?? "") ? form.temaPadrao : allIds[0]}
            options={[...temas.map((t) => ({ id: t.id, name: t.name })), ...builtIn.filter((t) => !hidden.includes(t.id)).map((t) => ({ id: t.id, name: t.name }))]}
            disabled={!canEdit}
            onChange={(_, v) => set("temaPadrao", String(v))}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ImageList({ items, onChange, canEdit, dark }: { items: MarketingImage[]; onChange: (items: MarketingImage[]) => void; canEdit: boolean; dark?: boolean }) {
  if (!items.length) return null;
  return (
    <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
      {items.map((item, i) => (
        <div key={item.url} className="rounded-card border bg-card overflow-hidden">
          <div className={cn("h-20 flex items-center justify-center", dark ? "bg-neutral-900 p-2" : "bg-muted")}>
            <img src={item.url} alt="" className={cn("max-h-full max-w-full", dark ? "object-contain" : "h-full w-full object-cover")} />
          </div>
          <div className="flex items-center gap-1 p-1">
            <Input value={item.nome} className="h-7 text-xs" disabled={!canEdit} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} />
            {canEdit && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Icon name="x" className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SealsCard({ form, set, canEdit }: CardProps) {
  const own = form.selosPersonalizados ?? [];
  const on = (id: string) => (form.selos ?? []).includes(id);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Selos e certificações</CardTitle>
        <CardDescription>Aparecem no canto do rodapé. Envie os da empresa (PNG claro, para fundo escuro) ou use os da biblioteca.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ImageList items={own} onChange={(v) => set("selosPersonalizados", v)} canEdit={canEdit} dark />
        {canEdit && <UploadButton label="Enviar selo" multiple disabled={own.length >= 8} onDone={(files) => set("selosPersonalizados", [...own, ...files].slice(0, 8))} />}
        <div className="space-y-2">
          <Label className="text-sm">Biblioteca</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {SEALS.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border p-2">
                <Checkbox
                  id={`wl-selo-${s.id}`}
                  checked={on(s.id)}
                  disabled={!canEdit}
                  onCheckedChange={(v) => set("selos", v ? [...(form.selos ?? []), s.id] : (form.selos ?? []).filter((x) => x !== s.id))}
                />
                <span className="h-8 w-16 rounded bg-neutral-900 flex items-center justify-center p-1">
                  <img src={s.dark} alt="" className="max-h-full max-w-full object-contain" />
                </span>
                <Label htmlFor={`wl-selo-${s.id}`} className="text-sm font-normal cursor-pointer">{s.name}</Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PhotosCard({ form, set, canEdit }: CardProps) {
  const own = form.fotos ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Banco de fotos</CardTitle>
        <CardDescription>Fotos que aparecem para escolher na arte quando a turma não tem imagem boa.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ImageList items={own} onChange={(v) => set("fotos", v)} canEdit={canEdit} />
        {canEdit && <UploadButton label="Enviar fotos" multiple disabled={own.length >= 30} onDone={(files) => set("fotos", [...own, ...files].slice(0, 30))} />}
        <div className="flex items-center justify-between gap-3 rounded-card border bg-card p-3">
          <div>
            <p className="text-sm font-medium">Usar também as fotos que vêm com o sistema</p>
            <p className="text-xs text-muted-foreground">{PHOTO_BANK.length} fotos de treinamentos em altura e resgate.</p>
          </div>
          <Switch checked={!!form.usarFotosPadrao} disabled={!canEdit} onCheckedChange={(v) => set("usarFotosPadrao", v)} />
        </div>
      </CardContent>
    </Card>
  );
}

