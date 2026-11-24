import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import Dialog from "@/components/general-components/Dialog";
import Select from "@/components/general-components/Select";
import Icon from "@/components/general-components/Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { badgeLabel, drawArt, FORMAT_SIZES, LAYOUTS, type ArtInput } from "../-lib/art";
import { renderCaption, KIND_FOR_SITUATION } from "../-lib/caption";
import { useCaptionTemplates, useMarketingClass, useMarketingSettings } from "../-lib/data";
import { themeById } from "../-lib/themes";
import type { ArtFormat, ArtLayout, ArtOptions, ClassSituation, MarketingOverrides } from "../-lib/types";
import { buildVariables, defaultOverrides } from "../-lib/variables";
import { useArtResources, useIdentity } from "./useArtResources";

interface Props {
  classId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SITUATION_LABELS: Record<ClassSituation, string> = {
  vagas_abertas: "Vagas abertas",
  ultimas_vagas: "Últimas vagas",
  lotada: "Turma lotada",
  promocao: "Promoção",
};

const AI_STYLES = [
  { id: "variar", name: "Variar o texto" },
  { id: "urgente", name: "Mais urgente" },
  { id: "curto", name: "Mais curto" },
  { id: "amigavel", name: "Mais próximo" },
  { id: "profissional", name: "Mais institucional" },
];

function Tip({ text, children }: { text: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-xs leading-snug">{text}</TooltipContent>
    </Tooltip>
  );
}

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function downloadCanvas(canvas: HTMLCanvasElement, name: string) {
  return new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      resolve();
    }, "image/png");
  });
}

export default function DivulgarDialog({ classId, open, onOpenChange }: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Divulgar turma"
      description="Arte para o Instagram e legenda prontas a partir dos dados da turma"
      showBttn={false}
      className="sm:max-w-[1180px] w-[96vw] max-h-[94vh]"
      classNameContent="h-[min(80vh,880px)] p-0 overflow-hidden"
      preventDismiss
    >
      {open && classId ? <DivulgarContent classId={classId} /> : null}
    </Dialog>
  );
}

function DivulgarContent({ classId }: { classId: number }) {
  const settingsQuery = useMarketingSettings();
  const captionsQuery = useCaptionTemplates();
  const classQuery = useMarketingClass(classId);

  if (settingsQuery.isLoading || classQuery.isLoading || captionsQuery.isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground gap-2">
        <Icon name="loader-circle" className="w-4 h-4 animate-spin" /> Carregando a turma…
      </div>
    );
  }
  if (!settingsQuery.data || !classQuery.data) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-6">
        <Icon name="triangle-alert" className="w-6 h-6 text-destructive" />
        <p className="font-medium">Não foi possível carregar a divulgação.</p>
        <p className="text-sm text-muted-foreground">Confira se você tem a permissão de divulgação e tente de novo.</p>
      </div>
    );
  }
  return (
    <Studio
      key={classId}
      turma={classQuery.data}
      settingsData={settingsQuery.data}
      captions={captionsQuery.data ?? []}
    />
  );
}

function Studio({
  turma,
  settingsData,
  captions,
}: {
  turma: NonNullable<ReturnType<typeof useMarketingClass>["data"]>;
  settingsData: NonNullable<ReturnType<typeof useMarketingSettings>["data"]>;
  captions: NonNullable<ReturnType<typeof useCaptionTemplates>["data"]>;
}) {
  const { settings, company } = settingsData;
  const [overrides, setOverrides] = useState<MarketingOverrides>(() => defaultOverrides(turma, settings));
  const vars = useMemo(
    () => buildVariables(turma, settings, overrides, company.name, company.siteDomain),
    [turma, settings, overrides, company],
  );

  const { themes, labels, fonts, photoBank, fontsReady } = useIdentity(settings, company);
  const firstPhoto = turma.imageUrl || turma.course?.imageUrl || photoBank[0]?.src || null;
  const [options, setOptions] = useState<ArtOptions>(() => ({
    format: "feed34",
    layout: "destaque",
    theme: themeById(settings.temaPadrao, themes).id,
    badge: vars.situation,
    photoUrl: firstPhoto,
    photoX: 70,
    photoY: 35,
    photoZoom: 100,
    showSeals: true,
    showIncluso: true,
    showPrice: true,
  }));
  const set = <K extends keyof ArtOptions>(key: K, value: ArtOptions[K]) => setOptions((o) => ({ ...o, [key]: value }));
  const theme = themeById(options.theme, themes);
  const { photo, photoError, seals, brand } = useArtResources(settings, company, theme, options.photoUrl);

  const artInput: ArtInput = useMemo(
    () => ({
      vars,
      labels,
      brand,
      fonts,
      title: overrides.titulo,
      levelsLabel: overrides.niveis,
      options,
      theme,
      companyName: company.name,
      whatsapp: vars.values.whatsapp,
      email: settings.email ?? "",
      site: vars.values.site,
      photo,
      seals,
    }),
    [vars, labels, brand, fonts, overrides.titulo, overrides.niveis, options, theme, company.name, settings.email, photo, seals],
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current || !fontsReady) return;
    drawArt(canvasRef.current, artInput);
  }, [artInput, fontsReady]);

  const fileName = (format: ArtFormat) =>
    `${slug(turma.course?.name || turma.name)}-${vars.dates?.inicio.replace("/", "-") ?? "turma"}-${FORMAT_SIZES[format].label.toLowerCase().replace(/[^a-z0-9]+/g, "")}.png`;

  const downloadCurrent = async () => {
    if (!canvasRef.current) return;
    await downloadCanvas(canvasRef.current, fileName(options.format));
    toast({ title: "Arte baixada", description: "O PNG foi salvo na pasta de downloads.", variant: "success" });
  };

  const downloadFeedAndStory = async () => {
    for (const format of ["feed34", "story"] as ArtFormat[]) {
      const c = document.createElement("canvas");
      drawArt(c, { ...artInput, options: { ...options, format } });
      await downloadCanvas(c, fileName(format));
    }
    toast({ title: "Artes baixadas", description: "Feed (3:4) e story (9:16) salvos na pasta de downloads.", variant: "success" });
  };

  const size = FORMAT_SIZES[options.format];
  const upload = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const photoChoices = [
    ...(turma.imageUrl ? [{ src: turma.imageUrl, label: "Imagem da turma" }] : []),
    ...(turma.course?.imageUrl && turma.course.imageUrl !== turma.imageUrl ? [{ src: turma.course.imageUrl, label: "Imagem do curso" }] : []),
    ...uploaded.map((src, i) => ({ src, label: `Enviada ${i + 1}` })),
    ...photoBank,
  ];

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] overflow-hidden">
      {/* Prévia */}
      <div className="bg-muted/40 flex flex-col items-center justify-center p-4 gap-3 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 w-full flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={size.w}
            height={size.h}
            className="max-h-full max-w-full rounded-md shadow-lg bg-black"
            style={{ aspectRatio: `${size.w} / ${size.h}` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={downloadCurrent} disabled={!fontsReady}>
            <Icon name="download" className="w-4 h-4" /> Baixar PNG ({size.label})
          </Button>
          <Tip text="Baixa duas imagens: a do feed (3:4) e a do story (9:16), com as mesmas escolhas.">
            <Button variant="outline" onClick={downloadFeedAndStory} disabled={!fontsReady}>
              <Icon name="images" className="w-4 h-4" /> Feed + story
            </Button>
          </Tip>
        </div>
        {photoError && (
          <p className="text-xs text-destructive">Não foi possível usar essa foto (acesso bloqueado). Escolha outra ou envie do computador.</p>
        )}
      </div>

      {/* Controles */}
      <div className="border-l min-h-0 flex flex-col">
        <Tabs defaultValue="arte" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="mx-4 mt-3 grid grid-cols-3">
            <TabsTrigger value="arte">Arte</TabsTrigger>
            <TabsTrigger value="legenda">Legenda</TabsTrigger>
            <TabsTrigger value="dados">Dados</TabsTrigger>
          </TabsList>

          <TabsContent value="arte" className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 space-y-5 mt-3">
            <Section title="Formato">
              <div className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-lg">
                {(Object.keys(FORMAT_SIZES) as ArtFormat[]).map((f) => (
                  <Tip key={f} text={FORMAT_SIZES[f].hint}>
                    <Button size="sm" variant={options.format === f ? "default" : "ghost"} onClick={() => set("format", f)} className="px-1 text-xs">
                      {FORMAT_SIZES[f].label}
                    </Button>
                  </Tip>
                ))}
              </div>
            </Section>

            <Section title="Diagramação">
              <div className="grid grid-cols-3 gap-2">
                {LAYOUTS.map((l) => (
                  <Tip key={l.id} text={l.hint}>
                    <button
                      type="button"
                      onClick={() => set("layout", l.id as ArtLayout)}
                      className={cn(
                        "rounded-lg border p-2 text-xs font-medium flex flex-col items-center gap-1.5 transition-colors",
                        options.layout === l.id ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted",
                      )}
                    >
                      <LayoutGlyph id={l.id as ArtLayout} />
                      {l.name}
                    </button>
                  </Tip>
                ))}
              </div>
            </Section>

            <Section title="Cores">
              <div className="flex flex-wrap gap-2">
                {themes.map((t) => (
                  <Tip key={t.id} text={t.name}>
                    <button
                      type="button"
                      onClick={() => set("theme", t.id)}
                      className={cn(
                        "h-10 w-10 rounded-full border-2 overflow-hidden flex transition-transform",
                        options.theme === t.id ? "border-primary scale-110" : "border-transparent hover:scale-105",
                      )}
                      style={{ background: `linear-gradient(135deg, ${t.bg} 0 55%, ${t.accent} 55% 100%)` }}
                      aria-label={t.name}
                    />
                  </Tip>
                ))}
              </div>
            </Section>

            <Section title="Selo" hint={`Pelos dados da turma: ${SITUATION_LABELS[vars.situation]}${vars.remaining !== null ? ` (${vars.remaining} vaga${vars.remaining === 1 ? "" : "s"} livre${vars.remaining === 1 ? "" : "s"})` : ""}`}>
              <Select
                name="badge"
                modal
                state={options.badge}
                options={[
                  ...(["vagas_abertas", "ultimas_vagas", "promocao", "lotada"] as ClassSituation[]).map((id) => ({ id, name: badgeLabel(labels, id) })),
                  { id: "nenhum", name: "Sem selo" },
                ]}
                onChange={(_, v) => set("badge", v as ArtOptions["badge"])}
              />
            </Section>

            <Section title="Foto">
              <div className="grid grid-cols-4 gap-2">
                {photoChoices.map((p) => (
                  <Tip key={p.src} text={p.label}>
                    <button
                      type="button"
                      onClick={() => set("photoUrl", p.src)}
                      className={cn(
                        "aspect-square rounded-md overflow-hidden border-2 bg-muted",
                        options.photoUrl === p.src ? "border-primary" : "border-transparent hover:border-muted-foreground/40",
                      )}
                    >
                      <img src={p.src} alt={p.label} className="h-full w-full object-cover" loading="lazy" />
                    </button>
                  </Tip>
                ))}
                <Tip text="Usar uma foto do computador (não é enviada ao servidor)">
                  <button
                    type="button"
                    onClick={() => upload.current?.click()}
                    className="aspect-square rounded-md border-2 border-dashed flex flex-col items-center justify-center text-[10px] text-muted-foreground hover:bg-muted gap-1"
                  >
                    <Icon name="upload" className="w-4 h-4" /> Enviar
                  </button>
                </Tip>
                <Tip text="Sem foto: fundo com a marca">
                  <button
                    type="button"
                    onClick={() => set("photoUrl", null)}
                    className={cn(
                      "aspect-square rounded-md border-2 flex flex-col items-center justify-center text-[10px] text-muted-foreground hover:bg-muted gap-1",
                      options.photoUrl === null ? "border-primary" : "border-dashed",
                    )}
                  >
                    <Icon name="image-off" className="w-4 h-4" /> Sem foto
                  </button>
                </Tip>
              </div>
              <input
                ref={upload}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = URL.createObjectURL(file);
                  setUploaded((u) => [url, ...u]);
                  set("photoUrl", url);
                  e.target.value = "";
                }}
              />
              {options.photoUrl && (
                <div className="space-y-3 pt-2">
                  <SliderRow label="Posição horizontal" value={options.photoX} min={0} max={100} onChange={(v) => set("photoX", v)} />
                  <SliderRow label="Posição vertical" value={options.photoY} min={0} max={100} onChange={(v) => set("photoY", v)} />
                  <SliderRow label="Zoom" value={options.photoZoom} min={100} max={220} suffix="%" onChange={(v) => set("photoZoom", v)} />
                </div>
              )}
            </Section>

            <Section title="Mostrar na arte">
              <div className="space-y-2.5">
                <SwitchRow label="Preço" checked={options.showPrice} onChange={(v) => set("showPrice", v)} />
                <SwitchRow label="Itens inclusos" checked={options.showIncluso} onChange={(v) => set("showIncluso", v)} />
                <SwitchRow label="Selos de certificação" checked={options.showSeals} onChange={(v) => set("showSeals", v)} />
              </div>
            </Section>
          </TabsContent>

          <TabsContent value="legenda" className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 mt-3">
            <CaptionPanel captions={captions} values={vars.values} situation={vars.situation} />
          </TabsContent>

          <TabsContent value="dados" className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 space-y-4 mt-3">
            <p className="text-xs text-muted-foreground">
              Ajustes só para esta divulgação (a turma não muda). Valem para a arte e para a legenda.
            </p>
            <Field label="Título da arte" hint="Use Enter para escolher onde quebrar a linha.">
              <Textarea rows={2} value={overrides.titulo} onChange={(e) => setOverrides((o) => ({ ...o, titulo: e.target.value }))} />
            </Field>
            <Field label="Níveis" hint='Ex.: "N1, N2 e N3". Vazio, não aparece.'>
              <Input value={overrides.niveis} onChange={(e) => setOverrides((o) => ({ ...o, niveis: e.target.value }))} placeholder="N1, N2 e N3" />
            </Field>
            <Field label="Horário">
              <Input value={overrides.horario} onChange={(e) => setOverrides((o) => ({ ...o, horario: e.target.value }))} />
            </Field>
            <Field label="Local">
              <Textarea rows={2} value={overrides.local} onChange={(e) => setOverrides((o) => ({ ...o, local: e.target.value }))} />
            </Field>
            <Field label="Incluso" hint="Um item por linha.">
              <Textarea rows={4} value={overrides.incluso} onChange={(e) => setOverrides((o) => ({ ...o, incluso: e.target.value }))} />
            </Field>
            <Field label="Preços por nível" hint='Um por linha, ex.: "N1 = 2500". Substitui o preço da turma.'>
              <Textarea rows={3} value={overrides.precosNiveis} onChange={(e) => setOverrides((o) => ({ ...o, precosNiveis: e.target.value }))} placeholder={"N1 = 2500\nN2 = 2800\nN3 = 3000"} />
            </Field>
            <SwitchRow label="Não mostrar valores (arte e legenda)" checked={overrides.ocultarPreco} onChange={(v) => setOverrides((o) => ({ ...o, ocultarPreco: v }))} />
            <Button variant="ghost" size="sm" onClick={() => setOverrides(defaultOverrides(turma, settings))}>
              <Icon name="rotate-ccw" className="w-3.5 h-3.5" /> Voltar aos dados da turma
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CaptionPanel({ captions, values, situation }: { captions: { id: number; name: string; kind: string; body: string }[]; values: Record<string, string>; situation: ClassSituation }) {
  const suggested = captions.find((c) => c.kind === KIND_FOR_SITUATION[situation]) ?? captions[0];
  const [templateId, setTemplateId] = useState<number | undefined>(suggested?.id);
  const template = captions.find((c) => c.id === templateId);
  const generated = useMemo(() => (template ? renderCaption(template.body, values) : ""), [template, values]);
  const [text, setText] = useState(generated);
  const [edited, setEdited] = useState(false);
  const [style, setStyle] = useState("variar");

  useEffect(() => {
    if (!edited) setText(generated);
  }, [generated, edited]);

  const ai = useMutation({
    // JSON: a rota não lê FormData
    mutationFn: async () => (await api.post<{ caption: string }>("marketing/captions/ai", { caption: text, style })).data,
    onSuccess: (res) => {
      if (res?.caption) {
        setText(res.caption);
        setEdited(true);
        toast({ title: "Nova versão pronta", description: "Revise os dados antes de publicar.", variant: "success" });
      }
    },
    onError: (err: any) =>
      toast({ title: "A IA não respondeu", description: err?.response?.data?.message ?? "Tente de novo em instantes.", variant: "destructive" }),
  });

  const copy = (value: string, what: string) =>
    navigator.clipboard
      .writeText(value)
      .then(() => toast({ title: `${what} copiad${what === "Legenda" ? "a" : "as"}!`, variant: "success" }))
      .catch(() => toast({ title: "Não foi possível copiar", variant: "destructive" }));

  if (!captions.length) {
    return <p className="text-sm text-muted-foreground">Nenhum modelo de legenda. Em Treinamentos → Divulgação → Modelos de legenda, use “Recriar modelos padrão” ou crie um novo.</p>;
  }
  const hashtags = (text.match(/#[\p{L}\p{N}_]+/gu) ?? []).join(" ");

  return (
    <div className="space-y-4">
      <Section title="Modelo">
        <Select
          name="template"
          modal
          state={templateId ? String(templateId) : ""}
          options={captions.map((c) => ({ id: String(c.id), name: c.name }))}
          onChange={(_, v) => {
            setTemplateId(Number(v));
            setEdited(false);
          }}
        />
      </Section>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Legenda</Label>
          <span className={cn("text-xs", text.length > 2200 ? "text-destructive" : "text-muted-foreground")}>{text.length}/2200</span>
        </div>
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setEdited(true);
          }}
          className="min-h-[340px] font-[inherit] text-sm leading-relaxed"
        />
        {edited && (
          <Button variant="link" size="sm" className="px-0 h-auto" onClick={() => setEdited(false)}>
            Desfazer edições e voltar ao modelo
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => copy(text, "Legenda")}>
          <Icon name="copy" className="w-4 h-4" /> Copiar legenda
        </Button>
        {hashtags && (
          <Button variant="outline" onClick={() => copy(hashtags, "Hashtags")}>
            <Icon name="hash" className="w-4 h-4" /> Copiar hashtags
          </Button>
        )}
      </div>
      <div className="rounded-card border bg-card p-3 space-y-2">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <Icon name="sparkles" className="w-4 h-4 text-primary" /> Reescrever com IA
        </p>
        <p className="text-xs text-muted-foreground">A IA muda o gancho e a chamada e mantém datas, valores e contatos. Sempre revise antes de postar.</p>
        <div className="flex gap-2">
          <div className="flex-1">
            <Select name="style" modal state={style} options={AI_STYLES} onChange={(_, v) => setStyle(String(v))} />
          </div>
          <Button variant="outline" onClick={() => ai.mutate()} disabled={ai.isPending || text.trim().length < 20}>
            {ai.isPending ? <Icon name="loader-circle" className="w-4 h-4 animate-spin" /> : <Icon name="wand-sparkles" className="w-4 h-4" />}
            Gerar
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{title}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SliderRow({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{value}{suffix ?? ""}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

/** Miniatura esquemática de cada diagramação. */
function LayoutGlyph({ id }: { id: ArtLayout }) {
  return (
    <svg viewBox="0 0 30 40" className="h-10 w-8" aria-hidden>
      <rect x="0.5" y="0.5" width="29" height="39" rx="2" className="fill-muted stroke-current" strokeOpacity="0.3" />
      {id === "destaque" && (
        <>
          <rect x="15" y="1" width="14" height="38" className="fill-current" opacity="0.18" />
          <rect x="3" y="6" width="11" height="4" className="fill-current" />
          <rect x="3" y="12" width="9" height="6" className="fill-current" opacity="0.6" />
          <rect x="3" y="21" width="10" height="2" className="fill-current" opacity="0.4" />
          <rect x="3" y="25" width="10" height="2" className="fill-current" opacity="0.4" />
        </>
      )}
      {id === "faixa" && (
        <>
          <path d="M1 1 H29 V14 L1 18 Z" className="fill-current" opacity="0.18" />
          <rect x="3" y="21" width="18" height="4" className="fill-current" />
          <rect x="3" y="27" width="12" height="5" className="fill-current" opacity="0.6" />
          <rect x="3" y="34" width="20" height="2" className="fill-current" opacity="0.4" />
        </>
      )}
      {id === "cartao" && (
        <>
          <rect x="1" y="1" width="28" height="38" className="fill-current" opacity="0.12" />
          <rect x="3" y="4" width="17" height="27" rx="2" className="fill-background stroke-current" strokeOpacity="0.4" />
          <rect x="5" y="8" width="12" height="3" className="fill-current" />
          <rect x="5" y="13" width="9" height="5" className="fill-current" opacity="0.6" />
          <rect x="5" y="21" width="11" height="2" className="fill-current" opacity="0.4" />
        </>
      )}
    </svg>
  );
}
