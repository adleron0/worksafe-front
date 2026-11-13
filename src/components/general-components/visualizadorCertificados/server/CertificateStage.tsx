import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Icon from "@/components/general-components/Icon";
import { getLogicalCanvasSize } from "../utils/fabricSetup";
import { certificateImageUrl, hasBackSide } from "./certificateRenderUrls";

// ============================================================================
// Palco do certificado público: mostra o certificado inteiro (sem rolagem),
// com zoom (botões, Ctrl/⌘ + roda, pinça, duplo clique) e arrastar quando
// ampliado. Com verso, o cartão gira em 3D entre frente e verso.
// As imagens vêm prontas da API; ao ampliar troca para a versão de impressão.
// ============================================================================

type Side = "front" | "back";

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const HI_RES_FROM = 1.6; // acima disso carrega a imagem 4x
const PAD = 16; // respiro em volta do cartão (px)
const TOOLBAR = 56; // altura reservada para a barra inferior (px)
const TOPBAR = 52; // faixa superior para as ações (Baixar)

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

export const CertificateStage: React.FC<CertificateStageProps> = ({
  certificateKey,
  name,
  fabricJsonBack,
  canvasWidth,
  canvasHeight,
  version,
  actions,
  onError,
}) => {
  const { width: logicalW, height: logicalH } = getLogicalCanvasSize(
    canvasWidth,
    canvasHeight,
  );
  const aspect = logicalW / logicalH;
  const twoSided = hasBackSide(fabricJsonBack);
  const top = actions ? TOPBAR : 0;

  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(0);
  const [viewportH, setViewportH] = useState(
    typeof window !== "undefined" ? window.innerHeight : 800,
  );
  const [fullscreen, setFullscreen] = useState(false);
  const nativeFs = useRef(false);
  const [side, setSide] = useState<Side>("front");
  const [view, setView] = useState<View>(FIT);
  const [dragging, setDragging] = useState(false);

  // --- Tamanho: o cartão inteiro cabe na largura e na altura da tela -------
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

  // altura que o palco ocupava na página (para não pular conteúdo ao expandir)
  const inlineHeight = useRef(0);

  // Altura útil: em tela cheia, a tela toda; senão, a janela menos o menu do site
  const maxStageH = fullscreen ? viewportH : Math.max(320, viewportH - 112);
  const maxCardH = maxStageH - TOOLBAR - top - PAD * 2;
  const maxCardW = Math.max(0, stageWidth - PAD * 2);
  const cardW = Math.max(0, Math.min(maxCardW, maxCardH * aspect));
  const cardH = cardW / aspect;
  const stageH = fullscreen ? viewportH : cardH + PAD * 2 + TOOLBAR + top;
  if (!fullscreen && stageWidth) inlineHeight.current = stageH;

  // --- Zoom e arrastar --------------------------------------------------------
  const clamp = useCallback(
    (v: View): View => {
      const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.scale));
      // pode arrastar até a borda do cartão ampliado encostar na borda do palco
      const limitX = Math.max(0, (cardW * scale - maxCardW) / 2 + PAD);
      const limitY = Math.max(
        0,
        (cardH * scale - (stageH - TOOLBAR - top - PAD * 2)) / 2 + PAD,
      );
      if (scale === 1) return FIT;
      return {
        scale,
        x: Math.min(limitX, Math.max(-limitX, v.x)),
        y: Math.min(limitY, Math.max(-limitY, v.y)),
      };
    },
    [cardW, cardH, maxCardW, stageH, top],
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

  const centerOf = (clientX: number, clientY: number) => {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      x: clientX - (rect.left + rect.width / 2),
      y: clientY - (rect.top + top + (rect.height - TOOLBAR - top) / 2),
    };
  };

  // Ctrl/⌘ + roda (e a pinça do trackpad, que chega assim) amplia; a roda
  // sozinha continua rolando a página. Listener nativo para poder preventDefault.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const p = centerOf(e.clientX, e.clientY);
      setView((v) => {
        const scale = Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, v.scale * Math.exp(-e.deltaY * 0.01)),
        );
        const k = scale / v.scale;
        return clamp({
          scale,
          x: p.x - (p.x - v.x) * k,
          y: p.y - (p.y - v.y) * k,
        });
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clamp]);

  // Ponteiros: 1 dedo/mouse arrasta (se ampliado); 2 dedos fazem pinça
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    dist: number;
    scale: number;
    mid: { x: number; y: number };
    view: View;
  } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-stage-control]")) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
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
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const now = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, now);
    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const g = gesture.current;
      const scale = Math.min(
        MAX_ZOOM,
        Math.max(
          MIN_ZOOM,
          g.scale * (Math.hypot(a.x - b.x, a.y - b.y) / g.dist),
        ),
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
      setView((v) =>
        clamp({ ...v, x: v.x + now.x - prev.x, y: v.y + now.y - prev.y }),
      );
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
    if (pointers.current.size === 0) setDragging(false);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-stage-control]")) return;
    const p = centerOf(e.clientX, e.clientY);
    if (view.scale > 1) setView(FIT);
    else zoomAt(2.5, p.x, p.y);
  };

  // --- Frente e verso ---------------------------------------------------------
  const flipTo = (next: Side) => {
    if (next === side) return;
    setView(FIT);
    setSide(next);
  };

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
  const canFullscreen = true;

  const zoomed = view.scale > 1;
  const hiRes = view.scale >= HI_RES_FROM;

  return (
    <div
      style={{
        height: fullscreen ? inlineHeight.current || undefined : undefined,
      }}
    >
      <div
        ref={stageRef}
        className={`select-none overflow-hidden ${
          fullscreen
            ? "fixed inset-0 z-[100] bg-background"
            : "relative w-full rounded-xl border border-border bg-muted/40"
        }`}
        style={{
          height: stageWidth ? stageH : undefined,
          aspectRatio: stageWidth ? undefined : `${aspect}`,
          touchAction: zoomed ? "none" : "pan-y",
          cursor: zoomed ? (dragging ? "grabbing" : "grab") : "zoom-in",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        {/* Área do cartão (acima da barra) */}
        <div
          className="absolute inset-x-0 flex items-center justify-center overflow-hidden"
          style={{ top, bottom: TOOLBAR, perspective: 2000 }}
        >
          <div
            style={{
              width: cardW,
              height: cardH,
              transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
              transition:
                dragging || gesture.current
                  ? "none"
                  : "transform 160ms ease-out",
            }}
          >
            <div
              className="relative h-full w-full"
              style={{
                transformStyle: "preserve-3d",
                transition: "transform 600ms cubic-bezier(.4,.2,.2,1)",
                transform: side === "back" ? "rotateY(180deg)" : "none",
              }}
            >
              <div
                className="absolute inset-0 overflow-hidden rounded-sm bg-white shadow-xl"
                style={{ backfaceVisibility: "hidden" }}
              >
                <Face
                  certificateKey={certificateKey}
                  side="front"
                  version={version}
                  alt={`${name} — frente`}
                  hiRes={hiRes && side === "front"}
                  onError={onError}
                />
              </div>
              {twoSided && (
                <div
                  className="absolute inset-0 overflow-hidden rounded-sm bg-white shadow-xl"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
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
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ações extras (ex.: Baixar) */}
        {actions && (
          <div
            data-stage-control
            className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 px-3"
            style={{ height: TOPBAR }}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            {fullscreen ? (
              <button
                type="button"
                onClick={toggleFullscreen}
                className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
              >
                <Icon name="x" className="h-4 w-4" />
                Fechar
              </button>
            ) : (
              <span />
            )}
            {actions}
          </div>
        )}

        {/* Barra inferior: frente/verso + zoom */}
        <div
          data-stage-control
          className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-2 px-3"
          style={{ height: TOOLBAR }}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {twoSided && (
            <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
              {(["front", "back"] as Side[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => flipTo(s)}
                  aria-pressed={side === s}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    side === s
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "front" ? "Frente" : "Verso"}
                </button>
              ))}
              <button
                type="button"
                onClick={() => flipTo(side === "front" ? "back" : "front")}
                title="Girar certificado"
                aria-label="Girar certificado"
                className="ml-0.5 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Icon name="rotate-3d" className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-0.5 rounded-full border border-border bg-card p-1 shadow-sm">
            <button
              type="button"
              onClick={() => zoomAt(view.scale / 1.5, view.x, view.y)}
              disabled={!zoomed}
              title="Diminuir zoom"
              aria-label="Diminuir zoom"
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              <Icon name="zoom-out" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView(FIT)}
              title="Ajustar à tela"
              className="min-w-[3.25rem] rounded-full px-1 text-xs font-medium tabular-nums text-muted-foreground hover:text-foreground"
            >
              {Math.round(view.scale * 100)}%
            </button>
            <button
              type="button"
              onClick={() => zoomAt(view.scale * 1.5)}
              disabled={view.scale >= MAX_ZOOM}
              title="Aumentar zoom"
              aria-label="Aumentar zoom"
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              <Icon name="zoom-in" className="h-4 w-4" />
            </button>
            {canFullscreen && (
              <button
                type="button"
                onClick={toggleFullscreen}
                title={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
                aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
                className="ml-0.5 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Icon
                  name={fullscreen ? "minimize" : "maximize"}
                  className="h-4 w-4"
                />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateStage;
