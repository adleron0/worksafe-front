import React from "react";
import type { HighlightTheme } from "../highlight";

// ============================================================================
// Brilho animado dos certificados de destaque (só na tela — no PNG/PDF e no
// impresso o destaque é o selo desenhado pela API).
//
// Fica por cima da imagem, dentro de cada face do CertificateStage, e lê
// --mx/--my (0–1, posição do ponteiro) e --hover (0/1) do elemento de
// inclinação. Sem ponteiro (celular), cintila sozinho.
//
// Sobre papel branco os modos "clarear" (color-dodge/screen) não aparecem:
// o furta-cor vai em multiply com tons pastel (tinge o branco de leve) e o
// reflexo em screen (acende as áreas coloridas).
// ============================================================================

const CSS = `
.ws-holo { position:absolute; inset:0; pointer-events:none; overflow:hidden; border-radius:inherit; }
.ws-holo > i { position:absolute; inset:0; display:block; }

/* furta-cor: faixas de arco-íris que andam com o ponteiro */
.ws-holo--holografico .ws-holo__rainbow {
  inset:-60%;
  background: repeating-linear-gradient(115deg,
    hsl(330 100% 86%) 0%, hsl(40 100% 84%) 7%, hsl(95 90% 84%) 14%,
    hsl(180 90% 84%) 21%, hsl(230 100% 88%) 28%, hsl(285 95% 88%) 35%, hsl(330 100% 86%) 42%);
  mix-blend-mode: multiply;
  opacity: calc(0.22 + var(--hover, 0) * 0.23);
  transform: translate3d(calc((var(--mx, .5) - .5) * -22%), calc((var(--my, .5) - .5) * -22%), 0);
  transition: opacity .35s ease, transform .25s ease-out;
  animation: ws-holo-hue 8s linear infinite;
}
/* riscas finas de "foil" */
.ws-holo--holografico .ws-holo__foil {
  background: repeating-linear-gradient(65deg, rgba(255,255,255,0) 0 3px, rgba(140,120,255,.10) 3px 4px);
  mix-blend-mode: multiply;
  opacity: calc(0.5 + var(--hover, 0) * 0.5);
}

/* metal: uma faixa de reflexo que varre o certificado */
.ws-holo--ouro .ws-holo__band, .ws-holo--prata .ws-holo__band {
  inset:-30%;
  background: linear-gradient(115deg,
    transparent 38%, var(--ws-band-a) 46%, var(--ws-band-b) 50%, var(--ws-band-a) 54%, transparent 62%);
  mix-blend-mode: multiply;
  opacity: calc(0.45 + var(--hover, 0) * 0.25);
  transform: translate3d(calc((var(--mx, .5) - .5) * 60%), 0, 0);
  transition: transform .25s ease-out, opacity .35s ease;
  animation: ws-holo-sweep 7s ease-in-out infinite;
}
.ws-holo--ouro { --ws-band-a: rgba(255, 214, 120, .35); --ws-band-b: rgba(255, 196, 70, .55); }
.ws-holo--prata { --ws-band-a: rgba(190, 210, 235, .35); --ws-band-b: rgba(160, 185, 220, .55); }

/* reflexo de luz no ponteiro (todos os temas) */
.ws-holo__glare {
  background: radial-gradient(circle at calc(var(--mx, .5) * 100%) calc(var(--my, .5) * 100%),
    rgba(255,255,255,.75) 0%, rgba(255,255,255,.25) 18%, rgba(255,255,255,0) 45%);
  mix-blend-mode: screen;
  opacity: calc(var(--hover, 0) * .9);
  transition: opacity .35s ease;
}

@keyframes ws-holo-hue { to { filter: hue-rotate(360deg); } }
@keyframes ws-holo-sweep {
  0%, 100% { margin-left: -18%; }
  50% { margin-left: 18%; }
}
@media (prefers-reduced-motion: reduce) {
  .ws-holo * { animation: none !important; transition: none !important; }
}
`;


let injected = false;
const useHoloCss = () => {
  React.useInsertionEffect?.(() => {
    if (injected || typeof document === "undefined") return;
    const style = document.createElement("style");
    style.setAttribute("data-ws-holo", "");
    style.textContent = CSS;
    document.head.appendChild(style);
    injected = true;
  }, []);
};

export const HolographicLayer: React.FC<{ theme: HighlightTheme }> = ({ theme }) => {
  useHoloCss();
  return (
    <div className={`ws-holo ws-holo--${theme}`} aria-hidden>
      {theme === "holografico" ? (
        <>
          <i className="ws-holo__rainbow" />
          <i className="ws-holo__foil" />
        </>
      ) : (
        <i className="ws-holo__band" />
      )}
      <i className="ws-holo__glare" />
    </div>
  );
};

export default HolographicLayer;
