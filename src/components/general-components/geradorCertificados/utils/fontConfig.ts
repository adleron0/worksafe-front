import * as fabric from 'fabric';

// ============================================================================
// Configuração centralizada de fontes para o Gerador de Certificados
// ============================================================================

/**
 * Overrides de propriedades para fontes que precisam de tratamento especial no Fabric.js.
 * Ex: Bebas Neue é condensada e já é bold por natureza, causando problemas de
 * espaçamento e renderização se não corrigida.
 */
interface FontOverride {
  splitByGrapheme: boolean;
  charSpacing: number;
  fontWeight: string | number;
}

const FONT_OVERRIDES: Record<string, FontOverride> = {
  'bebas neue': {
    splitByGrapheme: false,
    charSpacing: 0,
    fontWeight: 'normal',
  },
};

/**
 * Lista de fontes do Google Fonts para carregar.
 * Fonte única de verdade — usada em fontLoader.ts e nos dropdowns.
 */
export const GOOGLE_FONTS = [
  'Bebas Neue',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Raleway',
  'Inter',
  'Playfair Display',
  'Oswald',
  'Merriweather',
];

/**
 * Opções de fonte para dropdowns de seleção na UI.
 * Inclui Arial (sistema) + todas as Google Fonts.
 */
export const FONT_OPTIONS: { name: string; value: string; fallback: string }[] = [
  { name: 'Arial', value: 'Arial', fallback: 'Arial, sans-serif' },
  ...GOOGLE_FONTS.map((f) => ({
    name: f,
    value: f,
    fallback: f.includes(' ') ? `"${f}", sans-serif` : `${f}, sans-serif`,
  })),
];

/**
 * URL do Google Fonts para carregar todas as fontes.
 * Inclui pesos 400 e 700 para todas as fontes (exceto Bebas Neue que só tem 400).
 */
export const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Montserrat:wght@400;700&family=Poppins:wght@400;700&family=Raleway:wght@400;700&family=Inter:wght@400;700&family=Playfair+Display:wght@400;700&family=Oswald:wght@400;700&family=Merriweather:wght@400;700&display=swap';

// ============================================================================
// Patch: forçar renderização caractere-por-caractere para texto bold.
//
// O Fabric.js tem um "shortCut" em _renderChars que renderiza a linha inteira
// com um único fillText() quando charSpacing===0 e não há estilos por caractere.
// O browser posiciona os caracteres usando o font engine nativo, mas o cursor
// é posicionado usando __charBounds (medido char-por-char a 400px e escalado).
// Em fontes bold, essa discrepância de medição acumula e desloca o cursor.
//
// O patch temporariamente define charSpacing para um valor minúsculo (1e-10)
// durante _renderChars quando fontWeight é bold. Isso desabilita o shortCut
// e força renderização char-por-char, alinhando cursor e texto.
// ============================================================================
let _boldRenderingPatched = false;

export function patchFabricBoldRendering(): void {
  if (_boldRenderingPatched) return;
  _boldRenderingPatched = true;

  const proto = fabric.Text.prototype as any;
  const origRenderChars = proto._renderChars;
  if (!origRenderChars) return;

  proto._renderChars = function (
    method: string,
    ctx: CanvasRenderingContext2D,
    line: any[],
    left: number,
    top: number,
    lineIndex: number,
  ) {
    const isBold =
      this.fontWeight === 'bold' ||
      this.fontWeight === 700 ||
      this.fontWeight === '700';

    if (isBold && this.charSpacing === 0) {
      // Valor minúsculo — visualmente imperceptível, mas suficiente
      // para desabilitar o shortCut e forçar render por caractere
      this.charSpacing = 1e-10;
      origRenderChars.call(this, method, ctx, line, left, top, lineIndex);
      this.charSpacing = 0;
    } else {
      origRenderChars.call(this, method, ctx, line, left, top, lineIndex);
    }
  };
}

/**
 * Verifica se uma fonte precisa de overrides especiais.
 */
export function needsFontOverride(fontFamily: string): boolean {
  if (!fontFamily) return false;
  return fontFamily.toLowerCase() in FONT_OVERRIDES;
}

/**
 * Retorna os overrides para uma fonte, ou null se não houver.
 */
export function getFontOverrides(fontFamily: string): FontOverride | null {
  if (!fontFamily) return null;
  return FONT_OVERRIDES[fontFamily.toLowerCase()] || null;
}

/**
 * Aplica overrides de fonte em um textbox do Fabric.js.
 * Corrige propriedades que causam problemas de renderização para fontes específicas
 * (ex: Bebas Neue com bold, charSpacing, splitByGrapheme).
 *
 * Também limpa caracteres invisíveis (zero-width spaces) que podem se acumular.
 *
 * @returns true se overrides foram aplicados, false caso contrário.
 */
export function applyFontOverrides(textbox: fabric.Textbox): boolean {
  const overrides = getFontOverrides(textbox.fontFamily);
  if (!overrides) return false;

  let changed = false;

  if ((textbox as any).splitByGrapheme !== overrides.splitByGrapheme) {
    (textbox as any).splitByGrapheme = overrides.splitByGrapheme;
    changed = true;
  }

  if ((textbox as any).charSpacing !== overrides.charSpacing) {
    (textbox as any).charSpacing = overrides.charSpacing;
    changed = true;
  }

  const currentWeight = textbox.fontWeight;
  if (
    currentWeight === 'bold' ||
    currentWeight === 700 ||
    currentWeight === '700'
  ) {
    if (overrides.fontWeight !== currentWeight) {
      textbox.set('fontWeight', overrides.fontWeight);
      changed = true;
    }
  }

  // Limpar caracteres de largura zero que se acumulam durante edição
  const text = textbox.text || '';
  const cleanText = text
    .replace(/\u200B/g, '') // Zero-width space
    .replace(/\u200C/g, '') // Zero-width non-joiner
    .replace(/\u200D/g, '') // Zero-width joiner
    .replace(/\uFEFF/g, '') // Zero-width no-break space
    .replace(/\u00A0/g, ' '); // Non-breaking space → espaço normal

  if (cleanText !== text) {
    textbox.set('text', cleanText);
    changed = true;
  }

  if (changed) {
    textbox._clearCache();
    textbox.initDimensions();
  }

  return changed;
}
