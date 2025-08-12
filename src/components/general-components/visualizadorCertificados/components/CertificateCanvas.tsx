import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Loader2 } from 'lucide-react';
import * as fabric from 'fabric';
import { CertificateCanvasProps } from '../types';

export interface CertificateCanvasRef {
  getCanvas: () => fabric.Canvas | null;
}

interface CertificateCanvasInternalProps extends CertificateCanvasProps {
  pageId: string;
  pageIndex: number;
  orientation: 'landscape' | 'portrait';
  isActive?: boolean;
}

const CertificateCanvas = forwardRef<CertificateCanvasRef, CertificateCanvasInternalProps>((props, ref) => {
  const {
    orientation,
    isLoading,
    zoom = 100,
    onCanvasReady,
    isActive = true
  } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Função para atualizar tamanho do canvas
  const updateCanvasSize = (orient: 'landscape' | 'portrait', customZoom?: number) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const baseScale = 0.6;
    const zoomScale = customZoom ? customZoom / 100 : zoomRef.current / 100;
    const finalScale = baseScale * zoomScale;
    
    const a4Width = 842;
    const a4Height = 595;

    let baseWidth: number;
    let baseHeight: number;
    
    if (orient === 'landscape') {
      baseWidth = a4Width;
      baseHeight = a4Height;
    } else {
      baseWidth = a4Height;
      baseHeight = a4Width;
    }
    
    canvas.setZoom(finalScale);
    
    canvas.setDimensions({
      width: baseWidth * finalScale,
      height: baseHeight * finalScale
    });
    
    // Atualizar background se existir
    const bgRect = canvas.getObjects().find(obj => (obj as any).name === 'backgroundRect');
    if (bgRect) {
      bgRect.set({
        width: baseWidth,
        height: baseHeight,
        scaleX: 1,
        scaleY: 1
      });
      bgRect.setCoords();
    }
    
    canvas.renderAll();
  };

  useImperativeHandle(ref, () => ({
    getCanvas: () => fabricCanvasRef.current
  }));

  // Inicializar canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        backgroundColor: '#e5e7eb',
        preserveObjectStacking: true,
        enableRetinaScaling: true,
        // Configurações para somente leitura
        selection: false,
        allowTouchScrolling: true,
        interactive: false,
        stopContextMenu: true,
        fireRightClick: false,
      });
      
      fabricCanvasRef.current = canvas;
      
      // Criar background branco padrão
      const bgRect = new fabric.Rect({
        left: 0,
        top: 0,
        width: 842, // Tamanho base A4 landscape
        height: 595,
        fill: 'white',
        selectable: false,
        evented: false,
        name: 'backgroundRect'
      });
      
      canvas.add(bgRect);
      updateCanvasSize(orientation);
      
      // Desabilitar todos os controles de interação
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'default';
      canvas.moveCursor = 'default';
      
      // Notificar que o canvas está pronto
      if (onCanvasReady) {
        onCanvasReady(canvas);
      }
      
      return () => {
        if (fabricCanvasRef.current) {
          try {
            fabricCanvasRef.current.dispose();
          } catch (error) {
            console.error('Error disposing canvas:', error);
          }
          fabricCanvasRef.current = null;
        }
      };
    }
  }, [orientation, onCanvasReady]);

  // Atualizar tamanho quando orientação ou zoom mudar
  useEffect(() => {
    updateCanvasSize(orientation, zoom);
  }, [orientation, zoom]);

  // Impedir eventos de teclado e mouse
  const handleInteractionEvents = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div 
      className={`flex-1 min-h-0 border rounded-lg bg-gray-100 dark:bg-gray-800 p-4 overflow-auto relative ${
        !isActive ? 'opacity-0 pointer-events-none absolute inset-0' : ''
      }`}
      data-page-active={isActive}
      onContextMenu={handleInteractionEvents}
      onKeyDown={handleInteractionEvents}
      onKeyUp={handleInteractionEvents}
      onKeyPress={handleInteractionEvents}
    >
      <div className="w-full h-full flex items-center justify-center">
        <div className="relative">
          <canvas 
            ref={canvasRef}
            style={{ 
              maxWidth: 'none', 
              maxHeight: 'none',
              position: 'relative',
              zIndex: 10,
              pointerEvents: 'none' // Desabilitar todos os eventos de mouse
            }}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg">
              <div className="bg-white p-3 rounded-lg shadow-lg">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

CertificateCanvas.displayName = 'CertificateCanvas';

export default CertificateCanvas;