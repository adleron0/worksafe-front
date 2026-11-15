/**
 * Desenho da arte de divulgação no canvas (API Canvas 2D pura, sem fabric),
 * para poder rodar igual no servidor com node-canvas no futuro.
 *
 * A diagramação segue os posts de turma do Instagram: coluna de texto com
 * "TREINAMENTO", nome do curso enorme, pílula "NOVA TURMA" + níveis, datas
 * gigantes no destaque, preço, checklist do incluso, selo inclinado
 * ("VAGAS ABERTAS!"), WhatsApp em destaque e, no rodapé, a marca e os selos de
 * certificação. A coluna é medida bloco a bloco e encolhe até caber.
 */
import { BRAND_MARK, WHATSAPP_ICON } from "./brand";
import type { ArtFonts } from "./fonts";
import { alpha, type ArtTheme } from "./themes";
import type { ArtFormat, ArtLabels, ArtLayout, ArtOptions, ClassSituation, MarketingBrand } from "./types";
import { moneyShort, type ClassVariables } from "./variables";

export const FORMAT_SIZES: Record<ArtFormat, { w: number; h: number; label: string; hint: string }> = {
  feed34: { w: 1080, h: 1440, label: "Feed 3:4", hint: "1080 × 1440 — padrão atual do feed" },
  feed45: { w: 1080, h: 1350, label: "Feed 4:5", hint: "1080 × 1350" },
  quadrado: { w: 1080, h: 1080, label: "Quadrado", hint: "1080 × 1080" },
  story: { w: 1080, h: 1920, label: "Story", hint: "1080 × 1920 — stories e status do WhatsApp" },
};

export const LAYOUTS: { id: ArtLayout; name: string; hint: string }[] = [
  { id: "destaque", name: "Foto ao fundo", hint: "Texto à esquerda sobre a foto, como os posts de turma" },
  { id: "faixa", name: "Foto em cima", hint: "Foto no topo com corte diagonal e texto embaixo" },
  { id: "cartao", name: "Cartão", hint: "Cartão com o texto sobre a foto" },
];

/** Textos fixos da arte; cada empresa troca os seus na identidade visual. */
export const DEFAULT_LABELS: ArtLabels = {
  topo: "TREINAMENTO",
  novaTurma: "NOVA TURMA",
  vagasAbertas: "VAGAS ABERTAS!",
  ultimasVagas: "ÚLTIMAS VAGAS!",
  lotada: "TURMA LOTADA",
  promocao: "PROMOÇÃO!",
  investimento: "INVESTIMENTO",
  valores: "VALORES",
  incluso: "INCLUSO",
  inscricoes: "INSCRIÇÕES",
};

export const LABEL_FIELDS: { key: keyof ArtLabels; label: string }[] = [
  { key: "topo", label: "Texto acima do título" },
  { key: "novaTurma", label: "Pílula de turma nova" },
  { key: "vagasAbertas", label: "Selo: vagas abertas" },
  { key: "ultimasVagas", label: "Selo: últimas vagas" },
  { key: "lotada", label: "Selo: turma lotada" },
  { key: "promocao", label: "Selo: promoção" },
  { key: "investimento", label: "Título do preço" },
  { key: "valores", label: "Título dos preços por nível" },
  { key: "incluso", label: "Título do incluso" },
  { key: "inscricoes", label: "Título do contato" },
];

export const resolveLabels = (custom?: Partial<ArtLabels>): ArtLabels => {
  const out = { ...DEFAULT_LABELS };
  for (const k of Object.keys(out) as (keyof ArtLabels)[]) if (custom?.[k]?.trim()) out[k] = custom[k]!.trim();
  return out;
};

export const badgeLabel = (labels: ArtLabels, badge: ClassSituation | "nenhum") =>
  ({ vagas_abertas: labels.vagasAbertas, ultimas_vagas: labels.ultimasVagas, lotada: labels.lotada, promocao: labels.promocao, nenhum: "" })[badge];

/** Para listas de opções (selo): rótulos padrão. */
export const BADGE_LABELS: Record<ClassSituation | "nenhum", string> = {
  vagas_abertas: DEFAULT_LABELS.vagasAbertas,
  ultimas_vagas: DEFAULT_LABELS.ultimasVagas,
  lotada: DEFAULT_LABELS.lotada,
  promocao: DEFAULT_LABELS.promocao,
  nenhum: "",
};

export const SEALS: { id: string; name: string; dark: string; light: string; tintLight?: boolean }[] = [
  { id: "aneac", name: "ANEAC", dark: "/divulgacao/selos/aneac-neg.png", light: "/divulgacao/selos/aneac.png" },
  { id: "icra", name: "ICRA", dark: "/divulgacao/selos/icra-neg.png", light: "/divulgacao/selos/icra-neg.png", tintLight: true },
  { id: "opc", name: "Certificação de pessoas (OPC 0015)", dark: "/divulgacao/selos/certificacao-pessoas-opc0015-neg.png", light: "/divulgacao/selos/certificacao-pessoas-opc0015-neg.png", tintLight: true },
  { id: "abnt", name: "ABNT Certificadora", dark: "/divulgacao/selos/abnt-certificadora-neg.png", light: "/divulgacao/selos/abnt-certificadora-neg.png", tintLight: true },
];

/** Marca já resolvida para desenhar (logo carregado conforme o fundo). */
export interface ArtBrand {
  tipo: MarketingBrand["tipo"];
  texto: string;
  logo: HTMLImageElement | null;
}

export interface ArtInput {
  vars: ClassVariables;
  labels: ArtLabels;
  brand: ArtBrand;
  fonts: ArtFonts;
  title: string;
  levelsLabel: string;
  options: ArtOptions;
  theme: ArtTheme;
  companyName: string;
  whatsapp: string;
  email: string;
  site: string;
  photo: HTMLImageElement | null;
  seals: { img: HTMLImageElement; tint: boolean }[];
}

type Ctx = CanvasRenderingContext2D;

// Fontes do desenho atual (definidas no começo de drawArt).
let DISPLAY_FONT = "Anton";
let DISPLAY_WEIGHT = 400;
let TEXT_FONT = "Montserrat";

const font = (ctx: Ctx, weight: number | string, size: number, family = TEXT_FONT) => {
  ctx.font = `${weight} ${Math.round(size)}px "${family}"`;
};

function setSpacing(ctx: Ctx, px: number) {
  const c = ctx as Ctx & { letterSpacing?: string };
  if ("letterSpacing" in c) c.letterSpacing = `${px}px`;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Quebra o texto em linhas que cabem na largura (respeita \n). */
function wrap(ctx: Ctx, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxW || !line) line = test;
      else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

/** Maior tamanho em que uma linha cabe na largura. */
function fitLine(ctx: Ctx, text: string, maxW: number, max: number, min: number, setFont: (size: number) => void) {
  setFont(max);
  const w = ctx.measureText(text).width;
  const size = w > maxW ? Math.max(min, Math.floor((max * maxW) / w)) : max;
  setFont(size);
  return size;
}

// Altura das maiúsculas da fonte de títulos (medida depois que a fonte carrega).
let capRatio = 0;
function cap(ctx: Ctx, size: number) {
  if (!capRatio) {
    ctx.save();
    font(ctx, DISPLAY_WEIGHT, 100, DISPLAY_FONT);
    ctx.textBaseline = "alphabetic"; // a subida medida é relativa à linha de base atual
    const m = ctx.measureText("H");
    capRatio = (m.actualBoundingBoxAscent || 74) / 100;
    ctx.restore();
  }
  return size * capRatio;
}

/** Texto na fonte de títulos com o topo das maiúsculas em yTop. */
function capFill(ctx: Ctx, text: string, x: number, yTop: number, size: number) {
  font(ctx, DISPLAY_WEIGHT, size, DISPLAY_FONT);
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x, yTop + cap(ctx, size));
}

/** Todas as formas de quebrar as palavras em n linhas (títulos são curtos). */
function partitions(words: string[], n: number): string[][] {
  if (n === 1) return [[words.join(" ")]];
  const out: string[][] = [];
  for (let i = 1; i <= words.length - n + 1; i++) {
    for (const rest of partitions(words.slice(i), n - 1)) out.push([words.slice(0, i).join(" "), ...rest]);
  }
  return out;
}

/**
 * Título equilibrado: escolhe quantas linhas (1 a maxLines) e onde quebrar para
 * o texto ficar o maior possível, com linhas de largura parecida
 * ("ACESSO / POR CORDA"). Quebras com Enter feitas pela pessoa são respeitadas.
 */
function fitTitle(ctx: Ctx, text: string, maxW: number, max: number, min: number, maxLines: number) {
  font(ctx, DISPLAY_WEIGHT, 100, DISPLAY_FONT);
  const widthAt100 = (line: string) => ctx.measureText(line).width;
  const sizeFor = (lines: string[]) => Math.min(max, (100 * maxW) / Math.max(...lines.map(widthAt100)));
  if (text.includes("\n")) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, maxLines + 1);
    return { size: Math.max(min, sizeFor(lines)), lines };
  }
  const words = text.split(/\s+/).filter(Boolean);
  let best = { size: 0, lines: [text] };
  for (let n = 1; n <= Math.min(maxLines, words.length); n++) {
    let bestN: { size: number; lines: string[] } | null = null;
    for (const lines of partitions(words, n)) {
      const size = sizeFor(lines);
      if (!bestN || size > bestN.size) bestN = { size, lines };
    }
    // uma linha a mais só compensa se o título crescer de verdade
    if (bestN && bestN.size > best.size * (n === 1 ? 1 : 1.18)) best = bestN;
  }
  if (best.size < min) {
    font(ctx, DISPLAY_WEIGHT, min, DISPLAY_FONT);
    return { size: min, lines: wrap(ctx, text, maxW).slice(0, maxLines) };
  }
  return best;
}

function drawCover(ctx: Ctx, img: HTMLImageElement, x: number, y: number, w: number, h: number, fx: number, fy: number, zoom: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = x + (w - dw) * fx;
  const dy = y + (h - dh) * fy;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawMark(ctx: Ctx, x: number, y: number, h: number, body: string) {
  const s = h / BRAND_MARK.height;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = body;
  ctx.fill(new Path2D(BRAND_MARK.body));
  ctx.fillStyle = BRAND_MARK.accentColor;
  ctx.fill(new Path2D(BRAND_MARK.accent));
  ctx.restore();
  return BRAND_MARK.width * s;
}

function wordmarkText(companyName: string) {
  if (/^work\s*safe/i.test(companyName.trim())) return "WORK SAFE";
  return companyName.trim().toUpperCase();
}

/**
 * Marca no rodapé: logo enviado (proporção mantida, até maxW), símbolo padrão
 * com o nome, ou só o nome. Retorna a largura usada.
 */
function drawBrand(ctx: Ctx, brand: ArtBrand, x: number, y: number, h: number, color: string, companyName: string, maxW: number) {
  if (brand.tipo === "logo" && brand.logo) {
    const ratio = brand.logo.naturalWidth / brand.logo.naturalHeight;
    let lh = h * 1.15;
    let lw = lh * ratio;
    if (lw > maxW) {
      lw = maxW;
      lh = lw / ratio;
    }
    ctx.drawImage(brand.logo, x, y + (h - lh) / 2, lw, lh);
    return lw;
  }
  const label = (brand.texto || wordmarkText(companyName)).toUpperCase();
  const mw = brand.tipo === "padrao" ? drawMark(ctx, x, y, h, color) : 0;
  const gap = mw ? h * 0.28 : 0;
  fitLine(ctx, label, maxW - mw - gap, h * 0.62, h * 0.3, (sz) => font(ctx, 900, sz));
  setSpacing(ctx, h * 0.02);
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + mw + gap, y + h * 0.54);
  const tw = ctx.measureText(label).width;
  setSpacing(ctx, 0);
  return mw + gap + tw;
}

const tintCache = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();
function tinted(img: HTMLImageElement, color: string): CanvasImageSource {
  let byColor = tintCache.get(img);
  if (!byColor) tintCache.set(img, (byColor = new Map()));
  const hit = byColor.get(color);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const cx = c.getContext("2d")!;
  cx.drawImage(img, 0, 0);
  cx.globalCompositeOperation = "source-in";
  cx.fillStyle = color;
  cx.fillRect(0, 0, c.width, c.height);
  byColor.set(color, c);
  return c;
}

function drawCheck(ctx: Ctx, x: number, y: number, size: number, bg: string, fg: string) {
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = fg;
  ctx.lineWidth = size * 0.14;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.28, y + size * 0.52);
  ctx.lineTo(x + size * 0.44, y + size * 0.67);
  ctx.lineTo(x + size * 0.73, y + size * 0.36);
  ctx.stroke();
}

function drawWhatsApp(ctx: Ctx, x: number, y: number, size: number) {
  ctx.fillStyle = "#25d366";
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  const inner = size * 0.6;
  const s = inner / WHATSAPP_ICON.height;
  ctx.save();
  ctx.translate(x + (size - WHATSAPP_ICON.width * s) / 2, y + (size - inner) / 2);
  ctx.scale(s, s);
  ctx.fillStyle = "#ffffff";
  ctx.fill(new Path2D(WHATSAPP_ICON.path));
  ctx.restore();
}

/** Faixa zebrada (listras diagonais), como no rodapé das artes de RTO. */
function drawStripes(ctx: Ctx, x: number, y: number, w: number, h: number, a: string, b: string, step: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = b;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = a;
  for (let i = -h; i < w + h; i += step * 2) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + step, y + h);
    ctx.lineTo(x + i + step + h, y);
    ctx.lineTo(x + i + h, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Coluna de texto: blocos medidos e desenhados na escala s
// ---------------------------------------------------------------------------

interface Block {
  key: string;
  gapBefore: number; // espaço antes, na escala 1
  optional?: number; // prioridade para sair quando não cabe (maior sai antes)
  measure: (s: number) => number;
  draw: (y: number, s: number) => void;
}

interface ColumnCtx {
  ctx: Ctx;
  x: number;
  w: number;
  input: ArtInput;
  /** texto principal na coluna (sobre cartão claro muda) */
  text: string;
  muted: string;
}

function buildBlocks(c: ColumnCtx): Block[] {
  const { ctx, x, w, input } = c;
  const { theme, vars, options } = input;
  const blocks: Block[] = [];

  // TREINAMENTO
  blocks.push({
    key: "kicker", gapBefore: 0,
    measure: (s) => 30 * s,
    draw: (y, s) => {
      font(ctx, 800, 30 * s);
      setSpacing(ctx, 7 * s);
      ctx.fillStyle = theme.accent;
      ctx.textBaseline = "top";
      ctx.fillText(input.labels.topo, x, y);
      setSpacing(ctx, 0);
    },
  });

  // Título (curso)
  let titleCache: { s: number; size: number; lines: string[] } | null = null;
  const title = (s: number) => {
    if (titleCache && titleCache.s === s) return titleCache;
    const r = fitTitle(ctx, (input.title || input.labels.topo).toUpperCase(), w, 168 * s, 60 * s, 3);
    titleCache = { s, ...r };
    return titleCache;
  };
  blocks.push({
    key: "title", gapBefore: 22,
    measure: (s) => {
      const t = title(s);
      const h = cap(ctx, t.size);
      return t.lines.length * h + (t.lines.length - 1) * h * 0.24;
    },
    draw: (y, s) => {
      const t = title(s);
      const h = cap(ctx, t.size);
      ctx.fillStyle = c.text;
      t.lines.forEach((line, i) => capFill(ctx, line, x - t.size * 0.01, y + i * h * 1.24, t.size));
    },
  });

  // NOVA TURMA + níveis
  const pill = options.badge === "lotada" ? input.labels.lotada.replace(/!+$/, "") : input.labels.novaTurma;
  blocks.push({
    key: "pills", gapBefore: 26,
    measure: (s) => 52 * s,
    draw: (y, s) => {
      font(ctx, 800, 26 * s);
      setSpacing(ctx, 2 * s);
      const pw = ctx.measureText(pill).width + 40 * s;
      ctx.fillStyle = theme.accent;
      roundRect(ctx, x, y, pw, 52 * s, 26 * s);
      ctx.fill();
      ctx.fillStyle = theme.onAccent;
      ctx.textBaseline = "middle";
      ctx.fillText(pill, x + 20 * s, y + 27 * s);
      setSpacing(ctx, 0);
      if (input.levelsLabel) {
        font(ctx, 800, 32 * s);
        ctx.fillStyle = c.text;
        const max = w - pw - 24 * s;
        let label = input.levelsLabel.toUpperCase();
        while (label.length > 3 && ctx.measureText(label).width > max) label = label.slice(0, -2);
        ctx.fillText(label, x + pw + 22 * s, y + 27 * s);
      }
    },
  });

  // Datas
  if (vars.dates) {
    const big = vars.dates.grande;
    const small = vars.dates.pequeno;
    const extra = [vars.values.horario, vars.values.carga_horaria && `${vars.values.carga_horaria} de curso`].filter(Boolean).join("  ·  ");
    const bigSize = (s: number) => fitLine(ctx, big, w, (big.length > 8 ? 150 : 205) * s, 80 * s, (size) => font(ctx, DISPLAY_WEIGHT, size, DISPLAY_FONT));
    const smallSize = (s: number) => fitLine(ctx, small, w, 76 * s, 40 * s, (size) => font(ctx, DISPLAY_WEIGHT, size, DISPLAY_FONT));
    blocks.push({
      key: "dates", gapBefore: 26,
      measure: (s) => {
        const bh = cap(ctx, bigSize(s));
        return bh + (small ? bh * 0.16 + cap(ctx, smallSize(s)) : 0) + (extra ? 22 * s + 30 * s : 0);
      },
      draw: (y, s) => {
        const bs = bigSize(s);
        const bh = cap(ctx, bs);
        ctx.fillStyle = theme.accent;
        capFill(ctx, big, x - bs * 0.015, y, bs);
        let yy = y + bh;
        if (small) {
          const ss = smallSize(s);
          yy += bh * 0.16;
          setSpacing(ctx, 3 * s);
          ctx.fillStyle = c.text;
          capFill(ctx, small, x, yy, ss);
          setSpacing(ctx, 0);
          yy += cap(ctx, ss);
        }
        if (extra) {
          font(ctx, 600, 27 * s);
          ctx.fillStyle = c.muted;
          ctx.textBaseline = "top";
          let label = extra;
          while (label.length > 6 && ctx.measureText(label).width > w) label = label.slice(0, -2);
          ctx.fillText(label, x, yy + 22 * s);
        }
      },
    });
  }

  // Preço
  if (options.showPrice && (vars.levels.length || vars.price)) {
    if (vars.levels.length) {
      const rows = vars.levels;
      blocks.push({
        key: "price", gapBefore: 30, optional: 2,
        measure: (s) => 40 * s + rows.length * cap(ctx, 46 * s) + (rows.length - 1) * 16 * s,
        draw: (y, s) => {
          font(ctx, 800, 24 * s);
          setSpacing(ctx, 5 * s);
          ctx.fillStyle = theme.accent;
          ctx.textBaseline = "top";
          ctx.fillText(input.labels.valores, x, y);
          setSpacing(ctx, 0);
          const rh = cap(ctx, 46 * s);
          font(ctx, 900, 34 * s);
          const lw = Math.max(...rows.map((r) => ctx.measureText(r.level.toUpperCase()).width), 60 * s);
          rows.forEach((r, i) => {
            const yy = y + 40 * s + i * (rh + 16 * s);
            font(ctx, 900, 34 * s);
            ctx.fillStyle = c.text;
            ctx.textBaseline = "alphabetic";
            ctx.fillText(r.level.toUpperCase(), x, yy + rh);
            if (r.value) capFill(ctx, moneyShort(r.value), x + lw + 24 * s, yy, 46 * s);
          });
        },
      });
    } else if (vars.price) {
      const from = vars.priceFrom;
      const price = moneyShort(vars.price);
      const priceSize = (s: number) => fitLine(ctx, price, w, 116 * s, 60 * s, (size) => font(ctx, DISPLAY_WEIGHT, size, DISPLAY_FONT));
      blocks.push({
        key: "price", gapBefore: 30, optional: 2,
        measure: (s) => 44 * s + cap(ctx, priceSize(s)) + (vars.values.parcelas ? 44 * s : 0),
        draw: (y, s) => {
          ctx.textBaseline = "top";
          if (from) {
            font(ctx, 700, 30 * s);
            ctx.fillStyle = c.muted;
            const label = `DE ${moneyShort(from)}`;
            ctx.fillText(label, x, y);
            const lw = ctx.measureText(label).width;
            ctx.strokeStyle = theme.badge;
            ctx.lineWidth = 4 * s;
            ctx.beginPath();
            ctx.moveTo(x + ctx.measureText("DE ").width - 4 * s, y + 17 * s);
            ctx.lineTo(x + lw + 4 * s, y + 13 * s);
            ctx.stroke();
            font(ctx, 800, 26 * s);
            ctx.fillStyle = c.text;
            ctx.fillText("POR APENAS", x + lw + 22 * s, y + 3 * s);
          } else {
            font(ctx, 800, 24 * s);
            setSpacing(ctx, 5 * s);
            ctx.fillStyle = theme.accent;
            ctx.fillText(input.labels.investimento, x, y + 4 * s);
            setSpacing(ctx, 0);
          }
          const ps = priceSize(s);
          ctx.fillStyle = c.text;
          capFill(ctx, price, x - ps * 0.01, y + 44 * s, ps);
          if (vars.values.parcelas) {
            font(ctx, 700, 26 * s);
            ctx.fillStyle = c.muted;
            ctx.textBaseline = "top";
            ctx.fillText(`ou ${vars.values.parcelas}`, x, y + 44 * s + cap(ctx, ps) + 14 * s);
          }
        },
      });
    }
  }

  // Incluso
  if (options.showIncluso && vars.incluso.length) {
    const items = vars.incluso.slice(0, 8);
    const cols = items.length > 4 ? 2 : 1;
    const rows = Math.ceil(items.length / cols);
    blocks.push({
      key: "incluso", gapBefore: 30, optional: 3,
      measure: (s) => 34 * s + rows * 46 * s,
      draw: (y, s) => {
        font(ctx, 800, 24 * s);
        setSpacing(ctx, 5 * s);
        ctx.fillStyle = theme.accent;
        ctx.textBaseline = "top";
        ctx.fillText(input.labels.incluso, x, y);
        setSpacing(ctx, 0);
        const colW = w / cols;
        items.forEach((item, i) => {
          const cx = x + Math.floor(i / rows) * colW;
          const cy = y + 36 * s + (i % rows) * 46 * s;
          drawCheck(ctx, cx, cy, 32 * s, theme.accent, theme.onAccent);
          font(ctx, 800, 28 * s);
          ctx.fillStyle = c.text;
          ctx.textBaseline = "middle";
          let label = item.toUpperCase();
          while (label.length > 3 && ctx.measureText(label).width > colW - 56 * s) label = label.slice(0, -2);
          ctx.fillText(label, cx + 44 * s, cy + 17 * s);
          ctx.textBaseline = "top";
        });
      },
    });
  }

  // Selo inclinado
  const badge = badgeLabel(input.labels, options.badge);
  if (badge) {
    const size = (s: number) => fitLine(ctx, badge, w - 60 * s, 78 * s, 40 * s, (sz) => font(ctx, DISPLAY_WEIGHT, sz, DISPLAY_FONT));
    blocks.push({
      key: "badge", gapBefore: 34, optional: 1,
      measure: (s) => cap(ctx, size(s)) * 1.9 + 30 * s,
      draw: (y, s) => {
        const sz = size(s);
        font(ctx, DISPLAY_WEIGHT, sz, DISPLAY_FONT);
        const tw = ctx.measureText(badge).width;
        const bw = tw + 56 * s;
        const bh = cap(ctx, sz) * 1.9;
        ctx.save();
        ctx.translate(x, y + 12 * s);
        ctx.rotate(-0.045);
        ctx.fillStyle = alpha("#000000", 0.25);
        ctx.fillRect(10 * s, 10 * s, bw, bh);
        ctx.fillStyle = theme.badge;
        ctx.fillRect(0, 0, bw, bh);
        ctx.fillStyle = theme.onBadge;
        capFill(ctx, badge, 28 * s, (bh - cap(ctx, sz)) / 2, sz);
        ctx.restore();
      },
    });
  }

  // WhatsApp e contatos
  const contacts = [input.email, input.site].filter(Boolean).join("   ·   ");
  if (input.whatsapp || contacts) {
    blocks.push({
      key: "cta", gapBefore: 34,
      measure: (s) => (input.whatsapp ? 74 * s : 0) + (contacts ? 40 * s : 0),
      draw: (y, s) => {
        let yy = y;
        if (input.whatsapp) {
          drawWhatsApp(ctx, x, yy, 72 * s);
          font(ctx, 800, 22 * s);
          setSpacing(ctx, 4 * s);
          ctx.fillStyle = c.muted;
          ctx.textBaseline = "top";
          ctx.fillText(input.labels.inscricoes, x + 90 * s, yy + 4 * s);
          setSpacing(ctx, 0);
          const size = fitLine(ctx, input.whatsapp, w - 90 * s, 44 * s, 26 * s, (sz) => font(ctx, 900, sz));
          ctx.fillStyle = c.text;
          ctx.fillText(input.whatsapp, x + 90 * s, yy + 30 * s + (44 * s - size) * 0.5);
          yy += 74 * s;
        }
        if (contacts) {
          fitLine(ctx, contacts, w, 24 * s, 16 * s, (sz) => font(ctx, 600, sz));
          ctx.fillStyle = c.muted;
          ctx.textBaseline = "top";
          ctx.fillText(contacts, x, yy + 14 * s);
        }
      },
    });
  }
  return blocks;
}

/** Escolhe a escala (e, se preciso, tira blocos opcionais) para a coluna caber. */
function layoutColumn(blocks: Block[], available: number, maxScale: number) {
  let list = [...blocks];
  const total = (bs: Block[], s: number) => bs.reduce((sum, b, i) => sum + b.measure(s) + (i ? b.gapBefore * s : 0), 0);
  for (;;) {
    let lo = 0.5;
    let hi = maxScale;
    if (total(list, hi) <= available) return { blocks: list, s: hi, height: total(list, hi) };
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      if (total(list, mid) <= available) lo = mid;
      else hi = mid;
    }
    const removable = list.filter((b) => b.optional).sort((a, b) => (b.optional ?? 0) - (a.optional ?? 0));
    if (lo >= 0.72 || !removable.length) return { blocks: list, s: lo, height: total(list, lo) };
    list = list.filter((b) => b !== removable[0]);
  }
}

/**
 * Várias colunas na mesma escala (a mais alta manda). Usado na diagramação
 * "Foto em cima": datas à esquerda, preço/incluso/selo à direita.
 */
function layoutGroups(groups: Block[][], available: number, maxScale: number) {
  let lists = groups.map((g) => [...g]);
  const total = (bs: Block[], s: number) => bs.reduce((sum, b, i) => sum + b.measure(s) + (i ? b.gapBefore * s : 0), 0);
  const tallest = (s: number) => Math.max(...lists.map((l) => total(l, s)));
  for (;;) {
    let lo = 0.5;
    let hi = maxScale;
    if (tallest(hi) <= available) lo = hi;
    else {
      for (let i = 0; i < 18; i++) {
        const mid = (lo + hi) / 2;
        if (tallest(mid) <= available) lo = mid;
        else hi = mid;
      }
    }
    // só tira bloco da coluna que estoura (tirar da outra não ajudaria)
    const over = lists.reduce((a, b) => (total(b, 0.72) > total(a, 0.72) ? b : a));
    const removable = over.filter((b) => b.optional).sort((a, b) => (b.optional ?? 0) - (a.optional ?? 0));
    if (lo >= 0.72 || !removable.length) return { lists, s: lo, heights: lists.map((l) => total(l, lo)) };
    lists = lists.map((l) => l.filter((b) => b !== removable[0]));
  }
}

function drawColumn(blocks: Block[], s: number, top: number, extraGap: number) {
  let y = top;
  blocks.forEach((b, i) => {
    if (i) y += b.gapBefore * s + extraGap;
    b.draw(y, s);
    y += b.measure(s);
  });
}

// ---------------------------------------------------------------------------

function drawFallbackBackground(ctx: Ctx, w: number, h: number, theme: ArtTheme, brand: ArtBrand) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, theme.bg);
  g.addColorStop(1, theme.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // marca d'água grande à direita
  ctx.save();
  ctx.globalAlpha = theme.light ? 0.06 : 0.08;
  if (brand.tipo === "padrao") drawMark(ctx, w * 0.48, h * 0.12, h * 0.8, theme.light ? "#000000" : "#ffffff");
  else if (brand.tipo === "logo" && brand.logo) {
    const lh = h * 0.6;
    const lw = Math.min(w * 0.7, lh * (brand.logo.naturalWidth / brand.logo.naturalHeight));
    ctx.drawImage(tinted(brand.logo, theme.light ? "#000000" : "#ffffff"), w - lw * 0.85, h * 0.2, lw, lw / (brand.logo.naturalWidth / brand.logo.naturalHeight));
  }
  ctx.restore();
}

function drawFooter(ctx: Ctx, input: ArtInput, w: number, y: number, h: number, color: string) {
  const M = 64;
  const brandH = Math.min(58, h * 0.55);
  drawBrand(ctx, input.brand, M, y + (h - brandH) / 2, brandH, color, input.companyName, w * 0.42);
  if (input.options.showSeals && input.seals.length) {
    const sealH = Math.min(58, h * 0.55);
    let xx = w - M;
    for (const seal of [...input.seals].reverse()) {
      const ratio = seal.img.naturalWidth / seal.img.naturalHeight;
      const sw = sealH * ratio;
      xx -= sw;
      const src = input.theme.light && seal.tint ? tinted(seal.img, "#1b1f1b") : seal.img;
      ctx.drawImage(src, xx, y + (h - sealH) / 2, sw, sealH);
      xx -= 26;
    }
  }
}

export function drawArt(canvas: HTMLCanvasElement, input: ArtInput) {
  const { w: W, h: H } = FORMAT_SIZES[input.options.format];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  capRatio = 0;
  DISPLAY_FONT = input.fonts.title;
  DISPLAY_WEIGHT = input.fonts.titleWeight;
  TEXT_FONT = input.fonts.text;
  const { theme, options, photo } = input;
  const story = options.format === "story";
  const M = 64;
  const safeTop = story ? 210 : M;
  const footerH = story ? 130 : 120;
  const footerY = H - (story ? 200 : 0) - footerH - (story ? 0 : 18);
  const stripes = !!theme.listras;
  const zoom = Math.max(1, options.photoZoom / 100);
  const fx = options.photoX / 100;
  const fy = options.photoY / 100;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);

  if (options.layout === "faixa") {
    const photoH = Math.round(H * ({ feed34: 0.36, feed45: 0.33, quadrado: 0.3, story: 0.36 } as Record<ArtFormat, number>)[options.format]);
    const cut = Math.round(W * 0.09);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, photoH - cut);
    ctx.lineTo(0, photoH);
    ctx.closePath();
    ctx.clip();
    if (photo) drawCover(ctx, photo, 0, 0, W, photoH, fx, fy, zoom);
    else drawFallbackBackground(ctx, W, photoH, theme, input.brand);
    const g = ctx.createLinearGradient(0, photoH * 0.45, 0, photoH);
    g.addColorStop(0, alpha(theme.bg, 0));
    g.addColorStop(1, alpha(theme.bg, 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, photoH);
    ctx.restore();
    // faixa de destaque acompanhando o corte
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.moveTo(0, photoH);
    ctx.lineTo(W, photoH - cut);
    ctx.lineTo(W, photoH - cut + 16);
    ctx.lineTo(0, photoH + 16);
    ctx.closePath();
    ctx.fill();

    const inner = W - 2 * M;
    const leftW = Math.round(inner * 0.57);
    const rightX = M + Math.round(inner * 0.62);
    const rightW = W - M - rightX;
    const RIGHT = ["price", "incluso", "badge"];
    const left = buildBlocks({ ctx, x: M, w: leftW, input, text: theme.text, muted: theme.muted }).filter((b) => !RIGHT.includes(b.key));
    const right = buildBlocks({ ctx, x: rightX, w: rightW, input, text: theme.text, muted: theme.muted }).filter((b) => RIGHT.includes(b.key));
    const top = photoH + 46;
    const available = footerY - top - 24;
    const res = layoutGroups(right.length ? [left, right] : [left], available, story ? 1.2 : 1);
    res.lists.forEach((list, i) => {
      const extra = Math.min(story ? 60 : 30, Math.max(0, (available - res.heights[i]) / Math.max(1, list.length - 1)));
      // a coluna da direita começa na altura da pílula "NOVA TURMA"
      drawColumn(list, res.s, top + (i === 1 ? Math.min(available - res.heights[i], 80 * res.s) : 0), i === 0 ? extra : Math.min(extra, 24));
    });
  } else if (options.layout === "cartao") {
    if (photo) drawCover(ctx, photo, 0, 0, W, H, fx, fy, zoom);
    else drawFallbackBackground(ctx, W, H, theme, input.brand);
    ctx.fillStyle = alpha("#000000", 0.18);
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, footerY - 160, 0, H);
    g.addColorStop(0, alpha(theme.bg, 0));
    g.addColorStop(1, alpha(theme.bg, 0.92));
    ctx.fillStyle = g;
    ctx.fillRect(0, footerY - 160, W, H - footerY + 160);

    const cardX = M;
    const cardW = Math.round(W * (story ? 0.74 : 0.62));
    const pad = 46;
    const cardTop = safeTop + (story ? 40 : 0);
    const cardBg = theme.light ? "#ffffff" : alpha(theme.bg, 0.94);
    const col: ColumnCtx = { ctx, x: cardX + pad, w: cardW - pad * 2, input, text: theme.text, muted: theme.muted };
    const available = footerY - cardTop - 30 - pad * 2;
    const res = layoutColumn(buildBlocks(col), available, story ? 1.1 : 1);
    const cardH = res.height + pad * 2;
    ctx.save();
    ctx.shadowColor = alpha("#000000", 0.35);
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = cardBg;
    roundRect(ctx, cardX, cardTop, cardW, cardH, 34);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = theme.accent;
    roundRect(ctx, cardX, cardTop + 40, 10, Math.min(160, cardH - 80), 5);
    ctx.fill();
    drawColumn(res.blocks, res.s, cardTop + pad, 0);
  } else {
    // destaque: foto ao fundo, texto à esquerda
    if (photo) drawCover(ctx, photo, 0, 0, W, H, fx, fy, zoom);
    else drawFallbackBackground(ctx, W, H, theme, input.brand);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, alpha(theme.bg, 0.97));
    g.addColorStop(0.42, alpha(theme.bg, 0.9));
    g.addColorStop(0.72, alpha(theme.bg, 0.25));
    g.addColorStop(1, alpha(theme.bg, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const gb = ctx.createLinearGradient(0, footerY - 220, 0, H);
    gb.addColorStop(0, alpha(theme.bg, 0));
    gb.addColorStop(0.6, alpha(theme.bg, 0.85));
    gb.addColorStop(1, alpha(theme.bg, 1));
    ctx.fillStyle = gb;
    ctx.fillRect(0, footerY - 220, W, H - footerY + 220);
    if (story) {
      const gt = ctx.createLinearGradient(0, 0, 0, 260);
      gt.addColorStop(0, alpha(theme.bg, 0.7));
      gt.addColorStop(1, alpha(theme.bg, 0));
      ctx.fillStyle = gt;
      ctx.fillRect(0, 0, W, 260);
    }
    const colW = Math.round(W * (story ? 0.66 : 0.6));
    const col: ColumnCtx = { ctx, x: M, w: colW - M, input, text: theme.text, muted: theme.muted };
    const top = safeTop + (story ? 30 : 0);
    const available = footerY - top - 30;
    const res = layoutColumn(buildBlocks(col), available, story ? 1.2 : 1);
    const extra = Math.min(story ? 60 : 30, Math.max(0, (available - res.height) / Math.max(1, res.blocks.length - 1)));
    drawColumn(res.blocks, res.s, top, extra);
  }

  // rodapé: marca + selos; faixa zebrada nos temas escuros com verde/amarelo
  drawFooter(ctx, input, W, footerY, footerH, theme.light ? "#101410" : "#ffffff");
  if (stripes && !story) drawStripes(ctx, 0, H - 18, W, 18, theme.accent, theme.bg, 26);
  else if (!story) {
    ctx.fillStyle = theme.accent;
    ctx.fillRect(0, H - 10, W, 10);
  }
}

/** Carrega imagem para o canvas sem "sujar" a exportação (CORS). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Não foi possível carregar a imagem ${src}`));
    img.src = src;
  });
}
