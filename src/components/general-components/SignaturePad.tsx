import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";

interface SignaturePadProps {
  /** Chamado a cada traço com a imagem (data URL PNG) ou null quando limpa. */
  onChange: (dataUrl: string | null) => void;
  className?: string;
  height?: number;
  disabled?: boolean;
  label?: string;
}

/**
 * Assinatura desenhada na tela, com o dedo ou o mouse (pointer events).
 * Fundo branco e traço preto, para a imagem sair legível na ficha impressa.
 */
export default function SignaturePad({ onChange, className, height = 180, disabled = false, label = "Assine dentro do quadro" }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);
  const [wiped, setWiped] = useState(false);
  /** largura (em px de tela) com que o desenho foi feito: mudanças pequenas só esticam o quadro */
  const drawnWidth = useRef(0);
  const emptyRef = useRef(true);
  emptyRef.current = empty;

  const paintBackground = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  // ajusta o tamanho real do canvas à largura do quadro (nítido em telas de alta densidade)
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = wrap.clientWidth;
      if (!width) return;
      // até 40px de diferença (barra de rolagem, teclado do celular) não apaga a assinatura
      if (drawnWidth.current && Math.abs(width - drawnWidth.current) <= 40) return;
      const hadDrawing = !emptyRef.current;
      drawnWidth.current = width;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = "100%";
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 2.2; ctx.strokeStyle = "#111111";
      }
      paintBackground(canvas);
      // redimensionar de verdade apaga o desenho: avisa para assinar de novo
      setEmpty(true); onChange(null);
      if (hadDrawing) setWiped(true);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    // o quadro pode ter esticado um pouco desde que o canvas foi medido
    const scale = drawnWidth.current && rect.width ? drawnWidth.current / rect.width : 1;
    return { x: (event.clientX - rect.left) * scale, y: event.clientY - rect.top };
  };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    setWiped(false);
    last.current = point(event);
    const ctx = event.currentTarget.getContext("2d");
    if (ctx && last.current) { ctx.beginPath(); ctx.arc(last.current.x, last.current.y, 1.1, 0, Math.PI * 2); ctx.fillStyle = "#111111"; ctx.fill(); }
  };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    event.preventDefault();
    const ctx = event.currentTarget.getContext("2d");
    const next = point(event);
    if (ctx) { ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(next.x, next.y); ctx.stroke(); }
    last.current = next;
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    setEmpty(false);
    onChange(canvasRef.current?.toDataURL("image/png") ?? null);
  };
  const clear = () => {
    if (canvasRef.current) paintBackground(canvasRef.current);
    setEmpty(true); onChange(null);
  };

  return (
    <div className={cn("grid gap-1", className)}>
      <div ref={wrapRef} className={cn("relative w-full rounded border bg-white overflow-hidden", disabled && "opacity-60")}>
        <canvas ref={canvasRef} className="block touch-none cursor-crosshair" style={{ height }} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerLeave={end} aria-label={label} />
        {empty && <span className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-neutral-400">{label}</span>}
        <span className="pointer-events-none absolute left-4 right-4 bottom-8 border-b border-dashed border-neutral-300" />
      </div>
      {wiped && <p className="text-xs text-amber-600 dark:text-amber-400">O quadro mudou de tamanho e a assinatura foi apagada. Assine de novo.</p>}
      <Button type="button" variant="ghost" size="sm" className="w-fit" disabled={disabled || empty} onClick={clear}><Icon name="eraser" className="w-3 h-3 mr-1" /> Limpar assinatura</Button>
    </div>
  );
}
