import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText, User } from 'lucide-react';
import { DownloadToolbarProps } from '../types';

const DownloadToolbar: React.FC<DownloadToolbarProps> = ({
  onDownloadPDF,
  certificateName,
  studentName,
  isLoading = false
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border-b bg-background">
      {/* Informações do certificado */}
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm sm:text-lg font-semibold text-foreground truncate">
            {certificateName}
          </h2>
          {studentName && (
            <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
              <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">{studentName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2">
        <Button 
          onClick={onDownloadPDF}
          disabled={isLoading}
          className="flex items-center gap-2 w-full sm:w-auto justify-center"
          size="sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
              <span className="hidden sm:inline">Gerando PDF...</span>
              <span className="sm:hidden">Gerando...</span>
            </>
          ) : (
            <>
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Baixar PDF</span>
              <span className="sm:hidden">PDF</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default DownloadToolbar;