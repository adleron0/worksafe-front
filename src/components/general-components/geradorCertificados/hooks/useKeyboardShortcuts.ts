import { useEffect } from 'react';
import * as fabric from 'fabric';
import { clearFabricFontCache } from '../utils/fontLoader';
import { isTextObject } from '../types';

// ============================================================================
// useKeyboardShortcuts — Delete, Ctrl+D/B/I/U
// ============================================================================

interface KeyboardShortcutsDeps {
  canvas: fabric.Canvas | null;
  isActiveRef: React.MutableRefObject<boolean>;
  onSelectionClearedRef: React.MutableRefObject<() => void>;
  selectedShapeRef: React.MutableRefObject<fabric.Object | null>;
}

export function useKeyboardShortcuts({
  canvas,
  isActiveRef,
  onSelectionClearedRef,
  selectedShapeRef,
}: KeyboardShortcutsDeps) {
  useEffect(() => {
    if (!canvas) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActiveRef.current) return;

      // Ignorar eventos de inputs/textareas fora do canvas (ex: modais, sidebars)
      // Mas permitir o hiddenTextarea do Fabric.js (que está dentro do canvas wrapper)
      const target = e.target as HTMLElement;
      const isInsideCanvas = canvas.wrapperEl?.contains(target);
      if (!isInsideCanvas && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Prevenir defaults para atalhos Ctrl/Cmd
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'd':
          case 'b':
          case 'i':
          case 'u':
            e.preventDefault();
            e.stopPropagation();
            break;
        }
      }

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObject = canvas.getActiveObject();

        // Se texto em edição, deixar o Fabric.js tratar
        if (isTextObject(activeObject)) {
          if ((activeObject as fabric.IText).isEditing) return;
        }

        e.preventDefault();

        if (activeObject) {
          const objWithName = activeObject as fabric.Object & { name?: string };
          if (objWithName.name !== 'backgroundRect' && objWithName.name !== 'backgroundImage') {
            canvas.remove(activeObject);
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            onSelectionClearedRef.current();
            selectedShapeRef.current = null;
          }
        }
      }

      // Ctrl/Cmd + tecla
      if ((e.ctrlKey || e.metaKey) && canvas) {
        const activeObject = canvas.getActiveObject();
        if (!activeObject) return;

        switch (e.key.toLowerCase()) {
          case 'd': // Duplicar
            e.preventDefault();
            e.stopPropagation();
            activeObject.clone().then((cloned: fabric.Object) => {
              canvas.discardActiveObject();
              cloned.set({
                left: (cloned.left || 0) + 10,
                top: (cloned.top || 0) + 10,
                evented: true,
              });
              if (cloned.type === 'activeSelection') {
                (cloned as fabric.ActiveSelection).canvas = canvas;
                (cloned as fabric.ActiveSelection).forEachObject((obj: fabric.Object) => {
                  canvas.add(obj);
                });
                cloned.setCoords();
              } else {
                canvas.add(cloned);
              }
              canvas.setActiveObject(cloned);
              canvas.requestRenderAll();
            });
            break;

          case 'b': // Bold
            e.preventDefault();
            e.stopPropagation();
            if (isTextObject(activeObject)) {
              clearFabricFontCache(activeObject.fontFamily);
              const currentWeight = (activeObject.get('fontWeight') as string) || 'normal';
              activeObject.set('fontWeight', currentWeight === 'bold' ? 'normal' : 'bold');
              activeObject.dirty = true;
              activeObject._clearCache();
              activeObject.initDimensions();
              canvas.renderAll();
            }
            break;

          case 'i': // Italic
            e.preventDefault();
            e.stopPropagation();
            if (isTextObject(activeObject)) {
              const currentStyle = (activeObject.get('fontStyle') as string) || 'normal';
              activeObject.set('fontStyle', currentStyle === 'italic' ? 'normal' : 'italic');
              canvas.renderAll();
            }
            break;

          case 'u': // Underline
            e.preventDefault();
            e.stopPropagation();
            if (isTextObject(activeObject)) {
              const currentUnderline = (activeObject.get('underline') as boolean) || false;
              activeObject.set('underline', !currentUnderline);
              canvas.renderAll();
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvas, isActiveRef, onSelectionClearedRef, selectedShapeRef]);
}
