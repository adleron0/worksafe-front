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
  showContainer?: boolean;
}

const CertificateCanvas = forwardRef<CertificateCanvasRef, CertificateCanvasInternalProps>((props, ref) => {
  const {
    orientation,
    isLoading,
    zoom = 100,
    onCanvasReady,
    isActive = true,
    showContainer = true
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
    
    // Usar diretamente o zoom fornecido (já calculado no componente pai)
    const zoomScale = customZoom ? customZoom / 100 : zoomRef.current / 100;
    const finalScale = zoomScale;
    
    
    const a4Width = 842;
    const a4Height = 595;

    let baseWidth: number;
    let baseHeight: number;
    
    // Definir dimensões baseadas na orientação
    if (orient === 'portrait') {
      baseWidth = a4Height; // 595 para portrait
      baseHeight = a4Width; // 842 para portrait
    } else {
      baseWidth = a4Width;  // 842 para landscape
      baseHeight = a4Height; // 595 para landscape
    }
    
    canvas.setZoom(finalScale);
    
    canvas.setDimensions({
      width: baseWidth * finalScale,
      height: baseHeight * finalScale
    });
    
    canvas.renderAll();
  };

  useImperativeHandle(ref, () => ({
    getCanvas: () => fabricCanvasRef.current
  }));

  // Inicializar canvas
  useEffect(() => {
    // Prevenir múltiplas inicializações
    if (fabricCanvasRef.current) {
      return;
    }
    
    
    if (canvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        backgroundColor: '#ffffff', // Fundo branco para certificados
        preserveObjectStacking: true,
        enableRetinaScaling: true,
        // Configurações para somente leitura
        selection: false,
        allowTouchScrolling: true,
        interactive: false,
        stopContextMenu: true,
        fireRightClick: false,
        renderOnAddRemove: true // Forçar renderização ao adicionar objetos
      });
      
      fabricCanvasRef.current = canvas;
      
      // Não adicionar background por enquanto para ver se os objetos aparecem
      // O background pode estar cobrindo os objetos carregados
      updateCanvasSize(orientation);
      
      // Forçar renderização inicial
      canvas.requestRenderAll();
      
      // Desabilitar todos os controles de interação
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'default';
      canvas.moveCursor = 'default';
      
      // Notificar que o canvas está pronto APÓS a criação
      
      // Pequeno delay para garantir que o canvas está totalmente pronto
      setTimeout(() => {
        if (onCanvasReady && fabricCanvasRef.current) {
          onCanvasReady(fabricCanvasRef.current);
        }
      }, 100);
      
    }
    
    // Cleanup
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
  }, []); // Remover dependências para executar apenas uma vez

  // Não precisa de useEffect separado para notificação - será feito na inicialização

  // Atualizar tamanho quando orientação ou zoom mudar
  useEffect(() => {
    if (fabricCanvasRef.current) {
      updateCanvasSize(orientation, zoom);
    }
  }, [orientation, zoom, props.showContainer]);

  // Impedir eventos de teclado e mouse
  const handleInteractionEvents = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (showContainer) {
    return (
      <div 
        className={`flex-1 min-h-0 border rounded-lg bg-muted dark:bg-gray-800 p-4 overflow-auto relative ${
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
                pointerEvents: 'none'
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
  }

  // Renderização sem container (para uso no modo dupla página)
  return (
    <div className="relative" onContextMenu={handleInteractionEvents}>
      <canvas 
        ref={canvasRef}
        style={{ 
          maxWidth: 'none', 
          maxHeight: 'none',
          position: 'relative',
          zIndex: 10,
          pointerEvents: 'none',
          display: isActive ? 'block' : 'none'
        }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded">
          <div className="bg-white p-3 rounded shadow-lg">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </div>
      )}
    </div>
  );
});

CertificateCanvas.displayName = 'CertificateCanvas';

export default CertificateCanvas;