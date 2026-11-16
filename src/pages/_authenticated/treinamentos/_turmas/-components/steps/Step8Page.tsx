import React, { useRef, useState } from "react";
import { post } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input as ShadInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import Select from "@/components/general-components/Select";
import SwitchCustom from "@/components/general-components/SwitchCustom";
import TagInput from "@/components/general-components/TagInput";
import Icon from "@/components/general-components/Icon";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import {
  LANDING_LAYOUTS,
  LandingContent,
  LandingLayoutId,
  parseLandingContent,
} from "../pagina/landing";
import { FormData } from "../TurmasFormSteps";

interface StepProps {
  dataForm: FormData;
  setDataForm: React.Dispatch<React.SetStateAction<FormData>>;
  errors: { [key: string]: string };
  classId?: number;
}

const MAX_GALLERY = 12;

async function uploadImage(file: File): Promise<string> {
  const response = await post<{ imageUrl: string }, { image: File }>("images", "s3", { image: file });
  if (!response?.imageUrl) throw new Error("sem endereço");
  return response.imageUrl;
}

/** Página de inscrição: conteúdo editável, layout fixo ou teste A/B. */
const Step8Page = ({ dataForm, setDataForm, classId }: StepProps) => {
  const { theme } = useTheme();
  const content = parseLandingContent(dataForm.landingContent);
  const setContent = (patch: Partial<LandingContent>) =>
    setDataForm((prev) => ({ ...prev, landingContent: { ...parseLandingContent(prev.landingContent), ...patch } }));

  const siteBase =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3030"
      : theme.companyData?.lp_domain
        ? `https://${theme.companyData.lp_domain}`
        : "https://www.worksafebrasil.com.br";
  const previewUrl = (layout: string) => `${siteBase}/turma/${classId}?layout=${layout}&preview=1`;

  const abLayouts = (dataForm.landingAbLayouts as string[] | undefined) ?? [];
  const toggleAb = (id: string, on: boolean) =>
    setDataForm((prev) => {
      const list = new Set((prev.landingAbLayouts as string[] | undefined) ?? []);
      if (on) list.add(id);
      else list.delete(id);
      return { ...prev, landingAbLayouts: LANDING_LAYOUTS.map((l) => l.id).filter((l) => list.has(l)) };
    });

  return (
    <div className="space-y-8">
      {/* ── Layout e teste A/B ─────────────────────────────────────────── */}
      <section className="rounded-lg border p-4 space-y-4">
        <div>
          <h3 className="font-semibold">Layout da página</h3>
          <p className="text-xs text-muted-foreground">
            Todos os layouts mostram o mesmo conteúdo desta aba, de formas diferentes. A inscrição e o pagamento são os mesmos em todos.
          </p>
        </div>
        <SwitchCustom
          label="Testar layouts (teste A/B): cada visitante vê um dos layouts marcados"
          checked={!!dataForm.landingAbTest}
          onChange={(checked) =>
            setDataForm((prev) => ({
              ...prev,
              landingAbTest: checked,
              landingAbLayouts: checked && !((prev.landingAbLayouts as string[] | undefined)?.length) ? ["classico", "impacto"] : prev.landingAbLayouts,
            }))
          }
        />
        {dataForm.landingAbTest ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {LANDING_LAYOUTS.map((layout) => (
              <label key={layout.id} htmlFor={`ab-${layout.id}`} className={cn("flex gap-3 rounded-md border p-3 cursor-pointer", abLayouts.includes(layout.id) && "border-primary bg-primary/5")}>
                <Checkbox id={`ab-${layout.id}`} checked={abLayouts.includes(layout.id)} onCheckedChange={(v) => toggleAb(layout.id, v === true)} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{layout.name}</span>
                  <span className="block text-xs text-muted-foreground">{layout.hint}</span>
                </span>
              </label>
            ))}
            {abLayouts.length < 2 && <p className="text-xs text-destructive sm:col-span-2">Marque pelo menos dois layouts para o teste valer.</p>}
          </div>
        ) : (
          <div className="max-w-sm space-y-1">
            <Label>Layout fixo</Label>
            <Select
              name="landingLayout"
              options={LANDING_LAYOUTS.map((l) => ({ id: l.id, name: l.name }))}
              state={(dataForm.landingLayout as string) || "classico"}
              onChange={(_n, v) => setDataForm((prev) => ({ ...prev, landingLayout: String(v) as LandingLayoutId }))}
              placeholder="Clássico"
            />
          </div>
        )}
        {classId ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-xs text-muted-foreground self-center">Ver a página salva com:</span>
            {LANDING_LAYOUTS.map((l) => (
              <Button key={l.id} type="button" variant="outline" size="sm" asChild>
                <a href={previewUrl(l.id)} target="_blank" rel="noreferrer">
                  <Icon name="external-link" className="w-3.5 h-3.5 mr-1" /> {l.name}
                </a>
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Salve a turma para ver a página com cada layout.</p>
        )}
      </section>

      {/* ── Chamada principal ──────────────────────────────────────────── */}
      <section className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold">Chamada principal</h3>
        <p className="text-xs text-muted-foreground -mt-2">Sem título, a página usa o nome da turma. Sem subtítulo, usa a descrição.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Linha acima do título" placeholder="Formação em acesso por corda · ANEAC" value={content.hero?.eyebrow} onChange={(v) => setContent({ hero: { ...content.hero, eyebrow: v } })} />
          <Field label="Texto do botão" placeholder="Quero minha vaga" value={content.hero?.ctaLabel} onChange={(v) => setContent({ hero: { ...content.hero, ctaLabel: v } })} />
        </div>
        <Field label="Título" placeholder="Trabalhe onde poucos chegam" value={content.hero?.title} onChange={(v) => setContent({ hero: { ...content.hero, title: v } })} />
        <Field label="Subtítulo" multiline placeholder="Fachadas, indústrias, tanques e resgates. Próxima turma: 23 a 28 de novembro." value={content.hero?.subtitle} onChange={(v) => setContent({ hero: { ...content.hero, subtitle: v } })} />
      </section>

      {/* ── Galeria ────────────────────────────────────────────────────── */}
      <Gallery
        images={content.gallery ?? []}
        onChange={(gallery) => setContent({ gallery })}
      />

      {/* ── Destaques ──────────────────────────────────────────────────── */}
      <section className="rounded-lg border p-4 space-y-3">
        <div>
          <h3 className="font-semibold">Destaques</h3>
          <p className="text-xs text-muted-foreground">Cartões com foto, título e texto. Ex.: onde a pessoa pode trabalhar, o que ela leva do curso.</p>
        </div>
        <Field label="Título da seção" placeholder="Uma profissão, vários mercados" value={content.highlights?.title} onChange={(v) => setContent({ highlights: { items: content.highlights?.items ?? [], title: v } })} />
        <div className="grid gap-3">
          {(content.highlights?.items ?? []).map((item, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-[120px_1fr] rounded-md border p-3">
              <ImagePicker
                url={item.imageUrl}
                onChange={(url) => setContent({ highlights: { title: content.highlights?.title, items: (content.highlights?.items ?? []).map((h, i) => (i === index ? { ...h, imageUrl: url } : h)) } })}
              />
              <div className="grid gap-2 min-w-0">
                <Field label="Título" placeholder="Fachadas e prédios" value={item.title} onChange={(v) => setContent({ highlights: { title: content.highlights?.title, items: (content.highlights?.items ?? []).map((h, i) => (i === index ? { ...h, title: v } : h)) } })} />
                <Field label="Texto" multiline placeholder="Opcional" value={item.text} onChange={(v) => setContent({ highlights: { title: content.highlights?.title, items: (content.highlights?.items ?? []).map((h, i) => (i === index ? { ...h, text: v } : h)) } })} />
                <div>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setContent({ highlights: { title: content.highlights?.title, items: (content.highlights?.items ?? []).filter((_, i) => i !== index) } })}>
                    <Icon name="trash-2" className="w-3.5 h-3.5 mr-1" /> Remover destaque
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setContent({ highlights: { title: content.highlights?.title, items: [...(content.highlights?.items ?? []), { title: "" }] } })}>
          <Icon name="plus" className="w-3.5 h-3.5 mr-1" /> Adicionar destaque
        </Button>
      </section>

      {/* ── Formulário e confiança ─────────────────────────────────────── */}
      <section className="rounded-lg border p-4 space-y-4">
        <h3 className="font-semibold">Formulário e confiança</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Pergunta no formulário (opcional)" placeholder="Seu nível" value={content.options?.label} onChange={(v) => setContent({ options: { items: content.options?.items ?? [], label: v } })} />
          <div className="space-y-1">
            <Label>Opções da pergunta</Label>
            <TagInput
              value={(content.options?.items ?? []).join("#")}
              onChange={(value) => setContent({ options: { label: content.options?.label, items: String(value).split("#").filter(Boolean) } })}
              separator="#"
              placeholder="N1, N2, N3... (Enter para adicionar)"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">A resposta vai junto com a inscrição. Nos layouts novos aparece como botões; o Clássico não mostra.</p>
        <div className="space-y-1">
          <Label>Selos de confiança</Label>
          <TagInput value={(content.seals ?? []).join("#")} onChange={(value) => setContent({ seals: String(value).split("#").filter(Boolean) })} separator="#" placeholder="Certificação ANEAC, ISO 9001... (Enter para adicionar)" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 items-end">
          <SwitchCustom label="Mostrar avaliações dos alunos (só as autorizadas)" checked={content.showReviews !== false} onChange={(checked) => setContent({ showReviews: checked })} />
          <div className="space-y-1">
            <Label htmlFor="scarcity">Mostrar "últimas vagas" quando restarem até</Label>
            <ShadInput id="scarcity" type="number" min={0} max={100} value={content.scarcityThreshold ?? 5} onChange={(e) => setContent({ scarcityThreshold: Number(e.target.value) })} className="max-w-[120px]" />
          </div>
        </div>
      </section>

      {/* ── História ───────────────────────────────────────────────────── */}
      <section className="rounded-lg border p-4 space-y-3">
        <div>
          <h3 className="font-semibold">História</h3>
          <p className="text-xs text-muted-foreground">Um bloco de prova: quem vocês são, desde quando, por que confiar. Aparece no Impacto e na Narrativa.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <ImagePicker url={content.story?.imageUrl} onChange={(url) => setContent({ story: { ...content.story, imageUrl: url } })} />
          <div className="grid gap-2 min-w-0">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Linha acima do título" placeholder="Desde 2005" value={content.story?.eyebrow} onChange={(v) => setContent({ story: { ...content.story, eyebrow: v } })} />
              <Field label="Título" placeholder="Começamos fazendo rapel como profissão" value={content.story?.title} onChange={(v) => setContent({ story: { ...content.story, title: v } })} />
            </div>
            <Field label="Texto" multiline value={content.story?.text} onChange={(v) => setContent({ story: { ...content.story, text: v } })} />
          </div>
        </div>
      </section>
    </div>
  );
};

function Field({ label, value, onChange, placeholder, multiline }: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  const id = `lp-${label.replace(/\W+/g, "-").toLowerCase()}-${Math.abs(hash(label))}`;
  return (
    <div className="space-y-1 min-w-0">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea id={id} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} rows={3} />
      ) : (
        <ShadInput id={id} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

/** Uma imagem (destaque ou história): enviar, trocar ou remover. */
function ImagePicker({ url, onChange }: { url?: string; onChange: (url: string | undefined) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast({ title: `${file.name} não é uma imagem`, variant: "destructive" });
    setBusy(true);
    try {
      onChange(await uploadImage(file));
    } catch {
      toast({ title: "Não foi possível enviar a imagem", description: "Tente de novo ou confira o formato do arquivo.", variant: "destructive" });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <div className="grid gap-1.5 content-start">
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files)} />
      <button type="button" onClick={() => input.current?.click()} className="aspect-[4/3] w-full rounded-md border border-dashed bg-muted/40 overflow-hidden flex items-center justify-center text-xs text-muted-foreground hover:bg-muted">
        {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : busy ? "Enviando..." : <span className="flex flex-col items-center gap-1"><Icon name="image-plus" className="w-5 h-5" />Foto</span>}
      </button>
      {url && (
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange(undefined)}>
          Remover foto
        </Button>
      )}
    </div>
  );
}

/** Galeria: a primeira foto é a capa nos layouts novos. */
function Gallery({ images, onChange }: { images: { url: string; caption?: string }[]; onChange: (images: { url: string; caption?: string }[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_GALLERY - images.length;
    if (room <= 0) return toast({ title: `No máximo ${MAX_GALLERY} fotos`, variant: "destructive" });
    setBusy(true);
    const added: { url: string }[] = [];
    try {
      for (const file of Array.from(files).slice(0, room)) {
        if (!file.type.startsWith("image/")) { toast({ title: `${file.name} não é uma imagem`, variant: "destructive" }); continue; }
        added.push({ url: await uploadImage(file) });
      }
    } catch {
      toast({ title: "Não foi possível enviar uma das fotos", description: "As que já subiram ficaram na galeria.", variant: "destructive" });
    } finally {
      if (added.length) onChange([...images, ...added]);
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <section className="rounded-lg border p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Galeria</h3>
          <p className="text-xs text-muted-foreground">A primeira foto é a capa dos layouts novos. Sem fotos aqui, usa a imagem da turma.</p>
        </div>
        <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
        <Button type="button" variant="outline" className="shrink-0" disabled={busy || images.length >= MAX_GALLERY} onClick={() => input.current?.click()}>
          <Icon name="image-plus" className="w-4 h-4 mr-1" /> {busy ? "Enviando..." : "Adicionar fotos"}
        </Button>
      </div>
      {images.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma foto na galeria.</p>}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <div key={`${image.url}-${index}`} className="rounded-md border overflow-hidden flex flex-col">
            <div className="relative aspect-[4/5] bg-muted">
              <img src={image.url} alt={image.caption || `Foto ${index + 1}`} className="w-full h-full object-cover" />
              {index === 0 && <span className="absolute top-1.5 left-1.5 rounded bg-black/70 text-white text-[10px] px-1.5 py-0.5">Capa</span>}
            </div>
            <div className="p-2 grid gap-1.5">
              <ShadInput value={image.caption ?? ""} placeholder="Legenda (opcional)" onChange={(e) => onChange(images.map((g, i) => (i === index ? { ...g, caption: e.target.value } : g)))} className="h-8 text-xs" />
              <div className="flex justify-between">
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Mover para antes"><Icon name="arrow-left" className="w-3.5 h-3.5" /></Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={index === images.length - 1} onClick={() => move(index, 1)} aria-label="Mover para depois"><Icon name="arrow-right" className="w-3.5 h-3.5" /></Button>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => onChange(images.filter((_, i) => i !== index))} aria-label="Remover foto"><Icon name="trash-2" className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Step8Page;
