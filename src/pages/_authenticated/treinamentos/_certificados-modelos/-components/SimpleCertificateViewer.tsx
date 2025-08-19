import React, { useRef, useEffect, useState } from 'react';
import * as fabric from 'fabric';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface SimpleCertificateViewerProps {
  certificateData: {
    fabricJsonFront: string;
    fabricJsonBack?: string | null;
    canvasWidth: number;
    canvasHeight: number;
  };
  zoom?: number;
}

const SimpleCertificateViewer: React.FC<SimpleCertificateViewerProps> = ({ 
  certificateData, 
  zoom = 80 
}) => {
  console.log('🎨 SimpleCertificateViewer - Iniciando', {
    hasData: !!certificateData,
    hasFront: !!certificateData?.fabricJsonFront,
    hasBack: !!certificateData?.fabricJsonBack,
    width: certificateData?.canvasWidth,
    height: certificateData?.canvasHeight
  });

  const canvasFrontRef = useRef<HTMLCanvasElement>(null);
  const canvasBackRef = useRef<HTMLCanvasElement>(null);
  const fabricFrontRef = useRef<fabric.Canvas | null>(null);
  const fabricBackRef = useRef<fabric.Canvas | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(zoom);
  
  const hasBackPage = !!certificateData.fabricJsonBack;

  // Processar URLs para proxy
  const processImagesWithProxy = (jsonString: string): string => {
    console.log('🖼️ Processando imagens para proxy...');
    try {
      const jsonData = JSON.parse(jsonString);
      let imageCount = 0;
      
      if (jsonData.objects && Array.isArray(jsonData.objects)) {
        jsonData.objects = jsonData.objects.map((obj: any) => {
          if (obj.type && obj.type.toLowerCase() === 'image' && obj.src) {
            if (obj.src.startsWith('http')) {
              const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';
              const proxyUrl = `${BASE_URL}/images/proxy?url=${encodeURIComponent(obj.src)}`;
              console.log(`🖼️ Proxy aplicado [${++imageCount}]:`, obj.src.substring(0, 50) + '...');
              obj.src = proxyUrl;
            }
          }
          return obj;
        });
      }
      
      console.log(`🖼️ Total de imagens processadas: ${imageCount}`);
      return JSON.stringify(jsonData);
    } catch (error) {
      console.error('❌ Erro ao processar imagens:', error);
      return jsonString;
    }
  };

  useEffect(() => {
    const initCanvas = async () => {
      console.log('🚀 Iniciando canvas...');
      setIsLoading(true);
      
      // Aguardar um momento para garantir que o DOM esteja pronto
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Inicializar canvas da frente
      if (canvasFrontRef.current && certificateData.fabricJsonFront) {
        console.log('📄 Criando canvas da frente...');
        try {
          const canvas = new fabric.Canvas(canvasFrontRef.current, {
            width: certificateData.canvasWidth,
            height: certificateData.canvasHeight,
            backgroundColor: '#ffffff',
            selection: false,
            interactive: false
          });
          
          console.log('📄 Canvas criado:', !!canvas);
          fabricFrontRef.current = canvas;
          
          const processedJson = processImagesWithProxy(certificateData.fabricJsonFront);
          const jsonObj = JSON.parse(processedJson);
          
          console.log('📄 JSON processado:', {
            numObjects: jsonObj.objects?.length,
            hasBackground: !!jsonObj.background,
            hasBackgroundImage: !!jsonObj.backgroundImage
          });
          
          // Usar setTimeout para garantir que o canvas está pronto
          setTimeout(() => {
            console.log('📄 Carregando JSON no canvas...');
            canvas.loadFromJSON(jsonObj, () => {
              // Aguardar imagens carregarem
              setTimeout(() => {
                console.log('✅ Canvas frente carregado!');
                console.log('📄 Objetos no canvas:', canvas.getObjects().length);
                
                canvas.renderAll();
                
                // Aplicar zoom inicial
                const scale = zoomLevel / 100;
                canvas.setZoom(scale);
                canvas.setDimensions({
                  width: certificateData.canvasWidth * scale,
                  height: certificateData.canvasHeight * scale
                });
                
                console.log('✅ Zoom aplicado e canvas pronto!');
                
                // Ocultar upper-canvas
                const upperCanvas = canvasFrontRef.current?.parentElement?.querySelector('.upper-canvas') as HTMLCanvasElement;
                if (upperCanvas) {
                  upperCanvas.style.display = 'none';
                }
                
                setIsLoading(false);
              }, 1500); // Aguardar mais tempo para imagens carregarem
            });
          }, 100);
        } catch (error) {
          console.error('❌ Erro ao carregar canvas frente:', error);
          setIsLoading(false);
        }
      } else {
        console.warn('⚠️ Canvas ref ou dados não disponíveis');
        setIsLoading(false);
      }
      
      // Inicializar canvas do verso se existir
      if (hasBackPage && canvasBackRef.current && certificateData.fabricJsonBack) {
        console.log('📄 Criando canvas do verso...');
        try {
          const canvas = new fabric.Canvas(canvasBackRef.current, {
            width: certificateData.canvasWidth,
            height: certificateData.canvasHeight,
            backgroundColor: '#ffffff',
            selection: false,
            interactive: false
          });
          
          fabricBackRef.current = canvas;
          
          const processedJson = processImagesWithProxy(certificateData.fabricJsonBack);
          const jsonObj = JSON.parse(processedJson);
          
          console.log('📄 JSON verso processado:', {
            numObjects: jsonObj.objects?.length
          });
          
          setTimeout(() => {
            console.log('📄 Carregando JSON no canvas verso...');
            canvas.loadFromJSON(jsonObj, () => {
              setTimeout(() => {
                console.log('✅ Canvas verso carregado!');
                console.log('📄 Objetos no canvas verso:', canvas.getObjects().length);
                
                canvas.renderAll();
                
                // Aplicar zoom inicial
                const scale = zoomLevel / 100;
                canvas.setZoom(scale);
                canvas.setDimensions({
                  width: certificateData.canvasWidth * scale,
                  height: certificateData.canvasHeight * scale
                });
                
                // Ocultar upper-canvas do verso
                const upperCanvasBack = canvasBackRef.current?.parentElement?.querySelector('.upper-canvas') as HTMLCanvasElement;
                if (upperCanvasBack) {
                  upperCanvasBack.style.display = 'none';
                }
              }, 1500);
            });
          }, 100);
        } catch (error) {
          console.error('❌ Erro ao carregar canvas verso:', error);
        }
      }
    };

    initCanvas();

    return () => {
      if (fabricFrontRef.current) {
        fabricFrontRef.current.dispose();
        fabricFrontRef.current = null;
      }
      if (fabricBackRef.current) {
        fabricBackRef.current.dispose();
        fabricBackRef.current = null;
      }
    };
  }, []);

  // Atualizar zoom
  useEffect(() => {
    const scale = zoomLevel / 100;
    
    if (fabricFrontRef.current) {
      fabricFrontRef.current.setZoom(scale);
      fabricFrontRef.current.setDimensions({
        width: certificateData.canvasWidth * scale,
        height: certificateData.canvasHeight * scale
      });
    }
    
    if (fabricBackRef.current) {
      fabricBackRef.current.setZoom(scale);
      fabricBackRef.current.setDimensions({
        width: certificateData.canvasWidth * scale,
        height: certificateData.canvasHeight * scale
      });
    }
  }, [zoomLevel, certificateData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary mb-3" />
          <p className="text-sm font-medium">Carregando certificado...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full" style={{ height: '500px' }}>
      {/* Área do Canvas */}
      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-auto">
        <div className="flex items-center justify-center h-full p-4">
          {/* Container para Canvas Frente */}
          <div 
            className="canvas-container"
            style={{ 
              display: currentPage === 0 ? 'block' : 'none',
              position: 'relative'
            }}
          >
            <canvas 
              ref={canvasFrontRef}
              className="shadow-lg bg-white rounded"
            />
          </div>
          
          {/* Container para Canvas Verso */}
          {hasBackPage && (
            <div 
              className="canvas-container"
              style={{ 
                display: currentPage === 1 ? 'block' : 'none',
                position: 'relative'
              }}
            >
              <canvas 
                ref={canvasBackRef}
                className="shadow-lg bg-white rounded"
              />
            </div>
          )}
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between gap-4 p-3 border-t bg-background">
        {/* Controles de Zoom */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel(prev => Math.max(10, prev - 10))}
            disabled={zoomLevel <= 10}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 w-32">
            <Slider
              value={[zoomLevel]}
              onValueChange={(value) => setZoomLevel(value[0])}
              min={10}
              max={200}
              step={10}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-10 text-right">
              {zoomLevel}%
            </span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel(prev => Math.min(200, prev + 10))}
            disabled={zoomLevel >= 200}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Controles de Paginação */}
        {hasBackPage && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(0)}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-xs text-muted-foreground px-2">
              Página {currentPage + 1} de 2
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleCertificateViewer;