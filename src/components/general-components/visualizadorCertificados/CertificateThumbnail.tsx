import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CertificateThumbnailProps } from './types';
import { useCertificateThumbnail } from './hooks/useCertificateThumbnail';
import CertificateCanvas, { CertificateCanvasRef } from './components/CertificateCanvas';
import * as fabric from 'fabric';

const CertificateThumbnail: React.FC<CertificateThumbnailProps> = ({
  certificateData,
  variableToReplace,
  className = '',
  zoom = 100,
  onClick,
  showLoader = true,
  studentData // Mantém compatibilidade (deprecated)
}) => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const canvasRef = useRef<CertificateCanvasRef | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  
  // Reset ao montar/desmontar
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const {
    processedCanvasData,
    isLoading,
    page,
    registerCanvasRef,
    loadCanvasData
  } = useCertificateThumbnail(certificateData, variableToReplace, studentData);

  // Carregar fontes do Google (versão simplificada)
  useEffect(() => {
    const loadGoogleFonts = async () => {
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

        // Carregar Bebas Neue primeiro
        const bebasLinkId = 'bebas-neue-priority-link';
        if (!document.getElementById(bebasLinkId)) {
          const bebasLink = document.createElement('link');
          bebasLink.id = bebasLinkId;
          bebasLink.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=block';
          bebasLink.rel = 'stylesheet';
          bebasLink.crossOrigin = 'anonymous';
          
          const firstElement = document.head.firstChild;
          if (firstElement) {
            document.head.insertBefore(bebasLink, firstElement);
          } else {
            document.head.appendChild(bebasLink);
          }
          
          await new Promise((resolve) => {
            bebasLink.onload = () => resolve(true);
            bebasLink.onerror = () => resolve(false);
            setTimeout(() => resolve(false), 3000);
          });
        }

        // Adicionar estilos CSS
        const styleId = 'thumbnail-google-fonts-import-styles';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=block');
            @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Montserrat:wght@400;700&family=Poppins:wght@400;700&family=Raleway:wght@400;700&family=Inter:wght@400;700&family=Playfair+Display:wght@400;700&family=Oswald:wght@400;700&family=Merriweather:wght@400;700&display=swap');
          `;
          document.head.appendChild(style);
        }

        // Verificar se já existe o link das fontes
        let link = document.querySelector('link[href*="fonts.googleapis.com"][href*="Roboto"]') as HTMLLinkElement;
        
        if (!link) {
          link = document.createElement('link');
          link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Montserrat:wght@400;700&family=Poppins:wght@400;700&family=Raleway:wght@400;700&family=Inter:wght@400;700&family=Playfair+Display:wght@400;700&family=Oswald:wght@400;700&family=Merriweather:wght@400;700&display=swap';
          link.rel = 'stylesheet';
          link.crossOrigin = 'anonymous';
          document.head.appendChild(link);
        }

        // Aguardar o carregamento usando Font Loading API
        if ('fonts' in document) {
          await document.fonts.ready;
          
          // Verificação especial para Bebas Neue
          const bebasNeue = fontsToLoad.find(f => f === 'Bebas Neue');
          if (bebasNeue) {
            try {
              const variations = [
                '400 12px "Bebas Neue"',
                '12px "Bebas Neue"',
                'normal 400 12px "Bebas Neue"'
              ];
              
              for (const variation of variations) {
                try {
                  await document.fonts.load(variation, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
                  const loaded = document.fonts.check(variation, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
                  if (loaded) break;
                } catch (e) {
                  // Ignorar erro
                }
              }
            } catch (error) {
              console.error('Erro ao carregar Bebas Neue:', error);
            }
          }
          
          // Carregar outras fontes
          const fontPromises = fontsToLoad.filter(f => f !== 'Bebas Neue').map(async (fontFamily) => {
            try {
              const testString = `12px "${fontFamily}"`;
              await document.fonts.load(testString, 'Test');
              return document.fonts.check(testString, 'Test');
            } catch (error) {
              return true;
            }
          });

          await Promise.allSettled(fontPromises);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        setFontsLoaded(true);
      } catch (error) {
        console.error('Erro no carregamento de fontes:', error);
        setFontsLoaded(true);
      }
    };

    loadGoogleFonts();
  }, []);

  // Registrar canvas ref
  const handleCanvasReady = useCallback((pageId: string, canvas: fabric.Canvas) => {
    const canvasWrapper = {
      getCanvas: () => canvas
    };
    
    registerCanvasRef(pageId, canvasWrapper);
    setCanvasReady(true);
  }, [registerCanvasRef]);

  // Estado para rastrear se canvas está pronto
  const [canvasReady, setCanvasReady] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Carregar dados quando processos estiverem prontos
  useEffect(() => {
    if (processedCanvasData && fontsLoaded && canvasReady && !dataLoaded && page) {
      setDataLoaded(true);
      loadCanvasData(processedCanvasData);
    }
  }, [processedCanvasData, fontsLoaded, canvasReady, dataLoaded, page, loadCanvasData]);

  // Observer para o tamanho do container
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Detectar se é mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  // Calcular zoom automático baseado no espaço disponível
  const calculatedZoom = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) {
      return zoom || 100;
    }

    // Determinar orientação do certificado
    const certificateOrientation = page ? page.orientation : 'landscape';
    
    // Dimensões base do certificado A4 ajustadas pela orientação
    const baseWidth = certificateOrientation === 'landscape' ? 842 : 595;
    const baseHeight = certificateOrientation === 'landscape' ? 595 : 842;
    
    // Calcular espaço disponível
    const padding = isMobile ? 16 : 24;
    const availableWidth = containerSize.width - padding;
    const availableHeight = containerSize.height - padding;

    const scaleWidth = availableWidth / baseWidth;
    const scaleHeight = availableHeight / baseHeight;
    const scale = Math.min(scaleWidth, scaleHeight);
    
    // Converter para porcentagem e limitar entre 10% e 150% para thumbnail
    const zoomPercentage = Math.max(10, Math.min(150, scale * 100));
    
    return zoomPercentage;
  }, [containerSize, zoom, page, isMobile]);

  // Handler de clique
  const handleClick = useCallback(() => {
    if (onClick && !isLoading) {
      onClick();
    }
  }, [onClick, isLoading]);

  return (
    <div 
      ref={containerRef} 
      className={`relative h-full ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={handleClick}
    >
      <div className="w-full h-full bg-background p-2 overflow-hidden">
        {page && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="bg-background rounded shadow-sm">
              <CertificateCanvas
                ref={canvasRef}
                pageId={page.id}
                pageIndex={0}
                orientation={page.orientation}
                canvasData={processedCanvasData}
                isLoading={showLoader && isLoading}
                zoom={calculatedZoom}
                onCanvasReady={(canvas) => handleCanvasReady(page.id, canvas)}
                isActive={true}
                showContainer={false}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Overlay de hover opcional */}
      {onClick && (
        <div className="absolute inset-0 bg-muted bg-opacity-0 hover:bg-opacity-10 transition-opacity duration-200 rounded-lg" />
      )}
    </div>
  );
};

export default CertificateThumbnail;