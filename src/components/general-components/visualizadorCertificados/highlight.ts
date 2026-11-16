import type { FoilPattern, FoilSettings } from "./server/FoilShaderLayer";

// ============================================================================
// Certificados de destaque — catálogo dos temas e o destaque efetivo.
//
// Turma especial: tema na turma, herdado por todos os certificados dela.
// Aluno destaque: marcação no certificado (tema e texto opcionais).
// A mesma regra existe na API (trainee_certificate/highlight.ts) — manter iguais.
// ============================================================================

export type HighlightTheme = "ouro" | "prata" | "holografico";
export type HighlightPattern = FoilPattern;
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
  pattern: FoilPattern;
  /** Brilho da moldura (o PNG da API já vem com ele; aqui só ajusta a animação). */
  border: HighlightBorder;
}

interface HighlightSource {
  highlightStudent?: boolean | null;
  highlightTheme?: string | null;
  highlightLabel?: string | null;
  highlightPattern?: string | null;
  highlightBorder?: string | null;
  class?: {
    highlightTheme?: string | null;
    highlightLabel?: string | null;
    highlightPattern?: string | null;
    highlightBorder?: string | null;
  } | null;
}

const asTheme = (value?: string | null): HighlightTheme | null =>
  themeInfo(value)?.id ?? null;
const asPattern = (value?: string | null): FoilPattern | null =>
  HIGHLIGHT_PATTERNS.some((p) => p.id === value) ? (value as FoilPattern) : null;
const asBorder = (value?: string | null): HighlightBorder | null =>
  HIGHLIGHT_BORDERS.some((b) => b.id === value) ? (value as HighlightBorder) : null;

export function resolveHighlight(cert?: HighlightSource | null): CertificateHighlight | null {
  if (!cert) return null;
  if (cert.highlightStudent) {
    const theme = asTheme(cert.highlightTheme) ?? asTheme(cert.class?.highlightTheme) ?? "ouro";
    return {
      kind: "aluno",
      theme,
      label: cert.highlightLabel?.trim() || HIGHLIGHT_DEFAULT_LABEL.aluno,
      pattern: asPattern(cert.highlightPattern) ?? asPattern(cert.class?.highlightPattern) ?? DEFAULT_PATTERN[theme],
      border: asBorder(cert.highlightBorder) ?? asBorder(cert.class?.highlightBorder) ?? DEFAULT_BORDER,
    };
  }
  const classTheme = asTheme(cert.class?.highlightTheme);
  if (classTheme) {
    return {
      kind: "turma",
      theme: classTheme,
      label: cert.class?.highlightLabel?.trim() || HIGHLIGHT_DEFAULT_LABEL.turma,
      pattern: asPattern(cert.class?.highlightPattern) ?? DEFAULT_PATTERN[classTheme],
      border: asBorder(cert.class?.highlightBorder) ?? DEFAULT_BORDER,
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
  for (const ch of `${h.kind}|${h.theme}|${h.label}|${h.pattern}|${h.border}|selo8`) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return `${new Date(cert.updatedAt).getTime()}-${h.theme}-${(hash >>> 0).toString(36)}`;
}

/** Brilho extra em volta do cartão, por tema. */
export const HOLO_GLOW: Record<HighlightTheme, string> = {
  ouro: "0 0 0 1px rgba(212,160,23,.35), 0 0 34px -6px rgba(245,190,60,.55)",
  prata: "0 0 0 1px rgba(150,165,180,.4), 0 0 34px -6px rgba(170,190,215,.6)",
  holografico: "0 0 0 1px rgba(170,140,255,.35), 0 0 38px -6px rgba(160,200,255,.6)",
};

// ── Efeito animado (FoilShaderLayer): tema × padronagem ────────────────────
// O tema dá a cor (metal ou furta-cor); a padronagem, o desenho do centro.
// A borda sempre tem brilhos de formas e tamanhos sorteados.

export const HIGHLIGHT_PATTERNS: { id: FoilPattern; name: string; description: string }[] = [
  { id: "rosetas", name: "Rosetas", description: "Rosetas radiais, como selo de segurança" },
  { id: "estrelas", name: "Estrelas", description: "Estrelas de tamanhos variados espalhadas" },
  { id: "estilhacos", name: "Estilhaços", description: "Facetas de cristal que mudam com a luz" },
  { id: "bolhas", name: "Bolhas", description: "Anéis como bolhas de sabão" },
  { id: "espiral", name: "Espiral", description: "Raios que giram a partir do centro" },
  { id: "arco_iris", name: "Arco-íris", description: "Véu contínuo, sem desenho" },
  { id: "gravado", name: "Gravado", description: "Linhas finas gravadas em diagonal" },
  { id: "glitter", name: "Glitter", description: "Pontinhos finos (os flocos)" },
  { id: "nenhum", name: "Nenhum", description: "Só os brilhos da borda" },
];

/** Padronagem de cada tema quando ninguém escolheu (igual à API). */
export const DEFAULT_PATTERN: Record<HighlightTheme, FoilPattern> = {
  ouro: "rosetas",
  prata: "estilhacos",
  holografico: "estrelas",
};

const THEME_FOIL: Record<HighlightTheme, { foil: string; metal: number }> = {
  ouro: { foil: "#e6c36a", metal: 1 },
  prata: { foil: "#dfe6ee", metal: 1 },
  holografico: { foil: "#e2e6ec", metal: 0 },
};

/** Intensidade/escala por padronagem (as cheias tingem mais o papel). */
const PATTERN_TUNE: Record<FoilPattern, { intensity: number; scale: number }> = {
  rosetas: { intensity: 0.55, scale: 1 },
  estrelas: { intensity: 0.55, scale: 1 },
  estilhacos: { intensity: 0.5, scale: 1 },
  bolhas: { intensity: 0.55, scale: 1 },
  espiral: { intensity: 0.5, scale: 1 },
  arco_iris: { intensity: 0.55, scale: 1 },
  gravado: { intensity: 0.6, scale: 1 },
  glitter: { intensity: 0.32, scale: 1.3 },
  nenhum: { intensity: 0, scale: 1 },
};

// ── Brilho da moldura (igual à API: render/highlight-border.ts) ────────────
export type HighlightBorder = "corda" | "reflexo" | "glitter" | "cristais" | "nenhum";

export const HIGHLIGHT_BORDERS: { id: HighlightBorder; name: string; description: string }[] = [
  { id: "corda", name: "Trança", description: "Fios de luz dourados entrelaçados sobre a corda (padrão)" },
  { id: "reflexo", name: "Reflexo", description: "Linhas finas de luz que acendem e apagam ao longo da borda" },
  { id: "glitter", name: "Glitter", description: "Quadradinhos de brilho na borda" },
  { id: "cristais", name: "Cristais", description: "Triângulos pequenos de brilho" },
  { id: "nenhum", name: "Sem brilho", description: "Só a moldura do modelo" },
];

export const DEFAULT_BORDER: HighlightBorder = "corda";

export const borderInfo = (id?: string | null) =>
  HIGHLIGHT_BORDERS.find((b) => b.id === id) ?? null;

/** Opções de brilho da moldura para os selects do admin. */
export const HIGHLIGHT_BORDER_OPTIONS = HIGHLIGHT_BORDERS.map((b) => ({ id: b.id, name: `${b.name} — ${b.description}` }));

/** Quanto da cintilação animada vai na borda, por estilo (o desenho fixo vem no PNG). */
const BORDER_EDGE: Record<HighlightBorder, number> = {
  corda: 0.5,
  reflexo: 0.3,
  glitter: 0.8,
  cristais: 0.5,
  nenhum: 0,
};

export const patternInfo = (id?: string | null) =>
  HIGHLIGHT_PATTERNS.find((p) => p.id === id) ?? null;

export function buildFoilSettings(
  theme: HighlightTheme,
  pattern: FoilPattern,
  border: HighlightBorder = DEFAULT_BORDER,
): FoilSettings {
  return {
    pattern,
    ...THEME_FOIL[theme],
    ...PATTERN_TUNE[pattern],
    edge: BORDER_EDGE[border] ?? 0.8,
    frame: 0.035,
  };
}

/** Opções de padronagem para os selects do admin. */
export const HIGHLIGHT_PATTERN_OPTIONS = HIGHLIGHT_PATTERNS.map((p) => ({ id: p.id, name: p.name }));
