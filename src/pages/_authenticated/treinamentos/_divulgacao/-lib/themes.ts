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
}

export const THEMES: ArtTheme[] = [
  { id: "verde", name: "Preto e verde", bg: "#07090a", bg2: "#121a14", accent: "#8bd61f", onAccent: "#07090a", badge: "#8bd61f", onBadge: "#07090a", text: "#ffffff", muted: "#c8d0ca" },
  { id: "laranja", name: "Azul e laranja", bg: "#07152f", bg2: "#0d2552", accent: "#ff7a1a", onAccent: "#ffffff", badge: "#ff7a1a", onBadge: "#ffffff", text: "#ffffff", muted: "#c9d4ea" },
  { id: "amarelo", name: "Preto e amarelo", bg: "#0b0b0b", bg2: "#1d1b12", accent: "#ffd21f", onAccent: "#0b0b0b", badge: "#e3262f", onBadge: "#ffffff", text: "#ffffff", muted: "#d9d6c8" },
  { id: "vermelho", name: "Vermelho", bg: "#7c0910", bg2: "#c8121d", accent: "#ffffff", onAccent: "#b3121c", badge: "#111111", onBadge: "#ffffff", text: "#ffffff", muted: "#ffd9db" },
  { id: "claro", name: "Claro e verde", bg: "#f3f5f1", bg2: "#ffffff", accent: "#2f9e44", onAccent: "#ffffff", badge: "#2f9e44", onBadge: "#ffffff", text: "#101410", muted: "#4b524c", light: true },
];

export const themeById = (id?: string | null): ArtTheme => THEMES.find((t) => t.id === id) ?? THEMES[0];

/** Cor com transparência (aceita #rgb e #rrggbb). */
export function alpha(hex: string, a: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
