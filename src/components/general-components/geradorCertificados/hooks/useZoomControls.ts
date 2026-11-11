import { useCallback, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { getA4Dimensions } from './useCanvasSetup';

// ============================================================================
// useZoomControls — Zoom via wheel, pinch e controles de UI
// ============================================================================

const MIN_ZOOM_PERCENT = 30;
const MAX_ZOOM_PERCENT = 300;
const BASE_SCALE = 0.6;

interface ZoomControlsDeps {
  canvas: fabric.Canvas | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  orientationRef: React.MutableRefObject<'landscape' | 'portrait'>;
  zoomLevelRef: React.MutableRefObject<number>;
  isEditingTextRef: React.MutableRefObject<boolean>;
  onZoomChangeRef: React.MutableRefObject<(zoom: number) => void>;
}

export function useZoomControls({
  canvas,
  containerRef,
  orientationRef,
  zoomLevelRef,
  isEditingTextRef,
  onZoomChangeRef,
}: ZoomControlsDeps) {
  const pointerCache = useRef<PointerEvent[]>([]);
  const prevPinchDistance = useRef(0);

  const applyZoom = useCallback(
    (newZoomPercent: number) => {
      if (!canvas) return;

      const clampedZoom = Math.max(MIN_ZOOM_PERCENT, Math.min(MAX_ZOOM_PERCENT, Math.round(newZoomPercent)));
      const finalScale = BASE_SCALE * (clampedZoom / 100);
      const oldScale = canvas.getZoom();
      const { width: baseWidth, height: baseHeight } = getA4Dimensions(orientationRef.current);

      // Ponto de foco: objeto selecionado (se houver)
      const activeObject = canvas.getActiveObject();
      let focusPoint: { x: number; y: number } | null = null;
      if (activeObject && containerRef.current) {
        const objCenter = activeObject.getCenterPoint();
        focusPoint = { x: objCenter.x * oldScale, y: objCenter.y * oldScale };
      }

      canvas.setZoom(finalScale);
      canvas.setWidth(baseWidth * finalScale);
      canvas.setHeight(baseHeight * finalScale);

      // Atualizar background rect
      const bgRect = canvas.getObjects().find((obj) => (obj as any).name === 'backgroundRect');
      if (bgRect) {
        bgRect.set({ width: baseWidth, height: baseHeight, scaleX: 1, scaleY: 1 });
        bgRect.setCoords();
      }

      zoomLevelRef.current = clampedZoom;
      onZoomChangeRef.current(clampedZoom);
      canvas.requestRenderAll();

      // Scroll para manter objeto visível
      const container = containerRef.current;
      if (focusPoint && container && activeObject && !isEditingTextRef.current) {
        requestAnimationFrame(() => {
          if (isEditingTextRef.current) return;
          const objCenter = activeObject.getCenterPoint();
          const newObjX = objCenter.x * finalScale;
          const newObjY = objCenter.y * finalScale;
          const containerRect = container.getBoundingClientRect();
          container.scrollTo({
            left: Math.max(0, newObjX - containerRect.width / 2 + 40),
            top: Math.max(0, newObjY - containerRect.height / 2 + 40),
            behavior: 'smooth',
          });
        });
      }
    },
    [canvas, containerRef, orientationRef, zoomLevelRef, isEditingTextRef, onZoomChangeRef]
  );

  // Mouse wheel zoom
  useEffect(() => {
    if (!canvas) return;

    const handleWheel = (opt: fabric.TEvent<WheelEvent>) => {
      const e = opt.e;
      // ctrlKey === true indica pinch no trackpad (sintetizado pelo browser)
      // Scroll normal (dois dedos) não deve dar zoom — apenas rolar o container
      if (!e.ctrlKey) return;
      e.preventDefault();
      e.stopPropagation();
      const delta = -e.deltaY * 2;
      applyZoom(zoomLevelRef.current + delta);
    };

    canvas.on('mouse:wheel', handleWheel);
    return () => {
      canvas.off('mouse:wheel', handleWheel);
    };
  }, [canvas, applyZoom, zoomLevelRef]);

  // Pinch zoom (pointer events)
  useEffect(() => {
    if (!canvas) return;
    const upperCanvas = canvas.upperCanvasEl;
    if (!upperCanvas) return;

    const handlePointerDown = (e: PointerEvent) => {
      pointerCache.current.push(e);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const index = pointerCache.current.findIndex((p) => p.pointerId === e.pointerId);
      if (index !== -1) pointerCache.current[index] = e;

      if (pointerCache.current.length === 2) {
        const [p1, p2] = pointerCache.current;
        const distance = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
        if (prevPinchDistance.current > 0) {
          const delta = (distance - prevPinchDistance.current) * 0.5;
          applyZoom(zoomLevelRef.current + delta);
        }
        prevPinchDistance.current = distance;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      pointerCache.current = pointerCache.current.filter((p) => p.pointerId !== e.pointerId);
      if (pointerCache.current.length < 2) prevPinchDistance.current = 0;
    };

    upperCanvas.addEventListener('pointerdown', handlePointerDown);
    upperCanvas.addEventListener('pointermove', handlePointerMove);
    upperCanvas.addEventListener('pointerup', handlePointerUp);
    upperCanvas.addEventListener('pointercancel', handlePointerUp);
    upperCanvas.addEventListener('pointerleave', handlePointerUp);
    upperCanvas.style.touchAction = 'none';

    return () => {
      upperCanvas.removeEventListener('pointerdown', handlePointerDown);
      upperCanvas.removeEventListener('pointermove', handlePointerMove);
      upperCanvas.removeEventListener('pointerup', handlePointerUp);
      upperCanvas.removeEventListener('pointercancel', handlePointerUp);
      upperCanvas.removeEventListener('pointerleave', handlePointerUp);
      pointerCache.current = [];
      prevPinchDistance.current = 0;
    };
  }, [canvas, applyZoom, zoomLevelRef]);

  return { applyZoom, MIN_ZOOM_PERCENT, MAX_ZOOM_PERCENT };
}
