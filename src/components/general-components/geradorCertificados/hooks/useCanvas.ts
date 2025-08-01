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

        // Always use manual rendering in production for S3 images
        const isProduction = window.location.hostname !== 'localhost';
        const hasImages = canvas.getObjects().some((obj: any) => obj.type === 'image');
        
        if (isProduction && hasImages) {
          // Use manual rendering for canvases with S3 images
          try {
            // Create a temporary canvas for rendering
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            if (!tempCtx) {
              throw new Error('Could not get 2D context');
            }

            // Set dimensions based on the original canvas
            const zoom = canvas.getZoom();
            const originalWidth = canvas.getWidth() / zoom;
            const originalHeight = canvas.getHeight() / zoom;
            
            // Use a high resolution multiplier for better quality
            const multiplier = 4; // Increased from 2 to 4 for higher quality
            tempCanvas.width = originalWidth * multiplier;
            tempCanvas.height = originalHeight * multiplier;
            
            // Scale the context for high resolution
            tempCtx.scale(multiplier, multiplier);
            
            // Enable high-quality rendering
            tempCtx.imageSmoothingEnabled = true;
            tempCtx.imageSmoothingQuality = 'high';
            
            // Fill with white background
            tempCtx.fillStyle = 'white';
            tempCtx.fillRect(0, 0, originalWidth, originalHeight);
          
          // Render each object manually to avoid CORS issues
          const objects = canvas.getObjects();
          
          for (const obj of objects) {
            tempCtx.save();
            
            // Get object properties
            const left = obj.left || 0;
            const top = obj.top || 0;
            const angle = obj.angle || 0;
            const scaleX = obj.scaleX || 1;
            const scaleY = obj.scaleY || 1;
            const opacity = obj.opacity || 1;
            const originX = obj.originX || 'left';
            const originY = obj.originY || 'top';
            
            // Calculate offset based on origin
            let offsetX = 0;
            let offsetY = 0;
            
            if (originX === 'center') {
              offsetX = -(obj.width || 0) * scaleX / 2;
            } else if (originX === 'right') {
              offsetX = -(obj.width || 0) * scaleX;
            }
            
            if (originY === 'center') {
              offsetY = -(obj.height || 0) * scaleY / 2;
            } else if (originY === 'bottom') {
              offsetY = -(obj.height || 0) * scaleY;
            }
            
            // Apply transformations
            tempCtx.globalAlpha = opacity;
            tempCtx.translate(left, top);
            tempCtx.rotate((angle * Math.PI) / 180);
            
            // Render based on object type
            if (obj.type === 'image') {
              // Handle images
              const img = obj as fabric.FabricImage;
              const imgElement = img.getElement();
              
              try {
                // For S3 images in production, draw placeholder
                if ((img as any)._isS3Image || (isProduction && hasImages)) {
                  try {
                    // For immediate rendering, draw a placeholder
                    tempCtx.fillStyle = '#f9f9f9';
                    tempCtx.fillRect(
                      offsetX,
                      offsetY,
                      (img.width || 0) * scaleX,
                      (img.height || 0) * scaleY
                    );
                    tempCtx.strokeStyle = '#ddd';
                    tempCtx.lineWidth = 2;
                    tempCtx.strokeRect(
                      offsetX,
                      offsetY,
                      (img.width || 0) * scaleX,
                      (img.height || 0) * scaleY
                    );
                    
                    // Add text to indicate image
                    tempCtx.fillStyle = '#999';
                    tempCtx.font = '14px Arial';
                    tempCtx.textAlign = 'center';
                    tempCtx.fillText(
                      'Imagem',
                      offsetX + ((img.width || 0) * scaleX) / 2,
                      offsetY + ((img.height || 0) * scaleY) / 2
                    );
                  } catch (placeholderError) {
                    console.error('Error drawing placeholder:', placeholderError);
                  }
                } else {
                  // Normal image rendering
                  tempCtx.drawImage(
                    imgElement,
                    offsetX,
                    offsetY,
                    (img.width || 0) * scaleX,
                    (img.height || 0) * scaleY
                  );
                }
              } catch (error) {
                console.error('Error drawing image:', error);
                // Draw placeholder rectangle
                tempCtx.fillStyle = '#f0f0f0';
                tempCtx.fillRect(
                  offsetX,
                  offsetY,
                  (img.width || 0) * scaleX,
                  (img.height || 0) * scaleY
                );
                tempCtx.strokeStyle = '#ccc';
                tempCtx.strokeRect(
                  offsetX,
                  offsetY,
                  (img.width || 0) * scaleX,
                  (img.height || 0) * scaleY
                );
              }
            } else if (obj.type === 'rect') {
              const rect = obj as fabric.Rect;
              
              // Check if it's the background rect with a pattern
              if ((rect as any).name === 'backgroundRect' && rect.fill && typeof rect.fill === 'object') {
                // For production with images, just draw a white background
                if (isProduction && hasImages) {
                  tempCtx.fillStyle = 'white';
                  tempCtx.fillRect(0, 0, rect.width || 0, rect.height || 0);
                } else {
                  // Try to render pattern inside the rectangle bounds
                  const pattern = rect.fill as fabric.Pattern;
                  if (pattern.source) {
                    try {
                      const patternImg = pattern.source as HTMLImageElement;
                      const transform = pattern.patternTransform || [1, 0, 0, 1, 0, 0];
                      
                      // Create clipping path for the rectangle
                      tempCtx.save();
                      tempCtx.beginPath();
                      tempCtx.rect(0, 0, rect.width || 0, rect.height || 0);
                      tempCtx.clip();
                      
                      // Apply pattern transform and draw image
                      const scaleFactorX = transform[0];
                      const scaleFactorY = transform[3];
                      const offsetX = transform[4];
                      const offsetY = transform[5];
                      
                      tempCtx.drawImage(
                        patternImg,
                        offsetX,
                        offsetY,
                        patternImg.width * scaleFactorX,
                        patternImg.height * scaleFactorY
                      );
                      
                      tempCtx.restore();
                    } catch (error) {
                      console.error('Error drawing pattern:', error);
                      tempCtx.fillStyle = 'white';
                      tempCtx.fillRect(0, 0, rect.width || 0, rect.height || 0);
                    }
                  } else {
                    tempCtx.fillStyle = 'white';
                    tempCtx.fillRect(0, 0, rect.width || 0, rect.height || 0);
                  }
                }
              } else {
                tempCtx.fillStyle = rect.fill as string || 'black';
                
                const width = rect.width || 0;
                const height = rect.height || 0;
                const rx = rect.rx || 0;
                const ry = rect.ry || 0;
                
                tempCtx.scale(scaleX, scaleY);
                
                // Draw rounded rectangle if needed
                if (rx || ry) {
                  tempCtx.beginPath();
                  tempCtx.moveTo(offsetX / scaleX + rx, offsetY / scaleY);
                  tempCtx.lineTo(offsetX / scaleX + width - rx, offsetY / scaleY);
                  tempCtx.quadraticCurveTo(offsetX / scaleX + width, offsetY / scaleY, offsetX / scaleX + width, offsetY / scaleY + ry);
                  tempCtx.lineTo(offsetX / scaleX + width, offsetY / scaleY + height - ry);
                  tempCtx.quadraticCurveTo(offsetX / scaleX + width, offsetY / scaleY + height, offsetX / scaleX + width - rx, offsetY / scaleY + height);
                  tempCtx.lineTo(offsetX / scaleX + rx, offsetY / scaleY + height);
                  tempCtx.quadraticCurveTo(offsetX / scaleX, offsetY / scaleY + height, offsetX / scaleX, offsetY / scaleY + height - ry);
                  tempCtx.lineTo(offsetX / scaleX, offsetY / scaleY + ry);
                  tempCtx.quadraticCurveTo(offsetX / scaleX, offsetY / scaleY, offsetX / scaleX + rx, offsetY / scaleY);
                  tempCtx.closePath();
                  tempCtx.fill();
                } else {
                  tempCtx.fillRect(offsetX / scaleX, offsetY / scaleY, width, height);
                }
                
                // Draw stroke if exists
                if (rect.stroke && rect.strokeWidth) {
                  tempCtx.strokeStyle = rect.stroke as string;
                  tempCtx.lineWidth = rect.strokeWidth;
                  if (rx || ry) {
                    tempCtx.stroke();
                  } else {
                    tempCtx.strokeRect(offsetX / scaleX, offsetY / scaleY, width, height);
                  }
                }
              }
            } else if (obj.type === 'circle') {
              const circle = obj as fabric.Circle;
              tempCtx.scale(scaleX, scaleY);
              tempCtx.fillStyle = circle.fill as string || 'black';
              tempCtx.beginPath();
              tempCtx.arc(offsetX / scaleX + (circle.radius || 0), offsetY / scaleY + (circle.radius || 0), circle.radius || 0, 0, 2 * Math.PI);
              tempCtx.fill();
              
              if (circle.stroke && circle.strokeWidth) {
                tempCtx.strokeStyle = circle.stroke as string;
                tempCtx.lineWidth = circle.strokeWidth;
                tempCtx.stroke();
              }
            } else if (obj.type === 'triangle') {
              const triangle = obj as fabric.Triangle;
              const width = triangle.width || 0;
              const height = triangle.height || 0;
              
              tempCtx.scale(scaleX, scaleY);
              tempCtx.fillStyle = triangle.fill as string || 'black';
              tempCtx.beginPath();
              tempCtx.moveTo(offsetX / scaleX + width/2, offsetY / scaleY);
              tempCtx.lineTo(offsetX / scaleX, offsetY / scaleY + height);
              tempCtx.lineTo(offsetX / scaleX + width, offsetY / scaleY + height);
              tempCtx.closePath();
              tempCtx.fill();
              
              if (triangle.stroke && triangle.strokeWidth) {
                tempCtx.strokeStyle = triangle.stroke as string;
                tempCtx.lineWidth = triangle.strokeWidth;
                tempCtx.stroke();
              }
            } else if (obj.type === 'line') {
              const line = obj as fabric.Line;
              const x1 = line.x1 || 0;
              const y1 = line.y1 || 0;
              const x2 = line.x2 || 0;
              const y2 = line.y2 || 0;
              
              tempCtx.strokeStyle = line.stroke as string || 'black';
              tempCtx.lineWidth = line.strokeWidth || 1;
              tempCtx.beginPath();
              tempCtx.moveTo(x1 - left, y1 - top);
              tempCtx.lineTo(x2 - left, y2 - top);
              tempCtx.stroke();
            } else if (obj.type === 'textbox' || obj.type === 'i-text') {
              const text = obj as fabric.Textbox;
              tempCtx.scale(scaleX, scaleY);
              tempCtx.fillStyle = text.fill as string || 'black';
              tempCtx.font = `${text.fontStyle || 'normal'} ${text.fontWeight || 'normal'} ${text.fontSize || 16}px ${text.fontFamily || 'Arial'}`;
              
              // Handle text alignment
              let textAlign: CanvasTextAlign = 'left';
              if (text.textAlign === 'center') {
                textAlign = 'center';
              } else if (text.textAlign === 'right') {
                textAlign = 'right';
              }
              tempCtx.textAlign = textAlign;
              tempCtx.textBaseline = 'top';
              
              const lines = (text.text || '').split('\n');
              const lineHeight = (text.fontSize || 16) * (text.lineHeight || 1);
              
              // Calculate starting position based on origin
              let startX = offsetX / scaleX;
              let startY = offsetY / scaleY;
              
              // Adjust X position based on text alignment and width
              if (textAlign === 'center') {
                startX += (text.width || 0) / 2;
              } else if (textAlign === 'right') {
                startX += (text.width || 0);
              }
              
              lines.forEach((line, index) => {
                const y = startY + (index * lineHeight);
                
                // Apply character spacing if set
                if (text.charSpacing && text.charSpacing > 0) {
                  const chars = line.split('');
                  let currentX = startX;
                  
                  chars.forEach((char) => {
                    tempCtx.fillText(char, currentX, y);
                    const charWidth = tempCtx.measureText(char).width;
                    currentX += charWidth + (text.charSpacing || 0) / 10;
                  });
                } else {
                  tempCtx.fillText(line, startX, y);
                }
                
                // Draw underline if needed
                if (text.underline) {
                  const metrics = tempCtx.measureText(line);
                  tempCtx.strokeStyle = text.fill as string || 'black';
                  tempCtx.lineWidth = 1;
                  tempCtx.beginPath();
                  
                  let underlineX = startX;
                  if (textAlign === 'center') {
                    underlineX -= metrics.width / 2;
                  } else if (textAlign === 'right') {
                    underlineX -= metrics.width;
                  }
                  
                  tempCtx.moveTo(underlineX, y + lineHeight * 0.9);
                  tempCtx.lineTo(underlineX + metrics.width, y + lineHeight * 0.9);
                  tempCtx.stroke();
                }
              });
            }
            
            tempCtx.restore();
          }
          
          // Get PDF page dimensions
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          
          // Add canvas directly to PDF without using toDataURL
          // This avoids the tainted canvas issue
          const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
          
          // Create a new clean canvas for the image data
          const cleanCanvas = document.createElement('canvas');
          cleanCanvas.width = tempCanvas.width;
          cleanCanvas.height = tempCanvas.height;
          const cleanCtx = cleanCanvas.getContext('2d');
          
          if (cleanCtx) {
            cleanCtx.putImageData(imageData, 0, 0);
            const dataURL = cleanCanvas.toDataURL('image/png', 1.0);
            
            // Add image to PDF filling the entire page (no margins) with high quality
            pdf.addImage(dataURL, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'NONE');
          }
            
          } catch (fallbackError) {
            console.error('Error in manual rendering:', fallbackError);
            toast.error(`Erro ao exportar página ${i + 1} com imagens S3`);
          }
        } else {
          // No S3 images - use direct canvas export
          try {
            const dataURL = canvas.toDataURL({
              format: 'png',
              quality: 1.0,
              multiplier: 4 // Increased from 2 to 4 for higher quality
            });
            
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            pdf.addImage(dataURL, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'NONE');
          } catch (error) {
            console.error('Error exporting canvas:', error);
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
    exportToPDF
  };
};