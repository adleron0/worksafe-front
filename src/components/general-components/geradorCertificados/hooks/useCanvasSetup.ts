import { useRef, useState, useEffect } from 'react';
import * as fabric from 'fabric';
import { patchFabricBoldRendering } from '../utils/fontConfig';

// Aplicar patch uma vez no carregamento do módulo
patchFabricBoldRendering();

// ============================================================================
// useCanvasSetup — Inicialização do canvas Fabric.js e background rect
// ============================================================================

const A4_WIDTH = 842;
const A4_HEIGHT = 595;
const BASE_SCALE = 0.6;

export function getA4Dimensions(orient: 'landscape' | 'portrait') {
  return {
    width: orient === 'landscape' ? A4_WIDTH : A4_HEIGHT,
    height: orient === 'landscape' ? A4_HEIGHT : A4_WIDTH,
  };
}

export function useCanvasSetup(
  canvasElRef: React.RefObject<HTMLCanvasElement | null>,
  initialOrientation: 'landscape' | 'portrait',
  initialZoom: number
): fabric.Canvas | null {
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const createdRef = useRef(false);

  useEffect(() => {
    if (!canvasElRef.current || createdRef.current) return;

    // Verificar se já existe um canvas no elemento
    const existing = canvasElRef.current.querySelector('canvas');
    if (existing && existing.classList.contains('lower-canvas')) return;

    createdRef.current = true;

    const newCanvas = new fabric.Canvas(canvasElRef.current, {
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      enableRetinaScaling: true,
      stopContextMenu: true,
      fireRightClick: true,
    });

    // Background rect (A4)
    const { width: bgWidth, height: bgHeight } = getA4Dimensions(initialOrientation);
    const bgRect = new fabric.Rect({
      left: 0,
      top: 0,
      width: bgWidth,
      height: bgHeight,
      fill: 'white',
      selectable: false,
      evented: false,
      name: 'backgroundRect',
    } as any);

    newCanvas.add(bgRect);

    // Aplicar zoom inicial
    const finalScale = BASE_SCALE * (initialZoom / 100);
    newCanvas.setZoom(finalScale);
    newCanvas.setWidth(bgWidth * finalScale);
    newCanvas.setHeight(bgHeight * finalScale);

    setCanvas(newCanvas);

    return () => {
      createdRef.current = false;
      setCanvas(null);
      try {
        newCanvas.dispose();
      } catch {
        // Ignore dispose errors
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return canvas;
}
