import * as fabric from 'fabric';
import QRCode from 'qrcode';
import {
  CertificateData,
  VariableToReplace,
  StudentData
} from '../types';
import { VariableReplacer } from '../utils/VariableReplacer';
import { decodeBase64Variables } from '@/utils/decodeBase64Variables';

export interface ImageGenerationOptions {
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number; // 0-1 para JPEG/WebP
  scale?: number; // Multiplicador de resolução (default: 2 para alta qualidade)
  returnBlob?: boolean;
  returnBase64?: boolean;
  fileName?: string;
}

export interface ImageGenerationResult {
  success: boolean;
  data?: Blob | string;
  fileName?: string;
  error?: string;
}

class CertificateImageService {
  private static instance: CertificateImageService;
  private fontsLoaded: boolean = false;
  private fontLoadPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): CertificateImageService {
    if (!CertificateImageService.instance) {
      CertificateImageService.instance = new CertificateImageService();
    }
    return CertificateImageService.instance;
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
      const linkId = 'certificate-image-fonts';

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

        // Carregar o JSON no canvas
        await canvas.loadFromJSON(jsonToLoad);

        // Processar QR Codes
        const objects = [...canvas.getObjects()];
        for (const obj of objects) {
          if ((obj as any).isQRCodePlaceholder && (obj as any).qrCodeName) {
            const qrDataUrl = await this.generateQRCode(certificateId);

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

                const targetWidth = position.width || 120;
                const targetHeight = position.height || 120;
                const placeholderScaleX = position.scaleX;
                const placeholderScaleY = position.scaleY;

                const finalWidth = targetWidth * placeholderScaleX;
                const finalHeight = targetHeight * placeholderScaleY;

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
   * Gera imagem PNG/JPEG do certificado (apenas primeira página)
   */
  public async generateImage(
    certificateData: CertificateData,
    variableToReplace: VariableToReplace,
    options: ImageGenerationOptions = {},
    studentData?: StudentData
  ): Promise<ImageGenerationResult> {
    try {
      // Carregar fontes
      await this.loadFonts();

      // Processar variáveis
      const variables = this.processVariables(variableToReplace, studentData);

      // Validar e processar dados da frente (sempre primeira página)
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

      // Configurações de formato e qualidade
      const format = options.format || 'png';
      const quality = options.quality || 1.0; // Máxima qualidade por padrão
      const scale = options.scale || 4; // Aumentar para 4x de resolução (muito alta qualidade)

      // Usar dimensões reais do certificado ou padrão A4 landscape
      const canvasWidth = certificateData.canvasWidth || 842;
      const canvasHeight = certificateData.canvasHeight || 595;

      // Criar canvas temporário com resolução aumentada
      const tempCanvas = document.createElement('canvas');
      const finalWidth = canvasWidth * scale;
      const finalHeight = canvasHeight * scale;

      tempCanvas.width = finalWidth;
      tempCanvas.height = finalHeight;

      // Obter contexto e configurar para máxima qualidade
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        // Configurações para melhor qualidade de renderização
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }

      // Criar canvas Fabric com configurações de alta qualidade
      const tempFabricCanvas = new fabric.Canvas(tempCanvas, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: '#ffffff',
        enableRetinaScaling: true, // Habilitar suporte para Retina
        renderOnAddRemove: true,
        preserveObjectStacking: true
      });

      // Carregar dados da frente
      await this.loadCanvasData(
        tempFabricCanvas,
        frontProcessed,
        certificateData.certificateId || 'CERT-001'
      );

      // Aplicar escala para alta resolução
      tempFabricCanvas.setDimensions({
        width: finalWidth,
        height: finalHeight
      });
      tempFabricCanvas.setZoom(scale);

      // Forçar renderização múltiplas vezes para garantir qualidade
      tempFabricCanvas.renderAll();
      tempFabricCanvas.requestRenderAll();

      // Aguardar renderização completa com tempo maior
      await new Promise(resolve => setTimeout(resolve, 500));

      // Gerar imagem com máxima qualidade
      let dataURL: string;

      if (format === 'png') {
        // PNG com máxima qualidade e sem compressão
        dataURL = tempFabricCanvas.toDataURL({
          format: 'png',
          quality: 1.0,
          multiplier: 1, // Já aplicamos o scale manualmente
          enableRetinaScaling: false
        });
      } else if (format === 'jpeg') {
        // JPEG com qualidade configurável
        dataURL = tempFabricCanvas.toDataURL({
          format: 'jpeg',
          quality: quality,
          multiplier: 1,
          enableRetinaScaling: false
        });
      } else if (format === 'webp') {
        // WebP com qualidade configurável
        dataURL = tempFabricCanvas.toDataURL({
          format: 'webp',
          quality: quality,
          multiplier: 1,
          enableRetinaScaling: false
        });
      } else {
        throw new Error(`Formato não suportado: ${format}`);
      }

      // Limpar canvas
      tempFabricCanvas.dispose();

      // Gerar nome do arquivo
      const studentName = variables?.nome_do_aluno?.value ||
                         variables?.aluno_nome?.value ||
                         studentData?.nome_do_aluno ||
                         'certificado';

      const extension = format === 'jpeg' ? 'jpg' : format;
      const fileName = options.fileName ||
        `${certificateData.name}_${studentName}.${extension}`.replace(/[^a-zA-Z0-9_.-]/g, '_');

      // Retornar resultado baseado nas opções
      if (options.returnBase64) {
        return {
          success: true,
          data: dataURL,
          fileName
        };
      } else if (options.returnBlob) {
        // Converter dataURL para Blob
        const response = await fetch(dataURL);
        const blob = await response.blob();

        return {
          success: true,
          data: blob,
          fileName
        };
      } else {
        // Download direto
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return {
          success: true,
          fileName
        };
      }

    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Gera thumbnail em baixa resolução
   */
  public async generateThumbnail(
    certificateData: CertificateData,
    variableToReplace: VariableToReplace,
    studentData?: StudentData
  ): Promise<ImageGenerationResult> {
    return this.generateImage(
      certificateData,
      variableToReplace,
      {
        format: 'jpeg',
        quality: 0.7,
        scale: 0.5, // Resolução reduzida para thumbnail
        returnBase64: true
      },
      studentData
    );
  }

  /**
   * Gera imagem para compartilhamento social
   */
  public async generateSocialImage(
    certificateData: CertificateData,
    variableToReplace: VariableToReplace,
    studentData?: StudentData
  ): Promise<ImageGenerationResult> {
    return this.generateImage(
      certificateData,
      variableToReplace,
      {
        format: 'jpeg',
        quality: 0.85,
        scale: 1.5, // Resolução média para redes sociais
        returnBlob: true
      },
      studentData
    );
  }
}

export default CertificateImageService.getInstance();