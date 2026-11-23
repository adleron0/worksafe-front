import { useEffect, useId, useRef, type RefObject } from "react";

/**
 * Rostos dos bots, desenhados em SVG (sem imagem externa): uma forma macia com
 * brilho, dois traços no lugar dos olhos e um acessório do papel. Cada rosto vive
 * no seu próprio ritmo: pisca, olha em volta e inclina a cabeça sozinho, e o
 * estado muda o jeito (trabalhando lê da esquerda para a direita, esperando olha
 * para você e balança, sem chave fica sonolento e cinza).
 */

export interface AvatarLook {
  label: string;
  /** cor do brilho e cor de fundo da forma */
  colors: [string, string];
  shape: string;
  /** olhos: centro x, centro y e meia distância entre eles */
  eyes: [number, number, number];
  /** cílios e bochechas */
  female?: boolean;
  /** atrás da forma, por cima da forma e por cima dos olhos */
  back?: string;
  front?: string;
  over?: string;
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

export const AVATAR_LOOKS: Record<string, AvatarLook> = {
  gestao: {
    label: "Gestora", colors: ["#D9CCFF", "#8B5CF6"], eyes: [50, 60, 10], female: true,
    shape: roundedPolygon([[50, 22], [82, 40], [82, 76], [50, 93], [18, 76], [18, 40]], 16),
    back: `<circle cx="50" cy="17" r="11" fill="${HAIR_DARK}"/><path d="M44 12 Q48 9 52 10" stroke="#fff" stroke-width="1.6" opacity=".25" fill="none" stroke-linecap="round"/>`,
    front: bow(50, 27, 0.85),
  },
  comercial: {
    label: "Comercial", colors: ["#9FF0D8", "#12B386"], eyes: [50, 55, 10],
    shape: curve((t) => [50 + 34 * Math.cos(t), 58 + 33 * Math.sin(t)]),
    front: `<g transform="translate(50 88)"><path d="M-3 0 C-8 -6 -15 -6 -15 0 C-15 6 -8 6 -3 0Z M3 0 C8 -6 15 -6 15 0 C15 6 8 6 3 0Z" fill="#FF7A59"/><rect x="-4" y="-3.6" width="8" height="7.2" rx="3" fill="#E0532F"/></g>`,
  },
  operacao: {
    label: "Campo", colors: ["#FFD29A", "#F0861A"], eyes: [50, 63, 10],
    shape: squircle(50, 61, 33, 31, 4.2),
    front: `<path d="M21 36 C21 14 34 7 50 7 C66 7 79 14 79 36Z" fill="#FFE27A"/><path d="M28 30 C28 18 36 12 46 11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/><rect x="44" y="8" width="12" height="27" rx="6" fill="#FFEFA8"/><rect x="13" y="33" width="74" height="8" rx="4" fill="#F2B90F"/>`,
  },
  treinamentos: {
    label: "Instrutora", colors: ["#B5F3C4", "#2DB560"], eyes: [50, 64, 9], female: true,
    shape: roundedPolygon([[50, 22], [88, 90], [12, 90]], 24),
    back: `<g class="bot-pony"><path d="M44 26 C30 20 16 30 18 50 C21 42 27 36 36 34 C26 44 26 54 30 60 C32 46 38 38 46 34Z" fill="${HAIR_WARM}"/></g>`,
    front: `<path d="M33 38 C33 22 41 15 50 15 C59 15 67 22 67 38Z" fill="#fff"/><path d="M40 20 Q46 16 52 16" stroke="#2DB560" stroke-width="2" fill="none" opacity=".5"/><path d="M33 37 H67 Q82 36 86 42 Q74 44 64 42 H33Z" fill="#0F6E56"/><circle cx="50" cy="16" r="2.4" fill="#0F6E56"/><path d="M41 27 H59" stroke="#2DB560" stroke-width="3" stroke-linecap="round"/>`,
  },
  marketing: {
    label: "Criativa", colors: ["#FFBCD7", "#E0457F"], eyes: [50, 60, 10], female: true,
    shape: curve((t) => {
      const r = 31 + 3.2 * Math.cos(5 * t + 1.2);
      return [50 + r * 1.05 * Math.cos(t), 60 + r * 0.95 * Math.sin(t)];
    }, 90),
    front: `<g transform="rotate(-16 44 30)"><ellipse cx="44" cy="31" rx="25" ry="9" fill="#2E2A72"/><ellipse cx="38" cy="28" rx="10" ry="3" fill="#fff" opacity=".18"/><circle cx="44" cy="21" r="3.4" fill="#2E2A72"/></g>`,
  },
  financeiro: {
    label: "Financeiro", colors: ["#B4D8FF", "#3A84EE"], eyes: [50, 64, 11],
    shape: squircle(50, 62, 40, 25, 3.2),
    over: `<path d="M12 52 C24 40 76 40 88 52" fill="none" stroke="#0E6B3A" stroke-width="4" stroke-linecap="round"/><path d="M22 50 C34 40 66 40 78 50 C70 57 30 57 22 50Z" fill="#22A05A" opacity=".72"/><path d="M30 48 C40 44 52 43 60 44" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".4" fill="none"/>`,
  },
  suporte: {
    label: "Suporte", colors: ["#FFB4A6", "#E5473A"], eyes: [50, 60, 9],
    shape: curve((t) => [50 + 29 * Math.cos(t) * (1 + 0.13 * Math.sin(t)), 60 + 33 * Math.sin(t)]),
    back: `<path d="M19 64 C19 22 81 22 81 64" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>`,
    front: `<rect x="13" y="54" width="12" height="20" rx="6" fill="${INK}"/><rect x="75" y="54" width="12" height="20" rx="6" fill="${INK}"/><path d="M19 73 C20 86 30 90 39 88" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><rect x="38" y="85" width="8" height="6" rx="3" fill="${INK}"/>`,
  },
  dados: {
    label: "Dados", colors: ["#ECECEC", "#9C9C9C"], eyes: [51, 58, 11],
    shape: curve((t) => {
      const r = 33 + 2.5 * Math.sin(2 * t + 0.5) + 1.8 * Math.cos(3 * t);
      return [51 + r * 1.04 * Math.cos(t), 59 + r * 0.94 * Math.sin(t)];
    }, 80),
    over: `<g fill="rgba(255,255,255,.22)" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"><rect x="28" y="49" width="20" height="17" rx="5"/><rect x="56" y="49" width="20" height="17" rx="5"/></g><path d="M48 55 H56" stroke="${INK}" stroke-width="3.6"/>`,
  },
};

export type BotStatus = "trabalhando" | "aguardando" | "disponivel" | "sem_chave" | "desligado";
const RING: Record<BotStatus, string> = {
  trabalhando: "#22c55e", aguardando: "#f59e0b", disponivel: "#94a3b8", sem_chave: "#ef4444", desligado: "#64748b",
};
export const STATUS_TEXT: Record<BotStatus, string> = {
  trabalhando: "Trabalhando", aguardando: "Esperando você", disponivel: "Disponível", sem_chave: "Sem chave de IA", desligado: "Desligado",
};

type Mood = "idle" | "working" | "waiting" | "sleepy";
const MOOD: Record<BotStatus, Mood> = { trabalhando: "working", aguardando: "waiting", disponivel: "idle", sem_chave: "sleepy", desligado: "sleepy" };

function eyesSvg(look: AvatarLook) {
  const [cx, cy, g] = look.eyes;
  const eye = (x: number, side: number) =>
    `<rect x="${x - 3.6}" y="${cy - 8}" width="7.2" height="16" rx="3.6" fill="${INK}" transform="rotate(-10 ${x} ${cy})"/>` +
    (look.female
      ? `<g stroke="${INK}" stroke-width="2.2" stroke-linecap="round" transform="rotate(-10 ${x} ${cy})"><path d="M${x + side * 2.6} ${cy - 5} l${side * 4.5} -3.2"/><path d="M${x + side * 3.4} ${cy - 1} l${side * 4.8} -1"/></g>`
      : "");
  return `${eye(cx - g, -1)}${eye(cx + g, 1)}`;
}

function cheeks(look: AvatarLook) {
  if (!look.female) return "";
  const [cx, cy, g] = look.eyes;
  return `<ellipse cx="${cx - g - 7}" cy="${cy + 10}" rx="5" ry="3" fill="#FF6F91" opacity=".35"/><ellipse cx="${cx + g + 7}" cy="${cy + 10}" rx="5" ry="3" fill="#FF6F91" opacity=".35"/>`;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Vida do rosto: piscadas, olhares e inclinações sorteadas, cada rosto no seu tempo. */
function useAlive(mood: Mood, eyes: RefObject<SVGGElement | null>, lid: RefObject<SVGGElement | null>, tilt: RefObject<SVGGElement | null>) {
  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms: number) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
    const restLid = mood === "sleepy" ? "scaleY(.5)" : "";
    const setLid = (value: string) => { if (lid.current) lid.current.style.transform = value; };
    const lookAt = (x: number, y: number) => { if (eyes.current) eyes.current.style.transform = `translate(${x}px, ${y}px)`; };
    const lean = (deg: number) => { if (tilt.current) tilt.current.style.transform = deg ? `rotate(${deg}deg)` : ""; };
    setLid(restLid);
    lookAt(0, mood === "sleepy" ? 3 : 0);
    lean(0);

    const blink = () => {
      const slow = mood === "sleepy";
      setLid("scaleY(.08)");
      later(() => setLid(restLid), slow ? 320 : 120);
      if (!slow && Math.random() < 0.22) later(() => { setLid("scaleY(.08)"); later(() => setLid(restLid), 110); }, 260);
    };
    const blinkLoop = () => later(() => { blink(); blinkLoop(); }, mood === "sleepy" ? rand(2500, 5000) : rand(1800, 5500));

    let rx = -4.5, ry = -1;
    const lookLoop = () => {
      if (mood === "idle") {
        const center = Math.random() < 0.35;
        lookAt(center ? 0 : rand(-4.5, 4.5), center ? 0 : rand(-3, 2.5));
        if (Math.random() < 0.3) blink();
        later(lookLoop, rand(700, 2800));
      } else if (mood === "working") {
        rx += rand(1.6, 2.6);
        if (rx > 4.5) { rx = -4.5; ry = ry >= 2 ? -1.5 : ry + 1.2; if (Math.random() < 0.4) blink(); }
        lookAt(rx, ry);
        later(lookLoop, rand(220, 420));
      } else if (mood === "waiting") {
        const up = Math.random() < 0.5;
        lookAt(up ? rand(-1.5, 1.5) : 0, up ? -4.2 : 0);
        later(lookLoop, rand(900, 2000));
      } else {
        lookAt(rand(-2, 2), 3);
        later(lookLoop, rand(2000, 4000));
      }
    };
    const tiltLoop = () => {
      if (mood === "waiting") { lean((Math.random() < 0.5 ? -1 : 1) * rand(5, 9)); later(tiltLoop, rand(800, 1600)); }
      else if (mood === "idle") { lean(Math.random() < 0.5 ? rand(-6, 6) : 0); later(tiltLoop, rand(1500, 4500)); }
    };

    later(blinkLoop, rand(0, 1500));
    later(lookLoop, rand(0, 1500));
    later(tiltLoop, rand(1500, 5000));
    return () => timers.forEach(clearTimeout);
  }, [mood, eyes, lid, tilt]);
}

export function BotAvatar({ look: lookKey, size = 48, status, className = "" }: { look?: string | null; size?: number; status?: BotStatus; className?: string }) {
  const look = AVATAR_LOOKS[lookKey ?? ""] ?? AVATAR_LOOKS.dados;
  // id único por rosto: um SVG escondido (display: none) com o mesmo id apagaria o gradiente dos outros
  const id = `av-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const mood = MOOD[status ?? "disponivel"];
  const eyes = useRef<SVGGElement>(null);
  const lid = useRef<SVGGElement>(null);
  const tilt = useRef<SVGGElement>(null);
  useAlive(mood, eyes, lid, tilt);
  // a duração e o atraso da respiração variam por rosto, para não respirarem juntos
  const rhythm = useRef({ d: rand(3, 4.4).toFixed(2), dl: (-rand(0, 3)).toFixed(2) }).current;

  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100" width={size} height={size} aria-hidden overflow="visible"
        className={`bot-av bot-${mood}`}
        style={{ ["--d" as string]: `${rhythm.d}s`, ["--dl" as string]: `${rhythm.dl}s` }}
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
            <g ref={eyes} className="bot-eyes"><g ref={lid} className="bot-lid" dangerouslySetInnerHTML={{ __html: eyesSvg(look) }} /></g>
            {look.over && <g dangerouslySetInnerHTML={{ __html: look.over }} />}
          </g>
        </g>
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
        .bot-av .bot-pony { transform-box: view-box; transform-origin: 44px 24px; animation: botSwing 2.4s ease-in-out infinite var(--dl, 0s); }
        .bot-idle .bot-body { animation: botBreathe var(--d, 3.4s) ease-in-out infinite var(--dl, 0s); }
        .bot-working .bot-body { animation: botBob .9s ease-in-out infinite var(--dl, 0s); }
        .bot-working .bot-shadow { animation: botShadow .9s ease-in-out infinite var(--dl, 0s); }
        .bot-sleepy { filter: grayscale(1); opacity: .6; }
        .bot-sleepy .bot-body { transform: scale(1.04, .95); }
        @keyframes botBreathe { 50% { transform: scale(1.025, .975) } }
        @keyframes botBob { 50% { transform: translateY(-3px) } }
        @keyframes botShadow { 50% { transform: scaleX(.9) } }
        @keyframes botSwing { 0%, 100% { transform: rotate(-5deg) } 50% { transform: rotate(7deg) } }
        @keyframes botPulse { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,.6) } 70% { box-shadow: 0 0 0 8px rgba(34,197,94,0) } 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0) } }
        .bot-pulse { animation: botPulse 1.6s infinite; }
        @media (prefers-reduced-motion: reduce) { .bot-av *, .bot-pulse { animation: none !important; transition: none !important; } }
      `}</style>
    </span>
  );
}
