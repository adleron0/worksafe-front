import { useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import * as fabric from 'fabric';

export const useCanvas = () => {
  const [canvasOrientation, setCanvasOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<any>(null);

  const handleApplyAsBackground = useCallback(async (target: fabric.Object) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current.getCanvas();
    if (!canvas) return;

    const image = target as fabric.FabricImage;
    const bgRect = canvas.getObjects().find((obj: fabric.Object) => (obj as fabric.Object & { name?: string }).name === 'backgroundRect') as fabric.Rect;
    
    if (bgRect && image) {
      try {
        const imgElement = image.getElement();
        
        const pattern = new fabric.Pattern({
          source: imgElement,
          repeat: 'no-repeat'
        });
        
        const scaleX = bgRect.width! / image.width!;
        const scaleY = bgRect.height! / image.height!;
        const scale = Math.min(scaleX, scaleY);
        
        const offsetX = (bgRect.width! - (image.width! * scale)) / 2;
        const offsetY = (bgRect.height! - (image.height! * scale)) / 2;
        
        pattern.patternTransform = [scale, 0, 0, scale, offsetX, offsetY];
        
        bgRect.set('fill', pattern);
        canvas.remove(image);
        canvas.renderAll();
        
        toast.success('Imagem aplicada ao fundo!');
      } catch (error) {
        console.error('Error applying background:', error);
        toast.error('Erro ao aplicar imagem como fundo');
      }
    }
  }, []);

  const handleDeleteFromCanvas = useCallback((target: fabric.Object) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current.getCanvas();
    if (!canvas) return;

    canvas.remove(target);
    canvas.renderAll();
  }, []);

  const addImageToCanvas = useCallback((imageUrl: string, imageName: string) => {
    if (!canvasRef.current) return;
    
    setIsLoadingCanvas(true);
    canvasRef.current.addImageToCanvas(imageUrl, imageName);
    
    // Reset loading state after a delay
    setTimeout(() => setIsLoadingCanvas(false), 1000);
  }, []);

  const addShapeToCanvas = useCallback((shapeType: 'rectangle' | 'circle' | 'triangle' | 'line', shapeSettings: any) => {
    if (!canvasRef.current) return;
    
    canvasRef.current.addShapeToCanvas(shapeType, shapeSettings);
  }, []);

  const addTextToCanvas = useCallback((text: string, textSettings: any) => {
    if (!canvasRef.current) return;
    
    canvasRef.current.addTextToCanvas(text, textSettings);
  }, []);

  return {
    canvasRef,
    canvasOrientation,
    setCanvasOrientation,
    zoomLevel,
    setZoomLevel,
    isLoadingCanvas,
    isDragging,
    setIsDragging,
    handleApplyAsBackground,
    handleDeleteFromCanvas,
    addImageToCanvas,
    addShapeToCanvas,
    addTextToCanvas
  };
};