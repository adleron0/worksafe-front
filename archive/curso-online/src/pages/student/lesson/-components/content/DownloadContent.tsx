import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { ContentComponentProps, DownloadFile } from '../../types';

export function DownloadContent({ step, onCompleteStep }: ContentComponentProps) {
  const files = step.content?.files || [];
  
  const handleDownload = (file: DownloadFile) => {
    window.open(file.url, '_blank');
    
    // Marcar como concluído após download usando nova estrutura
    if (step.status !== 'completed' && onCompleteStep) {
      console.log('📥 Download realizado - Marcando como completo:', file.name);
      
      onCompleteStep({
        stepId: step.id,
        contentType: 'DOWNLOAD',
        progressData: { 
          downloadedFile: file.name,
          downloadedAt: new Date().toISOString()
        }
      });
    }
  };
  
  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base md:text-lg">Materiais para Download</CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        <div className="space-y-3">
          {files.map((file: DownloadFile) => (
            <div key={file.id} className="flex items-center justify-between p-2 md:p-3 border rounded-lg">
              <div className="flex items-center gap-2 md:gap-3">
                <Download className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm md:text-base">{file.name}</p>
                  {file.size && (
                    <p className="text-xs md:text-sm text-muted-foreground">{file.size}</p>
                  )}
                </div>
              </div>
              <Button 
                size="sm"
                onClick={() => handleDownload(file)}
              >
                Download
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}