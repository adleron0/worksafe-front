import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Download } from 'lucide-react';

interface PageControlsProps {
  pages: Array<{ id: string; name: string }>;
  currentPageIndex: number;
  onPageSelect: (index: number) => void;
  onPageAdd: () => void;
  onPageRemove: (index: number) => void;
  onExportPDF?: () => void;
  maxPages?: number;
}

const PageControls: React.FC<PageControlsProps> = ({
  pages,
  currentPageIndex,
  onPageSelect,
  onPageAdd,
  onPageRemove,
  onExportPDF,
  maxPages = 2
}) => {
  const canAddPage = pages.length < maxPages;
  const canRemovePage = pages.length > 1;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Páginas:</span>
        
        <div className="flex items-center gap-1">
        {pages.map((page, index) => (
          <div key={page.id} className="relative group">
            <Button
              variant={currentPageIndex === index ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onPageSelect(index)}
              className="relative h-9 w-9 p-0"
            >
              <span className="text-sm font-medium">{index + 1}</span>
            </Button>
            
            {canRemovePage && (
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onPageRemove(index);
                }}
                className="absolute -top-1 -right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remover página"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        ))}
        
        {canAddPage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onPageAdd}
            className="h-9 w-9 p-0"
            title="Adicionar página"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
          {pages.length}/{maxPages} páginas
        </span>
      </div>
      
      {onExportPDF && (
        <Button
          variant="outline"
          size="sm"
          onClick={onExportPDF}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar PDF
        </Button>
      )}
    </div>
  );
};

export default PageControls;