import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Icon from "@/components/general-components/Icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getLogicalCanvasSize } from "../utils/fabricSetup";
import { certificateImageUrl, hasBackSide } from "./certificateRenderUrls";
import HolographicLayer from "./HolographicLayer";
import { HOLO_GLOW, type HighlightTheme } from "../highlight";

// ============================================================================
// Palco do certificado público.
//
// - Tamanho fixo: o palco não muda de tamanho; o certificado cabe inteiro nele.
// - Zoom: roda do mouse sobre o certificado (na escala 100% a roda para baixo
//   continua rolando a página), pinça no trackpad/celular e os botões.
// - Clique (ou toque) vira o certificado quando há verso; ampliado, arrastar
//   move e o clique não vira (para não virar sem querer).
// - Flutua de leve e inclina em 3D seguindo o mouse. Quem pede menos movimento
//   no sistema não vê nenhuma das duas animações.
// - A posição do ponteiro também fica em CSS (--mx/--my, 0–1) para o efeito
//   holográfico dos certificados de destaque (próxima fase).
// As imagens vêm prontas da API; ao ampliar troca para a versão de impressão.
// ============================================================================

type Side = "front" | "back";

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const HI_RES_FROM = 1.6; // acima disso carrega a imagem 4x
const PAD_WIDE = 28; // respiro em volta do cartão (px) — sobra para a flutuação
const PAD_NARROW = 12; // no celular o cartão aproveita a largura
const TOOLBAR = 60; // faixa inferior do menu (px)
const TOPBAR = 48; // faixa superior das ações (Baixar)
const STAGE_MAX_H = 720; // altura fixa do palco no desktop
const STAGE_MIN_H = 360;
const TILT_X = 6; // graus máximos de inclinação
const TILT_Y = 9;
const CLICK_SLOP = 6; // px que ainda contam como clique, não arrasto
const CLICK_MS = 450;

interface View {
  scale: number;
  x: number;
  y: number;
}

const FIT: View = { scale: 1, x: 0, y: 0 };

interface CertificateStageProps {
  certificateKey: string;
  name: string;
  fabricJsonBack?: unknown;
  canvasWidth?: number;
  canvasHeight?: number;
  version?: string | number | Date | null;
  /** Conteúdo extra no canto superior direito (ex.: botão Baixar). */
  actions?: React.ReactNode;
  /** Tema de destaque (turma especial / aluno destaque): liga o brilho. */
  highlightTheme?: HighlightTheme | null;
  onError: () => void;
}

/** Uma face do cartão: imagem de tela e, se ampliado, a de impressão por cima. */
const Face: React.FC<{
  certificateKey: string;
  side: Side;
  version?: string | number | Date | null;
  alt: string;
  hiRes: boolean;
  onError: () => void;
}> = ({ certificateKey, side, version, alt, hiRes, onError }) => {
  const [loaded, setLoaded] = useState(false);
  const [hiLoaded, setHiLoaded] = useState(false);
  const [wantHi, setWantHi] = useState(false);
  useEffect(() => {
    if (hiRes) setWantHi(true); // uma vez carregada, fica
  }, [hiRes]);

  return (
    <>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-muted" />}
      <img
        src={certificateImageUrl(certificateKey, side, version)}
        alt={alt}
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={onError}
        className={`absolute inset-0 h-full w-full select-none object-contain transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
      {wantHi && (
        <img
          src={certificateImageUrl(certificateKey, side, version, 4)}
          alt=""
          aria-hidden
          draggable={false}
          onLoad={() => setHiLoaded(true)}
          className={`absolute inset-0 h-full w-full select-none object-contain transition-opacity duration-200 ${
            hiLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </>
  );
};

/** Botão de ícone do menu, com dica (Tooltip do projeto, nunca `title`). */
const ToolButton: React.FC<{
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}> = ({ icon, label, onClick, disabled, active }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-35 ${
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <Icon name={icon} className="h-4 w-4" />
      </button>
    </TooltipTrigger>
    <TooltipContent side="top">{label}</TooltipContent>
  </Tooltip>
);

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
};

export const CertificateStage: React.FC<CertificateStageProps> = ({
  certificateKey,
  name,
  fabricJsonBack,
  canvasWidth,
  canvasHeight,
  version,
  actions,
  highlightTheme,
  onError,
}) => {
  const { width: logicalW, height: logicalH } = getLogicalCanvasSize(
    canvasWidth,
    canvasHeight,
  );
  const aspect = logicalW / logicalH;
  const twoSided = hasBackSide(fabricJsonBack);
  const top = actions ? TOPBAR : 0;
  const reducedMotion = usePrefersReducedMotion();
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    setCoarse(!!window.matchMedia?.("(pointer: coarse)").matches);
  }, []);

  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(0);
  const [viewportH, setViewportH] = useState(
    typeof window !== "undefined" ? window.innerHeight : 800,
  );
  const [fullscreen, setFullscreen] = useState(false);
  const nativeFs = useRef(false);
  const [side, setSide] = useState<Side>("front");
  const [view, setView] = useState<View>(FIT);
  const [dragging, setDragging] = useState(false);
  const [showHint, setShowHint] = useState(true);

  // --- Tamanho -----------------------------------------------------------------
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      setStageWidth(el.clientWidth);
      setViewportH(window.innerHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    // saiu da tela cheia nativa (Esc do navegador) → sai do modo expandido
    const onChange = () => {
      if (!document.fullscreenElement && nativeFs.current) {
        nativeFs.current = false;
        setFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Modo expandido: trava a rolagem da página e fecha com Esc
  useEffect(() => {
    if (!fullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  // Dica dos gestos some sozinha
  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(t);
  }, []);

  // Palco de altura fixa (não acompanha o zoom). No celular, se a largura
  // limita o cartão, encolhe para não sobrar faixa vazia em cima e embaixo.
  const PAD = stageWidth && stageWidth < 640 ? PAD_NARROW : PAD_WIDE;
  const chrome = PAD * 2 + TOOLBAR + top;
  const fixedH = Math.min(
    STAGE_MAX_H,
    Math.max(STAGE_MIN_H, viewportH - 140),
  );
  const fitByWidthH = stageWidth
    ? (stageWidth - PAD * 2) / aspect + chrome
    : fixedH;
  const stageH = fullscreen ? viewportH : Math.min(fixedH, fitByWidthH);
  const maxCardW = Math.max(0, stageWidth - PAD * 2);
  const maxCardH = Math.max(0, stageH - chrome);
  const cardW = Math.max(0, Math.min(maxCardW, maxCardH * aspect));
  const cardH = cardW / aspect;

  // altura que o palco ocupava na página (para não pular conteúdo ao expandir)
  const inlineHeight = useRef(0);
  if (!fullscreen && stageWidth) inlineHeight.current = stageH;

  // --- Zoom e arrastar --------------------------------------------------------
  const clamp = useCallback(
    (v: View): View => {
      const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.scale));
      if (scale <= 1.001) return FIT;
      // pode arrastar até a borda do cartão ampliado encostar na borda do palco
      const limitX = Math.max(0, (cardW * scale - maxCardW) / 2 + PAD);
      const limitY = Math.max(0, (cardH * scale - maxCardH) / 2 + PAD);
      return {
        scale,
        x: Math.min(limitX, Math.max(-limitX, v.x)),
        y: Math.min(limitY, Math.max(-limitY, v.y)),
      };
    },
    [cardW, cardH, maxCardW, maxCardH, PAD],
  );

  /** Zoom mantendo fixo o ponto (px relativos ao centro do cartão). */
  const zoomAt = useCallback(
    (next: number, px = 0, py = 0) => {
      setView((v) => {
        const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
        const k = scale / v.scale;
        return clamp({ scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
      });
    },
    [clamp],
  );

  // reajusta ao redimensionar
  useEffect(() => {
    setView((v) => clamp(v));
  }, [clamp]);

  const centerOf = useCallback(
    (clientX: number, clientY: number) => {
      const rect = stageRef.current!.getBoundingClientRect();
      return {
        x: clientX - (rect.left + rect.width / 2),
        y: clientY - (rect.top + top + (rect.height - TOOLBAR - top) / 2),
      };
    },
    [top],
  );

  // Roda do mouse amplia/reduz sobre o certificado. Na escala 100%, rolar para
  // baixo (reduzir) não tem o que fazer: deixa a página rolar. Pinça do
  // trackpad chega como roda + Ctrl e é mais sensível.
  const viewRef = useRef(view);
  viewRef.current = view;
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest("[data-stage-control]")) return;
      const current = viewRef.current;
      const pinch = e.ctrlKey || e.metaKey;
      if (!pinch && current.scale <= 1 && e.deltaY > 0) return;
      e.preventDefault();
      setShowHint(false);
      const factor = Math.exp(-e.deltaY * (pinch ? 0.01 : 0.0025));
      const p = centerOf(e.clientX, e.clientY);
      setView((v) => {
        const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.scale * factor));
        const k = scale / v.scale;
        return clamp({ scale, x: p.x - (p.x - v.x) * k, y: p.y - (p.y - v.y) * k });
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clamp, centerOf]);

  // --- Inclinação 3D e posição do ponteiro (sem re-render: CSS vars) ----------
  const setTilt = useCallback(
    (clientX?: number, clientY?: number) => {
      const el = tiltRef.current;
      if (!el) return;
      if (clientX === undefined || clientY === undefined || reducedMotion) {
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
        el.style.setProperty("--mx", "0.5");
        el.style.setProperty("--my", "0.5");
        el.style.setProperty("--hover", "0");
        return;
      }
      const rect = el.getBoundingClientRect();
      const nx = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const ny = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
      el.style.setProperty("--ry", `${((nx - 0.5) * 2 * TILT_Y).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${((0.5 - ny) * 2 * TILT_X).toFixed(2)}deg`);
      el.style.setProperty("--mx", nx.toFixed(3));
      el.style.setProperty("--my", ny.toFixed(3));
      el.style.setProperty("--hover", "1");
    },
    [reducedMotion],
  );

  // --- Ponteiros: arrastar (ampliado), pinça (2 dedos) e clique (virar) -------
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    dist: number;
    scale: number;
    mid: { x: number; y: number };
    view: View;
  } | null>(null);
  const press = useRef<{ x: number; y: number; t: number; moved: boolean } | null>(
    null,
  );

  const flipTo = useCallback((next: Side) => {
    setView(FIT);
    setSide(next);
  }, []);
  const flip = useCallback(
    () => twoSided && flipTo(side === "front" ? "back" : "front"),
    [twoSided, side, flipTo],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-stage-control]")) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ponteiro que o navegador não reconhece (ex.: evento sintético)
    }
    press.current =
      pointers.current.size === 1
        ? { x: e.clientX, y: e.clientY, t: Date.now(), moved: false }
        : null;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        scale: view.scale,
        mid: centerOf((a.x + b.x) / 2, (a.y + b.y) / 2),
        view,
      };
    } else if (view.scale > 1) {
      setDragging(true);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    // mouse passando por cima (sem botão): só inclina
    if (e.pointerType === "mouse" && !pointers.current.has(e.pointerId)) {
      if (view.scale <= 1) setTilt(e.clientX, e.clientY);
      return;
    }
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const now = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, now);
    if (
      press.current &&
      Math.hypot(now.x - press.current.x, now.y - press.current.y) > CLICK_SLOP
    ) {
      press.current.moved = true;
    }
    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const g = gesture.current;
      const scale = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, g.scale * (Math.hypot(a.x - b.x, a.y - b.y) / g.dist)),
      );
      const k = scale / g.view.scale;
      const mid = centerOf((a.x + b.x) / 2, (a.y + b.y) / 2);
      setView(
        clamp({
          scale,
          x: mid.x - (g.mid.x - g.view.x) * k,
          y: mid.y - (g.mid.y - g.view.y) * k,
        }),
      );
    } else if (pointers.current.size === 1 && view.scale > 1) {
      setView((v) => clamp({ ...v, x: v.x + now.x - prev.x, y: v.y + now.y - prev.y }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const wasClick =
      e.type === "pointerup" &&
      pointers.current.size === 1 &&
      press.current &&
      !press.current.moved &&
      Date.now() - press.current.t < CLICK_MS;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
    if (pointers.current.size === 0) setDragging(false);
    press.current = null;
    // clique vira só na escala 100% (ampliado, o gesto é de arrastar)
    if (wasClick && view.scale <= 1 && twoSided) {
      setShowHint(false);
      flip();
    }
  };

  const onPointerLeave = () => setTilt();

  // ampliado não inclina
  useEffect(() => {
    if (view.scale > 1) setTilt();
  }, [view.scale, setTilt]);

  // Expande para a janela inteira (funciona em qualquer navegador, inclusive
  // iPhone e páginas embutidas) e, se permitido, pede a tela cheia nativa.
  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    setView(FIT);
    if (fullscreen) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      nativeFs.current = false;
      setFullscreen(false);
      return;
    }
    setFullscreen(true);
    el.requestFullscreen?.()
      .then(() => {
        nativeFs.current = true;
      })
      .catch(() => {
        // sem permissão: fica no modo expandido da própria página
      });
  };

  // brilho em volta do cartão nos certificados de destaque
  const glowStyle: React.CSSProperties = highlightTheme
    ? {
        boxShadow: `0 18px 40px -12px rgba(0,0,0,0.35), ${HOLO_GLOW[highlightTheme]}`,
      }
    : {};
  const zoomed = view.scale > 1;
  const hiRes = view.scale >= HI_RES_FROM;
  const animate = !reducedMotion && !zoomed && !dragging;

  return (
    <div
      style={{
        height: fullscreen ? inlineHeight.current || undefined : undefined,
      }}
    >
      <style>{`
        @keyframes ws-cert-float {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -7px, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ws-cert-float { animation: none !important; }
        }
      `}</style>
      <div
        ref={stageRef}
        className={`select-none overflow-hidden ${
          fullscreen
            ? "fixed inset-0 z-[100] bg-background"
            : "relative w-full rounded-2xl border border-border bg-gradient-to-b from-muted/30 to-muted/60"
        }`}
        style={{
          height: stageWidth ? stageH : undefined,
          aspectRatio: stageWidth ? undefined : `${aspect}`,
          touchAction: zoomed ? "none" : "pan-y",
          cursor: zoomed
            ? dragging
              ? "grabbing"
              : "grab"
            : twoSided
              ? "pointer"
              : "default",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
      >
        {/* Área do cartão */}
        <div
          className="absolute inset-x-0 flex items-center justify-center overflow-hidden"
          style={{ top, bottom: TOOLBAR, perspective: 1600 }}
        >
          {/* zoom + arrastar */}
          <div
            style={{
              width: cardW,
              height: cardH,
              transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
              transition:
                dragging || gesture.current ? "none" : "transform 160ms ease-out",
              transformStyle: "preserve-3d",
            }}
          >
            {/* flutuação */}
            <div
              className="ws-cert-float h-full w-full"
              style={{
                animation: animate
                  ? "ws-cert-float 6s ease-in-out infinite"
                  : "none",
                transformStyle: "preserve-3d",
              }}
            >
              {/* inclinação 3D seguindo o ponteiro */}
              <div
                ref={tiltRef}
                className="relative h-full w-full"
                style={
                  {
                    "--rx": "0deg",
                    "--ry": "0deg",
                    "--mx": "0.5",
                    "--my": "0.5",
                    "--hover": "0",
                    transform: "rotateX(var(--rx)) rotateY(var(--ry))",
                    transition: "transform 220ms ease-out",
                    transformStyle: "preserve-3d",
                  } as React.CSSProperties
                }
              >
                {/* frente/verso */}
                <div
                  className="relative h-full w-full"
                  style={{
                    transformStyle: "preserve-3d",
                    transition: reducedMotion
                      ? "none"
                      : "transform 700ms cubic-bezier(.3,.1,.2,1)",
                    transform: side === "back" ? "rotateY(180deg)" : "none",
                  }}
                >
                  <div
                    className="absolute inset-0 overflow-hidden rounded-sm bg-white shadow-[0_18px_40px_-12px_rgba(0,0,0,0.35)]"
                    style={{ backfaceVisibility: "hidden", ...glowStyle }}
                  >
                    <Face
                      certificateKey={certificateKey}
                      side="front"
                      version={version}
                      alt={`${name} — frente`}
                      hiRes={hiRes && side === "front"}
                      onError={onError}
                    />
                    {highlightTheme && <HolographicLayer theme={highlightTheme} />}
                  </div>
                  {twoSided && (
                    <div
                      className="absolute inset-0 overflow-hidden rounded-sm bg-white shadow-[0_18px_40px_-12px_rgba(0,0,0,0.35)]"
                      style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                        ...glowStyle,
                      }}
                    >
                      <Face
                        certificateKey={certificateKey}
                        side="back"
                        version={version}
                        alt={`${name} — verso`}
                        hiRes={hiRes && side === "back"}
                        onError={onError}
                      />
                      {highlightTheme && <HolographicLayer theme={highlightTheme} />}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Faixa superior: Fechar (expandido) e ações */}
        {(actions || fullscreen) && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 px-3 [&>*]:pointer-events-auto"
            style={{ height: TOPBAR }}
          >
            {fullscreen ? (
              <button
                type="button"
                data-stage-control
                onClick={toggleFullscreen}
                className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
              >
                <Icon name="x" className="h-4 w-4" />
                Fechar
              </button>
            ) : (
              <span />
            )}
            <div data-stage-control>{actions}</div>
          </div>
        )}

        {/* Dica dos gestos (some sozinha) */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center transition-opacity duration-500 ${
            showHint ? "opacity-100" : "opacity-0"
          }`}
          style={{ bottom: TOOLBAR + 4 }}
        >
          <span className="rounded-full bg-foreground/75 px-3 py-1 text-[11px] text-background">
            {coarse ? "Pinça para ampliar" : "Role para ampliar"}
            {twoSided ? (coarse ? " · toque para virar" : " · clique para virar") : ""}
          </span>
        </div>

        {/* Menu minimalista */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-center"
          style={{ height: TOOLBAR }}
        >
          <div
            data-stage-control
            className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-border/70 bg-card/90 p-1 shadow-sm backdrop-blur"
          >
            <ToolButton
              icon="zoom-out"
              label="Diminuir zoom"
              onClick={() => zoomAt(view.scale / 1.5, view.x, view.y)}
              disabled={!zoomed}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setView(FIT)}
                  aria-label="Ajustar à tela"
                  className="h-8 min-w-[3rem] rounded-full px-1 text-[11px] font-medium tabular-nums text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {Math.round(view.scale * 100)}%
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Ajustar à tela</TooltipContent>
            </Tooltip>
            <ToolButton
              icon="zoom-in"
              label="Aumentar zoom"
              onClick={() => zoomAt(view.scale * 1.5)}
              disabled={view.scale >= MAX_ZOOM}
            />
            {twoSided && (
              <>
                <span className="mx-1 h-5 w-px bg-border" />
                <ToolButton
                  icon="rotate-3d"
                  label={side === "front" ? "Ver o verso" : "Ver a frente"}
                  onClick={flip}
                />
                {/* indicador frente/verso */}
                <span
                  className="flex items-center gap-1 px-1.5"
                  aria-label={side === "front" ? "Frente" : "Verso"}
                >
                  {(["front", "back"] as Side[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => flipTo(s)}
                      aria-label={s === "front" ? "Frente" : "Verso"}
                      className={`h-1.5 rounded-full transition-all ${
                        side === s
                          ? "w-4 bg-primary"
                          : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70"
                      }`}
                    />
                  ))}
                </span>
              </>
            )}
            <span className="mx-1 h-5 w-px bg-border" />
            <ToolButton
              icon={fullscreen ? "minimize" : "maximize"}
              label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
              onClick={toggleFullscreen}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateStage;
