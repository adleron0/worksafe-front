import { useEffect, useId, useMemo, useRef, type RefObject } from "react";

/**
 * Rostos dos bots, desenhados em SVG (sem imagem externa): uma forma macia com
 * brilho, dois traços no lugar dos olhos e um acessório do papel. Cada rosto vive
 * no seu próprio ritmo: pisca, olha em volta e inclina a cabeça sozinho, e o
 * estado muda o jeito (trabalhando lê da esquerda para a direita, esperando olha
 * para você e balança, sem chave fica sonolento e cinza).
 */

/** O rosto pronto para desenhar (montado das partes). */
export interface AvatarLook {
  /** cor do brilho e cor de fundo da forma */
  colors: [string, string];
  shape: string;
  /** olhos: centro x, centro y e meia distância entre eles */
  eyes: [number, number, number];
  lashes?: boolean;
  cheeks?: boolean;
  /** atrás da forma, por cima da forma e por cima dos olhos */
  back?: string;
  front?: string;
  over?: string;
  mood: Personality;
}

const INK = "#161616";
const HAIR_DARK = "#3B2416";
const HAIR_WARM = "#8A4F24";

function roundedPolygon(points: [number, number][], radius: number) {
  let d = "";
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[(i + n - 1) % n], b = points[i], c = points[(i + 1) % n];
    const t1 = Math.min(0.48, radius / Math.hypot(a[0] - b[0], a[1] - b[1]));
    const t2 = Math.min(0.48, radius / Math.hypot(c[0] - b[0], c[1] - b[1]));
    const s = [b[0] + (a[0] - b[0]) * t1, b[1] + (a[1] - b[1]) * t1];
    const e = [b[0] + (c[0] - b[0]) * t2, b[1] + (c[1] - b[1]) * t2];
    d += `${i ? "L" : "M"}${s[0].toFixed(1)} ${s[1].toFixed(1)}Q${b[0]} ${b[1]} ${e[0].toFixed(1)} ${e[1].toFixed(1)}`;
  }
  return `${d}Z`;
}

function curve(fn: (t: number) => [number, number], steps = 64) {
  let d = "";
  for (let i = 0; i < steps; i++) {
    const [x, y] = fn((i / steps) * Math.PI * 2);
    d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d}Z`;
}

/** quadrado de cantos bem redondos (superelipse) */
function squircle(cx: number, cy: number, a: number, b: number, n: number) {
  return curve((t) => {
    const c = Math.cos(t), s = Math.sin(t);
    return [cx + a * Math.sign(c) * Math.abs(c) ** (2 / n), cy + b * Math.sign(s) * Math.abs(s) ** (2 / n)];
  });
}

const bow = (x: number, y: number, scale: number) =>
  `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 0 C-5 -8 -14 -7 -13 0 C-14 7 -5 8 0 0Z M0 0 C5 -8 14 -7 13 0 C14 7 5 8 0 0Z" fill="#FF7AA8"/><path d="M-9 -2 C-7 -4 -5 -4 -4 -2" stroke="#fff" stroke-width="1.4" fill="none" opacity=".5" stroke-linecap="round"/><circle r="3.4" fill="#E0457F"/></g>`;

// ------------------------------------------------------------------ partes

interface ShapePart { label: string; path: string; eyes: [number, number, number]; top: number; bottom: number }
/** Formas. Os olhos, o alto e a base de cada uma servem para encaixar os acessórios. */
export const SHAPES: Record<string, ShapePart> = {
  hexa: { label: "Hexágono", eyes: [50, 60, 10], top: 22, bottom: 93, path: roundedPolygon([[50, 22], [82, 40], [82, 76], [50, 93], [18, 76], [18, 40]], 16) },
  bola: { label: "Bola", eyes: [50, 55, 10], top: 25, bottom: 91, path: curve((t) => [50 + 34 * Math.cos(t), 58 + 33 * Math.sin(t)]) },
  quadro: { label: "Quadrado", eyes: [50, 63, 10], top: 30, bottom: 92, path: squircle(50, 61, 33, 31, 4.2) },
  tri: { label: "Triângulo", eyes: [50, 64, 9], top: 30, bottom: 90, path: roundedPolygon([[50, 22], [88, 90], [12, 90]], 24) },
  flor: {
    label: "Flor", eyes: [50, 60, 10], top: 27, bottom: 93,
    path: curve((t) => { const r = 31 + 3.2 * Math.cos(5 * t + 1.2); return [50 + r * 1.05 * Math.cos(t), 60 + r * 0.95 * Math.sin(t)]; }, 90),
  },
  largo: { label: "Largo", eyes: [50, 64, 11], top: 37, bottom: 87, path: squircle(50, 62, 40, 25, 3.2) },
  ovo: { label: "Ovo", eyes: [50, 60, 9], top: 27, bottom: 93, path: curve((t) => [50 + 29 * Math.cos(t) * (1 + 0.13 * Math.sin(t)), 60 + 33 * Math.sin(t)]) },
  nuvem: {
    label: "Nuvem", eyes: [51, 58, 11], top: 26, bottom: 92,
    path: curve((t) => { const r = 33 + 2.5 * Math.sin(2 * t + 0.5) + 1.8 * Math.cos(3 * t); return [51 + r * 1.04 * Math.cos(t), 59 + r * 0.94 * Math.sin(t)]; }, 80),
  },
};

/** Cores: brilho e fundo do degradê. */
export const COLORS: Record<string, { label: string; colors: [string, string] }> = {
  roxo: { label: "Roxo", colors: ["#D9CCFF", "#8B5CF6"] },
  menta: { label: "Menta", colors: ["#9FF0D8", "#12B386"] },
  laranja: { label: "Laranja", colors: ["#FFD29A", "#F0861A"] },
  verde: { label: "Verde", colors: ["#B5F3C4", "#2DB560"] },
  rosa: { label: "Rosa", colors: ["#FFBCD7", "#E0457F"] },
  azul: { label: "Azul", colors: ["#B4D8FF", "#3A84EE"] },
  vermelho: { label: "Vermelho", colors: ["#FFB4A6", "#E5473A"] },
  cinza: { label: "Cinza", colors: ["#ECECEC", "#9C9C9C"] },
  amarelo: { label: "Amarelo", colors: ["#FFF1A6", "#E5B400"] },
  ciano: { label: "Ciano", colors: ["#A8EEF7", "#1AA7BD"] },
  marrom: { label: "Marrom", colors: ["#EBCDAE", "#9A6234"] },
  grafite: { label: "Grafite", colors: ["#AEB6C1", "#3E4652"] },
};

/**
 * Acessórios. Cada um foi desenhado sobre uma forma (ref) e se encaixa nas outras
 * pelo ponto de apoio: o alto da cabeça, os olhos ou a base.
 */
interface AccessoryPart {
  label: string; ref: string; anchor: "top" | "eyes" | "bottom"; back?: string; front?: string; over?: string;
  /** quanto desce a mais fora da forma original (o boné da Lia flutuava nas cabeças redondas) */
  sink?: number;
}
const HELENA_BUN = `<circle cx="50" cy="17" r="11" fill="${HAIR_DARK}"/><path d="M44 12 Q48 9 52 10" stroke="#fff" stroke-width="1.6" opacity=".25" fill="none" stroke-linecap="round"/>`;
const PONYTAIL = `<g class="bot-pony"><path d="M44 26 C30 20 16 30 18 50 C21 42 27 36 36 34 C26 44 26 54 30 60 C32 46 38 38 46 34Z" fill="${HAIR_WARM}"/></g>`;
const CAP = `<path d="M33 38 C33 22 41 15 50 15 C59 15 67 22 67 38Z" fill="#fff"/><path d="M40 20 Q46 16 52 16" stroke="#2DB560" stroke-width="2" fill="none" opacity=".5"/><path d="M33 37 H67 Q82 36 86 42 Q74 44 64 42 H33Z" fill="#0F6E56"/><circle cx="50" cy="16" r="2.4" fill="#0F6E56"/><path d="M41 27 H59" stroke="#2DB560" stroke-width="3" stroke-linecap="round"/>`;
export const ACCESSORIES: Record<string, AccessoryPart> = {
  nenhum: { label: "Nenhum", ref: "bola", anchor: "top" },
  coque_laco: { label: "Coque e laço", ref: "hexa", anchor: "top", back: HELENA_BUN, front: bow(50, 27, 0.85) },
  coque: { label: "Coque", ref: "hexa", anchor: "top", back: HELENA_BUN },
  laco: { label: "Laço", ref: "hexa", anchor: "top", front: bow(50, 27, 0.85) },
  bone_rabo: { label: "Boné e rabo", ref: "tri", anchor: "top", sink: 5, back: PONYTAIL, front: CAP },
  bone: { label: "Boné", ref: "tri", anchor: "top", sink: 5, front: CAP },
  rabo: { label: "Rabo de cavalo", ref: "tri", anchor: "top", sink: 5, back: PONYTAIL },
  capacete: {
    label: "Capacete", ref: "quadro", anchor: "top",
    front: `<path d="M21 36 C21 14 34 7 50 7 C66 7 79 14 79 36Z" fill="#FFE27A"/><path d="M28 30 C28 18 36 12 46 11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/><rect x="44" y="8" width="12" height="27" rx="6" fill="#FFEFA8"/><rect x="13" y="33" width="74" height="8" rx="4" fill="#F2B90F"/>`,
  },
  boina: {
    label: "Boina", ref: "flor", anchor: "top",
    front: `<g transform="rotate(-16 44 30)"><ellipse cx="44" cy="31" rx="25" ry="9" fill="#2E2A72"/><ellipse cx="38" cy="28" rx="10" ry="3" fill="#fff" opacity=".18"/><circle cx="44" cy="21" r="3.4" fill="#2E2A72"/></g>`,
  },
  gravata: {
    label: "Gravata borboleta", ref: "bola", anchor: "bottom",
    front: `<g transform="translate(50 88)"><path d="M-3 0 C-8 -6 -15 -6 -15 0 C-15 6 -8 6 -3 0Z M3 0 C8 -6 15 -6 15 0 C15 6 8 6 3 0Z" fill="#FF7A59"/><rect x="-4" y="-3.6" width="8" height="7.2" rx="3" fill="#E0532F"/></g>`,
  },
  viseira: {
    label: "Viseira", ref: "largo", anchor: "eyes",
    over: `<path d="M12 52 C24 40 76 40 88 52" fill="none" stroke="#0E6B3A" stroke-width="4" stroke-linecap="round"/><path d="M22 50 C34 40 66 40 78 50 C70 57 30 57 22 50Z" fill="#22A05A" opacity=".72"/><path d="M30 48 C40 44 52 43 60 44" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".4" fill="none"/>`,
  },
  fone: {
    label: "Fone", ref: "ovo", anchor: "eyes",
    back: `<path d="M19 64 C19 22 81 22 81 64" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>`,
    front: `<rect x="13" y="54" width="12" height="20" rx="6" fill="${INK}"/><rect x="75" y="54" width="12" height="20" rx="6" fill="${INK}"/><path d="M19 73 C20 86 30 90 39 88" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><rect x="38" y="85" width="8" height="6" rx="3" fill="${INK}"/>`,
  },
  oculos: {
    label: "Óculos", ref: "nuvem", anchor: "eyes",
    over: `<g fill="rgba(255,255,255,.22)" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"><rect x="28" y="49" width="20" height="17" rx="5"/><rect x="56" y="49" width="20" height="17" rx="5"/></g><path d="M48 55 H56" stroke="${INK}" stroke-width="3.6"/>`,
  },
};

/** Olhos: os traços em pílula, com ou sem cílios e bochechas. */
export const EYES: Record<string, { label: string; lashes: boolean; cheeks: boolean }> = {
  n: { label: "Simples", lashes: false, cheeks: false },
  c: { label: "Com cílios", lashes: true, cheeks: false },
  b: { label: "Com bochechas", lashes: false, cheeks: true },
  cb: { label: "Cílios e bochechas", lashes: true, cheeks: true },
};

/** Jeito de se mexer, que sai da personalidade de trabalho (Big Five). */
export type Personality = { speed: number; look: number; tilt: number; bounce: number; down: number };
export type Traits = [abertura: number, conscienciosidade: number, extroversao: number, amabilidade: number, estabilidade: number];

/**
 * Perfis prontos de personalidade de trabalho (os textos e o porquê vêm da API).
 * O id fica no último pedaço do rosto; traços sob medida viram "t" + 5 níveis.
 */
export const PERSONALITY_TRAITS: Record<string, Traits> = {
  equilibrado: [3, 4, 3, 3, 4],
  analitico: [3, 5, 2, 3, 5],
  criativo: [5, 3, 4, 3, 4],
  comunicativo: [3, 4, 5, 4, 4],
  executor: [2, 5, 3, 2, 5],
  acolhedor: [4, 4, 3, 5, 4],
  estrategico: [4, 5, 4, 3, 5],
};
/** jeitos antigos, só de animação */
const LEGACY_MOODS: Record<string, string> = { normal: "equilibrado", calma: "analitico", agitada: "comunicativo", curiosa: "criativo", timida: "acolhedor" };

export function traitsOf(mood: string): Traits {
  const custom = /^t([1-5])([1-5])([1-5])([1-5])([1-5])$/.exec(mood);
  if (custom) return custom.slice(1).map(Number) as Traits;
  return PERSONALITY_TRAITS[mood] ?? PERSONALITY_TRAITS[LEGACY_MOODS[mood]] ?? PERSONALITY_TRAITS.equilibrado;
}
/** id do perfil pronto com esses traços, ou "t" + níveis */
export const moodOf = (traits: Traits) => Object.entries(PERSONALITY_TRAITS).find(([, item]) => item.every((value, i) => value === traits[i]))?.[0] ?? `t${traits.join("")}`;

/** Extroversão dá a velocidade e o pulo; abertura e amabilidade, os olhares e as inclinações. No meio (3), é o jeito de sempre. */
function motionOf(traits: Traits): Personality {
  const [o, , e, a] = traits;
  return {
    speed: [1.5, 1.2, 1, 0.8, 0.6][e - 1],
    bounce: [0.6, 0.8, 1, 1.3, 1.6][e - 1],
    look: [0.6, 0.8, 1, 1.15, 1.35][o - 1],
    tilt: [0.5, 0.75, 1, 1.3, 1.6][Math.round((o + a) / 2) - 1],
    down: e <= 1 ? 2 : 0,
  };
}

export interface Face { shape: string; color: string; accessory: string; eyes: string; mood: string }

/** Os rostos de antes viraram modelos prontos (e continuam valendo pela chave). */
export const PRESETS: Record<string, Face & { label: string }> = {
  gestao: { label: "Gestora", shape: "hexa", color: "roxo", accessory: "coque_laco", eyes: "cb", mood: "equilibrado" },
  comercial: { label: "Comercial", shape: "bola", color: "menta", accessory: "gravata", eyes: "n", mood: "equilibrado" },
  operacao: { label: "Campo", shape: "quadro", color: "laranja", accessory: "capacete", eyes: "n", mood: "equilibrado" },
  treinamentos: { label: "Instrutora", shape: "tri", color: "verde", accessory: "bone_rabo", eyes: "cb", mood: "equilibrado" },
  marketing: { label: "Criativa", shape: "flor", color: "rosa", accessory: "boina", eyes: "cb", mood: "equilibrado" },
  financeiro: { label: "Financeiro", shape: "largo", color: "azul", accessory: "viseira", eyes: "n", mood: "equilibrado" },
  suporte: { label: "Suporte", shape: "ovo", color: "vermelho", accessory: "fone", eyes: "n", mood: "equilibrado" },
  dados: { label: "Dados", shape: "nuvem", color: "cinza", accessory: "oculos", eyes: "n", mood: "equilibrado" },
};

const pick = <T,>(table: Record<string, T>, id: string | undefined, fallback: string) => (id && table[id] ? id : fallback);

/** "gestao" (modelo) ou "r:forma.cor.acessorio.olhos.jeito" (montado no editor) -> partes. */
export function parseFace(value?: string | null): Face {
  const preset = PRESETS[value ?? ""];
  if (preset) { const { label: _label, ...face } = preset; return face; }
  if (value?.startsWith("r:")) {
    const [shape, color, accessory, eyes, mood] = value.slice(2).split(".");
    return { shape: pick(SHAPES, shape, "bola"), color: pick(COLORS, color, "cinza"), accessory: pick(ACCESSORIES, accessory, "nenhum"), eyes: pick(EYES, eyes, "n"), mood: mood && (PERSONALITY_TRAITS[mood] || /^t[1-5]{5}$/.test(mood)) ? mood : LEGACY_MOODS[mood ?? ""] ?? "equilibrado" };
  }
  return parseFace("dados");
}

/** Partes -> texto guardado no bot. Se for igual a um modelo, guarda a chave dele. */
export function encodeFace(face: Face): string {
  const same = Object.entries(PRESETS).find(([, p]) => p.shape === face.shape && p.color === face.color && p.accessory === face.accessory && p.eyes === face.eyes && p.mood === face.mood);
  return same ? same[0] : `r:${face.shape}.${face.color}.${face.accessory}.${face.eyes}.${face.mood}`;
}

function buildLook(face: Face): AvatarLook {
  const shape = SHAPES[face.shape];
  const acc = ACCESSORIES[face.accessory];
  const ref = SHAPES[acc.ref];
  const dx = shape.eyes[0] - ref.eyes[0];
  const dy = (acc.anchor === "top" ? shape.top - ref.top : acc.anchor === "bottom" ? shape.bottom - ref.bottom : shape.eyes[1] - ref.eyes[1]) + (face.shape === acc.ref ? 0 : acc.sink ?? 0);
  const place = (svg?: string) => (!svg ? undefined : dx || dy ? `<g transform="translate(${dx} ${dy})">${svg}</g>` : svg);
  const eyes = EYES[face.eyes];
  return {
    colors: COLORS[face.color].colors, shape: shape.path, eyes: shape.eyes, lashes: eyes.lashes, cheeks: eyes.cheeks,
    back: place(acc.back), front: place(acc.front), over: place(acc.over), mood: motionOf(traitsOf(face.mood)),
  };
}

export type BotStatus = "trabalhando" | "aguardando" | "disponivel" | "sem_chave" | "desligado";
const RING: Record<BotStatus, string> = {
  trabalhando: "#22c55e", aguardando: "#f59e0b", disponivel: "#94a3b8", sem_chave: "#ef4444", desligado: "#64748b",
};
export const STATUS_TEXT: Record<BotStatus, string> = {
  trabalhando: "Trabalhando", aguardando: "Esperando você", disponivel: "Disponível", sem_chave: "Sem chave de IA", desligado: "Desligado",
};

/** balãozinho do estado, para dar para ler mesmo parado (só nos rostos maiores; nos pequenos fica a bolinha) */
const bubble = (fill: string, ink: string, text: string) =>
  `<g transform="translate(76 0)"><circle cx="10" cy="10" r="10" fill="${fill}" stroke="#fff" stroke-width="2"/><text x="10" y="15" text-anchor="middle" font-size="14" font-weight="600" font-family="system-ui, sans-serif" fill="${ink}">${text}</text></g>`;
const BADGE: Partial<Record<BotStatus, string>> = {
  trabalhando: `<g transform="translate(68 1)"><rect width="30" height="16" rx="8" fill="#fff" stroke="#D3D1C7"/>${[8, 15, 22].map((x, i) => `<circle class="bot-dot" style="animation-delay:${i * 0.2}s" cx="${x}" cy="8" r="2.3" fill="#5F5E5A"/>`).join("")}</g>`,
  aguardando: bubble("#F59E0B", "#412402", "?"),
  sem_chave: bubble("#EF4444", "#fff", "!"),
};

type Mood = "idle" | "working" | "waiting" | "sleepy" | "off";
const MOOD: Record<BotStatus, Mood> = { trabalhando: "working", aguardando: "waiting", disponivel: "idle", sem_chave: "sleepy", desligado: "off" };

/** Olhos mudam com o estado: normais, apertados de concentração, arregalados esperando, sonolentos ou fechados. */
function eyesSvg(look: AvatarLook, mood: Mood) {
  const [cx, cy, g] = look.eyes;
  const rot = (x: number) => `transform="rotate(-10 ${x} ${cy})"`;
  const lashes = (x: number, side: number, y = cy) =>
    look.lashes ? `<g stroke="${INK}" stroke-width="2.2" stroke-linecap="round" ${rot(x)}><path d="M${x + side * 2.6} ${y - 5} l${side * 4.5} -3.2"/><path d="M${x + side * 3.4} ${y - 1} l${side * 4.8} -1"/></g>` : "";
  const eye = (x: number, side: number) => {
    switch (mood) {
      case "working": // apertados, com sobrancelha de concentração
        return `<rect x="${x - 3.6}" y="${cy - 5}" width="7.2" height="11" rx="3.6" fill="${INK}" ${rot(x)}/>${lashes(x, side, cy + 2)}<path d="M${x + side * 5.5} ${cy - 11} Q${x} ${cy - 12.5} ${x - side * 4.5} ${cy - 10.5}" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
      case "waiting": // arregalados e brilhando, sobrancelha levantada
        return `<ellipse cx="${x}" cy="${cy}" rx="5" ry="9.5" fill="${INK}" ${rot(x)}/><circle cx="${x + 1.6}" cy="${cy - 4}" r="1.9" fill="#fff"/>${lashes(x, side, cy - 2)}<path d="M${x - 5} ${cy - 15} Q${x} ${cy - 19} ${x + 5} ${cy - 15}" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
      case "sleepy": // pálpebra caída
        return `<rect x="${x - 3.6}" y="${cy}" width="7.2" height="6" rx="3" fill="${INK}" ${rot(x)}/><path d="M${x - 6} ${cy - 1} L${x + 6} ${cy - 1}" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" ${rot(x)}/>`;
      case "off": // dormindo
        return `<path d="M${x - 5.5} ${cy} Q${x} ${cy + 5.5} ${x + 5.5} ${cy}" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>` +
          (look.lashes ? `<path d="M${x + side * 5.5} ${cy} l${side * 3} 2.6" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` : "");
      default:
        return `<rect x="${x - 3.6}" y="${cy - 8}" width="7.2" height="16" rx="3.6" fill="${INK}" ${rot(x)}/>${lashes(x, side)}`;
    }
  };
  return `${eye(cx - g, -1)}${eye(cx + g, 1)}`;
}

function cheeks(look: AvatarLook) {
  if (!look.cheeks) return "";
  const [cx, cy, g] = look.eyes;
  return `<ellipse cx="${cx - g - 7}" cy="${cy + 10}" rx="5" ry="3" fill="#FF6F91" opacity=".35"/><ellipse cx="${cx + g + 7}" cy="${cy + 10}" rx="5" ry="3" fill="#FF6F91" opacity=".35"/>`;
}

const ZZZ = [0, 1, 2].map((i) => `<text class="bot-z" style="animation-delay:${i}s" x="${72 + i * 4}" y="${30 - i * 3}" font-size="${10 + i * 2}" font-weight="700" font-family="system-ui, sans-serif" fill="#64748b">z</text>`).join("");

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Vida do rosto: piscadas, olhares e inclinações sorteadas, cada rosto no seu
 * tempo, do jeito do estado e da personalidade (calma, agitada...).
 */
function useAlive(mood: Mood, p: Personality, eyes: RefObject<SVGGElement | null>, lid: RefObject<SVGGElement | null>, tilt: RefObject<SVGGElement | null>, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms: number) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
    /** espera sorteada, mais longa no jeito calmo e mais curta no agitado */
    const wait = (a: number, b: number) => rand(a, b) * p.speed;
    const setLid = (value: string) => { if (lid.current) lid.current.style.transform = value; };
    const lookAt = (x: number, y: number) => { if (eyes.current) eyes.current.style.transform = `translate(${x}px, ${y}px)`; };
    const lean = (deg: number) => { if (tilt.current) tilt.current.style.transform = deg ? `rotate(${deg}deg)` : ""; };
    setLid("");
    lookAt(0, 0);
    lean(mood === "off" ? -7 : 0);
    if (mood === "off") return () => timers.forEach(clearTimeout);

    const blink = () => {
      const slow = mood === "sleepy";
      setLid("scaleY(.08)");
      later(() => setLid(""), slow ? 420 : 120);
      if (!slow && Math.random() < 0.22) later(() => { setLid("scaleY(.08)"); later(() => setLid(""), 110); }, 260);
    };
    const blinkLoop = () => later(() => { blink(); blinkLoop(); }, mood === "sleepy" ? wait(2500, 5000) : mood === "working" ? wait(2500, 6500) : wait(1800, 5000));

    let rx = -4.5, ry = -1;
    const lookLoop = () => {
      if (mood === "idle") {
        const center = Math.random() < 0.35;
        lookAt(center ? 0 : rand(-4.5, 4.5) * p.look, center ? p.down : rand(-3, 2.5) * p.look + p.down);
        if (Math.random() < 0.3) blink();
        later(lookLoop, wait(700, 2800));
      } else if (mood === "working") {
        rx += rand(1.6, 2.6);
        if (rx > 4.5) { rx = -4.5; ry = ry >= 2 ? -1.5 : ry + 1.2; if (Math.random() < 0.3) blink(); }
        lookAt(rx, ry);
        later(lookLoop, wait(200, 380));
      } else if (mood === "waiting") {
        const up = Math.random() < 0.4;
        lookAt(up ? rand(-1.5, 1.5) * p.look : 0, up ? -3.5 + p.down : p.down);
        later(lookLoop, wait(900, 2000));
      } else {
        lookAt(rand(-1.5, 1.5), 2);
        later(lookLoop, wait(2500, 4500));
      }
    };
    let nod = false;
    const tiltLoop = () => {
      if (mood === "waiting") { lean((Math.random() < 0.5 ? -1 : 1) * rand(5, 9) * p.tilt); later(tiltLoop, wait(800, 1600)); }
      else if (mood === "idle") { lean(Math.random() < 0.5 ? rand(-6, 6) * p.tilt : 0); later(tiltLoop, wait(1500, 4500)); }
      else if (mood === "sleepy") { nod = !nod; lean(nod ? 8 : 0); later(tiltLoop, nod ? wait(1200, 2000) : wait(2500, 4000)); } // cochilando
    };

    later(blinkLoop, rand(0, 1500));
    later(lookLoop, rand(0, 1500));
    later(tiltLoop, rand(1000, 4000));
    return () => timers.forEach(clearTimeout);
  }, [mood, p, eyes, lid, tilt, enabled]);
}

/**
 * O rosto do bot. `look` é a chave de um modelo ("gestao") ou a combinação do
 * editor ("r:forma.cor.acessorio.olhos.jeito"). `still` desenha parado (miniaturas do editor).
 */
export function BotAvatar({ look: lookKey, size = 48, status, className = "", still = false }: { look?: string | null; size?: number; status?: BotStatus; className?: string; still?: boolean }) {
  const look = useMemo(() => buildLook(parseFace(lookKey)), [lookKey]);
  // id único por rosto: um SVG escondido (display: none) com o mesmo id apagaria o gradiente dos outros
  const id = `av-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const mood = MOOD[status ?? "disponivel"];
  const eyes = useRef<SVGGElement>(null);
  const lid = useRef<SVGGElement>(null);
  const tilt = useRef<SVGGElement>(null);
  useAlive(mood, look.mood, eyes, lid, tilt, !still);
  // a duração e o atraso da respiração variam por rosto, para não respirarem juntos
  const rhythm = useRef({ d: rand(3, 4.4), dl: (-rand(0, 3)).toFixed(2) }).current;

  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100" width={size} height={size} aria-hidden overflow="visible"
        className={`bot-av bot-${mood}${still ? " bot-still" : ""}`}
        style={{ ["--d" as string]: `${(rhythm.d * look.mood.speed).toFixed(2)}s`, ["--dl" as string]: `${rhythm.dl}s`, ["--k" as string]: look.mood.speed, ["--b" as string]: look.mood.bounce }}
      >
        <defs>
          <radialGradient id={`${id}-bg`} cx="30%" cy="24%" r="80%"><stop offset="0" stopColor={look.colors[0]} /><stop offset="1" stopColor={look.colors[1]} /></radialGradient>
        </defs>
        <ellipse className="bot-shadow" cx="50" cy="96" rx="24" ry="3.2" fill="#000" opacity="0.1" />
        <g ref={tilt} className="bot-tilt">
          <g className="bot-body">
            {look.back && <g dangerouslySetInnerHTML={{ __html: look.back }} />}
            <path d={look.shape} fill={`url(#${id}-bg)`} />
            <ellipse cx="36" cy="40" rx="8" ry="4.5" fill="#fff" opacity="0.22" transform="rotate(-25 36 40)" />
            {look.front && <g dangerouslySetInnerHTML={{ __html: look.front }} />}
            <g dangerouslySetInnerHTML={{ __html: cheeks(look) }} />
            <g ref={eyes} className="bot-eyes"><g ref={lid} className="bot-lid" dangerouslySetInnerHTML={{ __html: eyesSvg(look, mood) }} /></g>
            {look.over && <g dangerouslySetInnerHTML={{ __html: look.over }} />}
          </g>
        </g>
        {mood === "off" && size >= 32 && <g dangerouslySetInnerHTML={{ __html: ZZZ }} />}
        {status && size >= 40 && BADGE[status] && <g dangerouslySetInnerHTML={{ __html: BADGE[status] }} />}
      </svg>
      {status && (
        <span
          className={`absolute bottom-0 right-0 block rounded-full border-2 border-background ${mood === "working" ? "bot-pulse" : ""}`}
          style={{ width: Math.max(10, size * 0.22), height: Math.max(10, size * 0.22), backgroundColor: RING[status] }}
          aria-label={STATUS_TEXT[status]}
        />
      )}
      <style>{`
        .bot-av .bot-tilt { transform-box: view-box; transform-origin: 50px 92px; transition: transform .7s cubic-bezier(.34,1.4,.64,1); }
        .bot-av .bot-body { transform-box: view-box; transform-origin: 50px 92px; }
        .bot-av .bot-eyes { transition: transform .22s cubic-bezier(.3,1.3,.6,1); }
        .bot-av .bot-lid { transform-box: fill-box; transform-origin: center; transition: transform .07s; }
        .bot-av .bot-shadow { transform-box: fill-box; transform-origin: center; }
        .bot-av .bot-pony { transform-box: view-box; transform-origin: 44px 24px; animation: botSwing calc(2.4s * var(--k, 1)) ease-in-out infinite var(--dl, 0s); }
        .bot-idle .bot-body { animation: botBreathe var(--d, 3.4s) ease-in-out infinite var(--dl, 0s); }
        .bot-working .bot-body { animation: botBob calc(.9s * var(--k, 1)) ease-in-out infinite var(--dl, 0s); }
        .bot-working .bot-shadow { animation: botShadow calc(.9s * var(--k, 1)) ease-in-out infinite var(--dl, 0s); }
        .bot-waiting .bot-body { animation: botHey calc(2.4s * var(--k, 1)) ease-in-out infinite var(--dl, 0s); }
        .bot-sleepy .bot-tilt, .bot-sleepy .bot-shadow, .bot-off .bot-tilt, .bot-off .bot-shadow { filter: grayscale(1); opacity: .6; }
        .bot-sleepy .bot-body { animation: botBreathe calc(5s * var(--k, 1)) ease-in-out infinite var(--dl, 0s); }
        .bot-off .bot-body { animation: botSnore 3s ease-in-out infinite var(--dl, 0s); }
        .bot-av .bot-z { opacity: 0; transform-box: fill-box; animation: botZ 3s ease-out infinite; }
        @keyframes botHey { 0%, 62%, 100% { transform: translateY(0) scale(1) } 70% { transform: scale(1.05, .93) } 80% { transform: translateY(calc(-7px * var(--b, 1))) scale(.97, 1.04) } 90% { transform: scale(1.03, .97) } }
        @keyframes botSnore { 50% { transform: scale(1.05, .95) } }
        @keyframes botZ { 0% { opacity: 0; transform: translate(0, 0) } 25% { opacity: 1 } 100% { opacity: 0; transform: translate(6px, -14px) } }
        @keyframes botBreathe { 50% { transform: scale(1.025, .975) } }
        @keyframes botBob { 50% { transform: translateY(calc(-3px * var(--b, 1))) } }
        @keyframes botShadow { 50% { transform: scaleX(.9) } }
        @keyframes botSwing { 0%, 100% { transform: rotate(-5deg) } 50% { transform: rotate(7deg) } }
        @keyframes botPulse { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,.6) } 70% { box-shadow: 0 0 0 8px rgba(34,197,94,0) } 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0) } }
        .bot-pulse { animation: botPulse 1.6s infinite; }
        .bot-av .bot-dot { animation: botDots 1.2s infinite; }
        @keyframes botDots { 0%, 100% { opacity: .25 } 50% { opacity: 1 } }
        .bot-still *, .bot-still { animation: none !important; transition: none !important; }
        @media (prefers-reduced-motion: reduce) { .bot-av *, .bot-pulse { animation: none !important; transition: none !important; } }
      `}</style>
    </span>
  );
}
