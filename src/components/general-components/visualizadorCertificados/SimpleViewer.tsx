import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';

interface SimpleViewerProps {
  jsonData: any;
  width?: number;
  height?: number;
}

const SimpleViewer: React.FC<SimpleViewerProps> = ({ jsonData, width = 842, height = 595 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Função para processar imagens e aplicar proxy
  const processImagesInJSON = (json: any) => {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    
    if (data.objects && Array.isArray(data.objects)) {
      data.objects = data.objects.map((obj: any) => {
        if (obj.type === 'Image' && obj.src) {
          // Verificar se já tem proxy aplicado
          if (obj.src.includes('/images/proxy') || obj.src.includes('api.allorigins.win')) {
            return obj;
          }
          
          // Se for URL externa, aplicar proxy
          if (obj.src.startsWith('http://') || obj.src.startsWith('https://')) {
            const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';
            obj.src = `${BASE_URL}/images/proxy?url=${encodeURIComponent(obj.src)}`;
          }
        }
        return obj;
      });
    }
    
    return data;
  };
  
  useEffect(() => {
    if (!canvasRef.current || !jsonData) return;
    
    // Criar canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: width * 0.5,
      height: height * 0.5,
      backgroundColor: 'white'
    });
    
    // Aplicar zoom
    canvas.setZoom(0.5);
    
    // Processar JSON e aplicar proxy nas imagens
    const data = processImagesInJSON(jsonData);
    
    // Carregar JSON com imagens via proxy
    canvas.loadFromJSON(data, () => {
      // Desabilitar interação
      canvas.getObjects().forEach(obj => {
        obj.set({
          selectable: false,
          evented: false
        });
      });
      
      canvas.renderAll();
      setIsLoading(false);
    });
    
    return () => {
      canvas.dispose();
    };
  }, [jsonData, width, height]);
  
  return (
    <div className="relative">
      <canvas ref={canvasRef} />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
};

export default SimpleViewer;