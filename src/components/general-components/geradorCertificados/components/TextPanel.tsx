import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Plus, List, ListOrdered, ChevronRight, IndentDecrease, IndentIncrease } from 'lucide-react';
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
  { name: 'Arial', value: 'Arial' },
  { name: 'Bebas Neue', value: 'Bebas Neue' },
  { name: 'Roboto', value: 'Roboto' },
  { name: 'Open Sans', value: 'Open Sans' },
  { name: 'Lato', value: 'Lato' },
  { name: 'Montserrat', value: 'Montserrat' },
  { name: 'Poppins', value: 'Poppins' },
  { name: 'Raleway', value: 'Raleway' },
  { name: 'Inter', value: 'Inter' },
  { name: 'Playfair Display', value: 'Playfair Display' },
  { name: 'Oswald', value: 'Oswald' },
  { name: 'Merriweather', value: 'Merriweather' },
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

  // Carregar fontes do Google quando o componente montar
  useEffect(() => {
    const loadGoogleFonts = () => {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Montserrat:wght@400;700&family=Poppins:wght@400;700&family=Raleway:wght@400;700&family=Inter:wght@400;700&family=Playfair+Display:wght@400;700&family=Oswald:wght@400;700&family=Merriweather:wght@400;700&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    };

    loadGoogleFonts();
  }, []);

  // Atualizar configurações quando um texto for selecionado
  useEffect(() => {
    if (selectedText) {
      console.log('TextPanel - selectedText mudou:', (selectedText as any).__uniqueID);
      console.log('TextPanel - texto:', selectedText.text);
      
      setTextSettings({
        text: selectedText.text || '',
        fontFamily: selectedText.fontFamily || 'Arial',
        fontSize: selectedText.fontSize || 24,
        fontWeight: selectedText.fontWeight === 'bold' ? 'bold' : 'normal',
        fontStyle: selectedText.fontStyle === 'italic' ? 'italic' : 'normal',
        underline: selectedText.underline || false,
        fill: selectedText.fill as string || '#000000',
        textAlign: (selectedText.textAlign || 'left') as 'left' | 'center' | 'right',
        lineHeight: selectedText.lineHeight || 1.16,
        letterSpacing: selectedText.charSpacing || 0,
        listType: (selectedText as any).listType || 'none',
        listIndent: (selectedText as any).listIndent || 0,
        listItemSpacing: (selectedText as any).listItemSpacing || 8
      });
    } else {
      console.log('TextPanel - nenhum texto selecionado');
    }
  }, [selectedText]);

  const handleAddText = () => {
    onAddText('Clique para editar', textSettings);
  };

  const updateSetting = (key: keyof TextSettings, value: any) => {
    const newSettings = { ...textSettings, [key]: value };
    setTextSettings(newSettings);
    
    if (selectedText) {
      onUpdateText({ [key]: value });
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
                    style={{ fontFamily: font.value }}
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
    </div>
  );
};

export default TextPanel;