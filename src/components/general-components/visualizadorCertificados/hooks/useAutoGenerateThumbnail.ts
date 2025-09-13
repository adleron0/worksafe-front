import { useEffect, useState, useRef } from 'react';
import CertificateThumbnailService from '../services/CertificateThumbnailService';
import {
  CertificateData,
  VariableToReplace,
  StudentData
} from '../types';

interface UseAutoGenerateThumbnailOptions {
  enabled?: boolean;
  delay?: number;
}

interface UseAutoGenerateThumbnailResult {
  isGenerating: boolean;
  thumbnailUrl?: string;
  error?: string;
}

/**
 * Hook que gera automaticamente thumbnail em background
 */
export const useAutoGenerateThumbnail = (
  certificateData: CertificateData | null,
  variables: VariableToReplace,
  studentData?: StudentData,
  options: UseAutoGenerateThumbnailOptions = {}
): UseAutoGenerateThumbnailResult => {
  const {
    enabled = true,
    delay = 1000 // Aguardar 1 segundo antes de gerar
  } = options;

  const [isGenerating, setIsGenerating] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>(certificateData?.pdfUrl);
  const [error, setError] = useState<string | undefined>();
  const generationAttemptedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Atualizar URL se mudou
    if (certificateData?.pdfUrl && certificateData.pdfUrl !== thumbnailUrl) {
      setThumbnailUrl(certificateData.pdfUrl);
    }
  }, [certificateData?.pdfUrl]);

  useEffect(() => {
    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Verificar se deve gerar
    if (!enabled ||
        !certificateData ||
        !certificateData.fabricJsonFront ||
        generationAttemptedRef.current ||
        isGenerating) {
      return;
    }

    // Verificar com o serviço se deve gerar
    const shouldGenerate = CertificateThumbnailService.shouldGenerateThumbnail(
      certificateData.id,
      certificateData.pdfUrl
    );

    if (!shouldGenerate) {
      return;
    }

    // Agendar geração com delay
    timeoutRef.current = setTimeout(async () => {
      generationAttemptedRef.current = true;
      setIsGenerating(true);
      setError(undefined);

      try {
        console.log(`[Thumbnail] Iniciando geração automática para certificado ${certificateData.id}`);

        const result = await CertificateThumbnailService.generateAndUploadThumbnail(
          certificateData,
          variables,
          {
            scale: 1.5, // Thumbnail em resolução média
            quality: 0.85,
            format: 'png'
          },
          studentData
        );

        if (result.success) {
          console.log(`[Thumbnail] Geração concluída com sucesso para certificado ${certificateData.id}`);
          if (result.url) {
            setThumbnailUrl(result.url);
          }
        } else {
          console.warn(`[Thumbnail] Falha na geração:`, result.error);
          setError(result.error);
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error(`[Thumbnail] Erro ao gerar:`, errorMessage);
        setError(errorMessage);
      } finally {
        setIsGenerating(false);
      }
    }, delay);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    enabled,
    certificateData?.id,
    certificateData?.pdfUrl,
    certificateData?.fabricJsonFront
  ]);

  return {
    isGenerating,
    thumbnailUrl,
    error
  };
};