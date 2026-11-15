import { useId } from "react";

/**
 * Rostos dos bots, desenhados em SVG (sem imagem externa). Cada visual tem pele,
 * cabelo, roupa, cor de fundo e um acessório do cargo. Quando o bot está
 * trabalhando, ele pisca e o anel de status pulsa.
 */

export interface AvatarLook {
  label: string;
  bg: [string, string];
  skin: string;
  hair: string;
  hairStyle: "bob" | "short" | "curly" | "long" | "side" | "bun" | "buzz";
  outfit: string;
  accent: string;
  accessory?: "hardhat" | "headset" | "glasses" | "tie" | "earrings" | "glassesTie" | "earringsBlazer";
  beard?: boolean;
}

export const AVATAR_LOOKS: Record<string, AvatarLook> = {
  gestao: { label: "Executiva", bg: ["#a78bfa", "#6d28d9"], skin: "#e8b896", hair: "#3b2416", hairStyle: "bun", outfit: "#1e293b", accent: "#f5f5f4", accessory: "earringsBlazer" },
  comercial: { label: "Atendimento", bg: ["#5eead4", "#0f766e"], skin: "#c68642", hair: "#111827", hairStyle: "short", outfit: "#0f766e", accent: "#ccfbf1", accessory: "headset" },
  operacao: { label: "Campo", bg: ["#fcd34d", "#d97706"], skin: "#f1c27d", hair: "#6b3f1d", hairStyle: "buzz", outfit: "#ea580c", accent: "#fde68a", accessory: "hardhat", beard: true },
  treinamentos: { label: "Instrutora", bg: ["#6ee7b7", "#047857"], skin: "#8d5524", hair: "#1f1308", hairStyle: "curly", outfit: "#065f46", accent: "#d1fae5", accessory: "glasses" },
  marketing: { label: "Criativa", bg: ["#f9a8d4", "#be185d"], skin: "#ffdbac", hair: "#7c3aed", hairStyle: "long", outfit: "#db2777", accent: "#fce7f3", accessory: "earrings" },
  financeiro: { label: "Analista", bg: ["#93c5fd", "#1d4ed8"], skin: "#e0ac69", hair: "#6b7280", hairStyle: "side", outfit: "#1e3a8a", accent: "#e0e7ff", accessory: "glassesTie" },
  suporte: { label: "Suporte", bg: ["#fdba74", "#c2410c"], skin: "#d4a373", hair: "#2b1b10", hairStyle: "bob", outfit: "#9a3412", accent: "#ffedd5", accessory: "headset" },
  dados: { label: "Dados", bg: ["#a5b4fc", "#4338ca"], skin: "#f3d2b3", hair: "#b45309", hairStyle: "short", outfit: "#312e81", accent: "#e0e7ff", accessory: "glasses" },
};

export type BotStatus = "trabalhando" | "aguardando" | "disponivel" | "sem_chave" | "desligado";
const RING: Record<BotStatus, string> = {
  trabalhando: "#22c55e", aguardando: "#f59e0b", disponivel: "#94a3b8", sem_chave: "#ef4444", desligado: "#64748b",
};
export const STATUS_TEXT: Record<BotStatus, string> = {
  trabalhando: "Trabalhando", aguardando: "Esperando você", disponivel: "Disponível", sem_chave: "Sem chave de IA", desligado: "Desligado",
};

function Hair({ look }: { look: AvatarLook }) {
  const c = look.hair;
  switch (look.hairStyle) {
    case "bun": return <><circle cx="50" cy="16" r="9" fill={c} /><path d="M27 44 C25 22 40 15 50 15 C60 15 75 22 73 44 C70 33 62 27 50 27 C38 27 30 33 27 44 Z" fill={c} /></>;
    case "short": return <path d="M28 40 C27 22 39 16 51 16 C64 16 74 24 72 40 C69 31 61 26 50 27 C40 27 32 31 28 40 Z" fill={c} />;
    case "buzz": return <path d="M30 38 C30 25 40 19 50 19 C60 19 70 25 70 38 C66 31 59 28 50 28 C41 28 34 31 30 38 Z" fill={c} opacity="0.9" />;
    case "curly": return <g fill={c}>{[[30, 30], [38, 21], [50, 18], [62, 21], [70, 30], [26, 42], [74, 42], [34, 26], [66, 26]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="9" />)}</g>;
    case "long": return <path d="M26 46 C24 22 38 15 50 15 C62 15 76 22 74 46 L76 76 C70 78 66 74 66 66 L66 40 C60 31 40 31 34 40 L34 66 C34 74 30 78 24 76 Z" fill={c} />;
    case "side": return <path d="M28 42 C26 23 38 17 50 17 C63 17 74 23 72 40 C66 30 56 25 44 29 C38 31 32 35 28 42 Z" fill={c} />;
    case "bob": return <path d="M26 50 C23 24 38 15 50 15 C62 15 77 24 74 50 C72 56 68 58 66 56 L66 38 C58 29 42 29 34 38 L34 56 C32 58 28 56 26 50 Z" fill={c} />;
  }
}

function Accessory({ look }: { look: AvatarLook }) {
  switch (look.accessory) {
    case "hardhat":
      return <g><path d="M27 33 C27 18 38 11 50 11 C62 11 73 18 73 33 Z" fill="#facc15" stroke="#ca8a04" strokeWidth="1" /><rect x="22" y="31" width="56" height="5" rx="2.5" fill="#eab308" /><rect x="47" y="12" width="6" height="20" rx="3" fill="#fde047" /></g>;
    case "headset":
      return <g fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round"><path d="M27 44 C27 24 73 24 73 44" /><rect x="22" y="40" width="7" height="12" rx="3" fill="#111827" /><rect x="71" y="40" width="7" height="12" rx="3" fill="#111827" /><path d="M26 52 C28 62 36 64 42 63" strokeWidth="2" /><circle cx="43" cy="63" r="2.2" fill="#111827" /></g>;
    case "glasses":
      return <g fill="none" stroke="#1f2937" strokeWidth="1.8"><circle cx="41" cy="47" r="6.5" fill="rgba(255,255,255,0.15)" /><circle cx="59" cy="47" r="6.5" fill="rgba(255,255,255,0.15)" /><path d="M47.5 47 L52.5 47" /></g>;
    case "glassesTie":
      return <g><g fill="none" stroke="#1f2937" strokeWidth="1.8"><rect x="34" y="42" width="13" height="10" rx="3" /><rect x="53" y="42" width="13" height="10" rx="3" /><path d="M47 46 L53 46" /></g><path d="M50 79 L46 85 L50 97 L54 85 Z" fill="#dc2626" /></g>;
    case "earrings":
      return <g fill="#fde047"><circle cx="28" cy="58" r="2.4" /><circle cx="72" cy="58" r="2.4" /></g>;
    case "earringsBlazer":
      return <g><circle cx="28" cy="56" r="2" fill="#f5f5f4" /><circle cx="72" cy="56" r="2" fill="#f5f5f4" /><path d="M40 80 L50 92 L60 80" fill="none" stroke="#f5f5f4" strokeWidth="2.5" /></g>;
    case "tie":
      return <path d="M50 79 L46 85 L50 97 L54 85 Z" fill="#dc2626" />;
    default: return null;
  }
}

export function BotAvatar({ look: lookKey, size = 48, status, className = "" }: { look?: string | null; size?: number; status?: BotStatus; className?: string }) {
  const look = AVATAR_LOOKS[lookKey ?? ""] ?? AVATAR_LOOKS.dados;
  // id único por rosto: um SVG escondido (display: none) com o mesmo id apagaria o gradiente dos outros
  const id = `av-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const working = status === "trabalhando";
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="rounded-full" aria-hidden>
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={look.bg[0]} /><stop offset="1" stopColor={look.bg[1]} /></linearGradient>
          <clipPath id={`${id}-clip`}><circle cx="50" cy="50" r="50" /></clipPath>
        </defs>
        <g clipPath={`url(#${id}-clip)`}>
          <rect width="100" height="100" fill={`url(#${id}-bg)`} />
          <circle cx="78" cy="20" r="18" fill="#fff" opacity="0.12" />
          {/* corpo */}
          <path d="M14 104 C14 84 30 76 50 76 C70 76 86 84 86 104 Z" fill={look.outfit} />
          <path d="M42 76 L50 86 L58 76 Z" fill={look.accent} />
          <rect x="44" y="64" width="12" height="14" rx="5" fill={look.skin} />
          {/* cabelo de trás (longo) */}
          {look.hairStyle === "long" && <path d="M28 50 L26 80 L74 80 L72 50 Z" fill={look.hair} />}
          {/* rosto */}
          <ellipse cx="50" cy="46" rx="22" ry="24" fill={look.skin} />
          <ellipse cx="28.5" cy="49" rx="3.2" ry="4.5" fill={look.skin} />
          <ellipse cx="71.5" cy="49" rx="3.2" ry="4.5" fill={look.skin} />
          {look.beard && <path d="M30 52 C32 70 42 72 50 72 C58 72 68 70 70 52 C66 60 60 62 50 62 C40 62 34 60 30 52 Z" fill={look.hair} opacity="0.85" />}
          <Hair look={look} />
          {/* rosto: sobrancelhas, olhos, bochechas, boca */}
          <path d="M36 39 Q41 36 46 39" stroke="#3f2a1e" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.8" />
          <path d="M54 39 Q59 36 64 39" stroke="#3f2a1e" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.8" />
          <g className={working ? "bot-blink" : ""} style={{ transformOrigin: "50px 47px" }}>
            <ellipse cx="41" cy="47" rx="2.8" ry="3.3" fill="#1f2937" />
            <ellipse cx="59" cy="47" rx="2.8" ry="3.3" fill="#1f2937" />
            <circle cx="42" cy="46" r="0.9" fill="#fff" />
            <circle cx="60" cy="46" r="0.9" fill="#fff" />
          </g>
          <circle cx="35" cy="55" r="3.5" fill="#fb7185" opacity="0.25" />
          <circle cx="65" cy="55" r="3.5" fill="#fb7185" opacity="0.25" />
          <path d={working ? "M43 57 Q50 63 57 57" : "M44 57 Q50 61 56 57"} stroke="#7f1d1d" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <Accessory look={look} />
        </g>
      </svg>
      {status && (
        <span
          className={`absolute bottom-0 right-0 block rounded-full border-2 border-background ${working ? "bot-pulse" : ""}`}
          style={{ width: Math.max(10, size * 0.24), height: Math.max(10, size * 0.24), backgroundColor: RING[status] }}
          aria-label={STATUS_TEXT[status]}
        />
      )}
      <style>{`
        @keyframes botBlink { 0%, 92%, 100% { transform: scaleY(1) } 95% { transform: scaleY(0.1) } }
        .bot-blink { animation: botBlink 2.6s infinite; }
        @keyframes botPulse { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,.6) } 70% { box-shadow: 0 0 0 8px rgba(34,197,94,0) } 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0) } }
        .bot-pulse { animation: botPulse 1.6s infinite; }
      `}</style>
    </span>
  );
}
