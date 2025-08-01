import { useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import * as fabric from 'fabric';

interface CanvasPage {
  id: string;
  orientation: 'landscape' | 'portrait';
  zoomLevel: number;
  canvasRef: any;
}

export const useCanvas = () => {
  const [pages, setPages] = useState<CanvasPage[]>([
    {
      id: 'page-1',
      orientation: 'landscape',
      zoomLevel: 100,
      canvasRef: null
    }
  ]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRefs = useRef<Map<string, any>>(new Map());

  const getCurrentPage = useCallback(() => {
    return pages[currentPageIndex];
  }, [pages, currentPageIndex]);

  const getCurrentCanvasRef = useCallback(() => {
    const currentPage = getCurrentPage();
    const ref = canvasRefs.current.get(currentPage.id);
    console.log('getCurrentCanvasRef - Page ID:', currentPage.id, 'Ref:', ref);
    return ref;
  }, [getCurrentPage]);

  const handleApplyAsBackground = useCallback(async (target: fabric.Object) => {
    console.log('handleApplyAsBackground called, current page index:', currentPageIndex);
    const canvasRef = getCurrentCanvasRef();
    if (!canvasRef) {
      console.error('No canvas ref found for current page');
      return;
    }
    
    const canvas = canvasRef.getCanvas();
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
  }, [getCurrentCanvasRef, currentPageIndex]);

  const handleDeleteFromCanvas = useCallback((target: fabric.Object) => {
    const canvasRef = getCurrentCanvasRef();
    if (!canvasRef) return;
    
    const canvas = canvasRef.getCanvas();
    if (!canvas) return;

    canvas.remove(target);
    canvas.renderAll();
  }, [getCurrentCanvasRef]);

  const addImageToCanvas = useCallback((imageUrl: string, imageName: string) => {
    console.log('addImageToCanvas called, current page index:', currentPageIndex);
    const canvasRef = getCurrentCanvasRef();
    if (!canvasRef) {
      console.error('No canvas ref found for current page');
      return;
    }
    
    setIsLoadingCanvas(true);
    canvasRef.addImageToCanvas(imageUrl, imageName);
    
    // Reset loading state after a delay
    setTimeout(() => setIsLoadingCanvas(false), 1000);
  }, [getCurrentCanvasRef, currentPageIndex]);

  const addShapeToCanvas = useCallback((shapeType: 'rectangle' | 'circle' | 'triangle' | 'line', shapeSettings: any) => {
    console.log('addShapeToCanvas called, current page index:', currentPageIndex);
    const canvasRef = getCurrentCanvasRef();
    if (!canvasRef) {
      console.error('No canvas ref found for current page');
      return;
    }
    
    canvasRef.addShapeToCanvas(shapeType, shapeSettings);
  }, [getCurrentCanvasRef, currentPageIndex]);

  const addTextToCanvas = useCallback((text: string, textSettings: any) => {
    console.log('addTextToCanvas called, current page index:', currentPageIndex);
    const canvasRef = getCurrentCanvasRef();
    if (!canvasRef) {
      console.error('No canvas ref found for current page');
      return;
    }
    
    canvasRef.addTextToCanvas(text, textSettings);
  }, [getCurrentCanvasRef, currentPageIndex]);

  const addPlaceholderToCanvas = useCallback((placeholderName: string) => {
    console.log('addPlaceholderToCanvas called, current page index:', currentPageIndex);
    const canvasRef = getCurrentCanvasRef();
    if (!canvasRef) {
      console.error('No canvas ref found for current page');
      return;
    }
    
    canvasRef.addPlaceholderToCanvas(placeholderName);
  }, [getCurrentCanvasRef, currentPageIndex]);

  const addPage = useCallback(() => {
    if (pages.length >= 2) return;
    
    const newPage: CanvasPage = {
      id: `page-${Date.now()}`,
      orientation: 'landscape',
      zoomLevel: 100,
      canvasRef: null
    };
    
    setPages([...pages, newPage]);
    setCurrentPageIndex(pages.length);
  }, [pages]);

  const removePage = useCallback((index: number) => {
    if (pages.length <= 1) return;
    
    const pageId = pages[index].id;
    canvasRefs.current.delete(pageId);
    
    const newPages = pages.filter((_, i) => i !== index);
    setPages(newPages);
    
    if (currentPageIndex >= newPages.length) {
      setCurrentPageIndex(newPages.length - 1);
    }
  }, [pages, currentPageIndex]);

  const setPageOrientation = useCallback((orientation: 'landscape' | 'portrait') => {
    setPages(prevPages => {
      const newPages = [...prevPages];
      newPages[currentPageIndex] = {
        ...newPages[currentPageIndex],
        orientation
      };
      return newPages;
    });
  }, [currentPageIndex]);

  const setPageZoomLevel = useCallback((zoomLevel: number) => {
    setPages(prevPages => {
      const newPages = [...prevPages];
      newPages[currentPageIndex] = {
        ...newPages[currentPageIndex],
        zoomLevel
      };
      return newPages;
    });
  }, [currentPageIndex]);

  const registerCanvasRef = useCallback((pageId: string, ref: any) => {
    console.log('Registering canvas ref for page:', pageId, ref);
    canvasRefs.current.set(pageId, ref);
  }, []);

  return {
    pages,
    currentPageIndex,
    setCurrentPageIndex,
    addPage,
    removePage,
    canvasRefs,
    registerCanvasRef,
    getCurrentCanvasRef,
    canvasOrientation: getCurrentPage()?.orientation || 'landscape',
    setCanvasOrientation: setPageOrientation,
    zoomLevel: getCurrentPage()?.zoomLevel || 100,
    setZoomLevel: setPageZoomLevel,
    isLoadingCanvas,
    isDragging,
    setIsDragging,
    handleApplyAsBackground,
    handleDeleteFromCanvas,
    addImageToCanvas,
    addShapeToCanvas,
    addTextToCanvas,
    addPlaceholderToCanvas
  };
};