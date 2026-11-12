// ============================================================================
// Setup do Fabric compartilhado por TODOS os caminhos de render de certificado
// (visualizador, miniatura, exportação PNG/PDF, pré-visualização de modelo).
//
// Importe este módulo (só pelo efeito colateral) antes de qualquer
// `loadFromJSON` fora do editor. Sem ele:
// - modelos com lista (`type: 'ListTextbox'`) não carregam, porque a classe só
//   era registrada quando o editor tinha sido aberto na sessão;
// - texto em bold é desenhado de forma diferente do editor (o editor desenha
//   letra por letra; sem o patch o Fabric desenha a linha inteira de uma vez).
// ============================================================================
import '../../geradorCertificados/utils/ListTextbox';
import { patchFabricBoldRendering } from '../../geradorCertificados/utils/fontConfig';

patchFabricBoldRendering();

// O JSON salvo grava `type: 'ListTextbox'`, mas a instância carregada reporta
// `obj.type === 'listtextbox'` — por isso as duas grafias.
/** Tipos de objeto de texto que carregam variáveis `{{...}}`. */
export const TEXT_OBJECT_TYPES = new Set([
  'text',
  'Text',
  'i-text',
  'IText',
  'textbox',
  'Textbox',
  'ListTextbox',
  'listtextbox',
]);

/** Textos com largura fixa e quebra de linha (Textbox e subclasses). */
export const TEXTBOX_TYPES = new Set(['textbox', 'Textbox', 'ListTextbox', 'listtextbox']);

export const isTextObjectType = (type?: string) => !!type && TEXT_OBJECT_TYPES.has(type);
export const isTextboxType = (type?: string) => !!type && TEXTBOX_TYPES.has(type);

/**
 * Tamanho lógico do canvas: A4 a 72 dpi conforme a orientação.
 * O valor gravado no banco não é confiável (o editor antigo gravava com zoom,
 * ex.: 1369x967, e há registros com o default 800x600); os objetos estão sempre
 * em coordenadas A4. Mesma regra que o useCertificateViewer já usava.
 */
export function getLogicalCanvasSize(rawWidth?: number, rawHeight?: number) {
  const w = rawWidth || 842;
  const h = rawHeight || 595;
  return w > h ? { width: 842, height: 595 } : { width: 595, height: 842 };
}
