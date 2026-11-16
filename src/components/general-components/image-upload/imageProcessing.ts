/**
 * Processamento de imagem no navegador para o ImageUpload: leitura (inclusive
 * HEIC do iPhone), redução de fotos enormes, remoção de fundo branco, aparar
 * margens e recorte final num File pronto para o FormData.
 *
 * A orientação EXIF já vem aplicada: os navegadores atuais desenham o <img>
 * com `image-orientation: from-image`, inclusive no canvas.
 */
import type { ImagePreset } from "./presets";

/** Maior lado da imagem de trabalho. Fotos de 48MP passam do limite de canvas do Safari. */
const WORKING_MAX = 4096;

/** Tipos que podem ter transparência — preservados como PNG. */
const ALPHA_TYPES = ["image/png", "image/webp", "image/gif", "image/svg+xml"];

export interface WorkingImage {
  /** objectURL da imagem de trabalho (lembrar de revogar). */
  url: string;
  width: number;
  height: number;
  /** Tipo do arquivo de origem (depois da conversão do HEIC). */
  type: string;
  /** Nome do arquivo de origem, sem extensão. */
  baseName: string;
}

export function isHeic(file: File): boolean {
  return /image\/hei(c|f)/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

/** Aceita o arquivo se for imagem. O `accept` do input não vale para arrastar e colar. */
export function matchesAccept(file: File, accept: string): boolean {
  const rules = accept.split(",").map((r) => r.trim().toLowerCase()).filter(Boolean);
  if (rules.length === 0) return true;
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  return rules.some((rule) => {
    if (rule === "image/*") return type.startsWith("image/") || isHeic(file);
    if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
    if (rule.startsWith(".")) return name.endsWith(rule);
    return type === rule;
  });
}

export function loadImage(src: string, crossOrigin = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível abrir a imagem."));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível gerar a imagem."))),
      type,
      quality,
    );
  });
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não permitiu processar a imagem.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx };
}

function baseNameOf(name: string) {
  return (name || "imagem").replace(/\.[^.]+$/, "") || "imagem";
}

/**
 * Prepara um arquivo para o recorte: converte HEIC, abre e, se a foto for
 * muito grande, reduz para no máximo WORKING_MAX no maior lado.
 */
export async function prepareFile(file: File): Promise<WorkingImage> {
  let blob: Blob = file;
  let type = file.type;

  if (isHeic(file)) {
    // Safari abre HEIC sozinho; nos outros navegadores converte (carregado só quando precisa).
    const direct = URL.createObjectURL(file);
    try {
      await loadImage(direct);
      URL.revokeObjectURL(direct);
    } catch {
      URL.revokeObjectURL(direct);
      const { default: heic2any } = await import("heic2any");
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
      blob = Array.isArray(converted) ? converted[0] : converted;
    }
    type = "image/jpeg";
  }

  return prepareBlob(blob, type, baseNameOf(file.name));
}

/** Prepara uma imagem já hospedada (para recortar de novo o que veio da API). */
export async function prepareRemote(url: string): Promise<WorkingImage> {
  const response = await fetch(url, { mode: "cors", cache: "no-cache" });
  if (!response.ok) throw new Error("Não foi possível baixar a imagem atual.");
  const blob = await response.blob();
  const name = decodeURIComponent(url.split("?")[0].split("/").pop() || "imagem");
  return prepareBlob(blob, blob.type || "image/jpeg", baseNameOf(name));
}

async function prepareBlob(blob: Blob, type: string, baseName: string): Promise<WorkingImage> {
  const url = URL.createObjectURL(blob);
  let img: HTMLImageElement;
  try {
    img = await loadImage(url);
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }

  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) {
    URL.revokeObjectURL(url);
    throw new Error("A imagem está vazia ou corrompida.");
  }

  const longest = Math.max(width, height);
  if (longest <= WORKING_MAX) return { url, width, height, type, baseName };

  const scale = WORKING_MAX / longest;
  const { canvas, ctx } = makeCanvas(width * scale, height * scale);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  const keepAlpha = ALPHA_TYPES.includes(type);
  const reduced = await canvasToBlob(canvas, keepAlpha ? "image/png" : "image/jpeg", 0.95);
  return {
    url: URL.createObjectURL(reduced),
    width: canvas.width,
    height: canvas.height,
    type,
    baseName,
  };
}

/**
 * Deixa transparente o fundo claro (papel). `sensitivity` vai de 0 a 100:
 * quanto maior, mais tons de cinza viram fundo. A borda é suave para a tinta
 * não ficar serrilhada.
 */
export async function removeWhiteBackground(src: string, sensitivity: number): Promise<string> {
  const img = await loadImage(src);
  const { canvas, ctx } = makeCanvas(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;

  const cutoff = 250 - sensitivity * 1.1; // 0 → 250 (só branco puro) · 100 → 140
  const soft = 28;
  for (let i = 0; i < px.length; i += 4) {
    const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    if (lum >= cutoff) {
      px[i + 3] = 0;
    } else if (lum > cutoff - soft) {
      const keep = (cutoff - lum) / soft;
      px[i + 3] = Math.round(px[i + 3] * keep);
    }
  }
  ctx.putImageData(data, 0, 0);
  const blob = await canvasToBlob(canvas, "image/png");
  return URL.createObjectURL(blob);
}

/** Caixa do conteúdo, ignorando bordas transparentes ou quase brancas. */
function contentBounds(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const { data } = ctx.getImageData(0, 0, width, height);
  let top = height, left = width, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3];
      const white = data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245;
      if (alpha > 12 && !white) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (right < 0) return null;
  const pad = Math.round(Math.max(right - left, bottom - top) * 0.03);
  left = Math.max(0, left - pad);
  top = Math.max(0, top - pad);
  right = Math.min(width - 1, right + pad);
  bottom = Math.min(height - 1, bottom + pad);
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

export interface PixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderOptions {
  /** URL da imagem mostrada no recorte (já com o fundo removido, se for o caso). */
  src: string;
  area: PixelArea;
  /** Rotação em graus, múltiplo de 90. */
  rotation: number;
  /** Espelhamento, aplicado antes da rotação (como no recorte). */
  flip?: { horizontal: boolean; vertical: boolean };
  preset: ImagePreset;
  trim: boolean;
  /** O fundo foi removido: força PNG. */
  transparent: boolean;
  source: Pick<WorkingImage, "type" | "baseName">;
}

/** Gera o arquivo final a partir da área escolhida no recorte. */
export async function renderCrop({ src, area, rotation, flip, preset, trim, transparent, source }: RenderOptions): Promise<File> {
  const img = await loadImage(src);
  const rot = ((rotation % 360) + 360) % 360;
  const swap = rot === 90 || rot === 270;
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  // 1. Imagem espelhada e girada inteira (a área do react-easy-crop é relativa a ela).
  const rotated = makeCanvas(swap ? h : w, swap ? w : h);
  rotated.ctx.translate(rotated.canvas.width / 2, rotated.canvas.height / 2);
  rotated.ctx.rotate((rot * Math.PI) / 180);
  rotated.ctx.scale(flip?.horizontal ? -1 : 1, flip?.vertical ? -1 : 1);
  rotated.ctx.drawImage(img, -w / 2, -h / 2);

  // 2. Recorte.
  let crop: PixelArea = {
    x: Math.max(0, Math.round(area.x)),
    y: Math.max(0, Math.round(area.y)),
    width: Math.round(area.width),
    height: Math.round(area.height),
  };
  crop.width = Math.min(crop.width, rotated.canvas.width - crop.x);
  crop.height = Math.min(crop.height, rotated.canvas.height - crop.y);
  const cropped = makeCanvas(crop.width, crop.height);
  cropped.ctx.drawImage(rotated.canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  // 3. Aparar margens.
  let sourceCanvas = cropped.canvas;
  if (trim) {
    const bounds = contentBounds(cropped.ctx, crop.width, crop.height);
    if (bounds && (bounds.width < crop.width || bounds.height < crop.height)) {
      const trimmed = makeCanvas(bounds.width, bounds.height);
      trimmed.ctx.drawImage(cropped.canvas, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
      sourceCanvas = trimmed.canvas;
      crop = { ...crop, width: bounds.width, height: bounds.height };
    }
  }

  // 4. Tamanho final (nunca amplia).
  const scale = Math.min(1, preset.maxSize / Math.max(crop.width, crop.height));
  const out = makeCanvas(crop.width * scale, crop.height * scale);

  const png =
    transparent ||
    preset.format === "png" ||
    (preset.format === "auto" && ALPHA_TYPES.includes(source.type));
  if (!png) {
    // JPEG não tem transparência: fundo branco em vez de preto.
    out.ctx.fillStyle = "#ffffff";
    out.ctx.fillRect(0, 0, out.canvas.width, out.canvas.height);
  }
  out.ctx.drawImage(sourceCanvas, 0, 0, out.canvas.width, out.canvas.height);

  const type = png ? "image/png" : "image/jpeg";
  const blob = await canvasToBlob(out.canvas, type, png ? undefined : 0.9);
  return new File([blob], `${source.baseName}.${png ? "png" : "jpg"}`, {
    type,
    lastModified: Date.now(),
  });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
