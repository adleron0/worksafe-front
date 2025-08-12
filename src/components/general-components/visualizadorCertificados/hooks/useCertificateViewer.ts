import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import * as fabric from 'fabric';
import jsPDF from 'jspdf';
import { CertificateData, StudentData, VariableToReplace, ProcessedCanvasData } from '../types';
import { VariableReplacer } from '../utils/VariableReplacer';

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
        // Determinar qual conjunto de variáveis usar (nova estrutura ou compatibilidade)
        const variables = variableToReplace || 
          (studentData ? convertStudentDataToVariables(studentData) : {});

        // Validar se todas as variáveis necessárias estão presentes
        const frontValidation = VariableReplacer.validateRequiredVariables(
          certificateData.fabricJsonFront,
          variables
        );
        
        if (!frontValidation.isValid) {
          console.warn('Variáveis faltando na frente:', frontValidation.missingVariables);
          // Não bloquear, apenas avisar
        }

        // Processar dados da frente
        const frontProcessed = VariableReplacer.replaceInCanvasJSON(
          certificateData.fabricJsonFront,
          variables
        );

        // Processar dados do verso se existir
        let backProcessed = null;
        if (certificateData.fabricJsonBack) {
          const backValidation = VariableReplacer.validateRequiredVariables(
            certificateData.fabricJsonBack,
            variables
          );
          
          if (!backValidation.isValid) {
            console.warn('Variáveis faltando no verso:', backValidation.missingVariables);
          }

          backProcessed = VariableReplacer.replaceInCanvasJSON(
            certificateData.fabricJsonBack,
            variables
          );
        }

        // Determinar orientação baseada nas dimensões do canvas original
        const orientation: 'landscape' | 'portrait' = 
          (certificateData.canvasWidth || 842) > (certificateData.canvasHeight || 595) 
            ? 'landscape' 
            : 'portrait';

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

        setProcessedCanvasData({
          fabricJsonFront: frontProcessed,
          fabricJsonBack: backProcessed,
          canvasWidth: certificateData.canvasWidth || 842,
          canvasHeight: certificateData.canvasHeight || 595
        });

      } catch (error) {
        console.error('Erro ao processar dados do certificado:', error);
        toast.error('Erro ao processar dados do certificado');
      } finally {
        setIsLoading(false);
      }
    };

    if (certificateData && (variableToReplace || studentData)) {
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
    console.log('Registrando canvas ref para página:', pageId);
    canvasRefs.current.set(pageId, ref);
  }, []);

  // Função para aplicar proxy nas imagens do JSON (reutilizada do gerador)
  const processImagesInJSON = useCallback((jsonData: any): any => {
    console.log('Processando imagens no JSON para viewer');
    
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    if (data.objects && Array.isArray(data.objects)) {
      data.objects = data.objects.map((obj: any) => {
        if (obj.type && obj.type.toLowerCase() === 'image') {
          let originalSrc = obj.src;
          
          // Se for URL externa e não tiver proxy, aplicar proxy
          if (originalSrc && (originalSrc.startsWith('http://') || originalSrc.startsWith('https://'))) {
            const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3001';
            
            // Verificar se já não tem proxy
            if (!originalSrc.includes('/images/proxy')) {
              obj.src = `${BASE_URL}/images/proxy?url=${encodeURIComponent(originalSrc)}`;
              obj._originalUrl = originalSrc;
              console.log('Aplicando proxy na imagem:', originalSrc, '->', obj.src);
            }
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
          frontCanvas.clear();
          
          await new Promise<void>((resolve, reject) => {
            const processedJsonFront = processImagesInJSON(data.fabricJsonFront);
            
            // Interceptar carregamento de imagens para aplicar proxy
            const originalFromURL = fabric.FabricImage.fromURL;
            fabric.FabricImage.fromURL = function(url: string, ...args: any[]) {
              let processedUrl = url;
              const originalUrl = url;
              
              if (url && (url.startsWith('http://') || url.startsWith('https://')) && !url.includes('/images/proxy')) {
                const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3001';
                processedUrl = `${BASE_URL}/images/proxy?url=${encodeURIComponent(url)}&t=${Date.now()}`;
              }
              
              if (args[0] && typeof args[0] === 'object') {
                args[0].crossOrigin = 'anonymous';
              } else if (args[0] && typeof args[0] === 'function') {
                args.splice(1, 0, { crossOrigin: 'anonymous' });
              }
              
              return originalFromURL.call(this, processedUrl, ...args).then((img: any) => {
                if (img) {
                  img._originalUrl = originalUrl;
                  Object.defineProperty(img, 'src', {
                    get: function() { return originalUrl; },
                    set: function() {},
                    configurable: true
                  });
                }
                return img;
              });
            };

            frontCanvas.loadFromJSON(processedJsonFront, () => {
              fabric.FabricImage.fromURL = originalFromURL;
              
              // Configurar objetos como não editáveis
              frontCanvas.getObjects().forEach((obj: fabric.Object) => {
                obj.set({
                  selectable: false,
                  evented: false,
                  hasControls: false,
                  hasBorders: false
                });
                
                const uniqueId = `viewer_${obj.type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                (obj as any).__uniqueID = uniqueId;
                (obj as any).id = uniqueId;
              });
              
              frontCanvas.renderAll();
              resolve();
            }, (error: any) => {
              console.error('Erro ao carregar JSON da frente:', error);
              reject(error);
            });
          });
        }
      }

      // Carregar canvas do verso se existir
      if (data.fabricJsonBack) {
        const backCanvasRef = canvasRefs.current.get('page-back');
        if (backCanvasRef) {
          const backCanvas = backCanvasRef.getCanvas();
          if (backCanvas) {
            backCanvas.clear();
            
            await new Promise<void>((resolve, reject) => {
              const processedJsonBack = processImagesInJSON(data.fabricJsonBack);
              
              const originalFromURL = fabric.FabricImage.fromURL;
              fabric.FabricImage.fromURL = function(url: string, ...args: any[]) {
                let processedUrl = url;
                const originalUrl = url;
                
                if (url && (url.startsWith('http://') || url.startsWith('https://')) && !url.includes('/images/proxy')) {
                  const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3001';
                  processedUrl = `${BASE_URL}/images/proxy?url=${encodeURIComponent(url)}&t=${Date.now()}`;
                }
                
                if (args[0] && typeof args[0] === 'object') {
                  args[0].crossOrigin = 'anonymous';
                } else if (args[0] && typeof args[0] === 'function') {
                  args.splice(1, 0, { crossOrigin: 'anonymous' });
                }
                
                return originalFromURL.call(this, processedUrl, ...args).then((img: any) => {
                  if (img) {
                    img._originalUrl = originalUrl;
                    Object.defineProperty(img, 'src', {
                      get: function() { return originalUrl; },
                      set: function() {},
                      configurable: true
                    });
                  }
                  return img;
                });
              };

              backCanvas.loadFromJSON(processedJsonBack, () => {
                fabric.FabricImage.fromURL = originalFromURL;
                
                backCanvas.getObjects().forEach((obj: fabric.Object) => {
                  obj.set({
                    selectable: false,
                    evented: false,
                    hasControls: false,
                    hasBorders: false
                  });
                  
                  const uniqueId = `viewer_${obj.type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                  (obj as any).__uniqueID = uniqueId;
                  (obj as any).id = uniqueId;
                });
                
                backCanvas.renderAll();
                resolve();
              }, (error: any) => {
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

    try {
      const isLandscape = pages[0].orientation === 'landscape';
      
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: false,
        precision: 16
      });

      for (let i = 0; i < pages.length; i++) {
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
          const dataURL = canvas.toDataURL({
            format: 'png',
            quality: 1.0,
            multiplier: 4
          });
          
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          
          pdf.addImage(dataURL, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'NONE');
        } catch (error) {
          console.error(`Erro ao exportar página ${i + 1}:`, error);
          toast.error(`Erro ao exportar página ${i + 1}`);
        }
      }

      // Tentar obter nome do aluno das variáveis
      const studentName = variableToReplace?.nome_do_aluno?.value || 
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