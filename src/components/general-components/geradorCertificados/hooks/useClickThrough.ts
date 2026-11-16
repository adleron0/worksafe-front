import { useEffect } from 'react';
import * as fabric from 'fabric';

/**
 * Clique que "atravessa":
 * - elementos grandes (moldura, faixas, fundo) só são pegos onde há desenho —
 *   clicar na área transparente deles seleciona o que está por baixo;
 * - Alt + clique seleciona o próximo elemento abaixo do ponto clicado (repita
 *   para descer na pilha).
 *
 * Nada disso vai para o JSON salvo (perPixelTargetFind não é serializado).
 */
export function useClickThrough(canvas: fabric.Canvas | null) {
  useEffect(() => {
    if (!canvas) return;
    canvas.targetFindTolerance = 4;

    const pageArea = () => {
      const z = canvas.getZoom() || 1;
      return (canvas.getWidth() / z) * (canvas.getHeight() / z);
    };
    const markLarge = (o: fabric.Object) => {
      const area = (o.width || 0) * (o.scaleX || 1) * (o.height || 0) * (o.scaleY || 1);
      o.perPixelTargetFind = area >= pageArea() * 0.35;
    };
    canvas.getObjects().forEach(markLarge);
    const onAdded = (e: { target: fabric.Object }) => e.target && markLarge(e.target);
    const onModified = (e: { target: fabric.Object }) => e.target && markLarge(e.target);

    /** Elementos selecionáveis sob o ponto, de cima para baixo. */
    const stackAt = (p: fabric.Point) =>
      canvas
        .getObjects()
        .filter((o) => o.selectable !== false && o.evented !== false && o.visible !== false && o.containsPoint(p))
        .reverse();

    let downAt: { x: number; y: number } | null = null;
    const onDown = (e: { e: fabric.TPointerEvent }) => {
      const ev = e.e as MouseEvent;
      downAt = ev.altKey ? { x: ev.clientX, y: ev.clientY } : null;
    };
    const onUp = (e: { e: fabric.TPointerEvent }) => {
      const ev = e.e as MouseEvent;
      if (!downAt || !ev.altKey) return;
      const moved = Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > 4;
      downAt = null;
      if (moved) return;
      const p = canvas.getScenePoint(ev);
      const stack = stackAt(p);
      if (stack.length < 2) return;
      const current = canvas.getActiveObject();
      const i = current ? stack.indexOf(current) : -1;
      const next = stack[(i + 1) % stack.length];
      canvas.setActiveObject(next);
      canvas.requestRenderAll();
    };

    canvas.on('object:added', onAdded as never);
    canvas.on('object:modified', onModified as never);
    canvas.on('mouse:down', onDown as never);
    canvas.on('mouse:up', onUp as never);
    return () => {
      canvas.off('object:added', onAdded as never);
      canvas.off('object:modified', onModified as never);
      canvas.off('mouse:down', onDown as never);
      canvas.off('mouse:up', onUp as never);
    };
  }, [canvas]);
}

/** Seleciona o elemento logo abaixo do selecionado, no ponto central dele. */
export function selectBelow(canvas: fabric.Canvas) {
  const current = canvas.getActiveObject();
  if (!current) return false;
  const p = current.getCenterPoint();
  const stack = canvas
    .getObjects()
    .filter((o) => o.selectable !== false && o.evented !== false && o.visible !== false && o.containsPoint(p))
    .reverse();
  const i = stack.indexOf(current);
  const next = stack[i + 1];
  if (!next) return false;
  canvas.setActiveObject(next);
  canvas.requestRenderAll();
  return true;
}
