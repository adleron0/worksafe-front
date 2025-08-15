import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import * as fabric from 'fabric';
import { CertificateData, StudentData, VariableToReplace, ProcessedCanvasData } from '../types';
import { VariableReplacer } from '../utils/VariableReplacer';
import { decodeBase64Variables } from '@/utils/decodeBase64Variables';

interface CanvasPage {
  id: string;
  orientation: 'landscape' | 'portrait';
  canvasRef: any;
}

export const useCertificateViewer = (
  certificateData: CertificateData,
  variableToReplace: VariableToReplace,
  studentData?: StudentData // Mantém compatibilidade
) => {
  const [processedCanvasData, setProcessedCanvasData] = useState<ProcessedCanvasData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [pages, setPages] = useState<CanvasPage[]>([]);
  const canvasRefs = useRef<Map<string, any>>(new Map());

  // Processar dados quando certificateData ou variableToReplace mudarem
  useEffect(() => {
    const processData = async () => {
      setIsLoading(true);
      
      try {
        
        // Decodificar variableToReplace se estiver em base64
        const decodedVariables = decodeBase64Variables(variableToReplace);
        
        // Determinar qual conjunto de variáveis usar (nova estrutura ou compatibilidade)
        const variables = decodedVariables || 
          (studentData ? convertStudentDataToVariables(studentData) : {});

        // Parsear o JSON se for string
        let frontJson;
        if (typeof certificateData.fabricJsonFront === 'string') {
          try {
            frontJson = JSON.parse(certificateData.fabricJsonFront);
          } catch (error) {
            console.error('❌ Erro ao parsear fabricJsonFront:', error);
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
          // Não bloquear, apenas avisar
        }
        
        // Processar dados da frente
        const frontProcessed = VariableReplacer.replaceInCanvasJSON(
          frontJson,
          variables
        );
        

        // Processar dados do verso se existir
        let backProcessed = null;
        if (certificateData.fabricJsonBack) {
          // Parsear o JSON se for string
          let backJson;
          if (typeof certificateData.fabricJsonBack === 'string') {
            try {
              backJson = JSON.parse(certificateData.fabricJsonBack);
            } catch (error) {
              console.error('❌ Erro ao parsear fabricJsonBack:', error);
              backJson = certificateData.fabricJsonBack;
            }
          } else {
            backJson = certificateData.fabricJsonBack;
          }
          
          const backValidation = VariableReplacer.validateRequiredVariables(
            backJson,
            variables
          );
          
          if (!backValidation.isValid) {
          }

          backProcessed = VariableReplacer.replaceInCanvasJSON(
            backJson,
            variables
          );
        }

        // Detectar orientação baseada nas dimensões do certificado
        const width = certificateData.canvasWidth || 842;
        const height = certificateData.canvasHeight || 595;
        const orientation: 'landscape' | 'portrait' = width > height ? 'landscape' : 'portrait';
        

        // Configurar páginas
        const newPages: CanvasPage[] = [
          {
            id: 'page-front',
            orientation,
            canvasRef: null
          }
        ];

        if (backProcessed) {
          newPages.push({
            id: 'page-back',
            orientation,
            canvasRef: null
          });
        }

        setPages(newPages);

        const processedData = {
          fabricJsonFront: frontProcessed,
          fabricJsonBack: backProcessed,
          canvasWidth: certificateData.canvasWidth || 842,
          canvasHeight: certificateData.canvasHeight || 595,
          certificateId: certificateData.certificateId
        };
        
        setProcessedCanvasData(processedData);

      } catch (error) {
        console.error('Erro ao processar dados do certificado:', error);
        toast.error('Erro ao processar dados do certificado');
      } finally {
        setIsLoading(false);
      }
    };

    // Sempre processar quando há certificateData
    // Para visualização simples, variableToReplace pode ser vazio
    if (certificateData) {
      processData();
    }
  }, [certificateData, variableToReplace, studentData]);

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

  // Função para registrar referências dos canvas
  const registerCanvasRef = useCallback((pageId: string, ref: any) => {
    canvasRefs.current.set(pageId, ref);
  }, []);

  // Função para aplicar proxy nas imagens do JSON (reutilizada do gerador)
  const processImagesInJSON = useCallback((jsonData: any): any => {
    
    // Garantir que temos um objeto, não uma string
    let data;
    if (typeof jsonData === 'string') {
      try {
        data = JSON.parse(jsonData);
      } catch (error) {
        console.error('❌ Erro ao parsear JSON:', error);
        return jsonData;
      }
    } else {
      data = jsonData;
    }
    
    if (data.objects && Array.isArray(data.objects)) {
      data.objects = data.objects.map((obj: any) => {
        // Verificar se é uma imagem (case insensitive)
        if (obj.type && obj.type.toLowerCase() === 'image' && obj.src) {
          const originalSrc = obj.src;
          
          // Verificar se já tem proxy aplicado (da substituição de variáveis ou decode)
          if (originalSrc.includes('api.allorigins.win') || originalSrc.includes('/images/proxy')) {
            return obj;
          }
          
          // Se for URL externa, aplicar proxy
          if (originalSrc.startsWith('http://') || originalSrc.startsWith('https://')) {
            const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';
            
            // Sempre aplicar proxy para URLs externas
            obj.src = `${BASE_URL}/images/proxy?url=${encodeURIComponent(originalSrc)}`;
            obj._originalUrl = originalSrc;
          }
        }
        return obj;
      });
    }
    
    return data;
  }, []);

  // Função para carregar dados nos canvas
  const loadCanvasData = useCallback(async (data: ProcessedCanvasData) => {
    try {

      // Carregar canvas da frente
      const frontCanvasRef = canvasRefs.current.get('page-front');
      if (frontCanvasRef && data.fabricJsonFront) {
        const frontCanvas = frontCanvasRef.getCanvas();
        if (frontCanvas) {
          // Limpar canvas mas manter o fundo branco
          frontCanvas.clear();
          frontCanvas.backgroundColor = '#ffffff';
          
          await new Promise<void>((resolve, reject) => {
            const processedJsonFront = processImagesInJSON(data.fabricJsonFront);
            
            
            // Não precisamos mais interceptar - o proxy já foi aplicado no JSON

            // Tentar carregar o JSON no canvas
            try {
              // Garantir que o JSON está em formato correto
              const jsonToLoad = typeof processedJsonFront === 'string' 
                ? JSON.parse(processedJsonFront) 
                : processedJsonFront;
              
              
              // Primeiro, adicionar um retângulo branco de background
              // Detectar orientação baseada nas dimensões
              const rawWidth = data.canvasWidth || 842;
              const rawHeight = data.canvasHeight || 595;
              
              // Usar dimensões A4 corretas baseadas na orientação
              let width, height;
              if (rawWidth > rawHeight) {
                // Landscape
                width = 842;
                height = 595;
              } else {
                // Portrait
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
              
              // Modificar o JSON para incluir o background como primeiro objeto
              if (!jsonToLoad.objects) {
                jsonToLoad.objects = [];
              }
              
              // Verificar se já existe um backgroundRect
              const hasBackground = jsonToLoad.objects.some((obj: any) => 
                obj.name === 'backgroundRect'
              );
              
              if (!hasBackground) {
                // Adicionar o background rect como primeiro objeto no JSON
                jsonToLoad.objects.unshift(bgRect.toObject(['name']));
              }
              
              frontCanvas.loadFromJSON(jsonToLoad).then(async () => {
                
                // Processar placeholders de QR Code ANTES de configurar como não editáveis
                const objects = frontCanvas.getObjects();
                const qrPromises: Promise<void>[] = [];
                
                for (let i = 0; i < objects.length; i++) {
                  const obj = objects[i] as any;
                  
                  // Verificar se é um placeholder de QR Code
                  if (obj.isQRCodePlaceholder && obj.qrCodeName) {
                    
                    // Obter o ID do certificado
                    const certificateId = data.certificateId || obj.certificateId || 'CERT-001';
                    const validationUrl = `${window.location.origin}/certificados/${certificateId}`;
                    
                    
                    // Remover o placeholder do canvas
                    frontCanvas.remove(obj);
                    
                    // Criar o QR Code usando a biblioteca QRCode
                    const qrPromise = (async () => {
                      try {
                        const QR = await import('qrcode');
                        
                        // Gerar QR Code como Data URL
                        const qrDataUrl = await QR.toDataURL(validationUrl, {
                          width: 200,
                          margin: 1,
                          errorCorrectionLevel: 'H',
                          color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                          }
                        });
                        
                        
                        // Criar imagem do QR Code no canvas
                        const position = obj.preservedPosition || obj;
                        
                        // Usar Promise para aguardar carregamento da imagem
                        await new Promise<void>((resolve, reject) => {
                          
                          const img = new Image();
                          img.onload = () => {
                            
                            const fabricImage = new fabric.Image(img);
                            
                            // Usar as dimensões preservadas do placeholder original
                            const targetWidth = position.width || 120;
                            const targetHeight = position.height || 120;
                            
                            // Calcular escala baseada nas dimensões do placeholder
                            // Considerando que o placeholder pode ter sido escalado (scaleX/scaleY)
                            const placeholderScaleX = position.scaleX || 1;
                            const placeholderScaleY = position.scaleY || 1;
                            
                            // Tamanho final desejado considerando a escala do placeholder
                            const finalWidth = targetWidth * placeholderScaleX;
                            const finalHeight = targetHeight * placeholderScaleY;
                            
                            // Calcular escala para o QR Code
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
                            
                            // Adicionar ao canvas
                            frontCanvas.add(fabricImage);
                            frontCanvas.renderAll();
                            
                            // Forçar renderização adicional
                            setTimeout(() => {
                              frontCanvas.renderAll();
                            }, 100);
                            
                            resolve();
                          };
                          
                          img.onerror = (error) => {
                            console.error('❌ Erro ao carregar imagem HTML (frente):', error);
                            reject(error);
                          };
                          
                          img.src = qrDataUrl;
                        });
                      } catch (error) {
                        console.error('❌ Erro ao gerar QR Code:', error);
                      }
                    })();
                    
                    qrPromises.push(qrPromise);
                  }
                }
                
                // Aguardar todos os QR codes serem processados
                if (qrPromises.length > 0) {
                  await Promise.all(qrPromises);
                }
                
                // Configurar objetos como não editáveis e corrigir fontes
                frontCanvas.getObjects().forEach((obj: any) => {
                  obj.set({
                    selectable: false,
                    evented: false,
                    hasControls: false,
                    hasBorders: false
                  });
                  
                  // Verificar e corrigir fonte Bebas Neue em objetos de texto
                  if ((obj.type === 'Textbox' || obj.type === 'Text' || obj.type === 'IText') && 
                      obj.fontFamily && obj.fontFamily.toLowerCase().includes('bebas')) {
                    // Forçar re-renderização do texto com a fonte correta
                    const originalText = obj.text;
                    obj.set({
                      fontFamily: 'Bebas Neue',
                      dirty: true
                    });
                    
                    // Pequeno hack: alterar e restaurar o texto para forçar recalculo
                    if (originalText) {
                      obj.set('text', originalText + ' ');
                      obj.set('text', originalText);
                    }
                    
                  }
                  
                  const uniqueId = `viewer_${obj.type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                  (obj as any).__uniqueID = uniqueId;
                  (obj as any).id = uniqueId;
                });
                
                // Forçar renderização múltiplas vezes para garantir que as fontes sejam aplicadas
                frontCanvas.requestRenderAll();
                setTimeout(() => frontCanvas.requestRenderAll(), 100);
                
                
                resolve();
              }).catch((error: any) => {
                console.error('❌ Erro ao carregar JSON da frente:', error);
                reject(error);
              });
            } catch (error) {
              console.error('❌ Erro ao carregar JSON da frente:', error);
              reject(error);
            }
          });
        }
      }

      // Carregar canvas do verso se existir
      if (data.fabricJsonBack) {
        const backCanvasRef = canvasRefs.current.get('page-back');
        if (backCanvasRef) {
          const backCanvas = backCanvasRef.getCanvas();
          if (backCanvas) {
            // Limpar canvas mas manter o fundo branco
            backCanvas.clear();
            backCanvas.backgroundColor = '#ffffff';
            
            await new Promise<void>((resolve, reject) => {
              const processedJsonBack = processImagesInJSON(data.fabricJsonBack);
              
              // Garantir que o JSON está em formato correto
              const jsonToLoad = typeof processedJsonBack === 'string' 
                ? JSON.parse(processedJsonBack) 
                : processedJsonBack;
              

              // Primeiro, adicionar um retângulo branco de background
              // Detectar orientação baseada nas dimensões
              const rawWidth = data.canvasWidth || 842;
              const rawHeight = data.canvasHeight || 595;
              
              // Usar dimensões A4 corretas baseadas na orientação
              let width, height;
              if (rawWidth > rawHeight) {
                // Landscape
                width = 842;
                height = 595;
              } else {
                // Portrait
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
              
              // Modificar o JSON para incluir o background como primeiro objeto
              if (!jsonToLoad.objects) {
                jsonToLoad.objects = [];
              }
              
              // Verificar se já existe um backgroundRect
              const hasBackground = jsonToLoad.objects.some((obj: any) => 
                obj.name === 'backgroundRect'
              );
              
              if (!hasBackground) {
                // Adicionar o background rect como primeiro objeto no JSON
                jsonToLoad.objects.unshift(bgRect.toObject(['name']));
              }
              
              backCanvas.loadFromJSON(jsonToLoad).then(async () => {
                
                // Processar placeholders de QR Code no verso também
                const backObjects = backCanvas.getObjects();
                const backQrPromises: Promise<void>[] = [];
                
                for (let i = 0; i < backObjects.length; i++) {
                  const obj = backObjects[i] as any;
                  
                  if (obj.isQRCodePlaceholder && obj.qrCodeName) {
                    
                    const certificateId = data.certificateId || obj.certificateId || 'CERT-001';
                    const validationUrl = `${window.location.origin}/certificados/${certificateId}`;
                    
                    backCanvas.remove(obj);
                    
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
                            
                            // Usar as dimensões preservadas do placeholder original
                            const targetWidth = position.width || 120;
                            const targetHeight = position.height || 120;
                            
                            // Calcular escala baseada nas dimensões do placeholder
                            // Considerando que o placeholder pode ter sido escalado (scaleX/scaleY)
                            const placeholderScaleX = position.scaleX || 1;
                            const placeholderScaleY = position.scaleY || 1;
                            
                            // Tamanho final desejado considerando a escala do placeholder
                            const finalWidth = targetWidth * placeholderScaleX;
                            const finalHeight = targetHeight * placeholderScaleY;
                            
                            // Calcular escala para o QR Code
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
                            
                            backCanvas.add(fabricImage);
                            backCanvas.renderAll();
                            
                            // Forçar renderização adicional
                            setTimeout(() => {
                              backCanvas.renderAll();
                            }, 100);
                            
                            resolve();
                          };
                          
                          img.onerror = (error) => {
                            console.error('❌ Erro ao carregar imagem HTML:', error);
                            reject(error);
                          };
                          
                          img.src = qrDataUrl;
                        });
                      } catch (error) {
                        console.error('❌ Erro ao gerar QR Code (verso):', error);
                      }
                    })();
                    
                    backQrPromises.push(qrPromise);
                  }
                }
                
                // Aguardar todos os QR codes do verso serem processados
                if (backQrPromises.length > 0) {
                  await Promise.all(backQrPromises);
                }
                
                backCanvas.getObjects().forEach((obj: any) => {
                  obj.set({
                    selectable: false,
                    evented: false,
                    hasControls: false,
                    hasBorders: false
                  });
                  
                  // Verificar e corrigir fonte Bebas Neue em objetos de texto
                  if ((obj.type === 'Textbox' || obj.type === 'Text' || obj.type === 'IText') && 
                      obj.fontFamily && obj.fontFamily.toLowerCase().includes('bebas')) {
                    // Forçar re-renderização do texto com a fonte correta
                    const originalText = obj.text;
                    obj.set({
                      fontFamily: 'Bebas Neue',
                      dirty: true
                    });
                    
                    // Pequeno hack: alterar e restaurar o texto para forçar recalculo
                    if (originalText) {
                      obj.set('text', originalText + ' ');
                      obj.set('text', originalText);
                    }
                    
                  }
                  
                  const uniqueId = `viewer_${obj.type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                  (obj as any).__uniqueID = uniqueId;
                  (obj as any).id = uniqueId;
                });
                
                // Forçar renderização múltiplas vezes para garantir que as fontes sejam aplicadas
                backCanvas.requestRenderAll();
                setTimeout(() => backCanvas.requestRenderAll(), 100);
                
                
                resolve();
              }).catch((error: any) => {
                console.error('Erro ao carregar JSON do verso:', error);
                reject(error);
              });
            });
          }
        }
      }

    } catch (error) {
      console.error('Erro ao carregar dados nos canvas:', error);
      toast.error('Erro ao carregar certificado');
    }
  }, [canvasRefs, processImagesInJSON]);

  // Função para exportar PDF
  const exportToPDF = useCallback(async () => {
    if (!processedCanvasData || pages.length === 0) {
      toast.error('Nenhum certificado carregado para exportar');
      return;
    }

    setIsExporting(true);
    
    // Delay maior para garantir que o estado seja renderizado e a animação comece
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const isLandscape = pages[0].orientation === 'landscape';
      
      // Configurar PDF com máxima qualidade
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: false, // Sem compressão para máxima qualidade
        precision: 32, // Máxima precisão
        hotfixes: ['px_scaling'] // Correção para escala de pixels
      });

      for (let i = 0; i < pages.length; i++) {
        // Pequeno delay entre páginas para não bloquear a thread
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        const page = pages[i];
        const canvasRef = canvasRefs.current.get(page.id);
        
        if (!canvasRef) {
          console.error(`Canvas não encontrado para página ${page.id}`);
          continue;
        }

        const canvas = canvasRef.getCanvas();
        if (!canvas) {
          console.error(`Canvas não inicializado para página ${page.id}`);
          continue;
        }

        if (i > 0) {
          pdf.addPage();
        }

        try {
          // Salvar zoom atual e dimensões
          const originalZoom = canvas.getZoom();
          const originalWidth = canvas.getWidth();
          const originalHeight = canvas.getHeight();
          
          // Definir dimensões A4 em pixels para alta resolução
          // Reduzindo para 150 DPI para evitar zoom excessivo
          const targetDPI = 150;
          const mmToInch = 25.4;
          const a4WidthMM = isLandscape ? 297 : 210;
          const a4HeightMM = isLandscape ? 210 : 297;
          const targetWidth = Math.round(a4WidthMM * targetDPI / mmToInch);
          const targetHeight = Math.round(a4HeightMM * targetDPI / mmToInch);
          
          // Calcular zoom necessário para alcançar a resolução alvo
          const baseWidth = isLandscape ? 842 : 595;
          const baseHeight = isLandscape ? 595 : 842;
          const zoomFactorWidth = targetWidth / baseWidth;
          const zoomFactorHeight = targetHeight / baseHeight;
          // Limitar o zoom máximo para evitar problemas
          const targetZoom = Math.min(zoomFactorWidth, zoomFactorHeight, 3);
          
          // Aplicar zoom temporariamente para alta resolução
          canvas.setZoom(targetZoom);
          canvas.setDimensions({
            width: baseWidth * targetZoom,
            height: baseHeight * targetZoom
          });
          canvas.renderAll();
          
          // Gerar imagem em alta resolução IMEDIATAMENTE após aplicar o zoom
          const dataURL = canvas.toDataURL({
            format: 'png',
            quality: 1.0, // Máxima qualidade
            multiplier: 1, // Já estamos usando zoom alto, não precisa multiplicar
            enableRetinaScaling: false // Desabilitar scaling adicional
          });
          
          // Restaurar zoom e dimensões originais IMEDIATAMENTE após gerar a imagem
          canvas.setZoom(originalZoom);
          canvas.setDimensions({
            width: originalWidth,
            height: originalHeight
          });
          canvas.renderAll();
          
          // Pequeno delay APÓS restaurar para permitir que a UI respire
          await new Promise(resolve => setTimeout(resolve, 10));
          
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          
          // Adicionar imagem com compressão NONE para manter qualidade máxima
          pdf.addImage(dataURL, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'NONE');
        } catch (error) {
          console.error(`Erro ao exportar página ${i + 1}:`, error);
          toast.error(`Erro ao exportar página ${i + 1}`);
        }
      }

      // Tentar obter nome do aluno das variáveis (decodificando se necessário)
      const decodedVariables = decodeBase64Variables(variableToReplace);
      const studentName = decodedVariables?.nome_do_aluno?.value || 
                         studentData?.nome_do_aluno || 
                         'certificado';
      
      const fileName = `${certificateData.name}_${studentName}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
      pdf.save(fileName);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsExporting(false);
    }
  }, [processedCanvasData, pages, canvasRefs, certificateData.name, variableToReplace, studentData]);

  return {
    processedCanvasData,
    isLoading,
    isExporting,
    pages,
    registerCanvasRef,
    loadCanvasData,
    exportToPDF
  };
};