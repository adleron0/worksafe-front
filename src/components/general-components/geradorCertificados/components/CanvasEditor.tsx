import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RectangleHorizontal, RectangleVertical, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import * as fabric from 'fabric';

export interface CanvasEditorRef {
  addImageToCanvas: (imageUrl: string, imageName: string) => void;
  addShapeToCanvas: (shapeType: 'rectangle' | 'circle' | 'triangle' | 'line', shapeSettings: any) => void;
  getCanvas: () => fabric.Canvas | null;
}

interface CanvasEditorProps {
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
}

const CanvasEditor = forwardRef<CanvasEditorRef, CanvasEditorProps>(({
  orientation,
  zoomLevel,
  isDragging,
  isLoadingCanvas,
  onOrientationChange,
  onZoomChange,
  onObjectSelected,
  onSelectionCleared,
  onContextMenu,
  selectedShapeRef
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const zoomLevelRef = useRef(zoomLevel);
  const orientationRef = useRef(orientation);

  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    orientationRef.current = orientation;
  }, [orientation]);

  const updateCanvasSize = (orient: 'landscape' | 'portrait', customZoom?: number) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const baseScale = 0.6;
    const zoomScale = customZoom ? customZoom / 100 : zoomLevelRef.current / 100;
    const finalScale = baseScale * zoomScale;
    
    const a4Width = 842;
    const a4Height = 595;

    if (orient === 'landscape') {
      canvas.setDimensions({
        width: a4Width * finalScale,
        height: a4Height * finalScale
      });
    } else {
      canvas.setDimensions({
        width: a4Height * finalScale,
        height: a4Width * finalScale
      });
    }
    
    const bgRect = canvas.getObjects().find(obj => (obj as fabric.Object & { name?: string }).name === 'backgroundRect');
    if (bgRect) {
      bgRect.set({
        width: canvas.width,
        height: canvas.height
      });
    }
    
    canvas.setZoom(1);
    canvas.renderAll();
  };

  const addImageToCanvas = (imageUrl: string, imageName: string) => {
    if (!fabricCanvasRef.current) return;

    fabric.FabricImage.fromURL(imageUrl, {
      crossOrigin: 'anonymous'
    }).then((fabricImage) => {
      if (!fabricCanvasRef.current) return;
      
      fabricImage.set({
        left: fabricCanvasRef.current.width! / 2,
        top: fabricCanvasRef.current.height! / 2,
        originX: 'center',
        originY: 'center',
        name: imageName
      });
      
      const maxSize = 200;
      if (fabricImage.width! > fabricImage.height!) {
        fabricImage.scaleToWidth(maxSize);
      } else {
        fabricImage.scaleToHeight(maxSize);
      }
      
      fabricCanvasRef.current.add(fabricImage);
      fabricCanvasRef.current.setActiveObject(fabricImage);
      fabricCanvasRef.current.renderAll();
    }).catch((error) => {
      console.error('Error loading image:', error);
    });
  };

  const addShapeToCanvas = (shapeType: 'rectangle' | 'circle' | 'triangle' | 'line', shapeSettings: any) => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    const centerX = canvas.width! / 2;
    const centerY = canvas.height! / 2;
    const size = 100;
    
    let shape: fabric.Object;
    
    const strokeWidth = shapeType === 'line' ? Math.max(2, shapeSettings.strokeWidth) : shapeSettings.strokeWidth;
    
    const baseProps = {
      left: centerX,
      top: centerY,
      originX: 'center' as const,
      originY: 'center' as const,
      fill: shapeSettings.fill,
      stroke: shapeSettings.stroke,
      strokeWidth: strokeWidth,
      opacity: shapeSettings.opacity / 100,
      name: shapeType
    };
    
    switch (shapeType) {
      case 'rectangle':
        shape = new fabric.Rect({
          ...baseProps,
          width: size,
          height: size,
          rx: shapeSettings.cornerRadius,
          ry: shapeSettings.cornerRadius
        });
        break;
        
      case 'circle':
        shape = new fabric.Circle({
          ...baseProps,
          radius: size / 2
        });
        break;
        
      case 'triangle':
        shape = new fabric.Triangle({
          ...baseProps,
          width: size,
          height: size
        });
        break;
        
      case 'line':
        shape = new fabric.Line([centerX - 50, centerY, centerX + 50, centerY], {
          ...baseProps,
          fill: undefined,
          lockScalingY: true,
          lockSkewingY: true
        });
        shape.setControlsVisibility({
          mt: false,
          mb: false,
          tl: false,
          tr: false,
          bl: false,
          br: false,
        });
        break;
        
      default:
        return;
    }
    
    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
    
    onObjectSelected(shape);
    selectedShapeRef.current = shape;
  };

  useImperativeHandle(ref, () => ({
    addImageToCanvas,
    addShapeToCanvas,
    getCanvas: () => fabricCanvasRef.current
  }));

  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        backgroundColor: '#e5e7eb',
        preserveObjectStacking: true,
      });
      fabricCanvasRef.current = canvas;
      
      const bgRect = new fabric.Rect({
        left: 0,
        top: 0,
        width: canvas.width || 842 * 0.6,
        height: canvas.height || 595 * 0.6,
        fill: 'white',
        selectable: false,
        evented: false,
        name: 'backgroundRect'
      });
      
      canvas.add(bgRect);
      updateCanvasSize('landscape');
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && fabricCanvasRef.current) {
          e.preventDefault();
          const activeObject = fabricCanvasRef.current.getActiveObject();
          
          if (activeObject) {
            const objWithName = activeObject as fabric.Object & { name?: string };
            if (objWithName.name !== 'backgroundRect') {
              fabricCanvasRef.current.remove(activeObject);
              fabricCanvasRef.current.discardActiveObject();
              fabricCanvasRef.current.requestRenderAll();
              onSelectionCleared();
              selectedShapeRef.current = null;
            }
          }
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      
      const handleContextMenu = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        
        const mouseEvent = e as MouseEvent;
        const currentCanvas = fabricCanvasRef.current;
        if (!currentCanvas) return false;
        
        const pointer = currentCanvas.getPointer(mouseEvent);
        const objects = currentCanvas.getObjects();
        let target = null;
        
        for (let i = objects.length - 1; i >= 0; i--) {
          const obj = objects[i];
          if (obj.containsPoint(pointer) && (obj as fabric.Object & { name?: string }).name !== 'backgroundRect') {
            target = obj;
            break;
          }
        }
        
        if (target) {
          currentCanvas.setActiveObject(target);
          currentCanvas.renderAll();
        }
        
        onContextMenu(mouseEvent, target);
        return false;
      };
      
      const attachContextMenuListeners = () => {
        if (canvas.upperCanvasEl) {
          canvas.upperCanvasEl.removeEventListener('contextmenu', handleContextMenu);
          canvas.upperCanvasEl.addEventListener('contextmenu', handleContextMenu);
        }
        if (canvas.lowerCanvasEl) {
          canvas.lowerCanvasEl.removeEventListener('contextmenu', handleContextMenu);
          canvas.lowerCanvasEl.addEventListener('contextmenu', handleContextMenu);
        }
        
        const wrapperEl = canvas.wrapperEl;
        if (wrapperEl) {
          wrapperEl.removeEventListener('contextmenu', handleContextMenu);
          wrapperEl.addEventListener('contextmenu', handleContextMenu);
        }
      };
      
      setTimeout(() => {
        attachContextMenuListeners();
      }, 200);
      
      const handleWheel = (opt: fabric.TEvent<WheelEvent>) => {
        const delta = opt.e.deltaY;
        let currentZoom = zoomLevelRef.current;
        
        if (delta > 0) {
          currentZoom = Math.max(30, currentZoom - 5);
        } else {
          currentZoom = Math.min(300, currentZoom + 5);
        }
        
        onZoomChange(currentZoom);
        updateCanvasSize(orientationRef.current, currentZoom);
        
        opt.e.preventDefault();
        opt.e.stopPropagation();
      };
      
      canvas.on('mouse:wheel', handleWheel);
      
      const handleShapeSelection = (obj: fabric.Object) => {
        const objWithName = obj as fabric.Object & { name?: string };
        const objName = objWithName.name;
        
        if (['rectangle', 'circle', 'triangle', 'line', 'rect'].includes(objName || obj.type || '')) {
          onObjectSelected(obj);
          selectedShapeRef.current = obj;
        } else {
          onSelectionCleared();
          selectedShapeRef.current = null;
        }
      };
      
      canvas.on('selection:created', (e) => {
        if (e.selected && e.selected[0]) {
          handleShapeSelection(e.selected[0]);
        }
      });
      
      canvas.on('selection:updated', (e) => {
        if (e.selected && e.selected[0]) {
          handleShapeSelection(e.selected[0]);
        }
      });
      
      canvas.on('selection:cleared', () => {
        onSelectionCleared();
        selectedShapeRef.current = null;
      });
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        canvas.off('mouse:wheel', handleWheel);
        canvas.off('selection:created');
        canvas.off('selection:updated');
        canvas.off('selection:cleared');
        setTimeout(() => {
          if (canvas.upperCanvasEl) {
            canvas.upperCanvasEl.removeEventListener('contextmenu', handleContextMenu);
          }
          if (canvas.lowerCanvasEl) {
            canvas.lowerCanvasEl.removeEventListener('contextmenu', handleContextMenu);
          }
          const wrapperEl = canvas.wrapperEl;
          if (wrapperEl) {
            wrapperEl.removeEventListener('contextmenu', handleContextMenu);
          }
        }, 100);
      };
    }

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    updateCanvasSize(orientation, zoomLevel);
  }, [orientation, zoomLevel]);

  const handleZoomChange = (value: number[]) => {
    onZoomChange(value[0]);
  };

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
      // Get shape settings from parent
      const shapeSettings = {
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 0,
        opacity: 100,
        cornerRadius: 0
      };
      addShapeToCanvas(shapeType as any, shapeSettings);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Controls */}
      <div className="mb-4 flex items-center justify-between gap-4 flex-shrink-0">
        {/* Orientation toggle */}
        <div className="inline-flex rounded-lg border bg-gray-100 dark:bg-gray-800 p-1">
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
            onClick={() => onZoomChange(Math.max(30, zoomLevel - 1))}
            className="h-6 w-6 p-0"
            disabled={zoomLevel <= 30}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Slider
            value={[zoomLevel]}
            onValueChange={handleZoomChange}
            min={30}
            max={300}
            step={1}
            className="w-32"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onZoomChange(Math.min(300, zoomLevel + 1))}
            className="h-6 w-6 p-0"
            disabled={zoomLevel >= 300}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span className="text-xs text-gray-500 min-w-[3rem] text-right">{zoomLevel}%</span>
        </div>
      </div>
      
      {/* Canvas container */}
      <div 
        className={`flex-1 border rounded-lg bg-gray-100 dark:bg-gray-800 p-4 overflow-hidden relative transition-colors ${
          isDragging ? 'border-primary border-2' : ''
        }`}
        onContextMenu={(e) => {
          e.preventDefault();
          return false;
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={handleDrop}
      >
        <div className="absolute inset-4 flex items-center justify-center overflow-hidden">
          <div className="relative">
            <canvas 
              ref={canvasRef}
              style={{ maxWidth: 'none', maxHeight: 'none' }}
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