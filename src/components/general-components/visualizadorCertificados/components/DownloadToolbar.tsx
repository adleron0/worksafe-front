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
    <div className="flex items-center justify-between p-4 border-b bg-background">
      {/* Informações do certificado */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {certificateName}
            </h2>
            {studentName && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{studentName}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2">
        <Button 
          onClick={onDownloadPDF}
          disabled={isLoading}
          className="flex items-center gap-2"
          size="sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando PDF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Baixar PDF
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default DownloadToolbar;