import jsPDF from 'jspdf';
import * as fabric from 'fabric';
import QRCode from 'qrcode';
import { 
  CertificateData, 
  VariableToReplace, 
  ProcessedCanvasData,
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
        
        // Adicionar background branco se não existir
        if (!jsonToLoad.objects) {
          jsonToLoad.objects = [];
        }
        
        const hasBackground = jsonToLoad.objects.some((obj: any) => 
          obj.name === 'backgroundRect'
        );
        
        if (!hasBackground) {
          const bgRect = {
            type: 'rect',
            left: 0,
            top: 0,
            width: canvas.width || 842,
            height: canvas.height || 595,
            fill: 'white',
            selectable: false,
            evented: false,
            name: 'backgroundRect'
          };
          jsonToLoad.objects.unshift(bgRect);
        }
        
        await canvas.loadFromJSON(jsonToLoad);
        
        // Processar QR Codes
        const objects = canvas.getObjects();
        for (const obj of objects) {
          if ((obj as any).isQRCodePlaceholder) {
            const qrDataUrl = await this.generateQRCode(certificateId);
            
            canvas.remove(obj);
            
            // Criar nova imagem do QR Code
            await new Promise<void>((resolveQR) => {
              const img = new Image();
              img.onload = () => {
                const fabricImage = new fabric.Image(img);
                
                const targetWidth = (obj as any).width || 120;
                const targetHeight = (obj as any).height || 120;
                const scaleX = targetWidth / (fabricImage.width || 200);
                const scaleY = targetHeight / (fabricImage.height || 200);
                
                fabricImage.set({
                  left: obj.left,
                  top: obj.top,
                  scaleX: scaleX,
                  scaleY: scaleY,
                  selectable: false,
                  evented: false
                });
                
                canvas.add(fabricImage);
                resolveQR();
              };
              img.src = qrDataUrl;
            });
          }
        }
        
        // Configurar objetos como não editáveis
        canvas.getObjects().forEach((obj: any) => {
          obj.set({
            selectable: false,
            evented: false,
            hasControls: false,
            hasBorders: false
          });
          
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
      
      // Detectar orientação
      const width = certificateData.canvasWidth || 842;
      const height = certificateData.canvasHeight || 595;
      const isLandscape = width > height;
      
      // Configurar qualidade
      const qualitySettings = {
        low: { dpi: 72, compress: true },
        medium: { dpi: 150, compress: true },
        high: { dpi: 300, compress: false },
        maximum: { dpi: 600, compress: false }
      };
      
      const quality = qualitySettings[options.quality || 'high'];
      
      // Criar PDF
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: quality.compress,
        precision: 32,
        hotfixes: ['px_scaling']
      });
      
      // Criar canvas temporário
      const tempCanvas = document.createElement('canvas');
      const targetDPI = quality.dpi;
      const mmToInch = 25.4;
      const a4WidthMM = isLandscape ? 297 : 210;
      const a4HeightMM = isLandscape ? 210 : 297;
      const targetWidth = Math.round(a4WidthMM * targetDPI / mmToInch);
      const targetHeight = Math.round(a4HeightMM * targetDPI / mmToInch);
      
      tempCanvas.width = targetWidth;
      tempCanvas.height = targetHeight;
      
      // Processar página da frente
      const tempFabricCanvas = new fabric.Canvas(tempCanvas, {
        width: targetWidth,
        height: targetHeight,
        backgroundColor: '#ffffff'
      });
      
      const baseWidth = isLandscape ? 842 : 595;
      const baseHeight = isLandscape ? 595 : 842;
      const scale = Math.min(targetWidth / baseWidth, targetHeight / baseHeight);
      
      // Carregar dados da frente
      await this.loadCanvasData(
        tempFabricCanvas, 
        frontProcessed, 
        certificateData.certificateId || 'CERT-001'
      );
      
      tempFabricCanvas.setZoom(scale);
      tempFabricCanvas.renderAll();
      
      // Gerar imagem da frente
      const frontDataURL = tempFabricCanvas.toDataURL({
        format: 'png',
        quality: 1.0,
        multiplier: 1,
        enableRetinaScaling: false
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(frontDataURL, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'NONE');
      
      // Processar verso se existir
      if (backProcessed) {
        pdf.addPage();
        
        // Limpar e reutilizar canvas
        tempFabricCanvas.clear();
        tempFabricCanvas.backgroundColor = '#ffffff';
        
        await this.loadCanvasData(
          tempFabricCanvas,
          backProcessed,
          certificateData.certificateId || 'CERT-001'
        );
        
        tempFabricCanvas.setZoom(scale);
        tempFabricCanvas.renderAll();
        
        const backDataURL = tempFabricCanvas.toDataURL({
          format: 'png',
          quality: 1.0,
          multiplier: 1,
          enableRetinaScaling: false
        });
        
        pdf.addImage(backDataURL, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'NONE');
      }
      
      // Limpar canvas temporário
      tempFabricCanvas.dispose();
      
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