import type { CustomTheme } from "./types";

/**
 * Paletas tiradas dos posts de turma do Instagram (nov/2026 e anteriores):
 * fundo escuro com um acento forte, ou fundo claro com verde.
 */
export interface ArtTheme {
  id: string;
  name: string;
  /** fundo principal */
  bg: string;
  /** segundo tom do fundo (degradê) */
  bg2: string;
  /** cor de destaque (datas, pílulas, faixa) */
  accent: string;
  /** texto sobre o destaque */
  onAccent: string;
  /** cor do selo (vagas abertas, últimas vagas…) */
  badge: string;
  onBadge: string;
  text: string;
  muted: string;
  /** fundo claro: selos e logo escuros */
  light?: boolean;
  /** faixa zebrada no rodapé */
  listras?: boolean;
  /** tema criado pela empresa ou gerado das cores do cadastro */
  custom?: boolean;
}

export const THEMES: ArtTheme[] = [
  { id: "verde", name: "Preto e verde", bg: "#07090a", bg2: "#121a14", accent: "#8bd61f", onAccent: "#07090a", badge: "#8bd61f", onBadge: "#07090a", text: "#ffffff", muted: "#c8d0ca", listras: true },
  { id: "laranja", name: "Azul e laranja", bg: "#07152f", bg2: "#0d2552", accent: "#ff7a1a", onAccent: "#ffffff", badge: "#ff7a1a", onBadge: "#ffffff", text: "#ffffff", muted: "#c9d4ea" },
  { id: "amarelo", name: "Preto e amarelo", bg: "#0b0b0b", bg2: "#1d1b12", accent: "#ffd21f", onAccent: "#0b0b0b", badge: "#e3262f", onBadge: "#ffffff", text: "#ffffff", muted: "#d9d6c8", listras: true },
  { id: "vermelho", name: "Vermelho", bg: "#7c0910", bg2: "#c8121d", accent: "#ffffff", onAccent: "#b3121c", badge: "#111111", onBadge: "#ffffff", text: "#ffffff", muted: "#ffd9db" },
  { id: "claro", name: "Claro e verde", bg: "#f3f5f1", bg2: "#ffffff", accent: "#2f9e44", onAccent: "#ffffff", badge: "#2f9e44", onBadge: "#ffffff", text: "#101410", muted: "#4b524c", light: true },
];

export const themeById = (id?: string | null, list: ArtTheme[] = THEMES): ArtTheme =>
  list.find((t) => t.id === id) ?? list[0] ?? THEMES[0];

// ---------------------------------------------------------------------------
// Temas da empresa (white label)
// ---------------------------------------------------------------------------

function rgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (c: number[]) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
/** Mistura duas cores (t = 0 → a, t = 1 → b). */
export const mix = (a: string, b: string, t: number) => {
  const x = rgb(a);
  const y = rgb(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};
/** Luminância relativa (WCAG). */
export function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** Preto ou branco, o que contrastar mais com o fundo. */
export const readableOn = (hex: string) => (luminance(hex) > 0.4 ? "#0b0b0b" : "#ffffff");

/** Tema completo a partir de 3 cores (fundo, destaque e selo). */
export function makeTheme(t: { id: string; name: string; bg: string; accent: string; badge?: string; light?: boolean; listras?: boolean }): ArtTheme {
  const light = t.light ?? luminance(t.bg) > 0.5;
  const text = light ? "#101410" : "#ffffff";
  const badge = t.badge || t.accent;
  return {
    id: t.id,
    name: t.name,
    bg: t.bg,
    bg2: light ? mix(t.bg, "#ffffff", 0.6) : mix(t.bg, t.accent, 0.12),
    accent: t.accent,
    onAccent: readableOn(t.accent),
    badge,
    onBadge: readableOn(badge),
    text,
    muted: mix(text, t.bg, 0.25),
    light,
    listras: !!t.listras,
    custom: true,
  };
}

/**
 * Temas oferecidos na divulgação: os da empresa primeiro (incluindo um gerado
 * das cores do cadastro), depois os padrão que não foram escondidos.
 */
export function availableThemes(opts: { temas?: CustomTheme[]; temasOcultos?: string[]; primaryColor?: string | null; secondaryColor?: string | null }): ArtTheme[] {
  const own = (opts.temas ?? []).map((t) => makeTheme(t));
  const company: ArtTheme[] = [];
  if (opts.primaryColor && /^#[0-9a-f]{6}$/i.test(opts.primaryColor) && !(opts.temasOcultos ?? []).includes("empresa")) {
    company.push(makeTheme({ id: "empresa", name: "Cores da empresa", bg: mix(opts.primaryColor, "#000000", 0.82), accent: opts.primaryColor, badge: opts.secondaryColor || opts.primaryColor }));
  }
  const builtIn = THEMES.filter((t) => !(opts.temasOcultos ?? []).includes(t.id));
  const list = [...own, ...company, ...builtIn];
  return list.length ? list : [THEMES[0]];
}

/** Cor com transparência (aceita #rgb e #rrggbb). */
export function alpha(hex: string, a: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
