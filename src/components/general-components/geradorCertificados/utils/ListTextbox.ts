import * as fabric from 'fabric';
import { classRegistry } from 'fabric';

// ============================================================================
// ListTextbox — Classe customizada que estende fabric.Textbox
// Suporta listas com marcadores, setas e numeração.
// Registrada no classRegistry para serialização/deserialização correta.
// ============================================================================

export type ListType = 'none' | 'bullet' | 'arrow' | 'numbered';

export interface ListTextboxOptions extends Partial<fabric.TextboxProps> {
  listType?: ListType;
  listIndent?: number;
  listItemSpacing?: number;
  name?: string;
}

/**
 * Limpa marcadores de lista de um texto.
 */
export function cleanListMarkers(text: string): string {
  return text
    .replace(/^[\s]*[-•▸*\d]+[.):]?\s*/gm, '')
    .split('\n')
    .map((line) => line.replace(/;\s*$/, '').trim())
    .join('\n');
}

/**
 * Processa texto adicionando marcadores de lista.
 */
export function processListText(
  text: string,
  listType: ListType,
  listIndent: number
): string {
  if (listType === 'none' || !text) return text;

  const lines = text.split('\n');
  const processedLines: string[] = [];
  let itemNumber = 1;

  for (const line of lines) {
    const indent = '  '.repeat(listIndent);
    const cleanLine = line.replace(/^[\s]*[•▸\d]+\.?\s*/, '').trim();

    if (cleanLine === '') {
      processedLines.push('');
      continue;
    }

    let marker = '';
    switch (listType) {
      case 'bullet':
        marker = '• ';
        break;
      case 'arrow':
        marker = '▸ ';
        break;
      case 'numbered':
        marker = `${itemNumber}. `;
        itemNumber++;
        break;
    }

    processedLines.push(indent + marker + cleanLine);
  }

  return processedLines.join('\n');
}

/**
 * Classe ListTextbox — estende fabric.Textbox com suporte a listas.
 * Propriedades customizadas sobrevivem à serialização (toObject/toJSON) e clone().
 */
export class ListTextbox extends fabric.Textbox {
  static type = 'ListTextbox';

  declare listType: ListType;
  declare listIndent: number;
  declare listItemSpacing: number;

  // Propriedades temporárias para posicionamento de cursor
  declare _pendingCursorLine?: number;
  declare _pendingCursorPos?: number;

  constructor(text: string, options: ListTextboxOptions = {}) {
    // Processar texto inicial se houver tipo de lista
    let initialText = text;
    if (options.listType && options.listType !== 'none') {
      initialText = processListText(text, options.listType, options.listIndent || 0);
    }

    super(initialText, options);

    this.listType = options.listType || 'none';
    this.listIndent = options.listIndent || 0;
    this.listItemSpacing = options.listItemSpacing || 8;

    // Aplicar espaçamento inicial
    if (this.listType !== 'none' && this.listItemSpacing > 0) {
      const baseLineHeight = options.lineHeight || 1.16;
      const additionalSpacing = this.listItemSpacing / (this.fontSize || 24);
      this.set('lineHeight', baseLineHeight + additionalSpacing);
    }
  }

  /**
   * Desserialização — o construtor soma o espaçamento da lista ao lineHeight
   * recebido, mas o lineHeight salvo no JSON JÁ contém esse espaçamento. Sem
   * restaurar o valor salvo, o espaço entre linhas crescia a cada salvar/abrir
   * (e o visualizador mostrava a lista mais espaçada que o editor).
   */
  static async fromObject<
    T extends Parameters<typeof fabric.Textbox.fromObject>[0],
    S extends fabric.FabricText,
  >(object: T): Promise<S> {
    const instance = await super.fromObject<T, S>(object);
    if (object && typeof object.lineHeight === 'number') {
      instance.set('lineHeight', object.lineHeight);
    }
    return instance;
  }

  /**
   * Serialização — inclui propriedades de lista.
   */
  toObject(propertiesToInclude?: any[]): any {
    return super.toObject([
      ...(propertiesToInclude || []),
      'listType',
      'listIndent',
      'listItemSpacing',
    ] as any);
  }

  /**
   * Atualiza propriedades de lista e reprocessa o texto.
   */
  updateListProperties(props: Partial<ListTextboxOptions>): void {
    const isEditing = this.isEditing;
    let savedSelectionStart = 0;
    let savedSelectionEnd = 0;

    if (props.listType !== undefined) this.listType = props.listType;
    if (props.listIndent !== undefined) this.listIndent = props.listIndent;
    if (props.listItemSpacing !== undefined) this.listItemSpacing = props.listItemSpacing;

    // Reprocessar o texto
    const cleanText = (this.text || '').replace(/^[\s]*[•▸\d]+\.?\s*/gm, '');
    const newText = processListText(cleanText, this.listType, this.listIndent);
    const newLines = newText.split('\n');

    // Verificar posição de cursor pendente
    if (this._pendingCursorLine !== undefined && this._pendingCursorPos !== undefined) {
      let newCursorPos = 0;
      for (let i = 0; i < Math.min(this._pendingCursorLine, newLines.length); i++) {
        newCursorPos += newLines[i].length + 1;
      }

      if (this._pendingCursorLine < newLines.length) {
        const lineMarker = newLines[this._pendingCursorLine].match(/^[\s]*[•▸\d]+\.?\s*/);
        if (lineMarker) {
          newCursorPos += lineMarker[0].length + this._pendingCursorPos;
        }
      }

      savedSelectionStart = newCursorPos;
      savedSelectionEnd = newCursorPos;

      delete this._pendingCursorLine;
      delete this._pendingCursorPos;
    } else if (isEditing) {
      savedSelectionStart = this.selectionStart || 0;
      savedSelectionEnd = this.selectionEnd || 0;

      if (this.listType !== 'none') {
        const oldLines = (this.text || '').split('\n');
        let currentPos = 0;
        let newPos = savedSelectionStart;

        for (let i = 0; i < oldLines.length; i++) {
          const lineLength = oldLines[i].length + 1;
          if (currentPos + lineLength > savedSelectionStart) {
            const posInLine = savedSelectionStart - currentPos;
            const oldLineClean = oldLines[i].replace(/^[\s]*[•▸\d]+\.?\s*/, '');
            const cleanPosInLine = Math.max(0, posInLine - (oldLines[i].length - oldLineClean.length));

            if (i < newLines.length) {
              const newLineMarkerLength =
                newLines[i].length - newLines[i].replace(/^[\s]*[•▸\d]+\.?\s*/, '').length;
              newPos = currentPos + newLineMarkerLength + cleanPosInLine;
            }
            break;
          }
          currentPos += lineLength;
        }

        savedSelectionStart = newPos;
        savedSelectionEnd = newPos;
      }
    }

    this.set('text', newText);

    if (isEditing) {
      this.setSelectionStart(savedSelectionStart);
      this.setSelectionEnd(savedSelectionEnd);
    }

    // Aplicar espaçamento entre linhas
    if (this.listType !== 'none' && this.listItemSpacing > 0) {
      const baseLineHeight = 1.16;
      const additionalSpacing = this.listItemSpacing / (this.fontSize || 24);
      this.set('lineHeight', baseLineHeight + additionalSpacing);
    }

    this.setCoords();
    if (this.canvas) {
      this.canvas.renderAll();
    }
  }
}

// Registrar no classRegistry para serialização/deserialização
classRegistry.setClass(ListTextbox, 'ListTextbox');

/**
 * Wrapper de compatibilidade — cria uma ListTextbox.
 * @deprecated Use `new ListTextbox(text, options)` diretamente.
 */
export function createListTextbox(text: string, options: ListTextboxOptions): ListTextbox {
  return new ListTextbox(text, options);
}
