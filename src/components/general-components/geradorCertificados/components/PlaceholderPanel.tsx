import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
import { ImageIcon, User, Edit3, Plus, Info } from 'lucide-react';

interface PlaceholderPanelProps {
  onAddPlaceholder: (name: string) => void;
}

const PlaceholderPanel: React.FC<PlaceholderPanelProps> = ({
  onAddPlaceholder
}) => {
  // const [placeholderName, setPlaceholderName] = useState('');
  const [instructorCount, setInstructorCount] = useState(1);
  
  // Variável de foto do aluno (fixa)
  const alunoVariable = { 
    name: 'aluno_foto', 
    label: 'Foto do Aluno',
    category: 'aluno',
    icon: User
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
      {/* Custom placeholder - COMENTADO PARA USO FUTURO */}
      {/*
      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-3">Adicionar Placeholder Personalizado</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">
                Nome do Placeholder
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={placeholderName}
                  onChange={(e) => setPlaceholderName(e.target.value)}
                  placeholder="ex: logo_personalizada"
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddCustom();
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleAddCustom}
                  disabled={!placeholderName.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Este nome será usado para identificar a imagem na geração
              </p>
            </div>
          </div>
        </div>
      </Card>
      */}

      {/* Placeholders de Imagem Disponíveis */}
      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-3">Placeholders de Imagem</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Clique para adicionar uma área de imagem dinâmica ao certificado
          </p>
          
          {/* Foto do Aluno */}
          <div className="mb-4">
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
        </div>
      </Card>

      {/* Instructions */}
      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Como funciona
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Placeholders são áreas reservadas para imagens dinâmicas</li>
            <li>• Na geração, serão substituídos pelas imagens reais do aluno/instrutor</li>
            <li>• <strong>aluno_foto</strong>: Foto do aluno cadastrado</li>
            <li>• <strong>instrutor_assinatura_N</strong>: Assinatura do instrutor N</li>
            <li>• Use números sequenciais para múltiplos instrutores</li>
            <li>• As imagens virão automaticamente do banco de dados</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default PlaceholderPanel;