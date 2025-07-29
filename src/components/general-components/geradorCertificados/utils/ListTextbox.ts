import * as fabric from 'fabric';

export interface ListTextboxOptions extends fabric.ITextboxOptions {
  listType?: 'none' | 'bullet' | 'arrow' | 'numbered';
  listIndent?: number;
  listItemSpacing?: number;
}

// Função helper para limpar texto de marcadores de lista
export function cleanListMarkers(text: string): string {
  // Remove vários tipos de marcadores de lista incluindo ';' no final
  return text.replace(/^[\s]*[-•▸*\d]+[.):]?\s*/gm, '')
    .split('\n')
    .map(line => line.replace(/;\s*$/, '').trim())
    .join('\n');
}

// Função helper para processar texto com lista
export function processListText(
  text: string, 
  listType: 'none' | 'bullet' | 'arrow' | 'numbered',
  listIndent: number
): string {
  if (listType === 'none' || !text) return text;

  const lines = text.split('\n');
  const processedLines: string[] = [];
  let itemNumber = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indent = '  '.repeat(listIndent);
    
    // Remove marcadores existentes para reprocessar
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

// Criar uma extensão do Textbox padrão
export function createListTextbox(text: string, options: ListTextboxOptions): fabric.Textbox {
  // Processar o texto inicial se houver tipo de lista
  let initialText = text;
  if (options.listType && options.listType !== 'none') {
    initialText = processListText(text, options.listType, options.listIndent || 0);
  }
  
  // Criar um Textbox normal
  const textbox = new fabric.Textbox(initialText, options);
  
  // Adicionar propriedades customizadas usando Object.assign para evitar problemas com 'any'
  Object.assign(textbox, {
    listType: options.listType || 'none',
    listIndent: options.listIndent || 0,
    listItemSpacing: options.listItemSpacing || 8,
    
    // Método para atualizar propriedades de lista
    updateListProperties: function(this: any, props: Partial<ListTextboxOptions>) {
      // Salvar posição do cursor se estiver editando
      const isEditing = this.isEditing;
      let savedSelectionStart = 0;
      let savedSelectionEnd = 0;
      
      if (props.listType !== undefined) this.listType = props.listType;
      if (props.listIndent !== undefined) this.listIndent = props.listIndent;
      if (props.listItemSpacing !== undefined) this.listItemSpacing = props.listItemSpacing;
      
      // Reprocessar o texto
      const cleanText = this.text.replace(/^[\s]*[•▸\d]+\.?\s*/gm, '');
      const newText = processListText(cleanText, this.listType, this.listIndent);
      const newLines = newText.split('\n');
      
      // Verificar se temos uma posição de cursor pendente
      if (this._pendingCursorLine !== undefined && this._pendingCursorPos !== undefined) {
        // Calcular posição baseada na linha pendente
        let newCursorPos = 0;
        for (let i = 0; i < Math.min(this._pendingCursorLine, newLines.length); i++) {
          if (i < this._pendingCursorLine) {
            newCursorPos += newLines[i].length + 1;
          }
        }
        
        // Adicionar a posição após o marcador
        if (this._pendingCursorLine < newLines.length) {
          const lineMarker = newLines[this._pendingCursorLine].match(/^[\s]*[•▸\d]+\.?\s*/);
          if (lineMarker) {
            newCursorPos += lineMarker[0].length + this._pendingCursorPos;
          }
        }
        
        savedSelectionStart = newCursorPos;
        savedSelectionEnd = newCursorPos;
        
        // Limpar flags pendentes
        delete this._pendingCursorLine;
        delete this._pendingCursorPos;
      } else if (isEditing) {
        // Lógica padrão de manutenção do cursor
        savedSelectionStart = this.selectionStart || 0;
        savedSelectionEnd = this.selectionEnd || 0;
        
        if (this.listType !== 'none') {
          const oldLines = this.text.split('\n');
          let currentPos = 0;
          let newPos = savedSelectionStart;
          
          // Encontrar em qual linha estava o cursor
          for (let i = 0; i < oldLines.length; i++) {
            const lineLength = oldLines[i].length + 1; // +1 para o \n
            if (currentPos + lineLength > savedSelectionStart) {
              // Cursor está nesta linha
              const posInLine = savedSelectionStart - currentPos;
              const oldLineClean = oldLines[i].replace(/^[\s]*[•▸\d]+\.?\s*/, '');
              const cleanPosInLine = Math.max(0, posInLine - (oldLines[i].length - oldLineClean.length));
              
              // Calcular nova posição
              if (i < newLines.length) {
                const newLineMarkerLength = newLines[i].length - newLines[i].replace(/^[\s]*[•▸\d]+\.?\s*/, '').length;
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
      
      // Restaurar posição do cursor se estava editando
      if (isEditing) {
        this.setSelectionStart(savedSelectionStart);
        this.setSelectionEnd(savedSelectionEnd);
      }
      
      // Aplicar espaçamento entre linhas se necessário
      if (this.listType !== 'none' && this.listItemSpacing > 0) {
        const baseLineHeight = 1.16;
        const additionalSpacing = this.listItemSpacing / this.fontSize;
        this.set('lineHeight', baseLineHeight + additionalSpacing);
      }
      
      this.setCoords();
      if (this.canvas) {
        this.canvas.renderAll();
      }
    }
  });
  
  // Aplicar espaçamento inicial se necessário
  const extendedTextbox = textbox as any;
  if (extendedTextbox.listType !== 'none' && extendedTextbox.listItemSpacing > 0) {
    const baseLineHeight = options.lineHeight || 1.16;
    const additionalSpacing = extendedTextbox.listItemSpacing / (options.fontSize || 24);
    textbox.set('lineHeight', baseLineHeight + additionalSpacing);
  }
  
  return textbox;
}

// Alias para manter compatibilidade
export const ListTextbox = createListTextbox;