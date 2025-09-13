import { put } from '@/services/api';
import CertificateImageService from './CertificateImageService';
import {
  CertificateData,
  VariableToReplace,
  StudentData
} from '../types';

interface ThumbnailGenerationOptions {
  scale?: number;
  quality?: number;
  format?: 'png' | 'jpeg';
}

interface ThumbnailUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

class CertificateThumbnailService {
  private static instance: CertificateThumbnailService;
  private generatingCache: Set<number> = new Set();
  private uploadedCache: Set<number> = new Set();

  private constructor() {
    // Carregar cache do sessionStorage ao inicializar
    this.loadCacheFromStorage();
  }

  public static getInstance(): CertificateThumbnailService {
    if (!CertificateThumbnailService.instance) {
      CertificateThumbnailService.instance = new CertificateThumbnailService();
    }
    return CertificateThumbnailService.instance;
  }

  /**
   * Carrega o cache do sessionStorage
   */
  private loadCacheFromStorage(): void {
    try {
      const cached = sessionStorage.getItem('thumbnail_upload_cache');
      if (cached) {
        const ids = JSON.parse(cached);
        ids.forEach((id: number) => this.uploadedCache.add(id));
      }
    } catch (error) {
      console.error('Erro ao carregar cache:', error);
    }
  }

  /**
   * Salva o cache no sessionStorage
   */
  private saveCacheToStorage(): void {
    try {
      const ids = Array.from(this.uploadedCache);
      sessionStorage.setItem('thumbnail_upload_cache', JSON.stringify(ids));
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
    }
  }

  /**
   * Verifica se deve gerar thumbnail
   */
  public shouldGenerateThumbnail(certificateId: number, pdfUrl?: string): boolean {
    // Não gerar se:
    // 1. Já tem URL
    // 2. Já está gerando
    // 3. Já foi enviado nesta sessão
    return !pdfUrl &&
           !this.generatingCache.has(certificateId) &&
           !this.uploadedCache.has(certificateId);
  }

  /**
   * Gera e faz upload do thumbnail
   */
  public async generateAndUploadThumbnail(
    certificateData: CertificateData,
    variables: VariableToReplace,
    options: ThumbnailGenerationOptions = {},
    studentData?: StudentData
  ): Promise<ThumbnailUploadResult> {
    const certificateId = certificateData.id;

    // Verificar se deve gerar
    if (!this.shouldGenerateThumbnail(certificateId, certificateData.pdfUrl)) {
      return {
        success: false,
        error: 'Thumbnail já existe ou está sendo gerado'
      };
    }

    // Marcar como gerando
    this.generatingCache.add(certificateId);

    try {
      // 1. Gerar thumbnail com qualidade otimizada
      const imageResult = await CertificateImageService.generateImage(
        certificateData,
        variables,
        {
          format: options.format || 'png',
          scale: options.scale || 1.5, // Resolução menor para thumbnail
          quality: options.quality || 0.85, // Boa qualidade mas arquivo menor
          returnBlob: true
        },
        studentData
      );

      if (!imageResult.success || !(imageResult.data instanceof Blob)) {
        throw new Error(imageResult.error || 'Falha ao gerar imagem');
      }

      // Criar um File a partir do Blob
      const file = new File(
        [imageResult.data],
        imageResult.fileName || `certificate_${certificateId}.png`,
        { type: imageResult.data.type }
      );

      const payload = {
        image: file
      };

      // 3. Fazer upload para o backend
      await put(
        'trainee-certificate',
        `update-pdf/${certificateId}`,
        payload,
      );

      // 4. Marcar como enviado e salvar cache
      this.uploadedCache.add(certificateId);
      this.saveCacheToStorage();

      // 5. Retornar URL do blob local como preview imediato
      const localUrl = URL.createObjectURL(imageResult.data);

      return {
        success: true,
        url: localUrl
      };

    } catch (error) {
      console.error('Erro ao gerar/enviar thumbnail:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };

    } finally {
      // Remover do cache de gerando
      this.generatingCache.delete(certificateId);
    }
  }

  /**
   * Limpa o cache da sessão
   */
  public clearCache(): void {
    this.generatingCache.clear();
    this.uploadedCache.clear();
    sessionStorage.removeItem('thumbnail_upload_cache');
  }

  /**
   * Verifica se está gerando thumbnail
   */
  public isGenerating(certificateId: number): boolean {
    return this.generatingCache.has(certificateId);
  }

  /**
   * Verifica se já foi enviado
   */
  public wasUploaded(certificateId: number): boolean {
    return this.uploadedCache.has(certificateId);
  }
}

export default CertificateThumbnailService.getInstance();