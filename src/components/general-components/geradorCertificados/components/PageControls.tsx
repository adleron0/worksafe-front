import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Trash2 } from 'lucide-react';

interface PageControlsProps {
  pages: Array<{ id: string; name: string }>;
  currentPageIndex: number;
  onPageSelect: (index: number) => void;
  onPageAdd: () => void;
  onPageRemove: (index: number) => void;
  maxPages?: number;
}

const PageControls: React.FC<PageControlsProps> = ({
  pages,
  currentPageIndex,
  onPageSelect,
  onPageAdd,
  onPageRemove,
  maxPages = 2
}) => {
  const canAddPage = pages.length < maxPages;
  const canRemovePage = pages.length > 1;

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Páginas:</span>
      
      <div className="flex items-center gap-1">
        {pages.map((page, index) => (
          <div key={page.id} className="relative group">
            <Button
              variant={currentPageIndex === index ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageSelect(index)}
              className="relative h-8 px-3"
            >
              <FileText className="w-3 h-3 mr-1" />
              <span className="text-xs">{index + 1}</span>
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
            variant="outline"
            size="sm"
            onClick={onPageAdd}
            className="h-8 px-3"
            title="Adicionar página"
          >
            <Plus className="w-3 h-3" />
          </Button>
        )}
      </div>
      
      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
        {pages.length}/{maxPages} páginas
      </span>
    </div>
  );
};

export default PageControls;