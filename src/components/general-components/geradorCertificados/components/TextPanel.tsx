import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, AlignVerticalSpaceAround, AlignVerticalJustifyStart, AlignVerticalJustifyEnd, Plus, List, ListOrdered, ChevronRight, IndentDecrease, IndentIncrease, Info, Variable } from 'lucide-react';
import * as fabric from 'fabric';
import { toast } from '@/hooks/use-toast';
import { applyFontOverrides, FONT_OPTIONS } from '../utils/fontConfig';
import { ensureFontLoaded } from '../utils/fontLoader';

interface TextPanelProps {
  selectedText: fabric.Textbox | null;
  onAddText: (text: string, settings: TextSettings) => void;
  onUpdateText: (settings: Partial<TextSettings>) => void;
  canvas?: fabric.Canvas | null;
}

export interface TextSettings {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  underline: boolean;
  fill: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  originY?: 'top' | 'center' | 'bottom';
  lineHeight: number;
  letterSpacing: number;
  listType: 'none' | 'bullet' | 'arrow' | 'numbered';
  listIndent: number;
  listItemSpacing: number;
  stroke: string;
  strokeWidth: number;
}

// Fontes disponíveis — importadas da fonte única de verdade
const googleFonts = FONT_OPTIONS;

const TextPanel: React.FC<TextPanelProps> = ({
  selectedText,
  onAddText,
  onUpdateText,
  canvas
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
    originY: 'center',
    lineHeight: 1.16,
    letterSpacing: 0,
    listType: 'none',
    listIndent: 0,
    listItemSpacing: 8,
    stroke: '',
    strokeWidth: 0
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
        textAlign: (selectedText.textAlign || 'left') as 'left' | 'center' | 'right' | 'justify',
        originY: (selectedText.originY || 'center') as 'top' | 'center' | 'bottom',
        lineHeight: selectedText.lineHeight || 1.16,
        letterSpacing: (selectedText as any).charSpacing || 0,
        listType: (selectedText as any).listType || 'none',
        listIndent: (selectedText as any).listIndent || 0,
        listItemSpacing: (selectedText as any).listItemSpacing || 8,
        stroke: (selectedText.stroke as string) || '',
        strokeWidth: selectedText.strokeWidth || 0
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
      
      // Para fontes, garantir carregamento e aplicar overrides
      if (key === 'fontFamily') {
        const applyFont = async (targetFont: string) => {
          if (!selectedText || !selectedText.canvas) return;
          const canvas = selectedText.canvas;

          await ensureFontLoaded(targetFont);

          selectedText.set('fontFamily', targetFont);
          selectedText.dirty = true;
          selectedText._clearCache();
          selectedText.setCoords();
          applyFontOverrides(selectedText);
          canvas.requestRenderAll();
        };

        applyFont(value);
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

  const handleVariableClick = (variableKey: string) => {
    const variableText = `{{${variableKey}}}`;
    
    if (selectedText && canvas) {
      // Se há um texto selecionado, adiciona a variável ao final do texto
      const currentText = selectedText.text || '';
      const newText = currentText + (currentText ? ' ' : '') + variableText;
      selectedText.set('text', newText);
      canvas.renderAll();
      
      toast({
        description: `Variável ${variableText} adicionada ao texto!`,
        duration: 2000,
      });
    } else {
      // Se não há texto selecionado, cria um novo texto com a variável
      onAddText(variableText, textSettings);
      
      toast({
        description: `Variável ${variableText} adicionada ao canvas!`,
        duration: 2000,
      });
    }
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

          {/* Alinhamento Horizontal */}
          <div>
            <label className="text-xs font-medium mb-1 block">Alinhamento Horizontal</label>
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
              <Button
                size="sm"
                variant={textSettings.textAlign === 'justify' ? 'default' : 'outline'}
                onClick={() => updateSetting('textAlign', 'justify')}
                className="flex-1"
              >
                <AlignJustify className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Alinhamento Vertical (Ponto de Origem) */}
          <div>
            <label className="text-xs font-medium mb-1 block">Alinhamento Vertical</label>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={textSettings.originY === 'top' ? 'default' : 'outline'}
                onClick={() => updateSetting('originY', 'top')}
                className="flex-1"
                title="Alinhar pelo topo (expande para baixo)"
              >
                <AlignVerticalJustifyStart className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={textSettings.originY === 'center' ? 'default' : 'outline'}
                onClick={() => updateSetting('originY', 'center')}
                className="flex-1"
                title="Centralizar verticalmente (padrão)"
              >
                <AlignVerticalSpaceAround className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={textSettings.originY === 'bottom' ? 'default' : 'outline'}
                onClick={() => updateSetting('originY', 'bottom')}
                className="flex-1"
                title="Alinhar pela base (expande para cima)"
              >
                <AlignVerticalJustifyEnd className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Define como o texto se comporta com quebras de linha
            </p>
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

          {/* Contorno do texto (stroke) */}
          <div>
            <label className="text-xs font-medium mb-1 block">Contorno do Texto</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={textSettings.stroke || '#000000'}
                onChange={(e) => updateSetting('stroke', e.target.value)}
                className="w-10 h-8 rounded cursor-pointer flex-shrink-0"
              />
              <Slider
                value={[textSettings.strokeWidth]}
                onValueChange={(value) => updateSetting('strokeWidth', value[0])}
                min={0}
                max={5}
                step={0.5}
                className="flex-1"
              />
              <span className="text-xs text-gray-500 w-6 text-right">{textSettings.strokeWidth}</span>
            </div>
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
      
      {/* Variáveis disponíveis */}
      <Card>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Variable className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Variáveis Disponíveis</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Clique em uma variável para adicionar ao canvas. As variáveis serão substituídas automaticamente na geração.
          </p>
          
          {/* Lista de variáveis organizadas por categoria */}
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {/* Dados do Aluno */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Aluno</h4>
              <div className="flex flex-wrap gap-1">
                {[
                  { key: 'aluno_nome', label: 'Nome' },
                  { key: 'aluno_cpf', label: 'CPF' },
                  { key: 'aluno_data_nascimento', label: 'Nascimento' },
                  { key: 'aluno_cidade', label: 'Cidade' },
                  { key: 'aluno_estado', label: 'Estado' },
                  { key: 'aluno_estado_uf', label: 'UF' },
                ].map(variable => (
                  <Button
                    key={variable.key}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] hover:bg-primary/10 hover:text-primary hover:border-primary"
                    onClick={() => handleVariableClick(variable.key)}
                  >
                    {variable.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Dados da Instituição */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Instituição</h4>
              <div className="flex flex-wrap gap-1">
                {[
                  { key: 'instituicao_nome', label: 'Nome Comercial' },
                  { key: 'instituicao_cnpj', label: 'CNPJ' },
                  { key: 'instituicao_razao_social', label: 'Razão Social' },
                ].map(variable => (
                  <Button
                    key={variable.key}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] hover:bg-primary/10 hover:text-primary hover:border-primary"
                    onClick={() => handleVariableClick(variable.key)}
                  >
                    {variable.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Dados do Curso */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Curso</h4>
              <div className="flex flex-wrap gap-1">
                {[
                  { key: 'curso_nome', label: 'Nome' },
                  { key: 'curso_descricao', label: 'Descrição' },
                  { key: 'curso_validade_anos', label: 'Validade' },
                ].map(variable => (
                  <Button
                    key={variable.key}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] hover:bg-primary/10 hover:text-primary hover:border-primary"
                    onClick={() => handleVariableClick(variable.key)}
                  >
                    {variable.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Dados da Turma */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Turma</h4>
              <div className="flex flex-wrap gap-1">
                {[
                  { key: 'turma_nome', label: 'Nome' },
                  { key: 'turma_carga_horaria', label: 'Carga Horária' },
                  { key: 'turma_data_inicio', label: 'Data Início' },
                  { key: 'turma_data_inicio_extenso', label: 'Início Extenso' },
                  { key: 'turma_data_fim', label: 'Data Fim' },
                  { key: 'turma_data_fim_extenso', label: 'Fim Extenso' },
                  { key: 'turma_periodo', label: 'Período' },
                ].map(variable => (
                  <Button
                    key={variable.key}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] hover:bg-primary/10 hover:text-primary hover:border-primary"
                    onClick={() => handleVariableClick(variable.key)}
                  >
                    {variable.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Dados do Instrutor */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Instrutor</h4>
              <div className="flex flex-wrap gap-1">
                {[
                  { key: 'instrutor_nome_1', label: 'Nome 1' },
                  { key: 'instrutor_cpf_1', label: 'CPF 1' },
                  { key: 'instrutor_formacao_1', label: 'Formação 1' },
                  { key: 'instrutor_curriculum_1', label: 'Curriculum 1' },
                  { key: 'instrutor_registro_1', label: 'Registro 1' },
                  { key: 'instrutor_assinatura_1', label: 'Assinatura 1' },
                  { key: 'instrutor_nome_2', label: 'Nome 2' },
                  { key: 'instrutor_formacao_2', label: 'Formação 2' },
                  { key: 'instrutor_curriculum_2', label: 'Curriculum 2' },
                  { key: 'instrutor_registro_2', label: 'Registro 2' },
                  { key: 'instrutor_assinatura_2', label: 'Assinatura 2' },
                  { key: 'instrutores_nomes', label: 'Todos Nomes' },
                ].map(variable => (
                  <Button
                    key={variable.key}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] hover:bg-primary/10 hover:text-primary hover:border-primary"
                    onClick={() => handleVariableClick(variable.key)}
                  >
                    {variable.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Dados do Certificado */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Certificado</h4>
              <div className="flex flex-wrap gap-1">
                {[
                  { key: 'certificado_validade', label: 'Validade' },
                  { key: 'certificado_validade_extenso', label: 'Validade Ext' },
                  { key: 'certificado_emissao', label: 'Emissão' },
                  { key: 'certificado_emissao_extenso', label: 'Emissão Ext' },
                  { key: 'certificado_codigo', label: 'Código' },
                  { key: 'certificado_ano', label: 'Ano de Emissão' },
                ].map(variable => (
                  <Button
                    key={variable.key}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] hover:bg-primary/10 hover:text-primary hover:border-primary"
                    onClick={() => handleVariableClick(variable.key)}
                  >
                    {variable.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Dados da Inscrição */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Inscrição</h4>
              <div className="flex flex-wrap gap-1">
                {[
                  { key: 'inscricao_nome', label: 'Nome' },
                  { key: 'inscricao_ocupacao', label: 'Ocupação' },
                  { key: 'inscricao_empresa', label: 'Empresa que Trabalha' },
                  { key: 'inscricao_data_confirmacao', label: 'Confirmação' },
                ].map(variable => (
                  <Button
                    key={variable.key}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] hover:bg-primary/10 hover:text-primary hover:border-primary"
                    onClick={() => handleVariableClick(variable.key)}
                  >
                    {variable.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Nota sobre múltiplos instrutores */}
          <div className="mt-3 p-2 bg-muted/30 rounded-md">
            <p className="text-xs text-muted-foreground">
              <Info className="w-3 h-3 inline mr-1" />
              Para mais instrutores, use: instrutor_nome_3, instrutor_nome_4, etc. seguindo o mesmo padrão.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TextPanel;