/**
 * Componente de debug para testar o sistema de temas
 * REMOVER EM PRODUÇÃO
 */
import { useTheme } from '@/context/ThemeContext';
import { getDomainForSearch } from '@/utils/domain-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export const ThemeDebug = () => {
  const { theme, refreshTheme, clearCache } = useTheme();
  const currentDomain = getDomainForSearch();
  const [isMinimized, setIsMinimized] = useState(() => {
    return localStorage.getItem('themeDebugMinimized') === 'true';
  });
  
  useEffect(() => {
    localStorage.setItem('themeDebugMinimized', String(isMinimized));
  }, [isMinimized]);
  
  const getCacheInfo = () => {
    const cached = localStorage.getItem('worksafe_theme_cache');
    if (!cached) return 'Sem cache';
    
    try {
      const cache = JSON.parse(cached);
      const expiresIn = new Date(cache.timestamp + cache.expiresIn).toLocaleString();
      return `Cache válido até: ${expiresIn}`;
    } catch {
      return 'Cache inválido';
    }
  };

  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
  };

  // Versão minimizada
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          size="sm"
          onClick={toggleMinimized}
          variant="outline"
          className="shadow-lg bg-background"
          title="Expandir debug do tema"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          🎨
        </Button>
      </div>
    );
  }

  // Versão expandida
  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 shadow-lg">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">🎨 Debug do Tema</CardTitle>
        <Button
          size="sm"
          onClick={toggleMinimized}
          variant="ghost"
          className="h-6 w-6 p-0"
          title="Minimizar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div>
          <strong>Domínio:</strong> {currentDomain}
        </div>
        <div>
          <strong>Cor Primária:</strong> 
          <span 
            className="ml-2 px-2 py-1 rounded text-white"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {theme.primaryColor}
          </span>
        </div>
        <div>
          <strong>Cor Secundária:</strong> 
          <span 
            className="ml-2 px-2 py-1 rounded text-white"
            style={{ backgroundColor: theme.secondaryColor || '#ccc' }}
          >
            {theme.secondaryColor || 'Não definida'}
          </span>
        </div>
        {theme.logoUrl && (
          <div className="flex items-center gap-2">
            <strong>Logo:</strong>
            <img src={theme.logoUrl} alt="Logo" className="h-6 object-contain" />
          </div>
        )}
        {theme.faviconUrl && (
          <div className="flex items-center gap-2">
            <strong>Favicon:</strong>
            <img src={theme.faviconUrl} alt="Favicon" className="h-4 w-4 object-contain" />
          </div>
        )}
        <div>
          <strong>Status:</strong> {theme.isLoading ? 'Carregando...' : 'Carregado'}
        </div>
        {theme.error && (
          <div className="text-red-500">
            <strong>Erro:</strong> {theme.error}
          </div>
        )}
        <div>
          <strong>Cache:</strong> {getCacheInfo()}
        </div>
        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            onClick={() => refreshTheme()}
            variant="outline"
            className="text-xs"
          >
            Atualizar Tema
          </Button>
          <Button 
            size="sm" 
            onClick={() => {
              clearCache();
              window.location.reload();
            }}
            variant="outline"
            className="text-xs"
          >
            Limpar Cache
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};