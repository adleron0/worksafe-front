import React, { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  // Se tem logo da empresa, usa ela
  if (theme.logoUrl) {
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
        />
      </div>
    );
  }

  // Se não tem logo e fallback está habilitado, usa um ícone do Lucide
  if (fallbackToDefault) {
    return (
      <div 
        className={cn("flex items-center gap-2", className)} 
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <div 
          className="flex items-center justify-center rounded-lg p-2"
          style={{ 
            backgroundColor: (forceWhite || isDarkMode) ? 'rgba(255,255,255,0.1)' : `${theme.primaryColor}20`
          }}
        >
          <Shield 
            className="w-8 h-8" 
            style={{ 
              color: (forceWhite || isDarkMode) ? '#ffffff' : theme.primaryColor
            }}
          />
        </div>
        <div className="flex flex-col">
          <span 
            className="text-lg font-bold leading-tight"
            style={{ 
              color: (forceWhite || isDarkMode) ? '#ffffff' : theme.primaryColor
            }}
          >
            CertifiCajá
          </span>
          <span 
            className="text-xs font-medium opacity-80"
            style={{ 
              color: (forceWhite || isDarkMode) ? '#ffffff' : theme.primaryColor
            }}
          >
            Auth
          </span>
        </div>
      </div>
    );
  }

  // Se não tem logo e fallback está desabilitado, não renderiza nada
  return null;
};

export default DynamicLogo;