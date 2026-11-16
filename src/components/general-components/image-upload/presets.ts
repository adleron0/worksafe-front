/**
 * Predefinições de recorte do ImageUpload.
 *
 * Cada tela escolhe uma predefinição em vez de configurar proporção, tamanho e
 * formato à mão. As proporções seguem onde a imagem aparece no site
 * (worksafe-site): blog 1200×630, cards de serviço/turma 4:3, loja 1:1.
 */

/** Proporção do recorte: número (largura/altura) ou "original" (a da própria imagem). */
export type AspectValue = number | "original";

export interface AspectOption {
  label: string;
  value: AspectValue;
}

export interface ImagePreset {
  /** Proporções que a pessoa pode escolher; a primeira é a inicial. */
  aspects: AspectOption[];
  /** Máscara redonda no recorte (só visual; o arquivo continua quadrado). */
  round?: boolean;
  /** Maior lado do arquivo final, em px. Nunca amplia a imagem. */
  maxSize: number;
  /**
   * Formato final. "auto" mantém PNG/WebP quando a origem pode ter
   * transparência e usa JPEG no resto.
   */
  format: "jpeg" | "png" | "auto";
  /** Oferece "remover fundo branco" (assinaturas fotografadas no papel). */
  removeBackground?: boolean;
  /** Já abre com o fundo branco removido. */
  removeBackgroundDefault?: boolean;
  /** Oferece "aparar margens" (corta bordas brancas/transparentes). */
  trim?: boolean;
  /** Como a imagem aparece no quadro: "cover" preenche, "contain" mostra inteira. */
  fit: "cover" | "contain";
  /** Texto curto mostrado no quadro vazio. */
  hint?: string;
}

const ORIGINAL: AspectOption = { label: "Original", value: "original" };
const SQUARE: AspectOption = { label: "1:1", value: 1 };
const FOUR_THREE: AspectOption = { label: "4:3", value: 4 / 3 };
const SIXTEEN_NINE: AspectOption = { label: "16:9", value: 16 / 9 };
const SHARE: AspectOption = { label: "Capa 1200×630", value: 1200 / 630 };
const FOUR_FIVE: AspectOption = { label: "4:5", value: 4 / 5 };

export const IMAGE_PRESETS = {
  /** Fotos de pessoas: usuário, aluno, instrutor, perfil. */
  avatar: {
    aspects: [SQUARE],
    round: true,
    maxSize: 800,
    format: "jpeg",
    fit: "cover",
    hint: "Foto quadrada",
  },
  /** Capa de post do blog (também usada no link compartilhado). */
  cover: {
    aspects: [SHARE, SIXTEEN_NINE],
    maxSize: 1920,
    format: "jpeg",
    fit: "cover",
    hint: "Capa 1200×630",
  },
  /** Cards do site: serviços, cursos, turmas, áreas. */
  card: {
    aspects: [FOUR_THREE, SIXTEEN_NINE, SQUARE, FOUR_FIVE, ORIGINAL],
    maxSize: 1920,
    format: "jpeg",
    fit: "cover",
    hint: "Proporção 4:3",
  },
  /** Produtos da loja: fundo branco, imagem inteira no card quadrado. */
  product: {
    aspects: [SQUARE, FOUR_THREE, ORIGINAL],
    maxSize: 1600,
    format: "auto",
    trim: true,
    fit: "contain",
    hint: "Foto quadrada",
  },
  /** Logos (empresa, clientes): sem proporção forçada, mantém transparência. */
  logo: {
    aspects: [ORIGINAL, SQUARE, FOUR_THREE, SIXTEEN_NINE],
    maxSize: 1200,
    format: "png",
    trim: true,
    fit: "contain",
    hint: "PNG com fundo transparente fica melhor",
  },
  /** Ícone do site. */
  favicon: {
    aspects: [SQUARE],
    maxSize: 512,
    format: "png",
    fit: "contain",
    hint: "Ícone quadrado",
  },
  /** Assinatura: aparar margens e tirar o fundo branco da foto do papel. */
  signature: {
    aspects: [ORIGINAL, { label: "3:1", value: 3 }],
    maxSize: 1200,
    format: "png",
    removeBackground: true,
    removeBackgroundDefault: true,
    trim: true,
    fit: "contain",
    hint: "Foto da assinatura em papel branco",
  },
  /** Sem proporção sugerida (compatibilidade). */
  free: {
    aspects: [ORIGINAL, SQUARE, FOUR_THREE, SIXTEEN_NINE],
    maxSize: 1920,
    format: "auto",
    fit: "cover",
  },
} satisfies Record<string, ImagePreset>;

export type ImagePresetName = keyof typeof IMAGE_PRESETS;

export function resolvePreset(preset: ImagePresetName | ImagePreset | undefined): ImagePreset {
  if (!preset) return IMAGE_PRESETS.free;
  return typeof preset === "string" ? IMAGE_PRESETS[preset] : preset;
}
