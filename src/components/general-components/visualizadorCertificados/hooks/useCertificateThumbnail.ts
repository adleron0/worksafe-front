import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import * as fabric from 'fabric';
import { CertificateData, StudentData, VariableToReplace, ProcessedCanvasData } from '../types';
import { VariableReplacer } from '../utils/VariableReplacer';
import { decodeBase64Variables } from '@/utils/decodeBase64Variables';

interface CanvasPage {
  id: string;
  orientation: 'landscape' | 'portrait';
  canvasRef: any;
}

export const useCertificateThumbnail = (
  certificateData: CertificateData,
  variableToReplace: VariableToReplace,
  studentData?: StudentData // Mantém compatibilidade
) => {
  const [processedCanvasData, setProcessedCanvasData] = useState<ProcessedCanvasData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState<CanvasPage | null>(null);
  const canvasRef = useRef<any>(null);

  // Memorizar variableToReplace para evitar loops
  const memoizedVariables = useMemo(() => {
    return variableToReplace;
  }, [JSON.stringify(variableToReplace)]);

  // Processar dados quando certificateData ou variableToReplace mudarem
  useEffect(() => {
    const processData = async () => {
      setIsLoading(true);
      
      try {
        // Decodificar variableToReplace se estiver em base64
        const decodedVariables = decodeBase64Variables(memoizedVariables);
        
        // Determinar qual conjunto de variáveis usar (nova estrutura ou compatibilidade)
        const variables = decodedVariables || 
          (studentData ? convertStudentDataToVariables(studentData) : {});

        // Parsear o JSON se for string
        let frontJson;
        if (typeof certificateData.fabricJsonFront === 'string') {
          try {
            frontJson = JSON.parse(certificateData.fabricJsonFront);
          } catch (error) {
            frontJson = certificateData.fabricJsonFront;
          }
        } else {
          frontJson = certificateData.fabricJsonFront;
        }

        // Validar se todas as variáveis necessárias estão presentes
        const frontValidation = VariableReplacer.validateRequiredVariables(
          frontJson,
          variables
        );
        
        if (!frontValidation.isValid) {
          // Não bloquear, apenas avisar se necessário
          console.warn('Variáveis faltando:', frontValidation.missingVariables);
        }
        
        // Processar dados da frente (thumbnail sempre mostra apenas a frente)
        const frontProcessed = VariableReplacer.replaceInCanvasJSON(
          frontJson,
          variables
        );

        // Detectar orientação baseada nas dimensões do certificado
        const width = certificateData.canvasWidth || 842;
        const height = certificateData.canvasHeight || 595;
        const orientation: 'landscape' | 'portrait' = width > height ? 'landscape' : 'portrait';

        // Configurar página única (apenas frente para thumbnail)
        const newPage: CanvasPage = {
          id: 'thumbnail-page',
          orientation,
          canvasRef: null
        };

        setPage(newPage);

        const processedData = {
          fabricJsonFront: frontProcessed,
          fabricJsonBack: null, // Thumbnail não precisa do verso
          canvasWidth: certificateData.canvasWidth || 842,
          canvasHeight: certificateData.canvasHeight || 595,
          certificateId: certificateData.certificateId
        };
        
        setProcessedCanvasData(processedData);

      } catch (error) {
        console.error('Erro ao processar dados do thumbnail:', error);
        toast.error('Erro ao processar thumbnail do certificado');
      } finally {
        setIsLoading(false);
      }
    };

    // Sempre processar quando há certificateData
    if (certificateData) {
      processData();
    }
  }, [certificateData, memoizedVariables, studentData]);

  // Função helper para converter StudentData para VariableToReplace (compatibilidade)
  const convertStudentDataToVariables = (data: StudentData): VariableToReplace => {
    const variables: VariableToReplace = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Determinar tipo baseado na chave ou conteúdo
        const isUrl = key.includes('url') || key.includes('assinatura') || 
                     (typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:')));
        
        variables[key] = {
          type: isUrl ? 'url' : 'string',
          value: String(value)
        };
      }
    });
    return variables;
  };

  // Função para registrar referência do canvas
  const registerCanvasRef = useCallback((_pageId: string, ref: any) => {
    canvasRef.current = ref;
  }, []);

  // Função para aplicar proxy nas imagens do JSON
  const processImagesInJSON = useCallback((jsonData: any): any => {
    // Garantir que temos um objeto, não uma string
    let data;
    if (typeof jsonData === 'string') {
      try {
        data = JSON.parse(jsonData);
      } catch (error) {
        return jsonData;
      }
    } else {
      data = jsonData;
    }
    
    if (data.objects && Array.isArray(data.objects)) {
      data.objects = data.objects.map((obj: any) => {
        // Verificar se é uma imagem
        if (obj.type && obj.type.toLowerCase() === 'image' && obj.src) {
          const originalSrc = obj.src;
          
          // Verificar se já tem proxy aplicado
          if (originalSrc.includes('api.allorigins.win') || originalSrc.includes('/images/proxy')) {
            return obj;
          }
          
          // Se for URL externa, aplicar proxy
          if (originalSrc.startsWith('http://') || originalSrc.startsWith('https://')) {
            const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';
            obj.src = `${BASE_URL}/images/proxy?url=${encodeURIComponent(originalSrc)}`;
            obj._originalUrl = originalSrc;
          }
        }
        return obj;
      });
    }
    
    return data;
  }, []);

  // Função simplificada para carregar dados no canvas (apenas frente)
  const loadCanvasData = useCallback(async (data: ProcessedCanvasData) => {
    try {
      // Carregar apenas canvas da frente (thumbnail)
      if (canvasRef.current && data.fabricJsonFront) {
        const canvas = canvasRef.current.getCanvas();
        if (canvas) {
          // Limpar canvas mas manter o fundo branco
          canvas.clear();
          canvas.backgroundColor = '#ffffff';
          
          await new Promise<void>((resolve, reject) => {
            const processedJsonFront = processImagesInJSON(data.fabricJsonFront);
            
            try {
              // Garantir que o JSON está em formato correto
              const jsonToLoad = typeof processedJsonFront === 'string' 
                ? JSON.parse(processedJsonFront) 
                : processedJsonFront;
              
              // Adicionar background branco
              const rawWidth = data.canvasWidth || 842;
              const rawHeight = data.canvasHeight || 595;
              
              let width, height;
              if (rawWidth > rawHeight) {
                width = 842;
                height = 595;
              } else {
                width = 595;
                height = 842;
              }
              
              const bgRect = new fabric.Rect({
                left: 0,
                top: 0,
                width: width,
                height: height,
                fill: 'white',
                selectable: false,
                evented: false,
                name: 'backgroundRect'
              });
              
              if (!jsonToLoad.objects) {
                jsonToLoad.objects = [];
              }
              
              const hasBackground = jsonToLoad.objects.some((obj: any) => 
                obj.name === 'backgroundRect'
              );
              
              if (!hasBackground) {
                jsonToLoad.objects.unshift(bgRect.toObject(['name']));
              }
              
              canvas.loadFromJSON(jsonToLoad).then(async () => {
                // Função simplificada para processar textboxes
                const processTextboxes = () => {
                  canvas.getObjects().forEach((obj: any) => {
                    if ((obj.type === 'Textbox' || obj.type === 'textbox')) {
                      if (obj.width && obj.width > 0) {
                        const originalWidth = obj.width;
                        
                        if (obj._clearCache) {
                          obj._clearCache();
                        }
                        
                        obj.set({
                          width: originalWidth,
                          splitByGrapheme: obj.splitByGrapheme !== undefined ? obj.splitByGrapheme : false,
                          dirty: true
                        });
                        
                        if (obj.initDimensions) {
                          obj.initDimensions();
                        }
                        
                        if (obj.width !== originalWidth) {
                          obj.set('width', originalWidth);
                          if (obj.initDimensions) {
                            obj.initDimensions();
                          }
                        }
                      }
                    }
                  });
                  
                  canvas.requestRenderAll();
                };
                
                // Aguardar fonts carregarem
                if (document.fonts && document.fonts.ready) {
                  document.fonts.ready.then(() => {
                    processTextboxes();
                    requestAnimationFrame(() => {
                      processTextboxes();
                    });
                  });
                } else {
                  processTextboxes();
                }
                
                // Processar com delays para garantir
                setTimeout(() => processTextboxes(), 150);
                setTimeout(() => processTextboxes(), 500);
                
                // Primeiro passo: ocultar imagens de assinatura para evitar o "pulo" visual
                canvas.getObjects().forEach((obj: any) => {
                  if (obj.type === 'Image' || obj.type === 'image') {
                    const isAssinatura = obj.name?.includes('assinatura') || 
                                       obj.name?.includes('image_') ||
                                       obj.placeholderNameDebug?.includes('assinatura');
                    
                    if (isAssinatura) {
                      obj.set({ 
                        opacity: 0,
                        dirty: true 
                      });
                      canvas.renderAll();
                    }
                  }
                });
                
                // Ajustar escala das imagens
                setTimeout(() => {
                  canvas.getObjects().forEach((obj: any) => {
                    if (obj.type === 'Image' || obj.type === 'image') {
                      const isAssinatura = obj.name?.includes('assinatura') || 
                                         obj.name?.includes('image_') ||
                                         obj.placeholderNameDebug?.includes('assinatura');
                      
                      if (isAssinatura) {
                        if (obj.targetHeight && obj.targetWidth && obj._element) {
                          const naturalWidth = obj._element.naturalWidth;
                          const naturalHeight = obj._element.naturalHeight;
                          
                          if (naturalWidth && naturalHeight) {
                            const scaleToFitHeight = obj.targetHeight / naturalHeight;
                            const scaleToFitWidth = obj.targetWidth / naturalWidth;
                            const correctScale = Math.min(scaleToFitHeight, scaleToFitWidth);
                            
                            obj.set({
                              scaleX: correctScale,
                              scaleY: correctScale
                            });
                          }
                        }
                        
                        // Garantir que está com opacity 0 e depois setar para 1
                        obj.set({ opacity: 0 });
                        setTimeout(() => {
                          obj.set({ 
                            opacity: 1,
                            dirty: true
                          });
                          canvas.requestRenderAll();
                        }, 100);
                      }
                    }
                  });
                  
                  canvas.renderAll();
                }, 500);
                
                // Processar QR Codes se houver
                const objects = canvas.getObjects();
                const qrPromises: Promise<void>[] = [];
                
                for (let i = 0; i < objects.length; i++) {
                  const obj = objects[i] as any;
                  
                  if (obj.isQRCodePlaceholder && obj.qrCodeName) {
                    const certificateId = data.certificateId || obj.certificateId || 'CERT-001';
                    const validationUrl = `${window.location.origin}/certificados/${certificateId}`;
                    
                    canvas.remove(obj);
                    
                    const qrPromise = (async () => {
                      try {
                        const QR = await import('qrcode');
                        const qrDataUrl = await QR.toDataURL(validationUrl, {
                          width: 200,
                          margin: 1,
                          errorCorrectionLevel: 'H',
                          color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                          }
                        });
                        
                        const position = obj.preservedPosition || obj;
                        
                        await new Promise<void>((resolve, reject) => {
                          const img = new Image();
                          img.onload = () => {
                            const fabricImage = new fabric.Image(img);
                            
                            const targetWidth = position.width || 120;
                            const targetHeight = position.height || 120;
                            const placeholderScaleX = position.scaleX || 1;
                            const placeholderScaleY = position.scaleY || 1;
                            const finalWidth = targetWidth * placeholderScaleX;
                            const finalHeight = targetHeight * placeholderScaleY;
                            const scaleX = finalWidth / (fabricImage.width || 200);
                            const scaleY = finalHeight / (fabricImage.height || 200);
                            
                            fabricImage.set({
                              left: position.left || obj.left,
                              top: position.top || obj.top,
                              scaleX: scaleX,
                              scaleY: scaleY,
                              selectable: false,
                              evented: false,
                              hasControls: false,
                              hasBorders: false,
                              name: `qrcode_${obj.qrCodeName}`
                            });
                            
                            canvas.add(fabricImage);
                            canvas.renderAll();
                            
                            setTimeout(() => canvas.renderAll(), 100);
                            resolve();
                          };
                          
                          img.onerror = (error) => reject(error);
                          img.src = qrDataUrl;
                        });
                      } catch (error) {
                        console.error('Erro ao gerar QR Code:', error);
                      }
                    })();
                    
                    qrPromises.push(qrPromise);
                  }
                }
                
                if (qrPromises.length > 0) {
                  await Promise.all(qrPromises);
                }
                
                // Configurar objetos como não editáveis
                canvas.getObjects().forEach((obj: any) => {
                  obj.set({
                    selectable: false,
                    evented: false,
                    hasControls: false,
                    hasBorders: false
                  });
                  
                  if (obj.type === 'Textbox' || obj.type === 'textbox') {
                    if (obj.width !== undefined && obj.width > 0) {
                      if (obj.initDimensions) {
                        obj.initDimensions();
                      }
                    }
                  }
                  
                  // Corrigir fonte Bebas Neue
                  if ((obj.type === 'Textbox' || obj.type === 'Text' || obj.type === 'IText') && 
                      obj.fontFamily && obj.fontFamily.toLowerCase().includes('bebas')) {
                    const originalText = obj.text;
                    obj.set({
                      fontFamily: 'Bebas Neue',
                      dirty: true
                    });
                    
                    if (originalText) {
                      obj.set('text', originalText + ' ');
                      obj.set('text', originalText);
                    }
                  }
                  
                  const uniqueId = `thumbnail_${obj.type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                  (obj as any).__uniqueID = uniqueId;
                  (obj as any).id = uniqueId;
                });
                
                canvas.requestRenderAll();
                setTimeout(() => canvas.requestRenderAll(), 100);
                
                resolve();
              }).catch((error: any) => {
                reject(error);
              });
            } catch (error) {
              reject(error);
            }
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar thumbnail:', error);
      toast.error('Erro ao carregar thumbnail do certificado');
    }
  }, [processImagesInJSON]);

  return {
    processedCanvasData,
    isLoading,
    page,
    registerCanvasRef,
    loadCanvasData
  };
};