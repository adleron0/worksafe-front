import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
import { User, Edit3, Plus, Info, QrCode, Star } from 'lucide-react';
import Dialog from '@/components/general-components/Dialog';
import { Image } from '../types';

interface PlaceholderPanelProps {
  onAddPlaceholder: (name: string) => void;
  /** Galeria de imagens do editor (para escolher o selo padrão). */
  images?: Image[];
  /** Imagem padrão do selo (sem destaque), se definida. */
  sealDefault?: string | null;
  hasSeal?: boolean;
  onSetSealDefault?: (url: string | null) => void;
}

const PlaceholderPanel: React.FC<PlaceholderPanelProps> = ({
  onAddPlaceholder,
  images = [],
  sealDefault,
  hasSeal,
  onSetSealDefault,
}) => {
  const [pickSeal, setPickSeal] = useState(false);
  // const [placeholderName, setPlaceholderName] = useState('');
  const [instructorCount, setInstructorCount] = useState(1);
  
  // Variável de foto do aluno (fixa)
  const alunoVariable = { 
    name: 'aluno_foto', 
    label: 'Foto do Aluno',
    category: 'aluno',
    icon: User
  };
  
  // Variável de QR Code para validação (fixa)
  const qrcodeVariable = {
    name: 'certificado_qrcode',
    label: 'QR Code de Validação',
    category: 'validacao',
    icon: QrCode,
    description: 'QR Code para validação online do certificado'
  };
  
  // Gerar variáveis de instrutor dinamicamente baseado em instructorCount
  const generateInstructorVariables = () => {
    const variables = [];
    for (let i = 1; i <= instructorCount; i++) {
      variables.push({
        name: `instrutor_assinatura_${i}`,
        label: `Assinatura Instrutor ${i}`,
        category: 'instrutor',
        icon: Edit3
      });
    }
    return variables;
  };
  
  const instructorVariables = generateInstructorVariables();

  // Função comentada para futura implementação de placeholders personalizados
  /*
  const handleAddCustom = () => {
    if (placeholderName.trim()) {
      onAddPlaceholder(placeholderName.trim());
      setPlaceholderName('');
    }
  };
  */

  const handleAddInstructor = () => {
    setInstructorCount(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Placeholders de Imagem Disponíveis - Sem Card, direto no content */}
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Clique para adicionar uma área de imagem dinâmica ao certificado
        </p>

        {/* Foto do Aluno */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Aluno</h4>
          <div className="space-y-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start overflow-hidden"
              onClick={() => onAddPlaceholder(alunoVariable.name)}
              title={`Adicionar: {{${alunoVariable.name}}}`}
            >
              <User className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-xs truncate flex-1 text-left">{alunoVariable.label}</span>
              <code className="text-[10px] text-muted-foreground ml-2">{`{{${alunoVariable.name}}}`}</code>
            </Button>
          </div>
        </div>

        {/* Assinaturas dos Instrutores */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-muted-foreground">Instrutores</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddInstructor}
              className="h-6 px-2 text-xs"
              title="Adicionar mais um instrutor"
            >
              <Plus className="w-3 h-3 mr-1" />
              Instrutor
            </Button>
          </div>
          <div className="space-y-1">
            {instructorVariables.map((variable) => (
              <Button
                key={variable.name}
                variant="outline"
                size="sm"
                className="w-full justify-start overflow-hidden"
                onClick={() => onAddPlaceholder(variable.name)}
                title={`Adicionar: {{${variable.name}}}`}
              >
                <Edit3 className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-xs truncate flex-1 text-left">{variable.label}</span>
                <code className="text-[10px] text-muted-foreground ml-2">{`{{${variable.name}}}`}</code>
              </Button>
            ))}
          </div>
          {instructorCount > 1 && (
            <p className="text-xs text-muted-foreground mt-2">
              {instructorCount} instrutores configurados
            </p>
          )}
        </div>

        {/* QR Code de Validação */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Validação</h4>
          <div className="space-y-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start overflow-hidden"
              onClick={() => onAddPlaceholder(qrcodeVariable.name)}
              title={`Adicionar: {{${qrcodeVariable.name}}}`}
            >
              <QrCode className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-xs truncate flex-1 text-left">{qrcodeVariable.label}</span>
              <code className="text-[10px] text-muted-foreground ml-2">{`{{${qrcodeVariable.name}}}`}</code>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Gera um QR Code para validação online do certificado
          </p>
        </div>

        {/* Selo (padrão ou destaque) */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Selo</h4>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start overflow-hidden"
            onClick={() => onAddPlaceholder('selo_destaque')}
          >
            <Star className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="text-xs truncate flex-1 text-left">{hasSeal ? 'Selo (já no certificado)' : 'Adicionar selo'}</span>
            <code className="text-[10px] text-muted-foreground ml-2">{'{{selo}}'}</code>
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            Com destaque (turma especial ou aluno destaque) aparece o selo de destaque. Sem
            destaque, aparece a imagem padrão abaixo; sem imagem, o espaço fica livre.
          </p>
          {hasSeal && onSetSealDefault && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-border/60 p-2">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                {sealDefault && <img src={sealDefault} alt="" className="h-full w-full object-contain" />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-xs">{sealDefault ? 'Selo padrão definido' : 'Sem selo padrão'}</span>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="secondary" className="h-6 px-2 text-[11px]" onClick={() => setPickSeal(true)}>
                    Escolher
                  </Button>
                  {sealDefault && (
                    <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => onSetSealDefault(null)}>
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={pickSeal}
        onOpenChange={setPickSeal}
        title="Selo padrão"
        description="Imagem usada no lugar do selo quando o certificado não tem destaque. Mostra as imagens da página atual da galeria."
        showBttn={false}
        className="sm:max-w-lg"
        classNameContent="h-auto max-h-[60vh]"
      >
        {images.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Envie a imagem na galeria do editor primeiro.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {images.map((img) => {
              const url = img.url || img.imageUrl || '';
              return (
                <button
                  key={img.id}
                  type="button"
                  className="aspect-square overflow-hidden rounded-md border bg-muted p-1 hover:border-primary"
                  onClick={() => {
                    onSetSealDefault?.(url);
                    setPickSeal(false);
                  }}
                >
                  <img src={url} alt={img.name} className="h-full w-full object-contain" />
                </button>
              );
            })}
          </div>
        )}
      </Dialog>

      {/* Instructions */}
      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Como funciona
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Placeholders são áreas reservadas para imagens dinâmicas</li>
            <li>• Na geração, serão substituídos pelas imagens reais</li>
            <li>• <strong>aluno_foto</strong>: Foto do aluno cadastrado</li>
            <li>• <strong>instrutor_assinatura_N</strong>: Assinatura do instrutor N</li>
            <li>• <strong>certificado_qrcode</strong>: QR Code para validação online</li>
            <li>• O QR Code direciona para: /certificados/[id]</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default PlaceholderPanel;