import { useState, useCallback, useRef, useEffect } from 'react';
import * as fabric from 'fabric';

// ============================================================================
// useCanvasHistory — Undo/Redo baseado em snapshots do canvas
// ============================================================================

interface HistoryEntry {
  json: string;
  timestamp: number;
}

const MAX_HISTORY_SIZE = 50;
const DEBOUNCE_MS = 300;

/**
 * Propriedades customizadas a incluir nos snapshots para preservar estado completo.
 */
const SNAPSHOT_PROPERTIES = [
  'name',
  '_originalUrl',
  'originY',
  'width',
  'splitByGrapheme',
  'selectable',
  'evented',
  'hasControls',
  'hasBorders',
  'lockMovementX',
  'lockMovementY',
  'lockScalingX',
  'lockScalingY',
  'lockRotation',
  'editable',
  'listType',
  'listIndent',
  'listItemSpacing',
  'targetHeight',
  'targetWidth',
  'placeholderNameDebug',
];

export interface CanvasHistoryAPI {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  captureState: () => void;
}

export function useCanvasHistory(canvas: fabric.Canvas | null): CanvasHistoryAPI {
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);
  const isRestoringRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef(canvas);

  // Manter ref atualizada
  useEffect(() => {
    canvasRef.current = canvas;
  }, [canvas]);

  /**
   * Captura snapshot do canvas e adiciona ao undoStack.
   */
  const captureState = useCallback(() => {
    if (isRestoringRef.current || !canvasRef.current) return;

    // Debounce para evitar snapshots excessivos durante drag/typing
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (!canvasRef.current || isRestoringRef.current) return;

      try {
        const json = JSON.stringify(
          canvasRef.current.toObject(SNAPSHOT_PROPERTIES)
        );

        setUndoStack((prev) => {
          // Evitar duplicatas consecutivas
          if (prev.length > 0 && prev[prev.length - 1].json === json) {
            return prev;
          }
          const newStack = [...prev, { json, timestamp: Date.now() }];
          // Limitar tamanho
          if (newStack.length > MAX_HISTORY_SIZE) {
            return newStack.slice(newStack.length - MAX_HISTORY_SIZE);
          }
          return newStack;
        });

        // Limpar redo stack quando nova ação é feita
        setRedoStack([]);
      } catch {
        // Erro ao serializar — ignorar
      }
    }, DEBOUNCE_MS);
  }, []);

  /**
   * Registrar listeners no canvas para captura automática.
   */
  useEffect(() => {
    if (!canvas) return;

    const handleChange = () => captureState();

    canvas.on('object:modified', handleChange);
    canvas.on('object:added', handleChange);
    canvas.on('object:removed', handleChange);

    // Capturar estado inicial
    // Pequeno delay para garantir que o canvas está pronto
    const initialTimer = setTimeout(() => captureState(), 100);

    return () => {
      canvas.off('object:modified', handleChange);
      canvas.off('object:added', handleChange);
      canvas.off('object:removed', handleChange);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      clearTimeout(initialTimer);
    };
  }, [canvas, captureState]);

  /**
   * Restaura um snapshot no canvas.
   */
  const restoreSnapshot = useCallback(
    (json: string): Promise<void> => {
      return new Promise((resolve) => {
        if (!canvasRef.current) {
          resolve();
          return;
        }

        isRestoringRef.current = true;
        const canvasInstance = canvasRef.current;

        try {
          const data = JSON.parse(json);

          // Fabric.js v6: loadFromJSON retorna Promise
          canvasInstance.loadFromJSON(data).then(() => {
            canvasInstance.renderAll();
            // Delay curto para garantir que renderização completou
            setTimeout(() => {
              isRestoringRef.current = false;
              resolve();
            }, 50);
          }).catch(() => {
            isRestoringRef.current = false;
            resolve();
          });
        } catch {
          isRestoringRef.current = false;
          resolve();
        }
      });
    },
    []
  );

  /**
   * Undo — volta ao estado anterior.
   */
  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length <= 1) return prev; // Precisa de pelo menos 2 entradas (estado atual + anterior)

      const newUndo = [...prev];
      const currentState = newUndo.pop()!;
      const previousState = newUndo[newUndo.length - 1];

      // Mover estado atual para redoStack
      setRedoStack((redoPrev) => [...redoPrev, currentState]);

      // Restaurar estado anterior
      if (previousState) {
        restoreSnapshot(previousState.json);
      }

      return newUndo;
    });
  }, [restoreSnapshot]);

  /**
   * Redo — avança para o estado seguinte.
   */
  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;

      const newRedo = [...prev];
      const nextState = newRedo.pop()!;

      // Mover para undoStack
      setUndoStack((undoPrev) => [...undoPrev, nextState]);

      // Restaurar estado
      restoreSnapshot(nextState.json);

      return newRedo;
    });
  }, [restoreSnapshot]);

  return {
    undo,
    redo,
    canUndo: undoStack.length > 1,
    canRedo: redoStack.length > 0,
    captureState,
  };
}
