import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as fabric from 'fabric';
import { CertificateData } from './types';

interface CertificateThumbnailProps {
  certificateData: CertificateData;
  className?: string;
  size?: number;
}

const CertificateThumbnail: React.FC<CertificateThumbnailProps> = ({
  certificateData,
  className = '',
  size = 48
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Detectar orientação do certificado
  const orientation = useMemo(() => {
    const width = certificateData.canvasWidth || 842;
    const height = certificateData.canvasHeight || 595;
    return width > height ? 'landscape' : 'portrait';
  }, [certificateData]);

  // Calcular dimensões mantendo proporção A4
  const dimensions = useMemo(() => {
    const A4_WIDTH = orientation === 'landscape' ? 842 : 595;
    const A4_HEIGHT = orientation === 'landscape' ? 595 : 842;
    const aspectRatio = A4_WIDTH / A4_HEIGHT;
    
    // Para thumbnail, manter altura fixa e calcular largura
    const height = size;
    const width = Math.round(height * aspectRatio);
    
    return {
      width,
      height,
      baseWidth: A4_WIDTH,
      baseHeight: A4_HEIGHT
    };
  }, [size, orientation]);

  // Aplicar proxy nas imagens
  const processImagesInJSON = (jsonData: any): any => {
    let data;
    if (typeof jsonData === 'string') {
      try {
        data = JSON.parse(jsonData);
      } catch (error) {
        return jsonData;
      }
    } else {
      data = JSON.parse(JSON.stringify(jsonData));
    }
    
    if (data.objects && Array.isArray(data.objects)) {
      data.objects = data.objects.map((obj: any) => {
        if (obj.type && obj.type.toLowerCase() === 'image' && obj.src) {
          const originalSrc = obj.src;
          
          if (originalSrc.includes('api.allorigins.win') || originalSrc.includes('/images/proxy')) {
            return obj;
          }
          
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
  };

  useEffect(() => {
    if (!certificateData.fabricJsonFront) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // Aguardar o canvas estar disponível no DOM
    const timeoutId = setTimeout(() => {
      if (!canvasRef.current) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      initCanvas();
    }, 50);

    const initCanvas = async () => {
      try {
        // Limpar canvas anterior
        if (fabricCanvasRef.current) {
          try {
            fabricCanvasRef.current.dispose();
          } catch (e) {
            console.warn('Erro ao limpar canvas anterior:', e);
          }
          fabricCanvasRef.current = null;
        }

        // Verificar se o elemento canvas ainda existe
        if (!canvasRef.current) {
          console.error('Canvas ref não disponível');
          return;
        }

        // Criar novo canvas com dimensões exatas
        const canvas = new fabric.Canvas(canvasRef.current, {
          width: dimensions.width,
          height: dimensions.height,
          backgroundColor: '#ffffff',
          preserveObjectStacking: true,
          selection: false,
          interactive: false,
          renderOnAddRemove: false
        });

        fabricCanvasRef.current = canvas;

        // Processar JSON
        const processedJson = processImagesInJSON(certificateData.fabricJsonFront);

        // Garantir que tem background branco
        if (!processedJson.objects) {
          processedJson.objects = [];
        }
        
        // Remover qualquer backgroundRect existente para evitar duplicação
        processedJson.objects = processedJson.objects.filter((obj: any) => 
          obj.name !== 'backgroundRect'
        );
        
        // Adicionar novo background branco
        const bgRect = new fabric.Rect({
          left: 0,
          top: 0,
          width: dimensions.baseWidth,
          height: dimensions.baseHeight,
          fill: 'white',
          selectable: false,
          evented: false,
          name: 'backgroundRect'
        });
        processedJson.objects.unshift(bgRect.toObject(['name']));

        // Calcular scale para ajustar conteúdo A4 no thumbnail
        const scale = Math.min(
          dimensions.width / dimensions.baseWidth,
          dimensions.height / dimensions.baseHeight
        ) * 0.9; // 90% para dar uma pequena margem

        // Carregar JSON
        await new Promise<void>((resolve, reject) => {
          try {
            canvas.loadFromJSON(processedJson).then(() => {
              // Verificar se canvas ainda existe
              if (!canvas || !fabricCanvasRef.current) {
                reject(new Error('Canvas foi destruído'));
                return;
              }

              // Desabilitar interação em todos os objetos
              canvas.getObjects().forEach((obj: any) => {
                obj.set({
                  selectable: false,
                  evented: false,
                  hasControls: false,
                  hasBorders: false
                });
              });

              // Aplicar zoom e centralizar usando viewportTransform
              const scaledWidth = dimensions.baseWidth * scale;
              const scaledHeight = dimensions.baseHeight * scale;
              const offsetX = (dimensions.width - scaledWidth) / 2;
              const offsetY = (dimensions.height - scaledHeight) / 2;
              
              // Usar setViewportTransform para zoom e centralização simultâneos
              canvas.setViewportTransform([
                scale, 0, 0, scale, offsetX, offsetY
              ]);

              // Renderizar
              canvas.renderAll();
              
              setTimeout(() => {
                if (canvas && fabricCanvasRef.current) {
                  canvas.renderAll();
                }
                setIsLoading(false);
                setHasError(false);
                resolve();
              }, 100);
            }).catch((error) => {
              console.error('Erro ao carregar JSON:', error);
              setHasError(true);
              setIsLoading(false);
              reject(error);
            });
          } catch (error) {
            console.error('Erro ao processar JSON:', error);
            setHasError(true);
            setIsLoading(false);
            reject(error);
          }
        });

      } catch (error) {
        console.error('Erro ao inicializar thumbnail:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    return () => {
      clearTimeout(timeoutId);
      if (fabricCanvasRef.current) {
        try {
          fabricCanvasRef.current.dispose();
        } catch (error) {
          console.warn('Erro ao limpar canvas:', error);
        }
        fabricCanvasRef.current = null;
      }
    };
  }, [certificateData, dimensions]);

  // Fallback para erro
  if (hasError || !certificateData.fabricJsonFront) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}
        style={{
          width: dimensions.width,
          height: dimensions.height
        }}
      >
        <span className="text-xs font-bold text-gray-400">
          {certificateData.name ? certificateData.name.charAt(0).toUpperCase() : 'C'}
        </span>
      </div>
    );
  }

  return (
    <div 
      className={`relative overflow-hidden bg-white ${className}`}
      style={{
        width: dimensions.width,
        height: dimensions.height
      }}
    >
      <canvas 
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{
          display: 'block',
          width: dimensions.width + 'px',
          height: dimensions.height + 'px'
        }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default CertificateThumbnail;