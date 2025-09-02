import jsPDF from 'jspdf';
import * as fabric from 'fabric';
import QRCode from 'qrcode';
import { 
  CertificateData, 
  VariableToReplace, 
  StudentData 
} from '../types';
import { VariableReplacer } from '../utils/VariableReplacer';
import { decodeBase64Variables } from '@/utils/decodeBase64Variables';

export interface PDFGenerationOptions {
  returnBlob?: boolean;
  returnBase64?: boolean;
  fileName?: string;
  quality?: 'low' | 'medium' | 'high' | 'maximum';
}

export interface PDFGenerationResult {
  success: boolean;
  data?: Blob | string;
  fileName?: string;
  error?: string;
}

export interface BatchPDFResult {
  certificateId: string;
  studentName?: string;
  success: boolean;
  data?: Blob | string;
  error?: string;
}

class CertificatePDFService {
  private static instance: CertificatePDFService;
  private fontsLoaded: boolean = false;
  private fontLoadPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): CertificatePDFService {
    if (!CertificatePDFService.instance) {
      CertificatePDFService.instance = new CertificatePDFService();
    }
    return CertificatePDFService.instance;
  }

  /**
   * Carrega as fontes necessárias para os certificados
   */
  private async loadFonts(): Promise<void> {
    if (this.fontsLoaded) return;
    
    if (this.fontLoadPromise) {
      return this.fontLoadPromise;
    }

    this.fontLoadPromise = this.loadFontsInternal();
    await this.fontLoadPromise;
    this.fontsLoaded = true;
  }

  private async loadFontsInternal(): Promise<void> {
    try {
      const fontsToLoad = [
        'Bebas Neue',
        'Roboto',
        'Open Sans',
        'Lato',
        'Montserrat',
        'Poppins',
        'Raleway',
        'Inter',
        'Playfair Display',
        'Oswald',
        'Merriweather'
      ];

      // Criar link para carregar fontes do Google
      const fontFamilies = fontsToLoad.join('&family=').replace(/ /g, '+');
      const linkId = 'certificate-pdf-fonts';
      
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.href = `https://fonts.googleapis.com/css2?family=${fontFamilies}&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        
        // Aguardar carregamento
        await new Promise((resolve) => {
          link.onload = () => resolve(true);
          setTimeout(() => resolve(false), 3000);
        });
      }

      // Aguardar Font Loading API
      if ('fonts' in document) {
        await document.fonts.ready;
        
        // Forçar carregamento das fontes
        for (const font of fontsToLoad) {
          try {
            await document.fonts.load(`12px "${font}"`);
          } catch (e) {
            console.warn(`Fonte ${font} não pôde ser carregada:`, e);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar fontes:', error);
    }
  }

  /**
   * Processa as variáveis do certificado
   */
  private processVariables(
    variableToReplace: VariableToReplace,
    studentData?: StudentData
  ): VariableToReplace {
    // Decodificar variáveis se estiverem em base64
    const decodedVariables = decodeBase64Variables(variableToReplace);
    
    // Se tiver studentData (compatibilidade), converter para VariableToReplace
    if (!decodedVariables && studentData) {
      const variables: VariableToReplace = {};
      Object.entries(studentData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const isUrl = key.includes('url') || key.includes('assinatura') || 
                       (typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:')));
          
          variables[key] = {
            type: isUrl ? 'url' : 'string',
            value: String(value)
          };
        }
      });
      return variables;
    }
    
    return decodedVariables || variableToReplace || {};
  }

  /**
   * Processa imagens no JSON do canvas aplicando proxy se necessário
   */
  private processImagesInJSON(jsonData: any): any {
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
        if (obj.type && obj.type.toLowerCase() === 'image' && obj.src) {
          const originalSrc = obj.src;
          
          // Se já tem proxy aplicado, manter
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
  }

  /**
   * Gera QR Code para validação do certificado
   */
  private async generateQRCode(certificateId: string): Promise<string> {
    const validationUrl = `${window.location.origin}/certificados/${certificateId}`;
    
    const qrDataUrl = await QRCode.toDataURL(validationUrl, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrDataUrl;
  }

  /**
   * Carrega e processa o canvas com os dados do certificado
   */
  private async loadCanvasData(
    canvas: fabric.Canvas,
    jsonData: any,
    certificateId: string
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const processedJson = this.processImagesInJSON(jsonData);
        const jsonToLoad = typeof processedJson === 'string' 
          ? JSON.parse(processedJson) 
          : processedJson;
        
        // Não adicionar background aqui, deixar como está no JSON original
        // O background já deve estar no JSON do certificado
        
        // Carregar o JSON no canvas
        await canvas.loadFromJSON(jsonToLoad);
        
        // Processar QR Codes
        const objects = [...canvas.getObjects()]; // Clonar array para evitar problemas ao remover
        for (const obj of objects) {
          if ((obj as any).isQRCodePlaceholder && (obj as any).qrCodeName) {
            const qrDataUrl = await this.generateQRCode(certificateId);
            
            // Salvar posição e dimensões do placeholder antes de remover
            const position = {
              left: obj.left,
              top: obj.top,
              width: (obj as any).width || 120,
              height: (obj as any).height || 120,
              scaleX: (obj as any).scaleX || 1,
              scaleY: (obj as any).scaleY || 1
            };
            
            canvas.remove(obj);
            
            // Criar nova imagem do QR Code
            await new Promise<void>((resolveQR) => {
              const img = new Image();
              img.onload = () => {
                const fabricImage = new fabric.Image(img);
                
                // Calcular tamanho final considerando a escala do placeholder
                const targetWidth = position.width || 120;
                const targetHeight = position.height || 120;
                const placeholderScaleX = position.scaleX;
                const placeholderScaleY = position.scaleY;
                
                // Tamanho final desejado considerando a escala do placeholder
                const finalWidth = targetWidth * placeholderScaleX;
                const finalHeight = targetHeight * placeholderScaleY;
                
                // Calcular escala para o QR Code
                const scaleX = finalWidth / (fabricImage.width || 200);
                const scaleY = finalHeight / (fabricImage.height || 200);
                
                fabricImage.set({
                  left: position.left,
                  top: position.top,
                  scaleX: scaleX,
                  scaleY: scaleY,
                  selectable: false,
                  evented: false,
                  hasControls: false,
                  hasBorders: false,
                  name: `qrcode_${(obj as any).qrCodeName}`
                });
                
                canvas.add(fabricImage);
                resolveQR();
              };
              img.src = qrDataUrl;
            });
          }
        }
        
        // Processar e ajustar objetos
        canvas.getObjects().forEach((obj: any) => {
          // Configurar como não editável
          obj.set({
            selectable: false,
            evented: false,
            hasControls: false,
            hasBorders: false
          });
          
          // Processar imagens de assinatura
          if (obj.type === 'Image' || obj.type === 'image') {
            const isAssinatura = obj.name?.includes('assinatura') || 
                               obj.name?.includes('image_') ||
                               obj.placeholderNameDebug?.includes('assinatura');
            
            if (isAssinatura) {
              // Verificar se temos as dimensões alvo e a imagem foi carregada
              if (obj.targetHeight && obj.targetWidth && obj._element) {
                const naturalWidth = obj._element.naturalWidth;
                const naturalHeight = obj._element.naturalHeight;
                
                if (naturalWidth && naturalHeight) {
                  // Calcular a escala correta baseada no tamanho real
                  const scaleToFitHeight = obj.targetHeight / naturalHeight;
                  const scaleToFitWidth = obj.targetWidth / naturalWidth;
                  
                  // Usar a menor escala para manter proporção
                  const correctScale = Math.min(scaleToFitHeight, scaleToFitWidth);
                  
                  // Aplicar a nova escala
                  obj.set({
                    scaleX: correctScale,
                    scaleY: correctScale
                  });
                }
              }
            }
          }
          
          // Processar Textboxes
          if (obj.type === 'Textbox' || obj.type === 'textbox') {
            if (obj.width !== undefined && obj.width > 0) {
              if (obj.initDimensions) {
                obj.initDimensions();
              }
            }
          }
        });
        
        canvas.renderAll();
        
        // Aguardar renderização completa
        setTimeout(() => {
          resolve();
        }, 500);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Gera o PDF do certificado
   */
  public async generatePDF(
    certificateData: CertificateData,
    variableToReplace: VariableToReplace,
    options: PDFGenerationOptions = {},
    studentData?: StudentData
  ): Promise<PDFGenerationResult> {
    try {
      // Carregar fontes
      await this.loadFonts();
      
      // Processar variáveis
      const variables = this.processVariables(variableToReplace, studentData);
      
      // Validar e processar dados da frente
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
      
      // Substituir variáveis
      const frontProcessed = VariableReplacer.replaceInCanvasJSON(frontJson, variables);
      
      // Processar verso se existir
      let backProcessed = null;
      if (certificateData.fabricJsonBack) {
        let backJson;
        if (typeof certificateData.fabricJsonBack === 'string') {
          try {
            backJson = JSON.parse(certificateData.fabricJsonBack);
          } catch (error) {
            backJson = certificateData.fabricJsonBack;
          }
        } else {
          backJson = certificateData.fabricJsonBack;
        }
        backProcessed = VariableReplacer.replaceInCanvasJSON(backJson, variables);
      }
      
      // Usar dimensões reais do certificado ou padrão A4 landscape
      const canvasWidth = certificateData.canvasWidth || 842;
      const canvasHeight = certificateData.canvasHeight || 595;
      
      // Detectar orientação baseada nas dimensões reais
      const isLandscape = canvasWidth > canvasHeight;
      
      // Configurar qualidade
      const qualitySettings = {
        low: { dpi: 72, compress: true },
        medium: { dpi: 150, compress: true },
        high: { dpi: 300, compress: false },
        maximum: { dpi: 600, compress: false }
      };
      
      const quality = qualitySettings[options.quality || 'high'];
      
      // Criar PDF com orientação correta
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: quality.compress,
        precision: 32,
        hotfixes: ['px_scaling']
      });
      
      // Dimensões A4 em mm
      const a4WidthMM = isLandscape ? 297 : 210;
      const a4HeightMM = isLandscape ? 210 : 297;
      
      // DPI para alta qualidade
      const targetDPI = quality.dpi;
      const mmToInch = 25.4;
      
      // Calcular dimensões do canvas temporário em pixels (alta resolução)
      const targetWidth = Math.round(a4WidthMM * targetDPI / mmToInch);
      const targetHeight = Math.round(a4HeightMM * targetDPI / mmToInch);
      
      // Criar canvas temporário
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = targetWidth;
      tempCanvas.height = targetHeight;
      
      // Criar canvas Fabric com dimensões do certificado original
      // Isso é importante: o canvas Fabric deve ter as dimensões originais
      const tempFabricCanvas = new fabric.Canvas(tempCanvas, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: '#ffffff'
      });
      
      // Carregar dados da frente no tamanho original
      await this.loadCanvasData(
        tempFabricCanvas, 
        frontProcessed, 
        certificateData.certificateId || 'CERT-001'
      );
      
      // Calcular escala para fazer o certificado caber na página A4
      const scaleX = targetWidth / canvasWidth;
      const scaleY = targetHeight / canvasHeight;
      const scale = Math.min(scaleX, scaleY);
      
      // Ajustar as dimensões do viewport do canvas para o tamanho final
      tempFabricCanvas.setDimensions({
        width: targetWidth,
        height: targetHeight
      });
      
      // Aplicar zoom para escalar o conteúdo
      tempFabricCanvas.setZoom(scale);
      
      // Centralizar o conteúdo se houver espaço extra
      const scaledWidth = canvasWidth * scale;
      const scaledHeight = canvasHeight * scale;
      const offsetX = (targetWidth - scaledWidth) / 2 / scale;
      const offsetY = (targetHeight - scaledHeight) / 2 / scale;
      
      if (offsetX > 0 || offsetY > 0) {
        tempFabricCanvas.absolutePan(new fabric.Point(-offsetX, -offsetY));
      }
      
      tempFabricCanvas.renderAll();
      
      // Aguardar renderização completa antes de exportar
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Gerar imagem da frente
      const frontDataURL = tempFabricCanvas.toDataURL({
        format: 'png',
        quality: 1.0,
        multiplier: 1, // Não precisamos de multiplier adicional pois já temos alta resolução
        enableRetinaScaling: false
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Adicionar imagem mantendo qualidade máxima
      pdf.addImage(frontDataURL, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'NONE');
      
      // Processar verso se existir
      if (backProcessed) {
        pdf.addPage();
        
        // Recriar o canvas Fabric para o verso
        tempFabricCanvas.dispose();
        
        const tempFabricCanvasBack = new fabric.Canvas(tempCanvas, {
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: '#ffffff'
        });
        
        await this.loadCanvasData(
          tempFabricCanvasBack,
          backProcessed,
          certificateData.certificateId || 'CERT-001'
        );
        
        // Ajustar dimensões e aplicar zoom
        tempFabricCanvasBack.setDimensions({
          width: targetWidth,
          height: targetHeight
        });
        
        tempFabricCanvasBack.setZoom(scale);
        
        // Centralizar se necessário
        if (offsetX > 0 || offsetY > 0) {
          tempFabricCanvasBack.absolutePan(new fabric.Point(-offsetX, -offsetY));
        }
        
        tempFabricCanvasBack.renderAll();
        
        // Aguardar renderização completa antes de exportar
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const backDataURL = tempFabricCanvasBack.toDataURL({
          format: 'png',
          quality: 1.0,
          multiplier: 1,
          enableRetinaScaling: false
        });
        
        pdf.addImage(backDataURL, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'NONE');
        
        // Limpar canvas do verso
        tempFabricCanvasBack.dispose();
      } else {
        // Limpar canvas da frente se não houver verso
        tempFabricCanvas.dispose();
      }
      
      // Gerar nome do arquivo
      const studentName = variables?.nome_do_aluno?.value || 
                         studentData?.nome_do_aluno || 
                         'certificado';
      
      const fileName = options.fileName || 
        `${certificateData.name}_${studentName}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
      
      // Retornar resultado baseado nas opções
      if (options.returnBase64) {
        const base64 = pdf.output('datauristring');
        return {
          success: true,
          data: base64,
          fileName
        };
      } else if (options.returnBlob) {
        const blob = pdf.output('blob');
        return {
          success: true,
          data: blob,
          fileName
        };
      } else {
        // Download direto
        pdf.save(fileName);
        return {
          success: true,
          fileName
        };
      }
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Gera múltiplos PDFs em lote
   */
  public async generateBatchPDFs(
    certificateData: CertificateData,
    studentsData: Array<{
      variables: VariableToReplace;
      studentData?: StudentData;
    }>,
    options: PDFGenerationOptions = {},
    onProgress?: (current: number, total: number) => void
  ): Promise<BatchPDFResult[]> {
    const results: BatchPDFResult[] = [];
    const total = studentsData.length;
    
    for (let i = 0; i < total; i++) {
      const { variables, studentData } = studentsData[i];
      
      try {
        const result = await this.generatePDF(
          certificateData,
          variables,
          options,
          studentData
        );
        
        const studentName = decodeBase64Variables(variables)?.nome_do_aluno?.value || 
                           studentData?.nome_do_aluno || 
                           `aluno_${i + 1}`;
        
        results.push({
          certificateId: certificateData.certificateId || `CERT-${i + 1}`,
          studentName,
          success: result.success,
          data: result.data,
          error: result.error
        });
        
      } catch (error) {
        results.push({
          certificateId: certificateData.certificateId || `CERT-${i + 1}`,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
      
      // Callback de progresso
      if (onProgress) {
        onProgress(i + 1, total);
      }
      
      // Pequena pausa entre gerações para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  /**
   * Gera PDF e retorna como Blob para envio
   */
  public async generatePDFForEmail(
    certificateData: CertificateData,
    variableToReplace: VariableToReplace,
    studentData?: StudentData
  ): Promise<{ blob: Blob; fileName: string } | null> {
    const result = await this.generatePDF(
      certificateData,
      variableToReplace,
      { returnBlob: true },
      studentData
    );
    
    if (result.success && result.data instanceof Blob) {
      return {
        blob: result.data,
        fileName: result.fileName || 'certificado.pdf'
      };
    }
    
    return null;
  }
}

export default CertificatePDFService.getInstance();