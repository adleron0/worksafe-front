import React, { useRef } from "react";
import FoilShaderLayer, { type FoilSettings } from "./FoilShaderLayer";

/**
 * Cartão leve para a vitrine de efeitos: imagem + foil + inclinação seguindo o
 * mouse (mesmas variáveis --mx/--my/--hover/--rx/--ry do CertificateStage).
 */
export const FoilPreviewCard: React.FC<{
  src: string;
  aspect: number;
  settings: FoilSettings;
  glow?: string;
  /** Vitrine: luz fixa acesa (simula o mouse por cima). */
  lit?: boolean;
}> = ({ src, aspect, settings, glow, lit }) => {
  const tiltRef = useRef<HTMLDivElement>(null);

  const move = (e: React.PointerEvent) => {
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const ny = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.style.setProperty("--mx", nx.toFixed(3));
    el.style.setProperty("--my", ny.toFixed(3));
    el.style.setProperty("--rx", `${((0.5 - ny) * 12).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${((nx - 0.5) * 16).toFixed(2)}deg`);
    el.style.setProperty("--hover", "1");
  };
  const leave = () => {
    const el = tiltRef.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--hover", "0");
  };

  return (
    <div
      style={{ perspective: 1200 }}
      onPointerMove={lit ? undefined : move}
      onPointerLeave={lit ? undefined : leave}
    >
      <div
        ref={tiltRef}
        data-ws-tilt
        className="relative w-full overflow-hidden rounded-sm bg-white"
        style={
          {
            aspectRatio: `${aspect}`,
            "--mx": lit ? "0.32" : "0.5",
            "--my": lit ? "0.3" : "0.5",
            "--rx": lit ? "4deg" : "0deg",
            "--ry": lit ? "-6deg" : "0deg",
            "--hover": lit ? "1" : "0",
            transform: "rotateX(var(--rx)) rotateY(var(--ry))",
            transition: "transform 220ms ease-out",
            boxShadow: `0 18px 40px -12px rgba(0,0,0,0.35)${glow ? `, ${glow}` : ""}`,
          } as React.CSSProperties
        }
      >
        <img src={src} alt="" draggable={false} className="absolute inset-0 h-full w-full object-contain" />
        <FoilShaderLayer src={src} settings={settings} />
      </div>
    </div>
  );
};

export default FoilPreviewCard;
