import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { CertificateTemplate } from './types';
// @ts-ignore - Import do visualizador existe mas pode não ter tipos
import { CertificateThumbnail } from "@/components/general-components/visualizadorCertificados";

interface TemplateGridProps {
  templates: CertificateTemplate[];
  onSelectTemplate: (template: CertificateTemplate) => void;
  isEditing?: boolean;
}

const TemplateGrid: React.FC<TemplateGridProps> = ({
  templates,
  onSelectTemplate
}) => {
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  // Converter template para formato esperado pelo CertificateThumbnail
  const convertTemplateToData = (template: CertificateTemplate) => {
    return {
      id: 0, // CertificateThumbnail expects a number id
      name: template.name,
      canvasWidth: template.canvasWidth,
      canvasHeight: template.canvasHeight,
      fabricJsonFront: template.fabricJsonFront,
      fabricJsonBack: template.fabricJsonBack || null
    };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold mb-2">Modelos de Certificado</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Selecione um modelo pré-configurado para começar rapidamente
        </p>
      </div>

      {/* Grid de templates */}
      {templates.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8">
          <div className="text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum modelo disponível nesta categoria
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="cursor-pointer group"
              onClick={() => onSelectTemplate(template)}
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
            >
              {/* Título pequeno em cima */}
              <p
                className="text-xs text-muted-foreground mb-1.5 text-center truncate px-1"
                title={template.name}
              >
                {template.name}
              </p>

              {/* Card com thumbnail */}
              <Card
                className={`
                  transition-all duration-200 overflow-hidden
                  hover:shadow-md hover:border-primary/40
                  ${hoveredTemplate === template.id ? 'border-primary/30 shadow-sm' : ''}
                `}
              >
                <div className="w-full aspect-[3/2] bg-background">
                  <CertificateThumbnail
                    certificateData={convertTemplateToData(template)}
                    variableToReplace={template.defaultVariables || {}}
                    className="w-full h-full object-contain"
                    zoom={20}
                    showLoader={false}
                  />
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateGrid;