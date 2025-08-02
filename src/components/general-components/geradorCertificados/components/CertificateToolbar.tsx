import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Save, 
  FileText, 
  Check, 
  AlertCircle,
  Edit
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CertificateToolbarProps {
  onSaveClick: () => void;
  certificateInfo?: {
    id?: number;
    name?: string;
    courseId?: number;
    companyId?: number;
    isModified?: boolean;
  };
  isLoading?: boolean;
}

export const CertificateToolbar: React.FC<CertificateToolbarProps> = ({
  onSaveClick,
  certificateInfo,
  isLoading = false
}) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const isEditMode = !!certificateInfo?.id;
  const hasUnsavedChanges = certificateInfo?.isModified || false;

  // Atualizar última vez salvo quando certificateInfo mudar
  useEffect(() => {
    if (certificateInfo?.id && !certificateInfo?.isModified) {
      setLastSaved(new Date());
    }
  }, [certificateInfo?.id, certificateInfo?.isModified]);

  const getStatusBadge = () => {
    if (isLoading) {
      return (
        <Badge variant="secondary" className="gap-1">
          <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
          Processando...
        </Badge>
      );
    }

    if (!certificateInfo?.id) {
      return (
        <Badge variant="outline" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Novo Modelo
        </Badge>
      );
    }

    if (hasUnsavedChanges) {
      return (
        <Badge variant="secondary" className="gap-1">
          <div className="h-2 w-2 rounded-full bg-yellow-500" />
          Alterações não salvas
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="gap-1 text-green-700 bg-green-50 border-green-200">
        <Check className="h-3 w-3" />
        Salvo
      </Badge>
    );
  };

  const getLastSavedText = () => {
    if (!lastSaved || !certificateInfo?.id) return null;

    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);

    if (diff < 60) return 'Salvo há alguns segundos';
    if (diff < 3600) return `Salvo há ${Math.floor(diff / 60)} minutos`;
    if (diff < 86400) return `Salvo há ${Math.floor(diff / 3600)} horas`;
    return `Salvo em ${lastSaved.toLocaleDateString()}`;
  };

  return (
    <div className="flex items-center justify-between p-1.5 border-b mb-3">
      <div className="flex items-center gap-4">
        {/* Status e informações do certificado */}
        <div className="flex items-center gap-3">
          {getStatusBadge()}
          
          {certificateInfo?.name && (
            <>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">{certificateInfo.name}</span>
              </div>
            </>
          )}

          {lastSaved && certificateInfo?.id && !hasUnsavedChanges && (
            <span className="text-xs text-gray-500">{getLastSavedText()}</span>
          )}
        </div>
      </div>

      {/* Botão de salvar */}
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={hasUnsavedChanges ? "default" : "outline"}
                size="sm"
                onClick={onSaveClick}
                disabled={isLoading}
                className={hasUnsavedChanges ? "animate-pulse" : ""}
              >
                {isEditMode ? (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Atualizar
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isEditMode ? 'Atualizar modelo existente' : 'Salvar como novo modelo'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};