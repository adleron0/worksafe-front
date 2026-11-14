import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
import { RectangleHorizontal, RectangleVertical, ZoomIn, ZoomOut, Loader2, RotateCcw } from 'lucide-react';
import * as fabric from 'fabric';
import { createListTextbox } from '../utils/ListTextbox';
import { createImagePlaceholder } from '../utils/PlaceholderImage';
import { applyFontOverrides } from '../utils/fontConfig';
import { isTextObject } from '../types';
import { useCanvasSetup, getA4Dimensions } from '../hooks/useCanvasSetup';
import { useZoomControls } from '../hooks/useZoomControls';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useContextMenuSetup } from '../hooks/useContextMenuSetup';
import { useTextEditing } from '../hooks/useTextEditing';
import './CanvasEditor.css';

export interface CanvasEditorRef {
  addImageToCanvas: (imageUrl: string, imageName: string) => void;
  addShapeToCanvas: (shapeType: 'rectangle' | 'circle' | 'triangle' | 'line', shapeSettings: any) => void;
  addTextToCanvas: (text: string, textSettings: any) => void;
  addPlaceholderToCanvas: (placeholderName: string) => void;
  getCanvas: () => fabric.Canvas | null;
}

interface CanvasEditorProps {
  pageId: string;
  pageIndex: number;
  orientation: 'landscape' | 'portrait';
  zoomLevel: number;
  isDragging: boolean;
  isLoadingCanvas: boolean;
  onOrientationChange: (orientation: 'landscape' | 'portrait') => void;
  onZoomChange: (zoom: number) => void;
  onObjectSelected: (obj: fabric.Object) => void;
  onSelectionCleared: () => void;
  onContextMenu: (e: MouseEvent, target: fabric.Object | null) => void;
  selectedShapeRef: React.MutableRefObject<fabric.Object | null>;
  isActive: boolean;
}

const CanvasEditor = forwardRef<CanvasEditorRef, CanvasEditorProps>(({
  pageId,
  pageIndex: _pageIndex,
  orientation,
  zoomLevel,
  isDragging,
  isLoadingCanvas,
  onOrientationChange,
  onZoomChange,
  onObjectSelected,
  onSelectionCleared,
  onContextMenu,
  selectedShapeRef,
  isActive
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomLevelRef = useRef(zoomLevel);
  const orientationRef = useRef(orientation);
  const isActiveRef = useRef(isActive);
  const isEditingTextRef = useRef(false);

  // Callback refs para evitar stale closures
  const onObjectSelectedRef = useRef(onObjectSelected);
  const onSelectionClearedRef = useRef(onSelectionCleared);
  const onContextMenuRef = useRef(onContextMenu);
  const onZoomChangeRef = useRef(onZoomChange);

  // Manter refs sincronizadas
  useEffect(() => { zoomLevelRef.current = zoomLevel; }, [zoomLevel]);
  useEffect(() => { orientationRef.current = orientation; }, [orientation]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => {
    onObjectSelectedRef.current = onObjectSelected;
    onSelectionClearedRef.current = onSelectionCleared;
    onContextMenuRef.current = onContextMenu;
    onZoomChangeRef.current = onZoomChange;
  }, [onObjectSelected, onSelectionCleared, onContextMenu, onZoomChange]);

  // ========== HOOKS EXTRAÍDOS ==========

  // 1. Inicialização do canvas e background rect
  const canvas = useCanvasSetup(canvasRef, orientation, zoomLevel);

  // Ref para acesso imperativo (useImperativeHandle, addImage, etc.)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  useEffect(() => { fabricCanvasRef.current = canvas; }, [canvas]);

  // 2. Zoom (wheel, pinch, applyZoom)
  const { applyZoom, MIN_ZOOM_PERCENT, MAX_ZOOM_PERCENT } = useZoomControls({
    canvas,
    containerRef,
    orientationRef,
    zoomLevelRef,
    isEditingTextRef,
    onZoomChangeRef,
  });

  // 3. Atalhos de teclado (Delete, Ctrl+D/B/I/U)
  useKeyboardShortcuts({
    canvas,
    isActiveRef,
    onSelectionClearedRef,
    selectedShapeRef,
  });

  // 4. Menu de contexto
  useContextMenuSetup({
    canvas,
    onContextMenuRef,
  });

  // 5. Edição de texto (dblclick, text:changed, editing:entered/exited, listas)
  useTextEditing({
    canvas,
    containerRef,
    isEditingTextRef,
    onObjectSelectedRef,
    onContextMenuRef,
  });

  // ========== SELEÇÃO + FORMAS (useEffect pequeno) ==========

  useEffect(() => {
    if (!canvas) return;

    // Configurar canvas wrapper
    if (canvas.wrapperEl) {
      canvas.wrapperEl.setAttribute('data-page-id', pageId);
      canvas.wrapperEl.tabIndex = 1;
    }

    const handleShapeSelection = (obj: fabric.Object) => {
      const objWithName = obj as fabric.Object & { name?: string };
      const objName = objWithName.name;
      if (isTextObject(obj)) {
        if (obj.isEditing) obj.exitEditing();
        onObjectSelectedRef.current(obj);
        selectedShapeRef.current = obj;
      } else if (['rectangle', 'circle', 'triangle', 'line', 'rect'].includes(objName || obj.type || '')) {
        onObjectSelectedRef.current(obj);
        selectedShapeRef.current = obj;
      } else {
        onSelectionClearedRef.current();
        selectedShapeRef.current = null;
      }
    };

    const handleMouseDownBefore = (e: any) => {
      if (e.target) {
        const objName = (e.target as any).name;
        if (['rectangle', 'circle', 'triangle', 'line'].includes(objName) || e.target.type === 'rect') {
          handleShapeSelection(e.target);
        }
      }
    };

    const exitOtherEditing = (except: fabric.Object) => {
      canvas.getObjects().forEach((obj) => {
        if (isTextObject(obj) && obj !== except) {
          if (obj.isEditing) obj.exitEditing();
        }
      });
    };

    const handleSelectionCreated = (e: { selected: fabric.Object[] }) => {
      if (e.selected?.[0]) {
        exitOtherEditing(e.selected[0]);
        handleShapeSelection(e.selected[0]);
      }
    };

    const handleSelectionUpdated = (e: { selected: fabric.Object[] }) => {
      if (e.selected?.[0]) {
        exitOtherEditing(e.selected[0]);
        handleShapeSelection(e.selected[0]);
      }
    };

    const handleSelectionCleared = () => {
      onSelectionClearedRef.current();
      selectedShapeRef.current = null;
    };

    // Corner radius para retângulos
    const adjustRectCorners = (rect: fabric.Rect) => {
      if (!rect.rx && !rect.ry && !(rect as any)._baseRadius) return;
      if (!(rect as any)._baseRadius) {
        (rect as any)._baseRadius = Math.max(rect.rx || 0, rect.ry || 0);
      }
      const width = rect.width! * rect.scaleX!;
      const height = rect.height! * rect.scaleY!;
      const baseRadius = (rect as any)._baseRadius;
      const minSide = Math.min(width, height);
      const targetRadius = Math.min(baseRadius, minSide / 2);
      const widthRatio = width / Math.max(width, height);
      const heightRatio = height / Math.max(width, height);
      rect.set({ rx: targetRadius * heightRatio, ry: targetRadius * widthRatio });
    };

    const handleObjectModified = (e: { target: fabric.Object }) => {
      if (e.target?.type === 'rect') {
        adjustRectCorners(e.target as fabric.Rect);
        canvas.renderAll();
      }
    };

    const handleObjectScaling = (e: { target: fabric.Object }) => {
      if (e.target?.type === 'rect') {
        adjustRectCorners(e.target as fabric.Rect);
      }
    };

    canvas.on('mouse:down:before', handleMouseDownBefore);
    canvas.on('selection:created', handleSelectionCreated as any);
    canvas.on('selection:updated', handleSelectionUpdated as any);
    canvas.on('selection:cleared', handleSelectionCleared);
    canvas.on('object:modified', handleObjectModified as any);
    canvas.on('object:scaling', handleObjectScaling as any);

    return () => {
      canvas.off('mouse:down:before', handleMouseDownBefore);
      canvas.off('selection:created', handleSelectionCreated as any);
      canvas.off('selection:updated', handleSelectionUpdated as any);
      canvas.off('selection:cleared', handleSelectionCleared);
      canvas.off('object:modified', handleObjectModified as any);
      canvas.off('object:scaling', handleObjectScaling as any);
    };
  }, [canvas, pageId, selectedShapeRef, onObjectSelectedRef, onSelectionClearedRef]);

  // ========== ORIENTAÇÃO ==========

  useEffect(() => {
    if (!canvas) return;
    const currentZoom = canvas.getZoom();
    const { width: baseWidth, height: baseHeight } = getA4Dimensions(orientation);
    canvas.setWidth(baseWidth * currentZoom);
    canvas.setHeight(baseHeight * currentZoom);

    const bgRect = canvas.getObjects().find((obj) => (obj as any).name === 'backgroundRect');
    if (bgRect) {
      bgRect.set({ width: baseWidth, height: baseHeight, scaleX: 1, scaleY: 1 });
      bgRect.setCoords();
    }
    canvas.requestRenderAll();
  }, [canvas, orientation]);

  // ========== MÉTODOS IMPERATIVOS ==========

  const addImageToCanvas = (imageUrl: string, imageName: string) => {
    if (!fabricCanvasRef.current) return;

    let processedUrl = imageUrl;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3001';
      processedUrl = `${BASE_URL}/images/proxy?url=${encodeURIComponent(imageUrl)}`;
    }

    fabric.FabricImage.fromURL(processedUrl, { crossOrigin: 'anonymous' })
      .then((fabricImage) => {
        if (!fabricCanvasRef.current) return;
        fabricImage.set({
          left: fabricCanvasRef.current.width! / 2,
          top: fabricCanvasRef.current.height! / 2,
          originX: 'center',
          originY: 'center',
          name: imageName,
        });
        const maxSize = 200;
        if (fabricImage.width! > fabricImage.height!) {
          fabricImage.scaleToWidth(maxSize);
        } else {
          fabricImage.scaleToHeight(maxSize);
        }
        (fabricImage as any)._originalUrl = imageUrl;
        Object.defineProperty(fabricImage, 'src', {
          get: () => imageUrl,
          set: () => {},
          configurable: true,
        });
        fabricCanvasRef.current.add(fabricImage);
        fabricCanvasRef.current.setActiveObject(fabricImage);
        fabricCanvasRef.current.renderAll();
      })
      .catch(() => {
        if (processedUrl !== imageUrl) {
          fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' })
            .then((fabricImage) => {
              if (!fabricCanvasRef.current) return;
              fabricImage.set({
                left: fabricCanvasRef.current.width! / 2,
                top: fabricCanvasRef.current.height! / 2,
                originX: 'center',
                originY: 'center',
                name: imageName,
              });
              const maxSize = 200;
              if (fabricImage.width! > fabricImage.height!) {
                fabricImage.scaleToWidth(maxSize);
              } else {
                fabricImage.scaleToHeight(maxSize);
              }
              (fabricImage as any)._originalUrl = imageUrl;
              fabricCanvasRef.current.add(fabricImage);
              fabricCanvasRef.current.setActiveObject(fabricImage);
              fabricCanvasRef.current.renderAll();
            })
            .catch(() => {
              toast({ title: 'Erro ao carregar imagem', description: 'Verifique se a URL está acessível.', variant: 'destructive' });
            });
        } else {
          toast({ title: 'Erro ao carregar imagem local', variant: 'destructive' });
        }
      });
  };

  const addShapeToCanvas = (shapeType: 'rectangle' | 'circle' | 'triangle' | 'line', shapeSettings: any) => {
    if (!fabricCanvasRef.current) return;
    const canvasInstance = fabricCanvasRef.current;
    const centerX = canvasInstance.width! / 2;
    const centerY = canvasInstance.height! / 2;
    const size = 100;
    const uniqueId = `${shapeType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const strokeWidth = shapeType === 'line' ? Math.max(2, shapeSettings.strokeWidth) : shapeSettings.strokeWidth;

    const baseProps = {
      left: centerX,
      top: centerY,
      originX: 'center' as const,
      originY: 'center' as const,
      fill: shapeSettings.fill,
      stroke: shapeSettings.stroke,
      strokeWidth,
      opacity: shapeSettings.opacity / 100,
      name: shapeType,
    };

    let shape: fabric.Object;

    switch (shapeType) {
      case 'rectangle':
        shape = new fabric.Rect({
          ...baseProps,
          width: size,
          height: size,
          rx: shapeSettings.cornerRadius,
          ry: shapeSettings.cornerRadius,
          strokeUniform: true,
          absolutePositioned: true,
        });
        (shape as any)._baseRadius = shapeSettings.cornerRadius;
        break;
      case 'circle':
        shape = new fabric.Circle({ ...baseProps, radius: size / 2, strokeUniform: true });
        break;
      case 'triangle':
        shape = new fabric.Triangle({ ...baseProps, width: size, height: size, strokeUniform: true });
        (shape as any)._originalSize = size;
        break;
      case 'line':
        shape = new fabric.Line([centerX - 50, centerY, centerX + 50, centerY], {
          ...baseProps,
          fill: undefined,
          lockScalingY: true,
          lockSkewingY: true,
          strokeUniform: true,
        });
        shape.setControlsVisibility({ mt: false, mb: false, tl: false, tr: false, bl: false, br: false });
        break;
      default:
        return;
    }

    (shape as any).__uniqueID = uniqueId;
    (shape as any).id = uniqueId;
    shape.set({ selectable: true, evented: true });

    canvasInstance.add(shape);
    canvasInstance.setActiveObject(shape);
    canvasInstance.renderAll();
    onObjectSelectedRef.current(shape);
    selectedShapeRef.current = shape;
  };

  const addTextToCanvas = (text: string, textSettings: any) => {
    if (!fabricCanvasRef.current) return;
    const canvasInstance = fabricCanvasRef.current;
    const centerX = canvasInstance.width! / 2;
    const centerY = canvasInstance.height! / 2;
    const uniqueId = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fabricText = createListTextbox(text, {
      left: centerX,
      top: centerY,
      originX: 'center',
      originY: textSettings.originY || 'center',
      fontFamily: textSettings.fontFamily,
      fontSize: textSettings.fontSize,
      fontWeight: textSettings.fontWeight,
      fontStyle: textSettings.fontStyle,
      underline: textSettings.underline,
      fill: textSettings.fill,
      textAlign: textSettings.textAlign,
      lineHeight: textSettings.lineHeight,
      charSpacing: textSettings.letterSpacing,
      listType: textSettings.listType || 'none',
      listIndent: textSettings.listIndent || 0,
      listItemSpacing: textSettings.listItemSpacing || 8,
      name: 'text',
      hasControls: true,
      lockScalingFlip: true,
    } as any);

    (fabricText as any).__uniqueID = uniqueId;
    (fabricText as any).id = uniqueId;
    applyFontOverrides(fabricText as any);

    canvasInstance.add(fabricText);
    canvasInstance.setActiveObject(fabricText);
    canvasInstance.renderAll();
    onObjectSelectedRef.current(fabricText);
    selectedShapeRef.current = fabricText;

    // Sair de edição de outros textos
    canvasInstance.getObjects().forEach((obj) => {
      if (isTextObject(obj) && obj !== fabricText) {
        if (obj.isEditing) obj.exitEditing();
      }
    });

    // Entrar em edição imediatamente
    setTimeout(() => {
      const container = containerRef.current;
      const scrollTop = container?.scrollTop ?? 0;
      const scrollLeft = container?.scrollLeft ?? 0;
      const winX = window.scrollX;
      const winY = window.scrollY;

      canvasInstance.setActiveObject(fabricText);
      fabricText.enterEditing();
      fabricText.selectAll();

      if (canvasInstance.wrapperEl) {
        canvasInstance.wrapperEl.focus({ preventScroll: true });
      }

      // Restaurar scroll (enterEditing + focus podem causar scroll indesejado)
      if (container) {
        container.scrollTop = scrollTop;
        container.scrollLeft = scrollLeft;
      }
      window.scrollTo(winX, winY);

      canvasInstance.renderAll();
    }, 200);
  };

  const addPlaceholderToCanvas = (placeholderName: string) => {
    if (!fabricCanvasRef.current) return;
    const canvasInstance = fabricCanvasRef.current;
    const centerX = canvasInstance.width! / 2;
    const centerY = canvasInstance.height! / 2;
    const isQRCode = placeholderName.toLowerCase().includes('qrcode');
    const size = isQRCode ? 120 : 200;

    const placeholder = createImagePlaceholder({
      name: placeholderName,
      left: centerX - size / 2,
      top: centerY - size / 2,
      width: size,
      height: isQRCode ? size : 100,
      type: isQRCode ? 'qrcode' : 'image',
    });

    canvasInstance.add(placeholder);
    canvasInstance.setActiveObject(placeholder);
    canvasInstance.renderAll();
    onObjectSelectedRef.current(placeholder);
  };

  useImperativeHandle(ref, () => ({
    addImageToCanvas,
    addShapeToCanvas,
    addTextToCanvas,
    addPlaceholderToCanvas,
    getCanvas: () => fabricCanvasRef.current,
  }));

  // ========== ZOOM UI HANDLERS ==========

  const handleZoomChange = (value: number[]) => applyZoom(value[0]);
  const handleZoomIn = () => applyZoom(Math.min(MAX_ZOOM_PERCENT, zoomLevel + 10));
  const handleZoomOut = () => applyZoom(Math.max(MIN_ZOOM_PERCENT, zoomLevel - 10));
  const handleZoomReset = () => applyZoom(100);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const imageUrl = e.dataTransfer.getData('imageUrl');
    const imageName = e.dataTransfer.getData('imageName');
    if (imageUrl) {
      addImageToCanvas(imageUrl, imageName);
      return;
    }
    const shapeType = e.dataTransfer.getData('shapeType');
    if (shapeType && fabricCanvasRef.current) {
      addShapeToCanvas(shapeType as any, {
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 0,
        opacity: 100,
        cornerRadius: 0,
      });
    }
  };

  // ========== RENDER ==========

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="mb-4 flex items-center justify-between gap-4 flex-shrink-0">
        {/* Orientation toggle */}
        <div className="inline-flex rounded-lg border bg-muted p-1">
          <Button
            size="sm"
            variant={orientation === 'landscape' ? 'default' : 'ghost'}
            onClick={() => onOrientationChange('landscape')}
            className="h-8 px-3"
            aria-label="A4 Horizontal"
          >
            <RectangleHorizontal className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={orientation === 'portrait' ? 'default' : 'ghost'}
            onClick={() => onOrientationChange('portrait')}
            className="h-8 px-3"
            aria-label="A4 Vertical"
          >
            <RectangleVertical className="w-4 h-4" />
          </Button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomOut}
            className="h-6 w-6 p-0"
            disabled={zoomLevel <= MIN_ZOOM_PERCENT}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Slider
            value={[zoomLevel]}
            onValueChange={handleZoomChange}
            min={MIN_ZOOM_PERCENT}
            max={MAX_ZOOM_PERCENT}
            step={1}
            className="w-32"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomIn}
            className="h-6 w-6 p-0"
            disabled={zoomLevel >= MAX_ZOOM_PERCENT}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomReset}
            className="h-6 px-2 text-xs"
            title="Reset zoom para 100%"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            100%
          </Button>
          <span className="text-xs text-gray-500 min-w-[3rem] text-right">{zoomLevel}%</span>
        </div>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className={`canvas-container flex-1 min-h-0 border rounded-lg bg-muted p-4 overflow-auto relative transition-colors ${
          isDragging ? 'border-primary border-2' : ''
        } ${!isActive ? 'opacity-0 pointer-events-none' : ''}`}
        data-page-active={isActive}
        onContextMenu={(e) => { e.preventDefault(); return false; }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
        onDrop={handleDrop}
      >
        <div className="canvas-scroll-area">
          <div className="canvas-wrapper">
            <canvas
              ref={canvasRef}
              style={{ maxWidth: 'none', maxHeight: 'none', display: 'block' }}
            />
            {isLoadingCanvas && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg">
                <div className="bg-white p-3 rounded-lg shadow-lg">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

CanvasEditor.displayName = 'CanvasEditor';

export default CanvasEditor;
