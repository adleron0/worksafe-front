/**
 * Utilitários para manipulação de domínios
 */

/**
 * Extrai o domínio limpo da URL atual
 * Remove protocolo (https://), www, porta e parâmetros
 * @returns domínio limpo ou null se não conseguir extrair
 */
export function extractDomain(): string | null {
  try {
    // Verificar se está no cliente (browser)
    if (typeof window === 'undefined') {
      return null;
    }
    
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return null;
    }
    
    const parts = hostname.split('.');
    
    if (parts.length >= 2) {
      // Remover apenas o www se presente, retornar domínio completo com subdomínios
      const domainParts = parts[0] === 'www' ? parts.slice(1) : parts;
      return domainParts.join('.');
    }
    
    return hostname;
  } catch (error) {
    console.error('Error extracting domain:', error);
    return null;
  }
}

/**
 * Retorna o domínio para busca na API
 * Se não houver domínio válido, retorna o domínio padrão
 * @returns domínio para busca
 */
export function getDomainForSearch(): string {
  const domain = extractDomain();
  return domain || 'worksafebrasil.com.br';
}

/**
 * Verifica se o domínio mudou comparado ao cache
 * @param cachedDomain - domínio armazenado no cache
 * @returns true se mudou, false se é o mesmo
 */
export function hasDomainChanged(cachedDomain: string): boolean {
  const currentDomain = getDomainForSearch();
  return currentDomain !== cachedDomain;
}

/**
 * Valida se uma string é um domínio válido
 * @param domain - string para validar
 * @returns true se é válido, false caso contrário
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
  return domainRegex.test(domain);
}