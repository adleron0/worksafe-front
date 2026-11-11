import { useEffect } from 'react';
import * as fabric from 'fabric';
import { applyFontOverrides, needsFontOverride } from '../utils/fontConfig';
import { isTextObject } from '../types';

// ============================================================================
// useTextEditing — text:changed, text:editing:entered/exited, dblclick,
//                  lista Enter, e mouse:down para sair de edição
// ============================================================================

interface TextEditingDeps {
  canvas: fabric.Canvas | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isEditingTextRef: React.MutableRefObject<boolean>;
  onObjectSelectedRef: React.MutableRefObject<(obj: fabric.Object) => void>;
  onContextMenuRef: React.MutableRefObject<(e: MouseEvent, target: fabric.Object | null) => void>;
}

/** Salva scroll positions do container e window, restaura após o callback */
function withScrollLock(container: HTMLElement | null, fn: () => void) {
  const scrollTop = container?.scrollTop ?? 0;
  const scrollLeft = container?.scrollLeft ?? 0;
  const winX = window.scrollX;
  const winY = window.scrollY;

  fn();

  if (container) {
    container.scrollTop = scrollTop;
    container.scrollLeft = scrollLeft;
  }
  window.scrollTo(winX, winY);
}

export function useTextEditing({
  canvas,
  containerRef,
  isEditingTextRef,
  onObjectSelectedRef,
  onContextMenuRef,
}: TextEditingDeps) {
  useEffect(() => {
    if (!canvas) return;

    // --- Helpers ---
    const exitOtherTextEditing = (except?: fabric.Object) => {
      canvas.getObjects().forEach((obj) => {
        if (isTextObject(obj) && obj !== except) {
          if (obj.isEditing) obj.exitEditing();
        }
      });
    };

    // --- mouse:down — sair de edição + clique direito ---
    const handleMouseDown = (opt: any) => {
      const target = opt.target;

      if (!target) {
        exitOtherTextEditing();
      } else if (isTextObject(target)) {
        exitOtherTextEditing(target);
      }

      // Clique direito
      if ('button' in opt.e && (opt.e as MouseEvent).button === 2) {
        opt.e.preventDefault();
        opt.e.stopPropagation();
        if (target && (target as any).name !== 'backgroundRect') {
          canvas.setActiveObject(target);
          canvas.renderAll();
        }
        onContextMenuRef.current(opt.e as MouseEvent, target || null);
      }
    };

    // --- mouse:dblclick — entrar em modo de edição ---
    const handleDblClick = (opt: any) => {
      const target = opt.target;
      if (!target || (target.type !== 'i-text' && target.type !== 'textbox')) return;

      const itext = target as fabric.Textbox;
      exitOtherTextEditing(itext);

      const container = containerRef.current;
      canvas.setActiveObject(itext);

      // enterEditing() cria hiddenTextarea e foca — browser tenta scrollar
      withScrollLock(container, () => {
        itext.enterEditing();
        itext.selectAll();
      });

      // O foco TEM de ficar no hiddenTextarea: é ele que recebe a digitação.
      // Focar o wrapper do canvas (como antes) roubava o foco e a primeira
      // digitação após o duplo clique se perdia até um novo clique no texto.
      if (itext.hiddenTextarea) {
        itext.hiddenTextarea.focus({ preventScroll: true });
      }

      canvas.renderAll();
      onObjectSelectedRef.current(itext);
    };

    // --- text:changed — font overrides + atualização de listas ---
    let textChangeTimer: ReturnType<typeof setTimeout> | null = null;

    const handleTextChanged = (e: { target: fabric.Object }) => {
      const target = e.target;
      if (!target || (target.type !== 'i-text' && target.type !== 'textbox')) return;

      const textObj = target as fabric.Textbox;

      if (needsFontOverride(textObj.fontFamily)) {
        applyFontOverrides(textObj);
        canvas.renderAll();
      }

      // Reprocessar marcadores de lista
      const listTextbox = target as any;
      if (listTextbox.listType && listTextbox.listType !== 'none' && listTextbox.isEditing) {
        if (textChangeTimer) clearTimeout(textChangeTimer);

        textChangeTimer = setTimeout(() => {
          const currentPos = listTextbox.selectionStart || 0;
          const currentText = listTextbox.text || '';
          const textBeforeCursor = currentText.substring(0, currentPos);
          const linesBeforeCursor = textBeforeCursor.split('\n');
          const currentLineIndex = linesBeforeCursor.length - 1;
          const lastLine = linesBeforeCursor[linesBeforeCursor.length - 1];
          const cleanLastLine = lastLine.replace(/^[\s]*[•▸\d]+\.?\s*/, '');

          listTextbox._pendingCursorLine = currentLineIndex;
          listTextbox._pendingCursorPos = cleanLastLine.length;

          if (listTextbox.updateListProperties) {
            listTextbox.updateListProperties({});
          }
        }, 300);
      }
    };

    // --- text:editing:entered — hiddenTextarea fix + font overrides ---
    const handleEditingEntered = (e: { target: fabric.Object }) => {
      isEditingTextRef.current = true;
      const target = e.target as fabric.Textbox;
      if (!target) return;

      const container = containerRef.current;

      // FIX: Mover hiddenTextarea para canvas wrapper e forçar posição fixa
      // para evitar scroll automático do browser ao focar
      withScrollLock(container, () => {
        if (target.hiddenTextarea && canvas.lowerCanvasEl?.parentNode) {
          const textarea = target.hiddenTextarea;
          // Forçar posição fixa antes de mover (previne scroll)
          textarea.style.position = 'fixed';
          textarea.style.top = '0';
          textarea.style.left = '0';
          textarea.style.opacity = '0';
          textarea.style.zIndex = '-1000';

          if (textarea.parentNode === document.body) {
            canvas.lowerCanvasEl.parentNode.insertBefore(textarea, canvas.lowerCanvasEl.nextSibling);
          }
        }
      });

      applyFontOverrides(target);

      // Registrar listener de Enter para listas
      if (target.hiddenTextarea) {
        target.hiddenTextarea.addEventListener('keydown', handleListEnter);
      }
    };

    // --- text:editing:exited ---
    const handleEditingExited = (e: { target: fabric.Object }) => {
      isEditingTextRef.current = false;
      const target = e.target as fabric.Textbox;
      if (target?.hiddenTextarea) {
        target.hiddenTextarea.removeEventListener('keydown', handleListEnter);
      }
    };

    // --- Enter em listas ---
    const handleListEnter = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;

      const activeObject = canvas.getActiveObject();
      if (!activeObject || (activeObject.type !== 'textbox' && activeObject.type !== 'i-text')) return;

      const textObj = activeObject as fabric.Textbox;
      const listTextbox = textObj as any;
      if (!listTextbox.listType || listTextbox.listType === 'none') return;

      e.preventDefault();
      e.stopPropagation();

      const currentText = textObj.text || '';
      const selectionStart = textObj.selectionStart || 0;

      const cleanText = currentText.replace(/^[\s]*[•▸\d]+\.?\s*/gm, '');
      const cleanLines = cleanText.split('\n');

      const textBeforeCursor = currentText.substring(0, selectionStart);
      const linesBeforeCursor = textBeforeCursor.split('\n');
      const cleanLineIndex = linesBeforeCursor.length - 1;

      const lastLine = linesBeforeCursor[linesBeforeCursor.length - 1];
      const cleanLastLine = lastLine.replace(/^[\s]*[•▸\d]+\.?\s*/, '');
      const posInCleanLine = cleanLastLine.length;

      const currentCleanLine = cleanLines[cleanLineIndex] || '';

      if (currentCleanLine.trim() === '' && cleanLineIndex > 0) {
        cleanLines.splice(cleanLineIndex, 1);
        const newCleanText = cleanLines.join('\n');
        textObj.set('text', newCleanText);

        let newCursorPos = 0;
        for (let i = 0; i < cleanLineIndex; i++) {
          newCursorPos += cleanLines[i].length + 1;
        }
        textObj.setSelectionStart(Math.max(0, newCursorPos - 1));
        textObj.setSelectionEnd(Math.max(0, newCursorPos - 1));
      } else {
        const beforeLine = currentCleanLine.substring(0, posInCleanLine);
        const afterLine = currentCleanLine.substring(posInCleanLine);
        cleanLines[cleanLineIndex] = beforeLine;
        cleanLines.splice(cleanLineIndex + 1, 0, afterLine);
        const newCleanText = cleanLines.join('\n');
        textObj.set('text', newCleanText);

        if (listTextbox.updateListProperties) {
          listTextbox._pendingCursorLine = cleanLineIndex + 1;
          listTextbox._pendingCursorPos = 0;
          listTextbox.updateListProperties({});
        }
      }

      canvas.renderAll();
    };

    // --- Registrar todos os listeners ---
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:dblclick', handleDblClick);
    canvas.on('text:changed', handleTextChanged as any);
    canvas.on('text:editing:entered', handleEditingEntered as any);
    canvas.on('text:editing:exited', handleEditingExited as any);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:dblclick', handleDblClick);
      canvas.off('text:changed', handleTextChanged as any);
      canvas.off('text:editing:entered', handleEditingEntered as any);
      canvas.off('text:editing:exited', handleEditingExited as any);
      if (textChangeTimer) clearTimeout(textChangeTimer);
    };
  }, [canvas, containerRef, isEditingTextRef, onObjectSelectedRef, onContextMenuRef]);
}
