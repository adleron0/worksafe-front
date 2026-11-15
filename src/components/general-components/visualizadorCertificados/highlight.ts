import type { FoilSettings } from "./server/FoilShaderLayer";

// ============================================================================
// Certificados de destaque — catálogo dos temas e o destaque efetivo.
//
// Turma especial: tema na turma, herdado por todos os certificados dela.
// Aluno destaque: marcação no certificado (tema e texto opcionais).
// A mesma regra existe na API (trainee_certificate/highlight.ts) — manter iguais.
// ============================================================================

export type HighlightTheme = "ouro" | "prata" | "holografico";
export type HighlightKind = "aluno" | "turma";

export interface HighlightThemeInfo {
  id: HighlightTheme;
  name: string;
  /** Gradiente do selo/chip (CSS). */
  gradient: string;
  /** Cor do texto sobre o gradiente. */
  text: string;
  icon: string;
}

export const HIGHLIGHT_THEMES: HighlightThemeInfo[] = [
  {
    id: "ouro",
    name: "Ouro",
    gradient: "linear-gradient(135deg, #8a5a00 0%, #f5d061 30%, #fff3b0 50%, #d4a017 70%, #8a5a00 100%)",
    text: "#3d2600",
    icon: "award",
  },
  {
    id: "prata",
    name: "Prata",
    gradient: "linear-gradient(135deg, #5f6b75 0%, #c9d1d8 30%, #ffffff 50%, #aab4bd 70%, #5f6b75 100%)",
    text: "#1f2a33",
    icon: "medal",
  },
  {
    id: "holografico",
    name: "Holográfico",
    gradient: "linear-gradient(135deg, #ff9adf 0%, #a0e7ff 25%, #c8ffb0 50%, #ffe39a 75%, #d3a8ff 100%)",
    text: "#2b1d4a",
    icon: "sparkles",
  },
];

export const HIGHLIGHT_DEFAULT_LABEL: Record<HighlightKind, string> = {
  aluno: "Aluno Destaque",
  turma: "Turma Especial",
};

export const themeInfo = (theme?: string | null) =>
  HIGHLIGHT_THEMES.find((t) => t.id === theme) ?? null;

export interface CertificateHighlight {
  kind: HighlightKind;
  theme: HighlightTheme;
  label: string;
}

interface HighlightSource {
  highlightStudent?: boolean | null;
  highlightTheme?: string | null;
  highlightLabel?: string | null;
  class?: { highlightTheme?: string | null; highlightLabel?: string | null } | null;
}

const asTheme = (value?: string | null): HighlightTheme | null =>
  themeInfo(value)?.id ?? null;

export function resolveHighlight(cert?: HighlightSource | null): CertificateHighlight | null {
  if (!cert) return null;
  if (cert.highlightStudent) {
    return {
      kind: "aluno",
      theme: asTheme(cert.highlightTheme) ?? asTheme(cert.class?.highlightTheme) ?? "ouro",
      label: cert.highlightLabel?.trim() || HIGHLIGHT_DEFAULT_LABEL.aluno,
    };
  }
  const classTheme = asTheme(cert.class?.highlightTheme);
  if (classTheme) {
    return {
      kind: "turma",
      theme: classTheme,
      label: cert.class?.highlightLabel?.trim() || HIGHLIGHT_DEFAULT_LABEL.turma,
    };
  }
  return null;
}

/**
 * Versão das imagens do certificado (`?v=`): a data de atualização e, se houver,
 * o destaque. O tema da turma muda sem tocar no certificado — sem isto o
 * navegador seguiria mostrando a imagem antiga (cache de um dia).
 */
export function renderVersion(
  cert?: (HighlightSource & { updatedAt?: string | Date | null }) | null,
): string | Date | null | undefined {
  if (!cert) return undefined;
  const h = resolveHighlight(cert);
  if (!h || !cert.updatedAt) return cert.updatedAt;
  let hash = 0;
  for (const ch of `${h.kind}|${h.theme}|${h.label}`) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return `${new Date(cert.updatedAt).getTime()}-${h.theme}-${(hash >>> 0).toString(36)}`;
}

/** Brilho extra em volta do cartão, por tema. */
export const HOLO_GLOW: Record<HighlightTheme, string> = {
  ouro: "0 0 0 1px rgba(212,160,23,.35), 0 0 34px -6px rgba(245,190,60,.55)",
  prata: "0 0 0 1px rgba(150,165,180,.4), 0 0 34px -6px rgba(170,190,215,.6)",
  holografico: "0 0 0 1px rgba(170,140,255,.35), 0 0 38px -6px rgba(160,200,255,.6)",
};

// ── Efeitos animados (FoilShaderLayer) ──────────────────────────────────────
// Cada tema aponta para um efeito; a vitrine (/treinamentos/efeitos-destaque)
// mostra também as variações extras para escolher.


export interface HighlightEffect {
  id: string;
  name: string;
  description: string;
  settings: FoilSettings;
  glow: string;
}

const FRAME = 0.035;

export const HIGHLIGHT_EFFECTS: HighlightEffect[] = [
  { id: "ouro", name: "Ouro", description: "Ouro gravado com flocos que acendem no ângulo da luz",
    settings: { preset: "gold", foil: "#e6c36a", intensity: 0.55, edge: 0.55, frame: FRAME, scale: 1 }, glow: HOLO_GLOW.ouro },
  { id: "ouro-glitter", name: "Ouro glitter", description: "Glitter dourado fino, mais discreto",
    settings: { preset: "glitter", foil: "#e9c46a", intensity: 0.32, edge: 0.5, frame: FRAME, scale: 1.4 }, glow: HOLO_GLOW.ouro },
  { id: "prata", name: "Prata", description: "Glitter prateado frio",
    settings: { preset: "glitter", foil: "#dfe6ee", intensity: 0.3, edge: 0.5, frame: FRAME, scale: 1.2 }, glow: HOLO_GLOW.prata },
  { id: "prata-estilhacos", name: "Prata estilhaçada", description: "Facetas de cristal que mudam com a inclinação",
    settings: { preset: "shards", foil: "#d9e1ea", intensity: 0.38, edge: 0.45, frame: FRAME, scale: 1 }, glow: HOLO_GLOW.prata },
  { id: "holografico", name: "Holográfico", description: "Arco-íris contínuo, o clássico holográfico",
    settings: { preset: "rainbow", foil: "#e2e6ec", intensity: 0.55, edge: 0.6, frame: FRAME, scale: 1 }, glow: HOLO_GLOW.holografico },
  { id: "estrelas", name: "Estrelas", description: "Estrelas furta-cor espalhadas",
    settings: { preset: "stars", foil: "#e2e6ec", intensity: 0.4, edge: 0.6, frame: FRAME, scale: 1 }, glow: HOLO_GLOW.holografico },
  { id: "explosoes", name: "Explosões", description: "Rosetas radiais, estilo selo de segurança",
    settings: { preset: "bursts", foil: "#e2e6ec", intensity: 0.35, edge: 0.6, frame: FRAME, scale: 1 }, glow: HOLO_GLOW.holografico },
  { id: "cosmos", name: "Cosmos", description: "Anéis e pontos, como bolhas de sabão",
    settings: { preset: "cosmos", foil: "#e2e6ec", intensity: 0.4, edge: 0.6, frame: FRAME, scale: 1 }, glow: HOLO_GLOW.holografico },
  { id: "espiral", name: "Espiral", description: "Raios que giram a partir do centro",
    settings: { preset: "swirl", foil: "#e2e6ec", intensity: 0.4, edge: 0.55, frame: FRAME, scale: 1 }, glow: HOLO_GLOW.holografico },
];

/** Efeito usado por cada tema (o que o certificado de destaque mostra hoje). */
export const THEME_EFFECT: Record<HighlightTheme, string> = {
  ouro: "ouro",
  prata: "prata",
  holografico: "holografico",
};

export const effectById = (id?: string | null) =>
  HIGHLIGHT_EFFECTS.find((e) => e.id === id) ?? null;
export const effectForTheme = (theme?: HighlightTheme | null) =>
  theme ? effectById(THEME_EFFECT[theme]) : null;
