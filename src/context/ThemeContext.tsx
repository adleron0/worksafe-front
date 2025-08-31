import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { get } from '@/services/api';
import { generateTheme } from '@/utils/color-utils';
import { getDomainForSearch, hasDomainChanged } from '@/utils/domain-utils';
import { 
  ThemeCache, 
  ThemeContextValue, 
  ThemeProviderProps, 
  CompanyThemeResponse,
  CompanyThemeData
} from '@/general-interfaces/theme.interface';

// Constantes
const CACHE_KEY = 'worksafe_theme_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas
const DEFAULT_PRIMARY_COLOR = '#00A24D';
const DEFAULT_SECONDARY_COLOR = '#0066CC';

// Criar o contexto
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Hook para usar o contexto
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Provider do tema
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultPrimaryColor = DEFAULT_PRIMARY_COLOR,
  defaultSecondaryColor = DEFAULT_SECONDARY_COLOR
}) => {
  const [theme, setTheme] = useState({
    primaryColor: defaultPrimaryColor,
    secondaryColor: defaultSecondaryColor,
    logoUrl: null as string | null,
    faviconUrl: null as string | null,
    companyData: null as CompanyThemeData | null,
    isLoading: true,
    error: null as string | null
  });

  // Função para salvar no cache
  const saveToCache = useCallback((primaryColor: string, secondaryColor: string | null, logoUrl: string | null, faviconUrl: string | null, companyData: CompanyThemeData | null) => {
    const cache: ThemeCache = {
      domain: getDomainForSearch(),
      primaryColor,
      secondaryColor,
      logoUrl,
      faviconUrl,
      companyData,
      timestamp: Date.now(),
      expiresIn: CACHE_DURATION
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }, []);

  // Função para ler do cache
  const getFromCache = useCallback((): ThemeCache | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const cache: ThemeCache = JSON.parse(cached);
      
      // Verifica se o cache expirou
      if (Date.now() - cache.timestamp > cache.expiresIn) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      // Verifica se o domínio mudou
      if (hasDomainChanged(cache.domain)) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      return cache;
    } catch (error) {
      console.error('Erro ao ler cache do tema:', error);
      return null;
    }
  }, []);

  // Função para limpar o cache
  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
  }, []);

  // Função para buscar tema da API
  const fetchThemeFromAPI = useCallback(async () => {
    try {
      const domain = getDomainForSearch();
      const params = [
        { key: 'like-system_domain', value: domain },
        { key: 'show', value: ['state', 'city'] },
      ];
      
      const response = await get('companies', 'public', params) as CompanyThemeResponse;
      
      if (response?.rows?.length > 0) {
        const company = response.rows[0];
        return {
          primaryColor: company.primary_color || defaultPrimaryColor,
          secondaryColor: company.secondary_color || null,
          logoUrl: company.logoUrl || null,
          faviconUrl: company.faviconUrl || null,
          companyData: company
        };
      }
      
      // Se não encontrou empresa, usa cores padrão
      return {
        primaryColor: defaultPrimaryColor,
        secondaryColor: defaultSecondaryColor,
        logoUrl: null,
        faviconUrl: null,
        companyData: null
      };
    } catch (error) {
      console.error('Erro ao buscar tema da API:', error);
      throw error;
    }
  }, [defaultPrimaryColor, defaultSecondaryColor]);

  // Função para aplicar o tema
  const applyTheme = useCallback((primaryColor: string, secondaryColor: string | null, faviconUrl: string | null) => {
    generateTheme(primaryColor, secondaryColor || undefined);
    
    // Aplicar favicon
    if (faviconUrl) {
      // Detectar o tipo de imagem baseado na URL
      let imageType = 'image/x-icon'; // padrão
      if (faviconUrl.includes('.png')) {
        imageType = 'image/png';
      } else if (faviconUrl.includes('.webp')) {
        imageType = 'image/webp';
      } else if (faviconUrl.includes('.jpg') || faviconUrl.includes('.jpeg')) {
        imageType = 'image/jpeg';
      } else if (faviconUrl.includes('.svg')) {
        imageType = 'image/svg+xml';
      }
      
      // Remover TODOS os favicons existentes primeiro
      const allFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
      allFavicons.forEach(fav => fav.remove());
      
      // Criar novo favicon
      const favicon = document.createElement('link');
      favicon.rel = 'icon';
      favicon.type = imageType;
      // Adicionar timestamp para forçar recarregamento
      const timestamp = new Date().getTime();
      favicon.href = `${faviconUrl}${faviconUrl.includes('?') ? '&' : '?'}t=${timestamp}`;
      
      // Especificar sizes para garantir proporção quadrada
      favicon.setAttribute('sizes', 'any'); // 'any' permite que o navegador use o tamanho apropriado
      
      // Adicionar ao head
      document.head.appendChild(favicon);
      
      // Para melhor compatibilidade, adicionar também apple-touch-icon
      const appleTouchIcon = document.createElement('link');
      appleTouchIcon.rel = 'apple-touch-icon';
      appleTouchIcon.href = faviconUrl;
      document.head.appendChild(appleTouchIcon);
    }
  }, []);

  // Função principal para carregar o tema
  const loadTheme = useCallback(async () => {
    setTheme(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Tenta ler do cache primeiro
      const cached = getFromCache();
      
      if (cached) {
        // Usa o cache
        setTheme({
          primaryColor: cached.primaryColor,
          secondaryColor: cached.secondaryColor || defaultSecondaryColor,
          logoUrl: cached.logoUrl,
          faviconUrl: cached.faviconUrl,
          companyData: cached.companyData,
          isLoading: false,
          error: null
        });
        applyTheme(cached.primaryColor, cached.secondaryColor, cached.faviconUrl);
        return;
      }

      // Se não tem cache, busca da API
      const { primaryColor, secondaryColor, logoUrl, faviconUrl, companyData } = await fetchThemeFromAPI();
      
      // Salva no cache
      saveToCache(primaryColor, secondaryColor, logoUrl, faviconUrl, companyData);
      
      // Atualiza o estado
      setTheme({
        primaryColor,
        secondaryColor: secondaryColor || defaultSecondaryColor,
        logoUrl,
        faviconUrl,
        companyData,
        isLoading: false,
        error: null
      });
      
      // Aplica o tema
      applyTheme(primaryColor, secondaryColor, faviconUrl);
      
    } catch (error) {
      console.error('Erro ao carregar tema:', error);
      
      // Em caso de erro, usa tema padrão
      setTheme({
        primaryColor: defaultPrimaryColor,
        secondaryColor: defaultSecondaryColor,
        logoUrl: null,
        faviconUrl: null,
        companyData: null,
        isLoading: false,
        error: 'Erro ao carregar tema personalizado. Usando tema padrão.'
      });
      
      // Aplica tema padrão
      applyTheme(defaultPrimaryColor, defaultSecondaryColor, null);
    }
  }, [
    getFromCache, 
    fetchThemeFromAPI, 
    saveToCache, 
    applyTheme, 
    defaultPrimaryColor, 
    defaultSecondaryColor
  ]);

  // Função para forçar atualização do tema
  const refreshTheme = useCallback(async () => {
    clearCache();
    await loadTheme();
  }, [clearCache, loadTheme]);

  // Carrega o tema ao montar o componente
  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  // Monitora mudanças no domínio (útil para SPAs)
  useEffect(() => {
    const handlePopState = () => {
      const cached = getFromCache();
      if (cached && hasDomainChanged(cached.domain)) {
        loadTheme();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getFromCache, loadTheme]);

  const contextValue: ThemeContextValue = {
    theme,
    refreshTheme,
    clearCache
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};