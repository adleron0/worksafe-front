import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ImageIcon, Plus } from 'lucide-react';

interface PlaceholderPanelProps {
  onAddPlaceholder: (name: string) => void;
}

const PlaceholderPanel: React.FC<PlaceholderPanelProps> = ({
  onAddPlaceholder
}) => {
  const [placeholderName, setPlaceholderName] = useState('');
  
  // Sugestões de placeholders comuns
  const suggestions = [
    { name: 'assinatura_instrutor', label: 'Assinatura do Instrutor' },
    { name: 'assinatura_diretor', label: 'Assinatura do Diretor' },
    { name: 'foto_aluno', label: 'Foto do Aluno' },
    { name: 'logo_empresa', label: 'Logo da Empresa' },
    { name: 'selo_certificacao', label: 'Selo de Certificação' }
  ];

  const handleAddCustom = () => {
    if (placeholderName.trim()) {
      onAddPlaceholder(placeholderName.trim());
      setPlaceholderName('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Custom placeholder */}
      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-3">Adicionar Placeholder</h3>
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
                  placeholder="ex: assinatura_instrutor"
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

      {/* Suggestions */}
      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-3">Sugestões Rápidas</h3>
          <div className="space-y-2">
            {suggestions.map(({ name, label }) => (
              <Button
                key={name}
                variant="outline"
                size="sm"
                className="w-full justify-start overflow-hidden"
                onClick={() => onAddPlaceholder(name)}
                title={`Adicionar: ${name}`}
              >
                <ImageIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-xs truncate">{label}</span>
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Instructions */}
      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-2">Como funciona</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Placeholders são áreas reservadas para imagens</li>
            <li>• Na geração do PDF, serão substituídos pelas imagens reais</li>
            <li>• As URLs das imagens virão do sistema automaticamente</li>
            <li>• Use os mesmos nomes definidos no backend</li>
            <li>• Evite espaços e caracteres especiais nos nomes</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default PlaceholderPanel;