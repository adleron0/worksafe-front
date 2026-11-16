/**
 * Conteúdo da página de inscrição da turma (CourseClass.landingContent).
 * Tudo opcional: o que ficar vazio não aparece no site. O mesmo formato é lido
 * pelo worksafe-site (src/routes/-components/turma-layouts/landing.ts).
 */
export interface LandingImage {
  url: string;
  caption?: string;
}

export interface LandingHighlight {
  imageUrl?: string;
  title: string;
  text?: string;
}

export interface LandingContent {
  version: 1;
  hero?: { eyebrow?: string; title?: string; subtitle?: string; ctaLabel?: string };
  gallery?: LandingImage[];
  highlights?: { title?: string; items: LandingHighlight[] };
  options?: { label?: string; items: string[] };
  seals?: string[];
  story?: { eyebrow?: string; title?: string; text?: string; imageUrl?: string };
  showReviews?: boolean;
  /** "Últimas vagas" aparece quando restarem até N vagas (0 = nunca). */
  scarcityThreshold?: number;
}

export const LANDING_LAYOUTS = [
  { id: "classico", name: "Clássico", hint: "A página de hoje. Serve de base de comparação no teste." },
  { id: "impacto", name: "Impacto", hint: "Foto de capa em tela cheia, galeria e destaques, botão fixo no celular." },
  { id: "direto", name: "Direto", hint: "Formulário já na primeira tela, ao lado de datas, prazo e vagas." },
  { id: "narrativa", name: "Narrativa", hint: "Página longa em capítulos, com a chamada de inscrição repetida." },
] as const;

export type LandingLayoutId = (typeof LANDING_LAYOUTS)[number]["id"];

export const layoutName = (id?: string | null) =>
  LANDING_LAYOUTS.find((l) => l.id === id)?.name ?? "Clássico";

/** Conteúdo vindo da API (objeto, string JSON ou nada) em formato seguro. */
export function parseLandingContent(value: unknown): LandingContent {
  let raw: unknown = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Partial<LandingContent>) : {};
  return {
    version: 1,
    hero: obj.hero ?? {},
    gallery: Array.isArray(obj.gallery) ? obj.gallery.filter((g) => g && typeof g.url === "string") : [],
    highlights: { title: obj.highlights?.title ?? "", items: Array.isArray(obj.highlights?.items) ? obj.highlights!.items : [] },
    options: { label: obj.options?.label ?? "", items: Array.isArray(obj.options?.items) ? obj.options!.items : [] },
    seals: Array.isArray(obj.seals) ? obj.seals.filter((s) => typeof s === "string") : [],
    story: obj.story ?? {},
    showReviews: obj.showReviews ?? true,
    scarcityThreshold: typeof obj.scarcityThreshold === "number" ? obj.scarcityThreshold : 5,
  };
}

/** Limpa campos vazios antes de salvar (o site trata ausente como "não mostrar"). */
export function compactLandingContent(c: LandingContent): LandingContent {
  const text = (v?: string) => (v && v.trim() ? v.trim() : undefined);
  const hero = { eyebrow: text(c.hero?.eyebrow), title: text(c.hero?.title), subtitle: text(c.hero?.subtitle), ctaLabel: text(c.hero?.ctaLabel) };
  const story = { eyebrow: text(c.story?.eyebrow), title: text(c.story?.title), text: text(c.story?.text), imageUrl: text(c.story?.imageUrl) };
  const items = (c.highlights?.items ?? []).filter((h) => text(h.title)).map((h) => ({ title: h.title.trim(), text: text(h.text), imageUrl: text(h.imageUrl) }));
  const options = (c.options?.items ?? []).map((o) => o.trim()).filter(Boolean);
  return {
    version: 1,
    hero,
    gallery: (c.gallery ?? []).filter((g) => g.url).map((g) => ({ url: g.url, caption: text(g.caption) })),
    highlights: { title: text(c.highlights?.title), items },
    options: { label: text(c.options?.label), items: options },
    seals: (c.seals ?? []).map((s) => s.trim()).filter(Boolean),
    story,
    showReviews: c.showReviews ?? true,
    scarcityThreshold: Math.max(0, Math.round(Number(c.scarcityThreshold) || 0)),
  };
}
