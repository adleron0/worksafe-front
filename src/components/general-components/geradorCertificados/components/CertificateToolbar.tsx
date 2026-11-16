import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Save,
  FileText,
  Check,
  AlertCircle,
  Edit,
  Undo2,
  Redo2,
  Eye,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CertificateToolbarProps {
  /** Salvar: modelo existente grava direto; modelo novo abre o formulário (nome e curso). */
  onSaveClick: () => void;
  /** Abre nome e curso do modelo. */
  onDetailsClick?: () => void;
  certificateInfo?: {
    id?: number;
    name?: string;
    courseId?: number;
    companyId?: number;
    isModified?: boolean;
  };
  /** Quando foi gravado no sistema pela última vez (nesta sessão). */
  savedAt?: Date | null;
  isLoading?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  /** Botão de prévia com dados de exemplo. */
  onPreviewClick?: () => void;
}

export const CertificateToolbar: React.FC<CertificateToolbarProps> = ({
  onSaveClick,
  onDetailsClick,
  certificateInfo,
  savedAt = null,
  isLoading = false,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onPreviewClick,
}) => {
  const isEditMode = !!certificateInfo?.id;
  const hasUnsavedChanges = certificateInfo?.isModified || false;
  // reavalia o "há X minutos" de tempos em tempos
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const savedText = () => {
    if (!savedAt) return 'Salvo no sistema';
    const diff = Math.floor((Date.now() - savedAt.getTime()) / 1000);
    if (diff < 60) return 'Salvo no sistema agora';
    if (diff < 3600) return `Salvo no sistema há ${Math.floor(diff / 60)} min`;
    return `Salvo no sistema às ${savedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  /** Uma frase só, sem ambiguidade: gravado no sistema ou não. */
  const getStatusBadge = () => {
    if (isLoading) {
      return (
        <Badge variant="secondary" className="gap-1.5">
          <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
          Salvando…
        </Badge>
      );
    }
    if (!isEditMode) {
      return (
        <Badge variant="outline" className="gap-1.5">
          <AlertCircle className="h-3 w-3" />
          Modelo novo — ainda não salvo
        </Badge>
      );
    }
    if (hasUnsavedChanges) {
      return (
        <Badge variant="secondary" className="gap-1.5 border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          Alterações não salvas
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1.5 border-green-200 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
        <Check className="h-3 w-3" />
        {savedText()}
      </Badge>
    );
  };

  return (
    <div className="flex items-center justify-between border-b py-2 pl-4 pr-14">
      <div className="flex items-center gap-4">
        {/* Status e informações do certificado */}
        <div className="flex items-center gap-3">
          {getStatusBadge()}
          
          {certificateInfo?.name && (
            <button
              type="button"
              onClick={onDetailsClick}
              className="flex items-center gap-2 rounded-md px-1.5 py-0.5 hover:bg-muted"
              aria-label="Nome e curso do modelo"
            >
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">{certificateInfo.name}</span>
              {onDetailsClick && <Edit className="h-3 w-3 text-muted-foreground" />}
            </button>
          )}
        </div>
      </div>

      {/* Undo/Redo e Botão de salvar */}
      <div className="flex items-center gap-2">
        {/* Undo/Redo */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onUndo}
                disabled={!canUndo}
                className="h-8 w-8 p-0"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Desfazer (Ctrl+Z)</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRedo}
                disabled={!canRedo}
                className="h-8 w-8 p-0"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refazer (Ctrl+Shift+Z)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="w-px h-6 bg-border" />

        {onPreviewClick && (
          <Button variant="outline" size="sm" onClick={onPreviewClick}>
            <Eye className="mr-2 h-4 w-4" />
            Prévia
          </Button>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={!isEditMode || hasUnsavedChanges ? 'default' : 'outline'}
                size="sm"
                onClick={onSaveClick}
                disabled={isLoading}
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isEditMode ? 'Grava no sistema (Ctrl+S)' : 'Dar nome e escolher o curso, e gravar (Ctrl+S)'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};