import { useEffect, useRef, useState } from "react";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";

/**
 * Confirmação por deslize: a pessoa arrasta a alça até o fim da trilha para
 * confirmar. Serve para ações importantes e difíceis de desfazer (concluir uma
 * OS, fechar um RDO), em que um clique errado custa caro.
 *
 * Soltar antes do fim devolve a alça ao início. Pelo teclado: com o foco na
 * alça, seta para a direita avança um quarto por vez e End vai até o fim.
 */
interface SlideConfirmProps {
  /** A instrução no meio da trilha, ex.: "Deslize para concluir". */
  label: string;
  /** Chamado quando a alça chega ao fim. Devolver `false` (validação que falhou) traz a alça de volta. */
  onConfirm: () => void | boolean;
  /** A ação está em andamento: a alça fica no fim, girando. Quando volta a `false`, a alça retorna ao início. */
  pending?: boolean;
  disabled?: boolean;
  className?: string;
}

const HANDLE = 44;
const PAD = 4;
/** Quanto do percurso conta como "chegou ao fim". */
const THRESHOLD = 0.92;

export default function SlideConfirm({ label, onConfirm, pending = false, disabled = false, className }: SlideConfirmProps) {
  const track = useRef<HTMLDivElement>(null);
  const grab = useRef(0);
  const wasPending = useRef(false);
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);

  const travel = () => Math.max(0, (track.current?.clientWidth ?? 0) - HANDLE - PAD * 2);
  const reset = () => { setDone(false); setX(0); };

  // a ação terminou sem a tela sair daqui (erro, por exemplo): a alça volta para tentar de novo
  useEffect(() => {
    if (wasPending.current && !pending) reset();
    wasPending.current = pending;
  }, [pending]);

  const commit = () => {
    setX(travel());
    setDone(true);
    if (onConfirm() === false) reset();
  };

  const down = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || done || pending) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    grab.current = event.clientX - x;
    setDragging(true);
  };
  const move = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    setX(Math.min(travel(), Math.max(0, event.clientX - grab.current)));
  };
  const up = () => {
    if (!dragging) return;
    setDragging(false);
    if (travel() > 0 && x >= travel() * THRESHOLD) commit();
    else setX(0);
  };
  const key = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || done || pending) return;
    const max = travel();
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const next = Math.min(max, x + max / 4);
      if (next >= max * THRESHOLD) commit(); else setX(next);
    } else if (event.key === "End") { event.preventDefault(); commit(); }
    else if (event.key === "ArrowLeft" || event.key === "Home" || event.key === "Escape") setX(0);
  };

  const max = travel();
  const progress = max > 0 ? x / max : 0;
  const busy = done || pending;

  return (
    <div ref={track} className={cn("relative h-[52px] w-full select-none overflow-hidden rounded-full border bg-muted", disabled && "opacity-50", className)}>
      {/* o caminho já percorrido */}
      <div className={cn("absolute inset-y-0 left-0 rounded-full bg-primary/20", !dragging && "transition-[width] duration-200")} style={{ width: x + HANDLE + PAD * 2 }} aria-hidden="true" />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center pl-12 pr-4 text-sm font-medium text-center leading-tight" style={{ opacity: busy ? 1 : Math.max(0, 1 - progress * 1.6) }}>
        {busy ? "Aguarde..." : label}
      </span>
      <button
        type="button" role="slider" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-disabled={disabled || busy}
        aria-valuetext={busy ? "Confirmado" : "Arraste até o fim para confirmar"} disabled={disabled}
        className={cn(
          "absolute top-1 left-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm outline-none touch-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          !disabled && !busy && "cursor-grab active:cursor-grabbing", !dragging && "transition-transform duration-200",
        )}
        style={{ width: HANDLE, height: HANDLE, transform: `translateX(${x}px)` }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}
      >
        <Icon name={busy ? "loader-circle" : "chevrons-right"} className={cn("w-5 h-5", busy && "animate-spin")} />
      </button>
    </div>
  );
}
