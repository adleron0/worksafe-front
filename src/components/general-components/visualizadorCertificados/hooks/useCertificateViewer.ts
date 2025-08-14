import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import * as fabric from 'fabric';
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
        console.log('🔍 Iniciando processamento dos dados do certificado:', {
          certificateData,
          variableToReplace,
          studentData
        });
        
        // Determinar qual conjunto de variáveis usar (nova estrutura ou compatibilidade)
        const variables = variableToReplace || 
          (studentData ? convertStudentDataToVariables(studentData) : {});

        console.log('📦 Variáveis para substituição:', variables);

        // Parsear o JSON se for string
        let frontJson;
        if (typeof certificateData.fabricJsonFront === 'string') {
          try {
            frontJson = JSON.parse(certificateData.fabricJsonFront);
            console.log('📦 JSON da frente parseado de string');
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
          console.warn('⚠️ Variáveis faltando na frente:', frontValidation.missingVariables);
          // Não bloquear, apenas avisar
        }
        
        // Processar dados da frente
        const frontProcessed = VariableReplacer.replaceInCanvasJSON(
          frontJson,
          variables
        );
        
        console.log('📄 JSON da frente processado:', frontProcessed);

        // Processar dados do verso se existir
        let backProcessed = null;
        if (certificateData.fabricJsonBack) {
          // Parsear o JSON se for string
          let backJson;
          if (typeof certificateData.fabricJsonBack === 'string') {
            try {
              backJson = JSON.parse(certificateData.fabricJsonBack);
              console.log('📦 JSON do verso parseado de string');
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
            console.warn('⚠️ Variáveis faltando no verso:', backValidation.missingVariables);
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
        
        console.log('📐 Orientação detectada:', {
          width,
          height,
          orientation
        });

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
          canvasHeight: certificateData.canvasHeight || 595
        };
        
        console.log('✅ Dados processados com sucesso:', processedData);
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
    console.log('Registrando canvas ref para página:', pageId);
    canvasRefs.current.set(pageId, ref);
  }, []);

  // Função para aplicar proxy nas imagens do JSON (reutilizada do gerador)
  const processImagesInJSON = useCallback((jsonData: any): any => {
    console.log('🖼️ Processando imagens no JSON para viewer');
    
    // Garantir que temos um objeto, não uma string
    let data;
    if (typeof jsonData === 'string') {
      try {
        data = JSON.parse(jsonData);
        console.log('📦 JSON parseado de string');
      } catch (error) {
        console.error('❌ Erro ao parsear JSON:', error);
        return jsonData;
      }
    } else {
      data = jsonData;
    }
    
    console.log('🔍 Estrutura do JSON:', {
      hasObjects: !!data.objects,
      objectsLength: data.objects?.length,
      version: data.version,
      background: data.background
    });
    
    if (data.objects && Array.isArray(data.objects)) {
      data.objects = data.objects.map((obj: any) => {
        // Verificar se é uma imagem (case insensitive)
        if (obj.type && obj.type.toLowerCase() === 'image' && obj.src) {
          const originalSrc = obj.src;
          
          // Verificar se já tem proxy aplicado (da substituição de variáveis)
          if (originalSrc.includes('api.allorigins.win')) {
            console.log('🔄 Imagem já tem proxy aplicado:', originalSrc);
            return obj;
          }
          
          // Se for URL externa, aplicar proxy
          if (originalSrc.startsWith('http://') || originalSrc.startsWith('https://')) {
            const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';
            
            // Sempre aplicar proxy para URLs externas
            obj.src = `${BASE_URL}/images/proxy?url=${encodeURIComponent(originalSrc)}`;
            obj._originalUrl = originalSrc;
            console.log('🌐 Aplicando proxy na imagem:', originalSrc, '->', obj.src);
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
      console.log('Iniciando carregamento dos canvas', { 
        hasFront: !!data.fabricJsonFront,
        hasBack: !!data.fabricJsonBack,
        canvasRefs: Array.from(canvasRefs.current.keys())
      });

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
            
            console.log('🎨 Carregando JSON no canvas da frente:', {
              jsonData: processedJsonFront,
              canvasId: 'page-front'
            });
            
            // Não precisamos mais interceptar - o proxy já foi aplicado no JSON

            // Tentar carregar o JSON no canvas
            try {
              // Garantir que o JSON está em formato correto
              const jsonToLoad = typeof processedJsonFront === 'string' 
                ? JSON.parse(processedJsonFront) 
                : processedJsonFront;
              
              console.log('📋 JSON a ser carregado:', {
                version: jsonToLoad.version,
                objectCount: jsonToLoad.objects?.length,
                firstObject: jsonToLoad.objects?.[0]
              });
              
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
              
              frontCanvas.loadFromJSON(jsonToLoad).then(() => {
                console.log('✅ JSON carregado no canvas, processando objetos...');
                
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
                    
                    console.log('🔤 Fonte Bebas Neue aplicada ao texto:', originalText?.substring(0, 20));
                  }
                  
                  const uniqueId = `viewer_${obj.type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                  (obj as any).__uniqueID = uniqueId;
                  (obj as any).id = uniqueId;
                });
                
                // Forçar renderização múltiplas vezes para garantir que as fontes sejam aplicadas
                frontCanvas.requestRenderAll();
                setTimeout(() => frontCanvas.requestRenderAll(), 100);
                
                console.log('🎉 Canvas frente carregado com sucesso', {
                  objects: frontCanvas.getObjects().length,
                  zoom: frontCanvas.getZoom(),
                  dimensions: { 
                    width: frontCanvas.getWidth(), 
                    height: frontCanvas.getHeight() 
                  },
                  objectTypes: frontCanvas.getObjects().map((o: any) => o.type)
                });
                
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
              
              console.log('📋 JSON do verso a ser carregado:', {
                version: jsonToLoad.version,
                objectCount: jsonToLoad.objects?.length
              });

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
              
              backCanvas.loadFromJSON(jsonToLoad).then(() => {
                console.log('✅ JSON do verso carregado no canvas');
                
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
                    
                    console.log('🔤 Fonte Bebas Neue aplicada ao texto (verso):', originalText?.substring(0, 20));
                  }
                  
                  const uniqueId = `viewer_${obj.type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                  (obj as any).__uniqueID = uniqueId;
                  (obj as any).id = uniqueId;
                });
                
                // Forçar renderização múltiplas vezes para garantir que as fontes sejam aplicadas
                backCanvas.requestRenderAll();
                setTimeout(() => backCanvas.requestRenderAll(), 100);
                
                console.log('Canvas verso carregado com sucesso', {
                  objects: backCanvas.getObjects().length,
                  zoom: backCanvas.getZoom(),
                  dimensions: { 
                    width: backCanvas.getWidth(), 
                    height: backCanvas.getHeight() 
                  }
                });
                
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
          
          // Definir dimensões A4 em pixels para alta resolução (300 DPI)
          // A4: 210mm x 297mm
          // Em 300 DPI: 2480 x 3508 pixels (portrait) ou 3508 x 2480 (landscape)
          const targetDPI = 300;
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
          const targetZoom = Math.min(zoomFactorWidth, zoomFactorHeight);
          
          // Aplicar zoom temporariamente para alta resolução
          canvas.setZoom(targetZoom);
          canvas.setDimensions({
            width: baseWidth * targetZoom,
            height: baseHeight * targetZoom
          });
          canvas.renderAll();
          
          // Gerar imagem em alta resolução
          const dataURL = canvas.toDataURL({
            format: 'png',
            quality: 1.0, // Máxima qualidade
            multiplier: 1, // Já estamos usando zoom alto, não precisa multiplicar
            enableRetinaScaling: false // Desabilitar scaling adicional
          });
          
          // Restaurar zoom e dimensões originais
          canvas.setZoom(originalZoom);
          canvas.setDimensions({
            width: originalWidth,
            height: originalHeight
          });
          canvas.renderAll();
          
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          
          // Adicionar imagem com compressão NONE para manter qualidade máxima
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