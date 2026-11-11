import { cache } from 'fabric';
import { GOOGLE_FONTS, GOOGLE_FONTS_URL } from './fontConfig';

// ============================================================================
// Carregamento de fontes simplificado usando Font Loading API
// ============================================================================

const FONT_LOAD_TIMEOUT = 5000; // 5 segundos máximo por fonte
let fontsLoadedPromise: Promise<void> | null = null;

// Fontes que só possuem peso normal (sem variante bold)
const SINGLE_WEIGHT_FONTS = ['bebas neue'];

/**
 * Injeta o stylesheet do Google Fonts no <head> e aguarda carregar.
 */
function injectGoogleFontsStylesheet(): Promise<void> {
  const linkId = 'google-fonts-stylesheet';
  const existing = document.getElementById(linkId);
  if (existing) return Promise.resolve();

  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = GOOGLE_FONTS_URL;
    link.crossOrigin = 'anonymous';
    link.onload = () => resolve();
    link.onerror = () => resolve(); // não bloquear em caso de erro
    document.head.appendChild(link);

    // Safety timeout — não travar se onload nunca disparar
    setTimeout(resolve, 3000);
  });
}

/**
 * Carrega uma variante de fonte usando a Font Loading API.
 * Retorna true se a fonte foi carregada, false se timeout.
 */
async function loadFontVariant(fontSpec: string): Promise<boolean> {
  if (document.fonts.check(fontSpec)) {
    return true;
  }

  try {
    await Promise.race([
      document.fonts.load(fontSpec),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), FONT_LOAD_TIMEOUT)
      ),
    ]);
    return true;
  } catch {
    console.warn(`Fonte "${fontSpec}" não carregou dentro do timeout.`);
    return false;
  }
}

/**
 * Carrega uma fonte individual (normal + bold) usando a Font Loading API.
 * Retorna true se pelo menos a variante normal foi carregada.
 */
async function loadSingleFont(fontFamily: string): Promise<boolean> {
  const normalSpec = `16px "${fontFamily}"`;
  const normalOk = await loadFontVariant(normalSpec);

  // Carregar variante bold se a fonte suportar
  if (!SINGLE_WEIGHT_FONTS.includes(fontFamily.toLowerCase())) {
    const boldSpec = `bold 16px "${fontFamily}"`;
    await loadFontVariant(boldSpec);
  }

  return normalOk;
}

/**
 * Carrega todas as fontes do Google Fonts.
 * Idempotente — chamadas subsequentes retornam a mesma promise.
 */
export async function loadAllFonts(): Promise<void> {
  if (fontsLoadedPromise) return fontsLoadedPromise;

  fontsLoadedPromise = (async () => {
    // 1. Injetar stylesheet e aguardar carregamento (garante @font-face rules)
    await injectGoogleFontsStylesheet();

    // 2. Aguardar que o browser esteja pronto
    await document.fonts.ready;

    // 3. Carregar todas as fontes em paralelo (normal + bold)
    const results = await Promise.allSettled(
      GOOGLE_FONTS.map((font) => loadSingleFont(font))
    );

    const loaded = results.filter(
      (r) => r.status === 'fulfilled' && r.value
    ).length;

    // 4. Limpar cache global de largura de caracteres do Fabric.js
    //    Garante que medições feitas com fontes sintetizadas (faux bold)
    //    sejam descartadas agora que as fontes reais estão carregadas.
    cache.clearFontCache();

    console.info(
      `Fontes carregadas: ${loaded}/${GOOGLE_FONTS.length} (cache Fabric.js limpo)`
    );
  })();

  return fontsLoadedPromise;
}

/**
 * Garante que uma fonte específica está carregada antes de usar.
 * Útil ao trocar a fonte de um textbox no canvas.
 */
export async function ensureFontLoaded(fontFamily: string): Promise<boolean> {
  // Arial e fontes do sistema não precisam de carregamento
  const systemFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'monospace', 'sans-serif', 'serif'];
  if (systemFonts.includes(fontFamily)) return true;

  // Injetar stylesheet caso ainda não esteja (pode ser chamado antes de loadAllFonts)
  await injectGoogleFontsStylesheet();

  await document.fonts.ready;
  return loadSingleFont(fontFamily);
}

/**
 * Limpa o cache global de largura de caracteres do Fabric.js para uma fonte
 * específica, ou para todas as fontes se fontFamily não for informado.
 * Deve ser chamado quando fontWeight muda para forçar remedição.
 */
export function clearFabricFontCache(fontFamily?: string): void {
  cache.clearFontCache(fontFamily);
}
