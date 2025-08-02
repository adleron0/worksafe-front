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

export interface CanvasData {
  fabricJsonFront: any;
  fabricJsonBack: any | null;
  canvasWidth: number;
  canvasHeight: number;
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
    
    if (image) {
      try {
        console.log('Original image dimensions:', {
          width: image.width,
          height: image.height,
          scaleX: image.scaleX,
          scaleY: image.scaleY,
          scaledWidth: image.getScaledWidth(),
          scaledHeight: image.getScaledHeight()
        });

        // Remover da camada de objetos primeiro
        canvas.remove(image);
        
        // Clonar a imagem para usar como background
        const clonedImage = await image.clone();
        
        // Procurar o retângulo de background branco para pegar as dimensões reais do certificado
        const whiteBackgroundRect = canvas.getObjects().find((obj: fabric.Object) => 
          (obj as any).name === 'backgroundRect' && obj.fill === 'white'
        ) as fabric.Rect;
        
        let canvasWidth, canvasHeight;
        
        if (whiteBackgroundRect) {
          // Usar as dimensões do retângulo branco (A4)
          const scaleX = whiteBackgroundRect.scaleX || 1;
          const scaleY = whiteBackgroundRect.scaleY || 1;
          canvasWidth = (whiteBackgroundRect.width || 842) * scaleX;
          canvasHeight = (whiteBackgroundRect.height || 595) * scaleY;
          console.log('Using white backgroundRect dimensions:', { 
            width: whiteBackgroundRect.width,
            height: whiteBackgroundRect.height,
            scaleX,
            scaleY,
            finalWidth: canvasWidth,
            finalHeight: canvasHeight
          });
        } else {
          // Fallback para dimensões padrão A4 landscape
          canvasWidth = 842;
          canvasHeight = 595;
          console.log('Using default A4 landscape dimensions');
        }
        
        console.log('Canvas real dimensions:', { 
          width: canvas.width,
          height: canvas.height,
          getWidth: canvas.getWidth(),
          getHeight: canvas.getHeight(),
          finalWidth: canvasWidth,
          finalHeight: canvasHeight
        });
        
        // Obter dimensões originais da imagem
        const originalWidth = clonedImage.width || clonedImage.getScaledWidth();
        const originalHeight = clonedImage.height || clonedImage.getScaledHeight();
        
        console.log('Image dimensions:', { 
          width: clonedImage.width,
          height: clonedImage.height,
          scaledWidth: clonedImage.getScaledWidth(),
          scaledHeight: clonedImage.getScaledHeight(),
          finalWidth: originalWidth,
          finalHeight: originalHeight
        });
        
        // Calcular escala para cobrir todo o canvas
        const scaleToFitWidth = canvasWidth / originalWidth;
        const scaleToFitHeight = canvasHeight / originalHeight;
        
        // Usar a maior escala para garantir cobertura total
        const finalScale = Math.max(scaleToFitWidth, scaleToFitHeight);
        
        console.log('Scale calculations:', { 
          scaleToFitWidth, 
          scaleToFitHeight, 
          finalScale 
        });
        
        // Aplicar configurações à imagem
        clonedImage.set({
          left: 0,
          top: 0,
          scaleX: finalScale,
          scaleY: finalScale,
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
          lockMovementX: true,
          lockMovementY: true,
          lockRotation: true,
          lockScalingX: true,
          lockScalingY: true
        });
        
        // Calcular as dimensões finais após escala
        const finalWidth = originalWidth * finalScale;
        const finalHeight = originalHeight * finalScale;
        
        // Centralizar se necessário
        if (finalWidth > canvasWidth) {
          const offsetX = -(finalWidth - canvasWidth) / 2;
          clonedImage.set('left', offsetX);
        }
        
        if (finalHeight > canvasHeight) {
          const offsetY = -(finalHeight - canvasHeight) / 2;
          clonedImage.set('top', offsetY);
        }
        
        console.log('Final positioning:', { 
          finalWidth, 
          finalHeight,
          left: clonedImage.left,
          top: clonedImage.top
        });
        
        // Remover qualquer imagem de background existente (não o retângulo branco)
        const objects = canvas.getObjects();
        const existingBgImage = objects.find((obj: fabric.Object) => 
          (obj as any).name === 'backgroundImage'
        );
        
        if (existingBgImage) {
          canvas.remove(existingBgImage);
        }
        
        // Marcar a imagem como background
        (clonedImage as any).name = 'backgroundImage';
        
        // Adicionar a imagem logo acima do retângulo branco
        canvas.add(clonedImage);
        
        // Reorganizar: manter o retângulo branco no fundo, imagem logo acima
        const allObjects = canvas.getObjects();
        const whiteRect = allObjects.find((obj: fabric.Object) => 
          (obj as any).name === 'backgroundRect' && obj.fill === 'white'
        );
        
        if (whiteRect) {
          // Remover todos os objetos
          const objectsToReorder = allObjects.filter((obj: fabric.Object) => 
            obj !== clonedImage && obj !== whiteRect
          );
          
          canvas.clear();
          
          // Re-adicionar na ordem: retângulo branco, imagem de background, outros objetos
          canvas.add(whiteRect);
          canvas.add(clonedImage);
          objectsToReorder.forEach((obj: fabric.Object) => canvas.add(obj));
        } else {
          // Se não houver retângulo branco, colocar a imagem no fundo
          const bgIndex = allObjects.indexOf(clonedImage);
          
          if (bgIndex > 0) {
            const objectsToReorder = allObjects.filter((obj: fabric.Object) => obj !== clonedImage);
            canvas.clear();
            canvas.add(clonedImage);
            objectsToReorder.forEach((obj: fabric.Object) => canvas.add(obj));
          }
        }
        
        canvas.renderAll();
        
        console.log('Background added as first object');
        console.log('Total objects:', canvas.getObjects().length);
        
        console.log('Background applied successfully');
        console.log('Canvas backgroundImage:', canvas.backgroundImage);
        
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

  // Função para coletar dados dos canvas para salvamento
  const getCanvasData = useCallback((): CanvasData | null => {
    try {
      // Pegar o canvas da frente (primeira página)
      const frontPage = pages[0];
      if (!frontPage) {
        toast.error('Nenhuma página encontrada');
        return null;
      }

      const frontCanvasRef = canvasRefs.current.get(frontPage.id);
      if (!frontCanvasRef) {
        toast.error('Canvas da frente não encontrado');
        return null;
      }

      const frontCanvas = frontCanvasRef.getCanvas();
      if (!frontCanvas) {
        toast.error('Canvas da frente não está inicializado');
        return null;
      }

      // Serializar o canvas da frente, mas excluir o retângulo branco de background
      const originalObjects = frontCanvas.getObjects();
      
      // Temporariamente remover o retângulo branco
      const whiteRect = originalObjects.find((obj: any) => 
        (obj as any).name === 'backgroundRect' && obj.fill === 'white'
      );
      
      if (whiteRect) {
        frontCanvas.remove(whiteRect);
      }
      
      // Antes de serializar, verificar se os objetos têm a propriedade name
      const objectsWithNames = frontCanvas.getObjects();
      console.log('Objetos antes de serializar:', objectsWithNames.map((obj: any) => ({
        type: obj.type,
        name: (obj as any).name,
        fill: obj.fill
      })));
      
      // Serializar o canvas
      // No Fabric.js v6, precisamos adicionar a propriedade ao objeto antes de serializar
      const canvasJSON = frontCanvas.toObject(['name']);
      
      // Adicionar manualmente a propriedade name aos objetos no JSON
      if (canvasJSON.objects) {
        canvasJSON.objects.forEach((objData: any, index: number) => {
          const originalObj = objectsWithNames[index];
          if ((originalObj as any).name) {
            objData.name = (originalObj as any).name;
          }
        });
      }
      
      const fabricJsonFront = canvasJSON;
      
      console.log('JSON final:', fabricJsonFront);
      console.log('Objetos no JSON final:', fabricJsonFront.objects?.map((obj: any) => ({
        type: obj.type,
        name: obj.name
      })));
      
      // Re-adicionar o retângulo branco
      if (whiteRect) {
        // Re-adicionar como primeiro objeto
        const currentObjects = frontCanvas.getObjects();
        frontCanvas.clear();
        frontCanvas.add(whiteRect);
        currentObjects.forEach((obj: fabric.Object) => frontCanvas.add(obj));
      }

      // Pegar as dimensões do canvas
      const canvasWidth = frontCanvas.width || 800;
      const canvasHeight = frontCanvas.height || 600;

      // Verificar se existe segunda página
      let fabricJsonBack = null;
      if (pages.length > 1) {
        const backPage = pages[1];
        const backCanvasRef = canvasRefs.current.get(backPage.id);
        if (backCanvasRef) {
          const backCanvas = backCanvasRef.getCanvas();
          if (backCanvas) {
            // Temporariamente remover o retângulo branco do verso
            const backOriginalObjects = backCanvas.getObjects();
            const backWhiteRect = backOriginalObjects.find((obj: any) => 
              (obj as any).name === 'backgroundRect' && obj.fill === 'white'
            );
            
            if (backWhiteRect) {
              backCanvas.remove(backWhiteRect);
            }
            
            // Serializar o canvas do verso
            const backObjectsWithNames = backCanvas.getObjects();
            const backCanvasJSON = backCanvas.toObject(['name']);
            
            // Adicionar manualmente a propriedade name aos objetos
            if (backCanvasJSON.objects) {
              backCanvasJSON.objects.forEach((objData: any, index: number) => {
                const originalObj = backObjectsWithNames[index];
                if ((originalObj as any).name) {
                  objData.name = (originalObj as any).name;
                }
              });
            }
            
            fabricJsonBack = backCanvasJSON;
            
            // Re-adicionar o retângulo branco
            if (backWhiteRect) {
              const backCurrentObjects = backCanvas.getObjects();
              backCanvas.clear();
              backCanvas.add(backWhiteRect);
              backCurrentObjects.forEach((obj: fabric.Object) => backCanvas.add(obj));
            }
          }
        }
      }

      return {
        fabricJsonFront,
        fabricJsonBack,
        canvasWidth,
        canvasHeight
      };
    } catch (error) {
      console.error('Erro ao coletar dados do canvas:', error);
      toast.error('Erro ao preparar dados para salvamento');
      return null;
    }
  }, [pages]);

  // Função para carregar dados nos canvas
  const loadCanvasData = useCallback(async (data: CanvasData) => {
    try {
      // Carregar dados no canvas da frente
      const frontPage = pages[0];
      if (!frontPage) {
        toast.error('Nenhuma página disponível para carregar');
        return;
      }

      const frontCanvasRef = canvasRefs.current.get(frontPage.id);
      if (!frontCanvasRef) {
        toast.error('Canvas da frente não encontrado');
        return;
      }

      const frontCanvas = frontCanvasRef.getCanvas();
      if (!frontCanvas) {
        toast.error('Canvas da frente não está inicializado');
        return;
      }

      // Limpar e carregar o canvas da frente
      frontCanvas.clear();
      await new Promise<void>((resolve, reject) => {
        frontCanvas.loadFromJSON(data.fabricJsonFront, async () => {
          // Adicionar IDs únicos aos objetos carregados se não tiverem
          let idCounter = 0;
          frontCanvas.getObjects().forEach((obj: fabric.Object) => {
            const type = obj.type || 'object';
            const timestamp = Date.now();
            const uniqueId = `${type}_${timestamp}_${idCounter++}_${Math.random().toString(36).substring(2, 11)}`;
            (obj as any).__uniqueID = uniqueId;
            (obj as any).id = uniqueId;
          });
          
          // Forçar renderização e atualização dos eventos
          frontCanvas.renderAll();
          frontCanvas.calcOffset();
          
          // Re-emitir evento de canvas modificado para garantir que os listeners sejam atualizados
          frontCanvas.fire('path:created', {});
          
          // Aguardar um momento para garantir que todos os objetos sejam carregados
          setTimeout(async () => {
            // Primeiro, garantir que existe um retângulo branco de background
            const objects = frontCanvas.getObjects();
            let whiteRect = objects.find((obj: fabric.Object) => 
              (obj as any).name === 'backgroundRect' && obj.fill === 'white'
            );
            
            // Se não existir, criar um
            if (!whiteRect) {
              whiteRect = new fabric.Rect({
                left: 0,
                top: 0,
                width: 842, // A4 landscape
                height: 595,
                fill: 'white',
                selectable: false,
                evented: false,
                name: 'backgroundRect'
              } as any);
              
              // Adicionar como primeiro objeto
              const allObjs = frontCanvas.getObjects();
              frontCanvas.clear();
              frontCanvas.add(whiteRect);
              allObjs.forEach((obj: fabric.Object) => frontCanvas.add(obj));
            }
            
            // Procurar novamente após criar o retângulo branco
            const updatedObjects = frontCanvas.getObjects();
            const backgroundObj = updatedObjects.find((obj: fabric.Object) => 
              (obj as any).name === 'backgroundImage'
            );
            
            if (backgroundObj) {
              console.log('Background image found:', {
                name: (backgroundObj as any).name,
                type: backgroundObj.type,
                visible: backgroundObj.visible,
                opacity: backgroundObj.opacity,
                left: backgroundObj.left,
                top: backgroundObj.top,
                width: backgroundObj.width,
                height: backgroundObj.height
              });
              
              // Configurar como não selecionável mas visível
              backgroundObj.set({
                selectable: false,
                evented: false,
                hasControls: false,
                hasBorders: false,
                lockMovementX: true,
                lockMovementY: true,
                lockRotation: true,
                lockScalingX: true,
                lockScalingY: true,
                visible: true,  // Garantir que está visível
                opacity: 1      // Garantir opacidade total
              });
              
              // Garantir que está logo acima do retângulo branco
              const finalObjects = frontCanvas.getObjects();
              const whiteRectIndex = finalObjects.findIndex((obj: fabric.Object) => 
                (obj as any).name === 'backgroundRect' && obj.fill === 'white'
              );
              const bgIndex = finalObjects.indexOf(backgroundObj);
              
              // Se o background não está na posição correta (logo após o retângulo branco)
              if (whiteRectIndex !== -1 && bgIndex !== whiteRectIndex + 1) {
                // Reorganizar objetos
                const rectObj = finalObjects[whiteRectIndex];
                const otherObjects = finalObjects.filter((obj: fabric.Object) => 
                  obj !== backgroundObj && obj !== rectObj
                );
                
                frontCanvas.clear();
                frontCanvas.add(rectObj); // Retângulo branco primeiro
                frontCanvas.add(backgroundObj); // Background logo acima
                otherObjects.forEach((obj: fabric.Object) => frontCanvas.add(obj)); // Outros objetos
              }
              
              console.log('Background configured successfully');
            } else {
              console.log('No background image found');
            }
            
            frontCanvas.renderAll();
            // Forçar atualização do canvas
            frontCanvas.requestRenderAll();
            resolve();
          }, 100);
        }, (error: any) => {
          console.error('Erro ao carregar JSON:', error);
          reject(error);
        });
      });

      // Se houver dados do verso, criar segunda página se necessário e carregar
      if (data.fabricJsonBack) {
        // Se não houver segunda página, criar uma
        if (pages.length === 1) {
          await addPage();
          // Aguardar um pouco para a página ser criada
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Pegar a referência atualizada das páginas
        const backPage = pages[1] || (await new Promise<CanvasPage>((resolve) => {
          setTimeout(() => {
            const updatedPages = canvasRefs.current.size > 1 ? 
              Array.from(canvasRefs.current.keys()).map(id => ({ 
                id, 
                orientation: 'landscape' as const, 
                zoomLevel: 100,
                canvasRef: null 
              }))[1] : null;
            if (updatedPages) resolve(updatedPages);
          }, 200);
        }));

        if (backPage) {
          const backCanvasRef = canvasRefs.current.get(backPage.id);
          if (backCanvasRef) {
            const backCanvas = backCanvasRef.getCanvas();
            if (backCanvas) {
              backCanvas.clear();
              await new Promise<void>((resolve, reject) => {
                backCanvas.loadFromJSON(data.fabricJsonBack, async () => {
                  // Adicionar IDs únicos aos objetos carregados se não tiverem
                  let backIdCounter = 0;
                  backCanvas.getObjects().forEach((obj: fabric.Object) => {
                    const type = obj.type || 'object';
                    const timestamp = Date.now();
                    const uniqueId = `${type}_${timestamp}_back_${backIdCounter++}_${Math.random().toString(36).substring(2, 11)}`;
                    (obj as any).__uniqueID = uniqueId;
                    (obj as any).id = uniqueId;
                  });
                  
                  // Aguardar um momento para garantir que todos os objetos sejam carregados
                  setTimeout(async () => {
                    // Verificar se há objetos marcados como background (imagem, não o retângulo branco)
                    const objects = backCanvas.getObjects();
                    const backgroundObj = objects.find((obj: fabric.Object) => 
                      (obj as any).name === 'backgroundImage'
                    );
                    
                    if (backgroundObj) {
                      // Garantir que o background fique no índice 0 e não seja selecionável
                      backgroundObj.set({
                        selectable: false,
                        evented: false,
                        hasControls: false,
                        hasBorders: false,
                        lockMovementX: true,
                        lockMovementY: true,
                        lockRotation: true,
                        lockScalingX: true,
                        lockScalingY: true
                      });
                      
                      // Garantir que está no fundo
                      const allObjects = backCanvas.getObjects();
                      const bgIndex = allObjects.indexOf(backgroundObj);
                      
                      if (bgIndex > 0) {
                        const objectsToReorder = allObjects.filter((obj: fabric.Object) => obj !== backgroundObj);
                        backCanvas.clear();
                        backCanvas.add(backgroundObj);
                        objectsToReorder.forEach((obj: fabric.Object) => backCanvas.add(obj));
                      }
                      
                      console.log('Background object found and configured for back page');
                    }
                    
                    backCanvas.renderAll();
                    // Forçar atualização do canvas
                    backCanvas.requestRenderAll();
                    resolve();
                  }, 100);
                }, (error: any) => {
                  console.error('Erro ao carregar JSON do verso:', error);
                  reject(error);
                });
              });
            }
          }
        }
      }

      toast.success('Modelo carregado com sucesso!');
    } catch (error) {
      console.error('Erro ao carregar dados no canvas:', error);
      toast.error('Erro ao carregar modelo no canvas');
    }
  }, [pages, addPage]);

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
    checkCanvasTainted,
    getCanvasData,
    loadCanvasData
  };
};