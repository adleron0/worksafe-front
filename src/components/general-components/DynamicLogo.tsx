import React, { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

interface DynamicLogoProps {
  className?: string;
  fallbackToDefault?: boolean;
  width?: number;
  height?: number;
  forceWhite?: boolean; // Para forçar branco em fundos escuros
}

const DynamicLogo: React.FC<DynamicLogoProps> = ({ 
  className, 
  fallbackToDefault = true,
  width = 200,
  height = 70,
  forceWhite = false
}) => {
  const { theme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Verificar se está em modo escuro
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    checkDarkMode();

    // Observar mudanças no modo escuro
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // TESTE: Forçando logo padrão - comente este bloco para voltar ao comportamento normal
  const FORCE_DEFAULT_LOGO = false; // Mude para false para desativar o teste
  
  // Mostra skeleton enquanto carrega o tema
  if (theme.isLoading && !imageError && !FORCE_DEFAULT_LOGO) {
    return (
      <div 
        className={cn("flex items-center", className)} 
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <Skeleton className="w-full h-full bg-muted" />
      </div>
    );
  }

  // Se tem logo da empresa e não houve erro, usa ela
  if (theme.logoUrl && !imageError && !FORCE_DEFAULT_LOGO) {
    return (
      <div className={cn("relative", className)} style={{ width: `${width}px`, height: `${height}px` }}>
        <img
          src={theme.logoUrl}
          alt="Logo"
          className={cn(
            "w-full h-full object-contain transition-all duration-200"
          )}
          style={{
            filter: (forceWhite || isDarkMode) ? 
              // Modo escuro - múltiplas opções de filtro
              // Opção 1: Inverte cores mantendo contraste (melhor para logos coloridas)
              `invert(0.9) hue-rotate(180deg) brightness(1.1)` :
              // Opção 2: Clareia preservando formas (melhor para logos escuras)
              // `brightness(3) contrast(1.5) saturate(0)` :
              // Opção 3: Inverte com grayscale suave
              // `grayscale(0.8) invert(0.95) brightness(1.2)` :
              // Modo claro - mantém original
              'none',
            opacity: (forceWhite || isDarkMode) ? 0.95 : 1
          }}
          onMouseEnter={(e) => {
            if (forceWhite || isDarkMode) {
              e.currentTarget.style.opacity = '1';
            }
          }}
          onMouseLeave={(e) => {
            if (forceWhite || isDarkMode) {
              e.currentTarget.style.opacity = '0.9';
            }
          }}
          onError={() => {
            console.warn('Erro ao carregar logo da empresa, usando logo padrão');
            setImageError(true);
          }}
        />
      </div>
    );
  }

  // Se não tem logo ou houve erro, usa logo padrão
  if (fallbackToDefault) {
    return (
      <div className={cn("relative", className)} style={{ width: `${width}px`, height: `${height}px` }}>
        <img
          src="/certfield-logo.png"
          alt="CertField Logo"
          className={cn(
            "w-full h-full object-contain transition-all duration-200"
          )}
          style={{
            filter: (forceWhite || isDarkMode) ? 
              `invert(0.9) hue-rotate(180deg) brightness(1.1)` :
              'none',
            opacity: (forceWhite || isDarkMode) ? 0.95 : 1
          }}
          onMouseEnter={(e) => {
            if (forceWhite || isDarkMode) {
              e.currentTarget.style.opacity = '1';
            }
          }}
          onMouseLeave={(e) => {
            if (forceWhite || isDarkMode) {
              e.currentTarget.style.opacity = '0.9';
            }
          }}
        />
      </div>
    );
  }

  // Se fallback está desabilitado, não renderiza nada
  return null;
};

export default DynamicLogo;