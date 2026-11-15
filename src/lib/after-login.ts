/**
 * Para onde ir depois do login. A tela de conectar app de IA (OAuth do MCP)
 * guarda o próprio endereço aqui antes de mandar para o login; o login volta
 * para ela em vez da Home. Só aceita caminho interno.
 */
const KEY = "worksafe:depois-do-login";

export function rememberAfterLogin(path: string) {
  try { sessionStorage.setItem(KEY, path); } catch { /* navegador sem sessionStorage */ }
}

export function takeAfterLogin(): string | null {
  try {
    const path = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return path && path.startsWith("/") && !path.startsWith("//") ? path : null;
  } catch {
    return null;
  }
}
