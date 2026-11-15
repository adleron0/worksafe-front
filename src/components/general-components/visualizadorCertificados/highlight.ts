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
