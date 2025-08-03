import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Plus, List, ListOrdered, ChevronRight, IndentDecrease, IndentIncrease, Info } from 'lucide-react';
import * as fabric from 'fabric';

interface TextPanelProps {
  selectedText: fabric.Textbox | null;
  onAddText: (text: string, settings: TextSettings) => void;
  onUpdateText: (settings: Partial<TextSettings>) => void;
}

export interface TextSettings {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  underline: boolean;
  fill: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  listType: 'none' | 'bullet' | 'arrow' | 'numbered';
  listIndent: number;
  listItemSpacing: number;
}

// Lista de fontes do Google Fonts populares e Bebas Neue
const googleFonts = [
  { name: 'Arial', value: 'Arial', fallback: 'Arial, sans-serif' },
  { name: 'Bebas Neue', value: 'Bebas Neue', fallback: '"Bebas Neue", sans-serif' },
  { name: 'Roboto', value: 'Roboto', fallback: 'Roboto, sans-serif' },
  { name: 'Open Sans', value: 'Open Sans', fallback: '"Open Sans", sans-serif' },
  { name: 'Lato', value: 'Lato', fallback: 'Lato, sans-serif' },
  { name: 'Montserrat', value: 'Montserrat', fallback: 'Montserrat, sans-serif' },
  { name: 'Poppins', value: 'Poppins', fallback: 'Poppins, sans-serif' },
  { name: 'Raleway', value: 'Raleway', fallback: 'Raleway, sans-serif' },
  { name: 'Inter', value: 'Inter', fallback: 'Inter, sans-serif' },
  { name: 'Playfair Display', value: 'Playfair Display', fallback: '"Playfair Display", serif' },
  { name: 'Oswald', value: 'Oswald', fallback: 'Oswald, sans-serif' },
  { name: 'Merriweather', value: 'Merriweather', fallback: 'Merriweather, serif' },
];

const TextPanel: React.FC<TextPanelProps> = ({
  selectedText,
  onAddText,
  onUpdateText
}) => {
  const [textSettings, setTextSettings] = useState<TextSettings>({
    text: 'Clique para editar',
    fontFamily: 'Arial',
    fontSize: 24,
    fontWeight: 'normal',
    fontStyle: 'normal',
    underline: false,
    fill: '#000000',
    textAlign: 'left',
    lineHeight: 1.16,
    letterSpacing: 0,
    listType: 'none',
    listIndent: 0,
    listItemSpacing: 8
  });

  // As fontes do Google são carregadas centralmente no componente pai (gerador.tsx)
  // Este useEffect foi removido para evitar carregamento duplicado

  // Atualizar configurações quando um texto for selecionado
  useEffect(() => {
    if (selectedText) {
      const actualFontFamily = selectedText.fontFamily || 'Arial';
      const newSettings = {
        text: selectedText.text || '',
        fontFamily: actualFontFamily,
        fontSize: selectedText.fontSize || 24,
        fontWeight: selectedText.fontWeight === 'bold' ? 'bold' : 'normal' as 'normal' | 'bold',
        fontStyle: selectedText.fontStyle === 'italic' ? 'italic' : 'normal' as 'normal' | 'italic',
        underline: selectedText.underline || false,
        fill: selectedText.fill as string || '#000000',
        textAlign: (selectedText.textAlign || 'left') as 'left' | 'center' | 'right',
        lineHeight: selectedText.lineHeight || 1.16,
        letterSpacing: (selectedText as any).charSpacing || 0,
        listType: (selectedText as any).listType || 'none',
        listIndent: (selectedText as any).listIndent || 0,
        listItemSpacing: (selectedText as any).listItemSpacing || 8
      };
      
      setTextSettings(newSettings);
      
      // Não forçar sincronização automática aqui pois pode conflitar com o carregamento
    }
  }, [selectedText, onUpdateText]);

  const handleAddText = () => {
    onAddText('Clique para editar', textSettings);
  };

  const updateSetting = (key: keyof TextSettings, value: any) => {
    const newSettings = { ...textSettings, [key]: value };
    setTextSettings(newSettings);
    
    if (selectedText) {
      // Aplicar mudança diretamente
      onUpdateText({ [key]: value });
      
      // Para fontes, aplicar com estratégia robusta
      if (key === 'fontFamily') {
        const applyFontRobustly = async (targetFont: string) => {
          if (!selectedText || !selectedText.canvas) return;
          
          const canvas = selectedText.canvas;
          
          // Verificar se a fonte está disponível
          const isFontAvailable = document.fonts.check(`12px "${targetFont}"`);
          
          if (!isFontAvailable) {
            console.warn(`⚠️ Fonte ${targetFont} não está disponível ainda`);
            // Tentar aguardar que a fonte carregue
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          // Estratégia de aplicação robusta
          console.log(`🔄 Aplicando fonte ${targetFont} com estratégia robusta`);
          
          // 1. Aplicar fallback temporário para forçar re-renderização
          selectedText.set('fontFamily', 'Arial');
          canvas.renderAll();
          
          // 2. Aguardar frame
          await new Promise(resolve => requestAnimationFrame(resolve));
          
          // 3. Aplicar a fonte desejada
          selectedText.set('fontFamily', targetFont);
          selectedText.dirty = true;
          
          // 4. Forçar limpeza de cache e recálculo
          if ('_clearCache' in selectedText) {
            (selectedText as any)._clearCache();
          }
          selectedText.setCoords();
          
          // 5. Renderizar
          canvas.renderAll();
          canvas.requestRenderAll();
          
          // 6. Verificação final após um delay
          setTimeout(() => {
            if (selectedText.fontFamily !== targetFont) {
              console.warn(`⚠️ Fonte ${targetFont} ainda não aplicada, tentando novamente...`);
              selectedText.set('fontFamily', targetFont);
              selectedText.dirty = true;
              canvas.renderAll();
            } else {
              console.log(`✅ Fonte ${targetFont} aplicada com sucesso`);
            }
          }, 150);
        };
        
        applyFontRobustly(value);
      }
    }
  };

  const toggleBold = () => {
    const newWeight = textSettings.fontWeight === 'bold' ? 'normal' : 'bold';
    updateSetting('fontWeight', newWeight);
  };

  const toggleItalic = () => {
    const newStyle = textSettings.fontStyle === 'italic' ? 'normal' : 'italic';
    updateSetting('fontStyle', newStyle);
  };

  const toggleUnderline = () => {
    updateSetting('underline', !textSettings.underline);
  };

  return (
    <div className="space-y-6">
      {/* Adicionar novo texto */}
      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-3">Adicionar Texto</h3>
          <Button 
            onClick={handleAddText}
            className="w-full"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Texto
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Clique no texto no canvas para editá-lo
          </p>
        </div>
      </Card>

      {/* Configurações de texto */}
      <Card>
        <div className="p-4 space-y-4">
          <h3 className="text-sm font-semibold">
            {selectedText ? 'Editando Texto' : 'Configurações de Texto'}
          </h3>

          {/* Seletor de fonte */}
          <div>
            <label className="text-xs font-medium mb-1 block">Fonte</label>
            <Select
              value={textSettings.fontFamily}
              onValueChange={(value) => updateSetting('fontFamily', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {googleFonts.map((font) => (
                  <SelectItem 
                    key={font.value} 
                    value={font.value}
                    style={{ fontFamily: font.fallback || font.value }}
                  >
                    {font.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tamanho da fonte */}
          <div>
            <label className="text-xs font-medium mb-1 block">
              Tamanho: {textSettings.fontSize}px
            </label>
            <Slider
              value={[textSettings.fontSize]}
              onValueChange={(value) => updateSetting('fontSize', value[0])}
              min={8}
              max={120}
              step={1}
              className="w-full"
            />
          </div>

          {/* Botões de formatação */}
          <div>
            <label className="text-xs font-medium mb-1 block">Formatação</label>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={textSettings.fontWeight === 'bold' ? 'default' : 'outline'}
                onClick={toggleBold}
                className="flex-1"
              >
                <Bold className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={textSettings.fontStyle === 'italic' ? 'default' : 'outline'}
                onClick={toggleItalic}
                className="flex-1"
              >
                <Italic className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={textSettings.underline ? 'default' : 'outline'}
                onClick={toggleUnderline}
                className="flex-1"
              >
                <Underline className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Alinhamento */}
          <div>
            <label className="text-xs font-medium mb-1 block">Alinhamento</label>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={textSettings.textAlign === 'left' ? 'default' : 'outline'}
                onClick={() => updateSetting('textAlign', 'left')}
                className="flex-1"
              >
                <AlignLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={textSettings.textAlign === 'center' ? 'default' : 'outline'}
                onClick={() => updateSetting('textAlign', 'center')}
                className="flex-1"
              >
                <AlignCenter className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={textSettings.textAlign === 'right' ? 'default' : 'outline'}
                onClick={() => updateSetting('textAlign', 'right')}
                className="flex-1"
              >
                <AlignRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Formatação de Lista */}
          <div>
            <label className="text-xs font-medium mb-1 block">Formatação de Lista</label>
            <div className="flex gap-1 mb-2">
              <Button
                size="sm"
                variant={textSettings.listType === 'bullet' ? 'default' : 'outline'}
                onClick={() => updateSetting('listType', textSettings.listType === 'bullet' ? 'none' : 'bullet')}
                className="flex-1"
                title="Lista com marcadores"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={textSettings.listType === 'numbered' ? 'default' : 'outline'}
                onClick={() => updateSetting('listType', textSettings.listType === 'numbered' ? 'none' : 'numbered')}
                className="flex-1"
                title="Lista numerada"
              >
                <ListOrdered className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={textSettings.listType === 'arrow' ? 'default' : 'outline'}
                onClick={() => updateSetting('listType', textSettings.listType === 'arrow' ? 'none' : 'arrow')}
                className="flex-1"
                title="Lista com setas"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Controles de indentação - só aparecem quando há lista ativa */}
            {textSettings.listType !== 'none' && (
              <>
                <div className="flex gap-1 mb-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateSetting('listIndent', Math.max(0, textSettings.listIndent - 1))}
                    className="flex-1"
                    disabled={textSettings.listIndent === 0}
                    title="Diminuir indentação"
                  >
                    <IndentDecrease className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateSetting('listIndent', Math.min(5, textSettings.listIndent + 1))}
                    className="flex-1"
                    disabled={textSettings.listIndent === 5}
                    title="Aumentar indentação"
                  >
                    <IndentIncrease className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Espaçamento entre itens da lista */}
                <div className="mt-2">
                  <label className="text-xs font-medium mb-1 block">
                    Espaçamento entre itens: {textSettings.listItemSpacing}px
                  </label>
                  <Slider
                    value={[textSettings.listItemSpacing]}
                    onValueChange={(value) => updateSetting('listItemSpacing', value[0])}
                    min={0}
                    max={30}
                    step={2}
                    className="w-full"
                  />
                </div>
              </>
            )}
          </div>

          {/* Cor do texto */}
          <div>
            <label className="text-xs font-medium mb-1 block">Cor do Texto</label>
            <input
              type="color"
              value={textSettings.fill}
              onChange={(e) => updateSetting('fill', e.target.value)}
              className="w-full h-8 rounded cursor-pointer"
            />
          </div>

          {/* Espaçamento entre linhas */}
          <div>
            <label className="text-xs font-medium mb-1 block">
              Espaçamento entre linhas: {textSettings.lineHeight.toFixed(2)}
            </label>
            <Slider
              value={[textSettings.lineHeight * 100]}
              onValueChange={(value) => updateSetting('lineHeight', value[0] / 100)}
              min={50}
              max={300}
              step={10}
              className="w-full"
            />
          </div>

          {/* Espaçamento entre letras */}
          <div>
            <label className="text-xs font-medium mb-1 block">
              Espaçamento entre letras: {textSettings.letterSpacing}
            </label>
            <Slider
              value={[textSettings.letterSpacing]}
              onValueChange={(value) => updateSetting('letterSpacing', value[0])}
              min={-50}
              max={200}
              step={5}
              className="w-full"
            />
          </div>
        </div>
      </Card>
      
      {/* Info sobre variáveis - bem discreto */}
      <div className="px-4 py-2 bg-muted/30 rounded-md">
        <div className="flex items-start gap-2">
          <Info className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Dica: Use variáveis dinâmicas</p>
            <p>Digite <code className="text-primary">{'{{nome_aluno}}'}</code> para inserir dados que serão substituídos na geração.</p>
            <details className="mt-1">
              <summary className="cursor-pointer hover:text-foreground">Ver exemplos</summary>
              <div className="mt-2 space-y-1 text-xs">
                <p><code>{'{{nome_aluno}}'}</code> - Nome do aluno</p>
                <p><code>{'{{nome_curso}}'}</code> - Nome do curso</p>
                <p><code>{'{{data_inicio}}'}</code> - Data de início</p>
                <p><code>{'{{carga_horaria}}'}</code> - Carga horária</p>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextPanel;