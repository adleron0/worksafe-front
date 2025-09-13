import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CertificateViewerProps } from './types';
import { useCertificateViewer } from './hooks/useCertificateViewer';
import CertificateCanvas, { CertificateCanvasRef } from './components/CertificateCanvas';
import * as fabric from 'fabric';

const VisualizadorCertificados: React.FC<CertificateViewerProps> = ({
  certificateData,
  variableToReplace,
  className = '',
  zoom = 100,
  studentData // Mantém compatibilidade (deprecated)
}) => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const canvasRefs = useRef<Map<string, CertificateCanvasRef>>(new Map());
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
    pages,
    registerCanvasRef,
    loadCanvasData
  } = useCertificateViewer(certificateData, variableToReplace, studentData);

  // Carregar fontes do Google (reutilizado do gerador)
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

        // PRIORIDADE MÁXIMA: Carregar Bebas Neue PRIMEIRO e SEPARADAMENTE
        const bebasLinkId = 'bebas-neue-priority-link';
        if (!document.getElementById(bebasLinkId)) {
          const bebasLink = document.createElement('link');
          bebasLink.id = bebasLinkId;
          bebasLink.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=block';
          bebasLink.rel = 'stylesheet';
          bebasLink.crossOrigin = 'anonymous';
          
          // Adicionar como primeiro link no head
          const firstElement = document.head.firstChild;
          if (firstElement) {
            document.head.insertBefore(bebasLink, firstElement);
          } else {
            document.head.appendChild(bebasLink);
          }
          
          // Aguardar carregamento com timeout
          await new Promise((resolve) => {
            bebasLink.onload = () => {
              resolve(true);
            };
            bebasLink.onerror = () => {
              console.error('❌ Erro ao carregar link Bebas Neue');
              resolve(false);
            };
            setTimeout(() => {
              resolve(false);
            }, 3000);
          });
        }

        // Adicionar estilos CSS para garantir importação das fontes
        const styleId = 'viewer-google-fonts-import-styles';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=block');
            @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Montserrat:wght@400;700&family=Poppins:wght@400;700&family=Raleway:wght@400;700&family=Inter:wght@400;700&family=Playfair+Display:wght@400;700&family=Oswald:wght@400;700&family=Merriweather:wght@400;700&display=swap');
            
            /* Forçar pré-carregamento da Bebas Neue */
            @font-face {
              font-family: 'Bebas Neue Preload';
              src: local('Bebas Neue'), local('BebasNeue');
              font-display: block;
            }
            
            .bebas-neue-force-load {
              font-family: 'Bebas Neue', sans-serif !important;
              position: fixed;
              left: -9999px;
              top: -9999px;
              visibility: hidden;
              opacity: 0;
              width: 1px;
              height: 1px;
              overflow: hidden;
            }
          `;
          document.head.appendChild(style);
          
          // Criar elemento invisível para forçar carregamento da fonte
          const forceLoadDiv = document.createElement('div');
          forceLoadDiv.className = 'bebas-neue-force-load';
          forceLoadDiv.textContent = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
          forceLoadDiv.style.fontFamily = 'Bebas Neue';
          document.body.appendChild(forceLoadDiv);
          
          // Aguardar um pouco e remover
          setTimeout(() => {
            document.body.removeChild(forceLoadDiv);
          }, 2000);
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
          
          // Verificação especial para Bebas Neue que é problemática
          const bebasNeue = fontsToLoad.find(f => f === 'Bebas Neue');
          if (bebasNeue) {
            try {
              // Tentar múltiplas variações para garantir carregamento
              const variations = [
                '400 12px "Bebas Neue"',
                '12px "Bebas Neue"',
                'normal 400 12px "Bebas Neue"'
              ];
              
              for (const variation of variations) {
                try {
                  await document.fonts.load(variation, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
                  const loaded = document.fonts.check(variation, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
                  if (loaded) {
                    break;
                  }
                } catch {
                }
              }
              
              // Verificação final se a fonte está disponível
              const bebasLoaded = document.fonts.check('12px "Bebas Neue"', 'TEST');
              if (!bebasLoaded) {
                console.error('❌ Bebas Neue não carregou corretamente');
                
                // Adicionar fallback CSS
                const fallbackStyle = document.createElement('style');
                fallbackStyle.textContent = `
                  @font-face {
                    font-family: 'Bebas Neue Fallback';
                    src: local('Arial'), local('Helvetica');
                    font-weight: 400;
                  }
                  .canvas-container { font-family: 'Bebas Neue', 'Bebas Neue Fallback', sans-serif !important; }
                `;
                document.head.appendChild(fallbackStyle);
              }
            } catch (error) {
              console.error('❌ Erro crítico ao carregar Bebas Neue:', error);
            }
          }
          
          // Carregar outras fontes
          const fontPromises = fontsToLoad.filter(f => f !== 'Bebas Neue').map(async (fontFamily) => {
            try {
              const testString = `12px "${fontFamily}"`;
              await document.fonts.load(testString, 'Test');
              return document.fonts.check(testString, 'Test');
            } catch {
              return true; // Não bloquear por erro
            }
          });

          await Promise.allSettled(fontPromises);
          
          // Delay maior para garantir estabilidade do Bebas Neue
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Verificação final CRÍTICA antes de liberar
          const finalCheck = document.fonts.check('12px "Bebas Neue"', 'TESTE');
          if (!finalCheck) {
            console.error('❌ ERRO CRÍTICO: Bebas Neue ainda não está disponível após todo o processo de carregamento');
            // Tentar mais uma vez com delay maior
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // Só marcar como carregado após todas as verificações
        setFontsLoaded(true);
      } catch (error) {
        console.error('Erro no carregamento de fontes:', error);
        setFontsLoaded(true); // Continuar mesmo com erro
      }
    };

    loadGoogleFonts();
  }, []);

  // Registrar canvas refs
  const handleCanvasReady = useCallback((pageId: string, canvas: fabric.Canvas) => {
    
    // Criar um wrapper para manter compatibilidade com o hook
    const canvasWrapper = {
      getCanvas: () => canvas
    };
    
    registerCanvasRef(pageId, canvasWrapper);
    
    // Adicionar ao Set de canvas prontos
    setCanvasReady(prev => {
      const newSet = new Set(prev);
      newSet.add(pageId);
      return newSet;
    });
  }, [registerCanvasRef]);

  // Estado para rastrear canvas prontos e se dados foram carregados
  const [canvasReady, setCanvasReady] = useState<Set<string>>(new Set());
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Carregar dados quando processos estiverem prontos
  useEffect(() => {
    const allCanvasReady = pages.length > 0 && 
                          pages.every(page => canvasReady.has(page.id));
    
    
    // Carregar dados apenas uma vez quando todas as condições forem atendidas
    if (processedCanvasData && fontsLoaded && allCanvasReady && !dataLoaded) {
      
      setDataLoaded(true); // Marcar como carregado ANTES de chamar loadCanvasData
      
      // Chamar loadCanvasData imediatamente
      loadCanvasData(processedCanvasData);
    }
  }, [processedCanvasData, fontsLoaded, pages, canvasReady, dataLoaded, loadCanvasData]);


  // Determinar se tem verso
  const hasBackPage = pages.length > 1;

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
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024; // breakpoint lg
  
  // Calcular zoom automático baseado no espaço disponível
  const calculatedZoom = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) {
      return zoom || 100; // Usar zoom fornecido ou padrão enquanto não tem tamanho
    }

    // Determinar orientação do certificado
    const certificateOrientation = pages.length > 0 ? pages[0].orientation : 'landscape';
    
    // Dimensões base do certificado A4 ajustadas pela orientação
    const baseWidth = certificateOrientation === 'landscape' ? 842 : 595;
    const baseHeight = certificateOrientation === 'landscape' ? 595 : 842;
    
    // Calcular espaço disponível (descontando padding e margem)
    const padding = 32; // 16px de cada lado (p-4 = 16px)
    const toolbarHeight = 60; // Altura aproximada da toolbar
    const labelHeight = hasBackPage ? 32 : 0; // Altura dos labels "Frente/Verso"
    const availableWidth = containerSize.width - padding;
    const availableHeight = containerSize.height - toolbarHeight - padding - labelHeight;

    let scale = 1;
    
    if (hasBackPage) {
      const gap = 16; // gap-4 = 16px
      const cardPadding = 16; // p-2 em cada card = 8px * 2
      
      // No mobile: sempre empilhado (scroll vertical permitido)
      if (isMobile) {
        // Certificados no mobile: calcular baseado apenas na largura
        // Permitir scroll vertical para ver o conteúdo completo
        const totalWidthNeeded = baseWidth + cardPadding;
        
        // Usar apenas a largura para calcular o zoom no mobile
        scale = availableWidth / totalWidthNeeded;
        
        // Limitar o zoom máximo para não ficar muito grande
        scale = Math.min(scale, 1.2);
      } else {
        // Desktop: sempre lado a lado
        const totalWidthNeeded = (baseWidth * 2) + gap + (cardPadding * 2);
        const totalHeightNeeded = baseHeight + cardPadding;
        
        const scaleWidth = availableWidth / totalWidthNeeded;
        const scaleHeight = availableHeight / totalHeightNeeded;
        scale = Math.min(scaleWidth, scaleHeight);
      }
    } else {
      // Com 1 página centralizada
      const cardPadding = 16;
      const totalWidthNeeded = baseWidth + cardPadding;
      const totalHeightNeeded = baseHeight + cardPadding;
      
      if (isMobile) {
        // Mobile: usar apenas largura
        scale = availableWidth / totalWidthNeeded;
        scale = Math.min(scale, 1.2);
      } else {
        // Desktop: considerar altura e largura
        const scaleWidth = availableWidth / totalWidthNeeded;
        const scaleHeight = availableHeight / totalHeightNeeded;
        scale = Math.min(scaleWidth, scaleHeight);
      }
    }
    
    // Converter para porcentagem e limitar entre 10% e 200%
    const zoomPercentage = Math.max(10, Math.min(200, scale * 100));
    
    
    return zoomPercentage;
  }, [containerSize, hasBackPage, zoom, pages, isMobile]);

  return (
    <div ref={containerRef} className={`flex flex-col h-full ${className}`}>
      {/* <DownloadToolbar 
        onDownloadPDF={handleDownloadPDF}
        certificateName={certificateData.name}
        studentName={decodeBase64Variables(variableToReplace)?.nome_do_aluno?.value || studentData?.nome_do_aluno}
        isLoading={isExporting}
      /> */}
      
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Container principal para canvas */}
        <div className={`flex-1 bg-background p-4 ${
          // No mobile: permitir scroll vertical
          // No desktop: sem scroll (overflow-hidden)
          isMobile ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'
        }`}>
          {hasBackPage ? (
            // Quando tem 2 páginas: layout responsível
            <div className={`
              flex gap-4 items-center justify-center
              ${
                // Mobile: sempre empilhado (flex-col)
                // Desktop: sempre lado a lado (flex-row)
                'flex-col lg:flex-row'
              }
              ${
                // No desktop: altura mínima total
                // No mobile: sem restrição de altura (permite scroll)
                isMobile ? '' : 'min-h-full'
              }
            `}>
              {pages.map((page, index) => (
                <div key={page.id} className="flex flex-col items-center">
                  {/* <div className="mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {index === 0 ? 'Frente' : 'Verso'}
                    </span>
                  </div> */}
                  <div className="bg-background rounded-lg shadow-lg p-2">
                    <CertificateCanvas
                      ref={(ref) => {
                        if (ref) {
                          canvasRefs.current.set(page.id, ref);
                        }
                      }}
                      pageId={page.id}
                      pageIndex={index}
                      orientation={page.orientation}
                      canvasData={processedCanvasData}
                      isLoading={isLoading}
                      zoom={calculatedZoom}
                      onCanvasReady={(canvas) => handleCanvasReady(page.id, canvas)}
                      isActive={true}
                      showContainer={false}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Quando tem apenas 1 página: mostrar centralizada
            <div className="flex items-center justify-center min-h-full">
              {pages.length > 0 && (
                <div className="flex flex-col items-center">
                  <div className="bg-background rounded-lg shadow-lg p-2">
                    <CertificateCanvas
                      ref={(ref) => {
                        if (ref) {
                          canvasRefs.current.set(pages[0].id, ref);
                        }
                      }}
                      pageId={pages[0].id}
                      pageIndex={0}
                      orientation={pages[0].orientation}
                      canvasData={processedCanvasData}
                      isLoading={isLoading}
                      zoom={calculatedZoom}
                      onCanvasReady={(canvas) => handleCanvasReady(pages[0].id, canvas)}
                      isActive={true}
                      showContainer={false}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualizadorCertificados;