import { useEffect } from 'react';
import * as fabric from 'fabric';

// ============================================================================
// useContextMenuSetup — Event listeners para menu de contexto (clique direito)
// ============================================================================

interface ContextMenuDeps {
  canvas: fabric.Canvas | null;
  onContextMenuRef: React.MutableRefObject<(e: MouseEvent, target: fabric.Object | null) => void>;
}

export function useContextMenuSetup({ canvas, onContextMenuRef }: ContextMenuDeps) {
  useEffect(() => {
    if (!canvas) return;

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();

      const mouseEvent = e as MouseEvent;
      const pointer = canvas.getPointer(mouseEvent);
      const objects = canvas.getObjects();
      let target: fabric.Object | null = null;

      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        if (obj.containsPoint(pointer) && (obj as any).name !== 'backgroundRect') {
          target = obj;
          break;
        }
      }

      if (target) {
        canvas.setActiveObject(target);
        canvas.renderAll();
      }

      onContextMenuRef.current(mouseEvent, target);
      return false;
    };

    // Attach com pequeno delay para garantir que os elementos do canvas estão prontos
    const timer = setTimeout(() => {
      if (canvas.upperCanvasEl) {
        canvas.upperCanvasEl.addEventListener('contextmenu', handleContextMenu);
      }
      if (canvas.lowerCanvasEl) {
        canvas.lowerCanvasEl.addEventListener('contextmenu', handleContextMenu);
      }
      if (canvas.wrapperEl) {
        canvas.wrapperEl.addEventListener('contextmenu', handleContextMenu);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (canvas.upperCanvasEl) {
        canvas.upperCanvasEl.removeEventListener('contextmenu', handleContextMenu);
      }
      if (canvas.lowerCanvasEl) {
        canvas.lowerCanvasEl.removeEventListener('contextmenu', handleContextMenu);
      }
      if (canvas.wrapperEl) {
        canvas.wrapperEl.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, [canvas, onContextMenuRef]);
}
