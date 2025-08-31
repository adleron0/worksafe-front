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
    const hostname = window.location.hostname;
    
    // Remove www. se presente
    const domain = hostname.replace(/^www\./, '');
    
    // Se for localhost ou IP, retorna null
    if (domain === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
      return null;
    }
    
    return domain;
  } catch (error) {
    console.error('Erro ao extrair domínio:', error);
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