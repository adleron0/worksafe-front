import { useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import * as fabric from 'fabric';
import jsPDF from 'jspdf';
import { applyFontOverrides } from '../utils/fontConfig';
import { isTextObject } from '../types';

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

// Função helper para processar imagens no JSON e aplicar proxy
const processImagesInJSON = (jsonData: any): any => {
  // Se for string, fazer parse
  const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

  // Se houver objetos no JSON
  if (data.objects && Array.isArray(data.objects)) {
    data.objects = data.objects.map((obj: any) => {
      // Se for uma imagem (verificar case insensitive)
      if (obj.type && obj.type.toLowerCase() === 'image') {
        let originalSrc = obj.src;

        // IMPORTANTE: Detectar se a URL já tem proxy e extrair a URL original
        if (obj.src && obj.src.includes('/images/proxy')) {
          try {
            // Criar URL completa se necessário
            const fullUrl = obj.src.startsWith('http') ? obj.src : `${window.location.origin}${obj.src}`;
            const urlObj = new URL(fullUrl);
            const encodedOriginal = urlObj.searchParams.get('url');
            if (encodedOriginal) {
              originalSrc = decodeURIComponent(encodedOriginal);
            }
          } catch (e) {
            // Error extracting original URL
          }
        }

        // Aplicar proxy apenas se for URL externa e não tiver proxy
        if (originalSrc && (originalSrc.startsWith('http://') || originalSrc.startsWith('https://'))) {
          const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3001';
          obj.src = `${BASE_URL}/images/proxy?url=${encodeURIComponent(originalSrc)}`;
          // Guardar URL original para referência
          obj._originalUrl = originalSrc;
        }
      }
      return obj;
    });
  }

  return data;
};

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
    return ref;
  }, [getCurrentPage]);

  const handleApplyAsBackground = useCallback(async (target: fabric.Object) => {
    const canvasRef = getCurrentCanvasRef();
    if (!canvasRef) {
      return;
    }
    
    const canvas = canvasRef.getCanvas();
    if (!canvas) return;

    const image = target as fabric.FabricImage;
    
    if (image) {
      try {
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
        } else {
          // Fallback para dimensões padrão A4 landscape
          canvasWidth = 842;
          canvasHeight = 595;
        }
        
        // Obter dimensões originais da imagem
        const originalWidth = clonedImage.width || clonedImage.getScaledWidth();
        const originalHeight = clonedImage.height || clonedImage.getScaledHeight();

        // Calcular escala para cobrir todo o canvas
        const scaleToFitWidth = canvasWidth / originalWidth;
        const scaleToFitHeight = canvasHeight / originalHeight;
        
        // Usar a maior escala para garantir cobertura total
        const finalScale = Math.max(scaleToFitWidth, scaleToFitHeight);

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

        toast.success('Imagem aplicada ao fundo!');
      } catch (error) {
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

  const handleDuplicateObject = useCallback((target: fabric.Object) => {
    const canvasRef = getCurrentCanvasRef();
    if (!canvasRef) return;
    
    const canvas = canvasRef.getCanvas();
    if (!canvas) return;

    // Clonar o objeto
    target.clone().then((cloned: fabric.Object) => {
      // Deslocar o objeto clonado para não ficar exatamente em cima do original
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
        evented: true,
      });
      
      // Preservar propriedades customizadas
      const originalProps = target as any;
      const clonedProps = cloned as any;
      
      if (originalProps.name) {
        clonedProps.name = originalProps.name;
      }
      if (originalProps._originalUrl) {
        clonedProps._originalUrl = originalProps._originalUrl;
      }
      if (originalProps.__uniqueID) {
        // Gerar novo ID único para o clone
        clonedProps.__uniqueID = `${originalProps.__uniqueID}_clone_${Date.now()}`;
      }
      
      // Adicionar ao canvas
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      
      toast.success('Item duplicado com sucesso!');
    }).catch(() => {
      toast.error('Erro ao duplicar item');
    });
  }, [getCurrentCanvasRef]);

  const addImageToCanvas = useCallback((imageUrl: string, imageName: string): Promise<void> => {
    const canvasRef = getCurrentCanvasRef();
    if (!canvasRef) {
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
    const canvasRef = getCurrentCanvasRef();
    if (!canvasRef) {
      return;
    }
    
    canvasRef.addShapeToCanvas(shapeType, shapeSettings);
  }, [getCurrentCanvasRef, currentPageIndex]);

  const addTextToCanvas = useCallback((text: string, textSettings: any) => {
    const canvasRef = getCurrentCanvasRef();
    if (!canvasRef) {
      return;
    }
    
    canvasRef.addTextToCanvas(text, textSettings);
  }, [getCurrentCanvasRef, currentPageIndex]);

  const addPlaceholderToCanvas = useCallback((placeholderName: string) => {
    const canvasRef = getCurrentCanvasRef();
    if (!canvasRef) {
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
    canvasRefs.current.set(pageId, ref);
  }, []);

  const checkCanvasTainted = useCallback(() => {
    const canvasRef = getCurrentCanvasRef();
    if (!canvasRef) {
      return false;
    }

    const canvas = canvasRef.getCanvas();
    if (!canvas) {
      return false;
    }

    try {
      // Tentar acessar o contexto 2D do canvas
      const canvasElement = canvas.lowerCanvasEl;
      const ctx = canvasElement.getContext('2d');
      if (!ctx) {
        return false;
      }

      // Tentar obter dados de imagem - isso falhará se o canvas estiver tainted
      ctx.getImageData(0, 0, 1, 1);
      return false;
    } catch (e) {
      return true;
    }
  }, [getCurrentCanvasRef]);

  // Propriedades customizadas a incluir na serialização
  const SERIALIZE_PROPS = [
    'name', '_originalUrl', 'originY', 'targetHeight', 'targetWidth',
    'placeholderNameDebug', 'width', 'splitByGrapheme', 'selectable',
    'evented', 'hasControls', 'hasBorders', 'lockMovementX', 'lockMovementY',
    'lockScalingX', 'lockScalingY', 'lockRotation', 'editable',
    'listType', 'listIndent', 'listItemSpacing',
  ];

  /**
   * Serializa um canvas: filtra backgroundRect do JSON e limpa URLs de proxy.
   * Não muta o canvas (sem remove/re-add).
   */
  const serializeCanvas = useCallback((canvasInstance: fabric.Canvas) => {
    const liveObjects = canvasInstance.getObjects();
    const canvasJSON = canvasInstance.toObject(SERIALIZE_PROPS);

    // Filtrar backgroundRect do JSON (sem remover do canvas)
    if (canvasJSON.objects) {
      // Mapa de objetos originais (por índice) antes de filtrar
      const indexedLive = liveObjects.map((obj, i) => ({ obj, i }));

      canvasJSON.objects = canvasJSON.objects.filter((_objData: any, index: number) => {
        const liveObj = liveObjects[index];
        return !((liveObj as any).name === 'backgroundRect' && liveObj.fill === 'white');
      });

      // Limpar URLs de proxy nas imagens
      const filteredLive = indexedLive.filter(({ obj }) =>
        !((obj as any).name === 'backgroundRect' && obj.fill === 'white')
      );

      canvasJSON.objects.forEach((objData: any, idx: number) => {
        const liveObj = filteredLive[idx]?.obj;
        if (!liveObj) return;

        if (objData.type && objData.type.toLowerCase() === 'image') {
          if ((liveObj as any)._originalUrl) {
            objData.src = (liveObj as any)._originalUrl;
          } else if (objData.src && objData.src.includes('/images/proxy')) {
            try {
              const fullUrl = objData.src.startsWith('http') ? objData.src : `${window.location.origin}${objData.src}`;
              const parsed = new URL(fullUrl);
              const encoded = parsed.searchParams.get('url');
              if (encoded) objData.src = decodeURIComponent(encoded);
            } catch {
              // Ignore URL parse errors
            }
          }
        }
      });
    }

    return canvasJSON;
  }, []);

  // Função para coletar dados dos canvas para salvamento
  const getCanvasData = useCallback((): CanvasData | null => {
    try {
      const frontPage = pages[0];
      if (!frontPage) { toast.error('Nenhuma página encontrada'); return null; }

      const frontCanvasRef = canvasRefs.current.get(frontPage.id);
      if (!frontCanvasRef) { toast.error('Canvas da frente não encontrado'); return null; }

      const frontCanvas = frontCanvasRef.getCanvas();
      if (!frontCanvas) { toast.error('Canvas da frente não está inicializado'); return null; }

      const fabricJsonFront = serializeCanvas(frontCanvas);

      // Dimensões A4
      const currentOrientation = frontPage.orientation || 'landscape';
      const canvasWidth = currentOrientation === 'landscape' ? 842 : 595;
      const canvasHeight = currentOrientation === 'landscape' ? 595 : 842;

      // Segunda página (verso)
      let fabricJsonBack = null;
      if (pages.length > 1) {
        const backPage = pages[1];
        const backCanvasRef = canvasRefs.current.get(backPage.id);
        if (backCanvasRef) {
          const backCanvas = backCanvasRef.getCanvas();
          if (backCanvas) {
            fabricJsonBack = serializeCanvas(backCanvas);
          }
        }
      }

      return { fabricJsonFront, fabricJsonBack, canvasWidth, canvasHeight };
    } catch (error) {
      toast.error('Erro ao preparar dados para salvamento');
      return null;
    }
  }, [pages, serializeCanvas]);

  // Função para carregar dados nos canvas
  const loadCanvasData = useCallback(async (data: CanvasData) => {
    try {
      // Detectar orientação baseada nas dimensões do certificado
      const width = data.canvasWidth || 842;
      const height = data.canvasHeight || 595;
      const detectedOrientation: 'landscape' | 'portrait' = width > height ? 'landscape' : 'portrait';

      // Atualizar a orientação das páginas existentes se necessário
      const updatedPages = pages.map(page => ({
        ...page,
        orientation: detectedOrientation
      }));
      
      // Se houver mudança na orientação, atualizar as páginas
      if (pages[0] && pages[0].orientation !== detectedOrientation) {
        setPages(updatedPages);
      }
      
      // Carregar dados no canvas da frente
      const frontPage = updatedPages[0] || pages[0];
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
        // Preparar para preservar fontes
        const fontsToPreserve = new Map<string, string>();
        
        // Extrair fontes do JSON antes de carregar
        if (data.fabricJsonFront.objects) {
          data.fabricJsonFront.objects.forEach((objData: any, index: number) => {
            if ((objData.type === 'textbox' || objData.type === 'i-text' || objData.type === 'ListTextbox') && objData.fontFamily) {
              const tempId = `temp_${index}_${objData.text?.substring(0, 10)}`;
              fontsToPreserve.set(tempId, objData.fontFamily);
            }
          });
        }
        
        // Processar as imagens para usar o proxy antes de carregar
        const processedJsonFront = processImagesInJSON(data.fabricJsonFront);

        // Backward compat: promover Textbox com listType para ListTextbox
        if (processedJsonFront.objects) {
          processedJsonFront.objects = processedJsonFront.objects.map((obj: any) => {
            if (
              (obj.type === 'Textbox' || obj.type === 'textbox') &&
              obj.listType && obj.listType !== 'none'
            ) {
              return { ...obj, type: 'ListTextbox' };
            }
            return obj;
          });
        }

        // IMPORTANTE: Configurar o Fabric.js para usar o proxy ANTES de carregar o JSON
        const originalFromURL = fabric.FabricImage.fromURL;
        fabric.FabricImage.fromURL = function(url: string, ...args: any[]) {
          let processedUrl = url;
          const originalUrl = url; // Sempre salvar URL original
          
          if (url && (url.startsWith('http://') || url.startsWith('https://')) && !url.includes('/images/proxy')) {
            const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3001';
            // Adicionar timestamp para evitar cache
            const timestamp = Date.now();
            processedUrl = `${BASE_URL}/images/proxy?url=${encodeURIComponent(url)}&t=${timestamp}`;
          }
          
          // Garantir crossOrigin anonymous
          if (args[0] && typeof args[0] === 'object') {
            args[0].crossOrigin = 'anonymous';
          } else if (args[0] && typeof args[0] === 'function') {
            // Se o primeiro arg for callback, adicionar options como segundo
            args.splice(1, 0, { crossOrigin: 'anonymous' });
          }
          
          // Chamar método original e depois preservar URL original
          return originalFromURL.call(this, processedUrl, ...args).then((img: any) => {
            if (img) {
              // IMPORTANTE: Preservar URL original para não salvar proxy no JSON
              img._originalUrl = originalUrl;
              // Sobrescrever o src para manter URL original
              Object.defineProperty(img, 'src', {
                get: function() { return originalUrl; },
                set: function() { /* ignorar mudanças */ },
                configurable: true
              });
            }
            return img;
          });
        };
        
        frontCanvas.loadFromJSON(processedJsonFront, async () => {
          // Restaurar o método original após carregar
          fabric.FabricImage.fromURL = originalFromURL;

          // Adicionar IDs únicos aos objetos carregados se não tiverem
          let idCounter = 0;
          const textObjects: fabric.Textbox[] = [];

          frontCanvas.getObjects().forEach((obj: fabric.Object, index: number) => {
            const type = obj.type || 'object';
            const timestamp = Date.now();
            const uniqueId = `${type}_${timestamp}_${idCounter++}_${Math.random().toString(36).substring(2, 11)}`;
            (obj as any).__uniqueID = uniqueId;
            (obj as any).id = uniqueId;
            
            // Verificar se é uma imagem e qual URL está usando (case insensitive)
            if (obj.type && obj.type.toLowerCase() === 'image') {
              const imageObj = obj as fabric.FabricImage;
              let src = (imageObj as any).src || imageObj.getSrc();

              // FORÇAR o uso do proxy se a URL for externa e não estiver usando proxy
              if (src && (src.startsWith('http://') || src.startsWith('https://')) && !src.includes('/images/proxy')) {
                const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3001';
                const proxiedUrl = `${BASE_URL}/images/proxy?url=${encodeURIComponent(src)}`;

                // Guardar propriedades da imagem atual
                const props = {
                  left: imageObj.left,
                  top: imageObj.top,
                  angle: imageObj.angle,
                  opacity: imageObj.opacity,
                  scaleX: imageObj.scaleX,
                  scaleY: imageObj.scaleY,
                  flipX: imageObj.flipX,
                  flipY: imageObj.flipY,
                  selectable: imageObj.selectable,
                  evented: imageObj.evented,
                  name: (imageObj as any).name,
                  _originalUrl: src
                };
                
                // Remover imagem antiga
                frontCanvas.remove(imageObj);
                
                // Criar nova imagem com proxy
                fabric.FabricImage.fromURL(proxiedUrl, {
                  crossOrigin: 'anonymous'
                }).then((newImage) => {
                  // Aplicar propriedades salvas
                  newImage.set(props);
                  (newImage as any).__uniqueID = (imageObj as any).__uniqueID;
                  (newImage as any).id = (imageObj as any).id;
                  
                  // Adicionar ao canvas na mesma posição
                  frontCanvas.insertAt(newImage, index);
                  frontCanvas.renderAll();
                }).catch(() => {
                  // Re-adicionar imagem original em caso de erro
                  frontCanvas.insertAt(imageObj, index);
                });
              }
            }
            
            // Coletar objetos de texto
            if (isTextObject(obj)) {
              // Limpar texto de espaços extras que podem ter vindo do JSON
              const originalText = obj.text || '';
              const cleanText = originalText.trim();
              if (originalText !== cleanText) {
                obj.set('text', cleanText);
              }

              // Verificar e corrigir charSpacing se estiver com valor errado
              const currentCharSpacing = (obj as any).charSpacing || 0;
              if (currentCharSpacing > 100 || currentCharSpacing < -50) {
                obj.set('charSpacing' as keyof fabric.Textbox, 0 as any);
              }

              // Aplicar overrides de fonte (ex: Bebas Neue)
              applyFontOverrides(obj);

              // Recalcular dimensões do textbox baseado no texto real
              obj.initDimensions();

              const tempId = `temp_${index}_${obj.text?.substring(0, 10)}`;
              const originalFont = fontsToPreserve.get(tempId);

              if (originalFont) {
                // Armazenar a fonte desejada para aplicação posterior
                (obj as any)._targetFontFamily = originalFont;
                textObjects.push(obj);
              }
            }
          });
          
          // Função para aplicar fontes com verificação robusta
          const applyFontsWithRetry = async (attempts = 0, maxAttempts = 5) => {
            let fontsApplied = 0;
            let fontsTotal = textObjects.length;

            for (const textObj of textObjects) {
              const targetFont = (textObj as any)._targetFontFamily;
              if (!targetFont) continue;

              // Verificar se a fonte está disponível
              const isFontAvailable = document.fonts.check(`12px "${targetFont}"`);

              if (isFontAvailable) {
                // Estratégia robusta de aplicação de fonte
                // 1. Forçar fallback temporário
                textObj.set('fontFamily', 'Arial');
                frontCanvas.renderAll();

                // 2. Aguardar frame para garantir que o fallback foi aplicado
                await new Promise(resolve => requestAnimationFrame(resolve));

                // 3. Aplicar a fonte desejada
                textObj.set('fontFamily', targetFont);
                textObj.dirty = true;

                // 4. Forçar recálculo de dimensões
                textObj._clearCache();
                textObj.setCoords();

                fontsApplied++;
              }
            }

            // Renderizar após todas as mudanças
            frontCanvas.renderAll();
            frontCanvas.requestRenderAll();

            // Se nem todas as fontes foram aplicadas e ainda temos tentativas
            if (fontsApplied < fontsTotal && attempts < maxAttempts - 1) {
              setTimeout(() => applyFontsWithRetry(attempts + 1, maxAttempts), 200);
            }
          };
          
          // Iniciar aplicação de fontes após um breve delay para garantir que o canvas está estável
          setTimeout(() => applyFontsWithRetry(), 100);
          
          // Re-emitir evento de canvas modificado para garantir que os listeners sejam atualizados
          frontCanvas.fire('path:created', {});
          
          // Configurar objetos de background após as fontes estarem corretas
          setTimeout(() => {
            // Primeiro, garantir que existe um retângulo branco de background
            const objects = frontCanvas.getObjects();
            let whiteRect = objects.find((obj: fabric.Object) => 
              (obj as any).name === 'backgroundRect' && obj.fill === 'white'
            );
            
            // Se não existir, criar um com dimensões baseadas na orientação detectada
            if (!whiteRect) {
              // Usar as dimensões A4 baseadas na orientação detectada
              const rectWidth = detectedOrientation === 'landscape' ? 842 : 595;
              const rectHeight = detectedOrientation === 'landscape' ? 595 : 842;
              
              whiteRect = new fabric.Rect({
                left: 0,
                top: 0,
                width: rectWidth,
                height: rectHeight,
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
              const whiteRectObj = finalObjects.find((obj: fabric.Object) => 
                (obj as any).name === 'backgroundRect' && obj.fill === 'white'
              );
              const bgIndex = finalObjects.indexOf(backgroundObj);
              const whiteRectIndex = whiteRectObj ? finalObjects.indexOf(whiteRectObj) : -1;
              
              // Só reorganizar se a ordem estiver errada (background deve estar logo após o retângulo branco)
              if (whiteRectObj && (whiteRectIndex > bgIndex || bgIndex > 1)) {
                // Reorganizar objetos
                const otherObjects = finalObjects.filter((obj: fabric.Object) => 
                  obj !== backgroundObj && obj !== whiteRectObj
                );
                
                frontCanvas.remove(...finalObjects);
                frontCanvas.add(whiteRectObj); // Retângulo branco primeiro
                frontCanvas.add(backgroundObj); // Imagem de background em segundo
                otherObjects.forEach((obj: fabric.Object) => frontCanvas.add(obj)); // Outros objetos
              }
              
            }

            frontCanvas.renderAll();
            // Forçar atualização do canvas
            frontCanvas.requestRenderAll();
            resolve();
          }, 100);
        }, (error: any) => {
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
                // Processar as imagens para usar o proxy antes de carregar
              const processedJsonBack = processImagesInJSON(data.fabricJsonBack);

              // Backward compat: promover Textbox com listType para ListTextbox
              if (processedJsonBack.objects) {
                processedJsonBack.objects = processedJsonBack.objects.map((obj: any) => {
                  if (
                    (obj.type === 'Textbox' || obj.type === 'textbox') &&
                    obj.listType && obj.listType !== 'none'
                  ) {
                    return { ...obj, type: 'ListTextbox' };
                  }
                  return obj;
                });
              }
              
              // Interceptar carregamento de imagens do verso também
              const originalFromURLBack = fabric.FabricImage.fromURL;
              fabric.FabricImage.fromURL = function(url: string, ...args: any[]) {
                let processedUrl = url;
                const originalUrl = url; // Sempre salvar URL original
                
                if (url && (url.startsWith('http://') || url.startsWith('https://')) && !url.includes('/images/proxy')) {
                  const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3001';
                  const timestamp = Date.now();
                  processedUrl = `${BASE_URL}/images/proxy?url=${encodeURIComponent(url)}&t=${timestamp}`;
                }
                
                // Garantir crossOrigin anonymous
                if (args[0] && typeof args[0] === 'object') {
                  args[0].crossOrigin = 'anonymous';
                } else if (args[0] && typeof args[0] === 'function') {
                  args.splice(1, 0, { crossOrigin: 'anonymous' });
                }
                
                // Chamar método original e depois preservar URL original
                return originalFromURLBack.call(this, processedUrl, ...args).then((img: any) => {
                  if (img) {
                    // IMPORTANTE: Preservar URL original para não salvar proxy no JSON
                    img._originalUrl = originalUrl;
                    // Sobrescrever o src para manter URL original
                    Object.defineProperty(img, 'src', {
                      get: function() { return originalUrl; },
                      set: function() { /* ignorar mudanças */ },
                      configurable: true
                    });
                  }
                  return img;
                });
              };
              
              backCanvas.loadFromJSON(processedJsonBack, async () => {
                // Restaurar o método original
                fabric.FabricImage.fromURL = originalFromURLBack;
                  // Adicionar IDs únicos aos objetos carregados se não tiverem
                  let backIdCounter = 0;
                  backCanvas.getObjects().forEach((obj: fabric.Object, objIndex: number) => {
                    const type = obj.type || 'object';
                    const timestamp = Date.now();
                    const uniqueId = `${type}_${timestamp}_back_${backIdCounter++}_${Math.random().toString(36).substring(2, 11)}`;
                    (obj as any).__uniqueID = uniqueId;
                    (obj as any).id = uniqueId;
                    
                    // Aplicar proxy em imagens do verso também (case insensitive)
                    if (obj.type && obj.type.toLowerCase() === 'image') {
                      const imageObj = obj as fabric.FabricImage;
                      let src = (imageObj as any).src || imageObj.getSrc();
                      
                      if (src && (src.startsWith('http://') || src.startsWith('https://')) && !src.includes('/images/proxy')) {
                        const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3001';
                        const proxiedUrl = `${BASE_URL}/images/proxy?url=${encodeURIComponent(src)}`;

                        const props = {
                          left: imageObj.left,
                          top: imageObj.top,
                          angle: imageObj.angle,
                          opacity: imageObj.opacity,
                          scaleX: imageObj.scaleX,
                          scaleY: imageObj.scaleY,
                          flipX: imageObj.flipX,
                          flipY: imageObj.flipY,
                          selectable: imageObj.selectable,
                          evented: imageObj.evented,
                          name: (imageObj as any).name,
                          _originalUrl: src
                        };
                        
                        backCanvas.remove(imageObj);
                        
                        fabric.FabricImage.fromURL(proxiedUrl, {
                          crossOrigin: 'anonymous'
                        }).then((newImage) => {
                          newImage.set(props);
                          (newImage as any).__uniqueID = uniqueId;
                          (newImage as any).id = uniqueId;
                          backCanvas.insertAt(newImage, objIndex);
                          backCanvas.renderAll();
                        });
                      }
                    }
                  });
                  
                  // Aguardar um momento para garantir que todos os objetos sejam carregados
                  setTimeout(async () => {
                    // Primeiro, garantir que existe um retângulo branco de background no verso
                    let objects = backCanvas.getObjects();
                    let whiteRect = objects.find((obj: fabric.Object) => 
                      (obj as any).name === 'backgroundRect' && obj.fill === 'white'
                    );
                    
                    // Se não existir, criar um com dimensões baseadas na orientação detectada
                    if (!whiteRect) {
                      // Usar as dimensões A4 baseadas na orientação detectada
                      const rectWidth = detectedOrientation === 'landscape' ? 842 : 595;
                      const rectHeight = detectedOrientation === 'landscape' ? 595 : 842;
                      
                      whiteRect = new fabric.Rect({
                        left: 0,
                        top: 0,
                        width: rectWidth,
                        height: rectHeight,
                        fill: 'white',
                        selectable: false,
                        evented: false,
                        name: 'backgroundRect'
                      } as any);
                      
                      // Adicionar como primeiro objeto (mas SEM limpar o canvas)
                      const allObjs = [...backCanvas.getObjects()];
                      backCanvas.remove(...allObjs);
                      backCanvas.add(whiteRect);
                      allObjs.forEach((obj: fabric.Object) => backCanvas.add(obj));
                      
                      // Atualizar referência dos objetos
                      objects = backCanvas.getObjects();
                    }
                    
                    // Verificar se há objetos marcados como background (imagem, não o retângulo branco)
                    const backgroundObj = objects.find((obj: fabric.Object) => 
                      (obj as any).name === 'backgroundImage'
                    );
                    
                    if (backgroundObj) {
                      // Garantir que o background fique não selecionável
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
                      
                      // Reorganizar objetos: retângulo branco primeiro, depois imagem de background, depois outros
                      const allObjects = backCanvas.getObjects();
                      const whiteRectObj = allObjects.find((obj: fabric.Object) => 
                        (obj as any).name === 'backgroundRect' && obj.fill === 'white'
                      );
                      const bgIndex = allObjects.indexOf(backgroundObj);
                      const whiteRectIndex = whiteRectObj ? allObjects.indexOf(whiteRectObj) : -1;
                      
                      // Só reorganizar se a ordem estiver errada
                      if (whiteRectObj && (whiteRectIndex > bgIndex || bgIndex > 1)) {
                        const otherObjects = allObjects.filter((obj: fabric.Object) => 
                          obj !== backgroundObj && obj !== whiteRectObj
                        );
                        
                        backCanvas.remove(...allObjects);
                        backCanvas.add(whiteRectObj); // Retângulo branco primeiro
                        backCanvas.add(backgroundObj); // Imagem de background em segundo
                        otherObjects.forEach((obj: fabric.Object) => backCanvas.add(obj)); // Outros objetos
                      }
                      
                    }

                    backCanvas.renderAll();
                    // Forçar atualização do canvas
                    backCanvas.requestRenderAll();
                    resolve();
                  }, 100);
                }, (error: any) => {
                  reject(error);
                });
              });
            }
          }
        }
      }

      toast.success('Modelo carregado com sucesso!');
    } catch (error) {
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
          continue;
        }

        const canvas = canvasRef.getCanvas();
        if (!canvas) {
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
    } catch {
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
    handleDuplicateObject,
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