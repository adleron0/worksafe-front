import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

const TestProxyImage: React.FC = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testProxy = () => {
    setLoading(true);
    setError('');
    
    // URL de teste - pode ser qualquer imagem externa
    const testImageUrl = 'https://via.placeholder.com/300x200/FF0000/FFFFFF?text=Teste+Proxy';
    setImageUrl(testImageUrl);
    
    // Criar URL do proxy
    const encodedUrl = encodeURIComponent(testImageUrl);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const proxiedUrl = `${apiBaseUrl}/images/proxy?url=${encodedUrl}`;
    setProxyUrl(proxiedUrl);
    
    // Testar carregamento da imagem
    const img = new Image();
    img.onload = () => {
      setLoading(false);
      console.log('✅ Imagem carregada com sucesso através do proxy!');
    };
    img.onerror = () => {
      setLoading(false);
      setError('❌ Erro ao carregar imagem através do proxy');
      console.error('Erro ao carregar imagem:', proxiedUrl);
    };
    img.src = proxiedUrl;
  };

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-4">Teste do Proxy de Imagens</h3>
      
      <Button onClick={testProxy} disabled={loading}>
        {loading ? 'Testando...' : 'Testar Proxy'}
      </Button>
      
      {imageUrl && (
        <div className="mt-4 space-y-2">
          <div>
            <strong>URL Original:</strong>
            <div className="text-xs text-gray-600 break-all">{imageUrl}</div>
          </div>
          
          <div>
            <strong>URL com Proxy:</strong>
            <div className="text-xs text-gray-600 break-all">{proxyUrl}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-sm font-medium mb-2">Direto (pode falhar com CORS):</p>
              <img 
                src={imageUrl} 
                alt="Direto" 
                className="w-full border"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200"%3E%3Crect width="300" height="200" fill="%23ccc"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23666"%3ECORS Error%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">Via Proxy:</p>
              <img 
                src={proxyUrl} 
                alt="Via Proxy" 
                className="w-full border"
                crossOrigin="anonymous"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200"%3E%3Crect width="300" height="200" fill="%23f00"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23fff"%3EProxy Error%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
          </div>
          
          {error && (
            <div className="text-red-500 text-sm mt-2">{error}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default TestProxyImage;