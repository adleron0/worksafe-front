import { useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import * as fabric from 'fabric';
import jsPDF from 'jspdf';

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
        
        // Use the image directly without CORS for S3 images
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

  const addImageToCanvas = useCallback((imageUrl: string, imageName: string): Promise<void> => {
    console.log('addImageToCanvas called, current page index:', currentPageIndex);
    const canvasRef = getCurrentCanvasRef();
    if (!canvasRef) {
      console.error('No canvas ref found for current page');
      return Promise.reject('No canvas ref found');
    }
    
    setIsLoadingCanvas(true);
    
    return new Promise((resolve, reject) => {
      try {
        canvasRef.addImageToCanvas(imageUrl, imageName);
        // Aguardar um pouco para garantir que a imagem foi adicionada
        setTimeout(() => {
          setIsLoadingCanvas(false);
          resolve();
        }, 300);
      } catch (error) {
        setIsLoadingCanvas(false);
        reject(error);
      }
    });
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
    
    // Use the same orientation as the first page
    const firstPageOrientation = pages[0]?.orientation || 'landscape';
    
    const newPage: CanvasPage = {
      id: `page-${Date.now()}`,
      orientation: firstPageOrientation,
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
      // If there's more than one page, update all pages to have the same orientation
      if (prevPages.length > 1) {
        return prevPages.map(page => ({
          ...page,
          orientation
        }));
      } else {
        // Single page - just update the current page
        const newPages = [...prevPages];
        newPages[currentPageIndex] = {
          ...newPages[currentPageIndex],
          orientation
        };
        return newPages;
      }
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

  const checkCanvasTainted = useCallback(() => {
    const canvasRef = getCurrentCanvasRef();
    if (!canvasRef) {
      console.log('No canvas ref found');
      return false;
    }
    
    const canvas = canvasRef.getCanvas();
    if (!canvas) {
      console.log('No canvas found');
      return false;
    }

    try {
      // Tentar acessar o contexto 2D do canvas
      const canvasElement = canvas.lowerCanvasEl;
      const ctx = canvasElement.getContext('2d');
      if (!ctx) {
        console.log('No 2D context found');
        return false;
      }
      
      // Tentar obter dados de imagem - isso falhará se o canvas estiver tainted
      ctx.getImageData(0, 0, 1, 1);
      console.log('✅ Canvas NÃO está tainted - exportação PDF funcionará');
      return false;
    } catch (e) {
      console.error('❌ Canvas está tainted - exportação PDF falhará:', e);
      console.error('Verifique se todas as imagens foram carregadas com crossOrigin="anonymous"');
      return true;
    }
  }, [getCurrentCanvasRef]);

  const exportToPDF = useCallback(async () => {
    try {
      // Get the first page to determine dimensions
      const firstPage = pages[0];
      const firstCanvasRef = canvasRefs.current.get(firstPage.id);
      if (!firstCanvasRef) {
        throw new Error('No canvas found');
      }
      
      // A4 is 210x297mm (portrait) or 297x210mm (landscape)
      const isLandscape = firstPage.orientation === 'landscape';
      
      // Create PDF with exact A4 dimensions and high quality settings
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: false, // Disable compression for better quality
        precision: 16 // Higher precision for better quality
      });

      // Process each page
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const canvasRef = canvasRefs.current.get(page.id);
        
        if (!canvasRef) {
          console.error(`No canvas ref found for page ${i + 1}`);
          continue;
        }

        const canvas = canvasRef.getCanvas();
        if (!canvas) {
          console.error(`No canvas found for page ${i + 1}`);
          continue;
        }

        // Add new page if not the first page
        if (i > 0) {
          pdf.addPage();
        }

        // Sempre usar o método direto do Fabric.js quando as imagens têm CORS configurado
        try {
          const dataURL = canvas.toDataURL({
            format: 'png',
            quality: 1.0,
            multiplier: 4 // Alta qualidade
          });
          
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          
          pdf.addImage(dataURL, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'NONE');
        } catch (error) {
          console.error('Erro ao exportar canvas:', error);
          
          // Se falhar, verificar se é problema de CORS
          if (error instanceof DOMException && error.name === 'SecurityError') {
            toast.error(`Erro de CORS na página ${i + 1}. Verifique se todas as imagens foram carregadas com crossOrigin="anonymous"`);
          } else {
            toast.error(`Erro ao exportar página ${i + 1}: ${error}`);
          }
        }
      }

      // Save the PDF
      pdf.save('certificado.pdf');
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Erro ao exportar PDF. Tente remover imagens externas que podem estar bloqueando a exportação.');
    }
  }, [pages]);

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
    addPlaceholderToCanvas,
    exportToPDF,
    checkCanvasTainted
  };
};