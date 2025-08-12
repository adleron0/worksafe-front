import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CertificateViewerProps } from './types';
import { useCertificateViewer } from './hooks/useCertificateViewer';
import CertificateCanvas, { CertificateCanvasRef } from './components/CertificateCanvas';
import DownloadToolbar from './components/DownloadToolbar';
import * as fabric from 'fabric';

const VisualizadorCertificados: React.FC<CertificateViewerProps> = ({
  certificateData,
  variableToReplace,
  onDownloadPDF,
  className = '',
  zoom = 100,
  studentData // Mantém compatibilidade (deprecated)
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const canvasRefs = useRef<Map<string, CertificateCanvasRef>>(new Map());

  const {
    processedCanvasData,
    isLoading,
    isExporting,
    pages,
    registerCanvasRef,
    loadCanvasData,
    exportToPDF
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

        // Adicionar estilos CSS para garantir importação das fontes
        const styleId = 'viewer-google-fonts-import-styles';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Montserrat:wght@400;700&family=Poppins:wght@400;700&family=Raleway:wght@400;700&family=Inter:wght@400;700&family=Playfair+Display:wght@400;700&family=Oswald:wght@400;700&family=Merriweather:wght@400;700&display=swap');
          `;
          document.head.appendChild(style);
        }

        // Verificar se já existe o link das fontes
        let link = document.querySelector('link[href*="fonts.googleapis.com"]') as HTMLLinkElement;
        
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
          
          const fontPromises = fontsToLoad.map(async (fontFamily) => {
            try {
              const testString = `12px "${fontFamily}"`;
              await document.fonts.load(testString, 'Test');
              return document.fonts.check(testString, 'Test');
            } catch (error) {
              console.warn(`⚠️ Erro ao carregar fonte ${fontFamily}:`, error);
              return true; // Não bloquear por erro
            }
          });

          await Promise.allSettled(fontPromises);
          
          // Pequeno delay adicional para garantir estabilidade
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        setFontsLoaded(true);
      } catch (error) {
        console.error('Erro no carregamento de fontes:', error);
        setFontsLoaded(true); // Continuar mesmo com erro
      }
    };

    loadGoogleFonts();
  }, []);

  // Registrar canvas refs
  const handleCanvasReady = (pageId: string, canvas: fabric.Canvas) => {
    console.log('Canvas pronto para página:', pageId);
    
    // Criar um wrapper para manter compatibilidade com o hook
    const canvasWrapper = {
      getCanvas: () => canvas
    };
    
    registerCanvasRef(pageId, canvasWrapper);
  };

  // Carregar dados quando processos estiverem prontos
  useEffect(() => {
    if (processedCanvasData && fontsLoaded && pages.length > 0) {
      // Aguardar um pouco para garantir que todos os canvas estão prontos
      setTimeout(() => {
        loadCanvasData(processedCanvasData);
      }, 500);
    }
  }, [processedCanvasData, fontsLoaded, pages.length, loadCanvasData]);

  const handleDownloadPDF = () => {
    exportToPDF();
    onDownloadPDF?.();
  };


  if (!fontsLoaded || isLoading) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <DownloadToolbar 
          onDownloadPDF={handleDownloadPDF}
          certificateName={certificateData.name}
          studentName={variableToReplace?.nome_do_aluno?.value || studentData?.nome_do_aluno}
          isLoading={true}
        />
        
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="w-12 h-12 animate-spin mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full" />
            <p className="text-sm text-muted-foreground">Carregando certificado...</p>
            <p className="text-xs text-muted-foreground mt-1">Preparando visualização</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <DownloadToolbar 
        onDownloadPDF={handleDownloadPDF}
        certificateName={certificateData.name}
        studentName={variableToReplace?.nome_do_aluno?.value || studentData?.nome_do_aluno}
        isLoading={isExporting}
      />
      
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Canvas para cada página */}
        <div className="flex-1 relative overflow-hidden">
          {pages.map((page, index) => (
            <CertificateCanvas
              key={page.id}
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
              zoom={zoom}
              onCanvasReady={(canvas) => handleCanvasReady(page.id, canvas)}
              isActive={index === currentPageIndex}
            />
          ))}
        </div>
        
        {/* Controles de página */}
        {pages.length > 1 && (
          <div className="p-4 border-t bg-background">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                disabled={currentPageIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              
              <div className="flex items-center gap-2">
                {pages.map((_, index) => (
                  <Button
                    key={index}
                    variant={index === currentPageIndex ? 'default' : 'outline'}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setCurrentPageIndex(index)}
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))}
                disabled={currentPageIndex === pages.length - 1}
              >
                Próxima
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            <div className="text-center mt-2">
              <span className="text-sm text-muted-foreground">
                Página {currentPageIndex + 1} de {pages.length}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualizadorCertificados;