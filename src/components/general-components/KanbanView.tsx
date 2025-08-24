import { useState, useEffect, useRef, ReactNode } from 'react';
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from '@/components/ui/kibo-ui/kanban';

export interface KanbanColumn {
  id: string | number;
  name: string;
  value: string | number;
  color?: string;
}

export interface KanbanViewProps<T = any> {
  data: T[];
  columns: KanbanColumn[];
  statusField: keyof T;
  onStatusChange?: (newStatus: string | number, itemId: string | number, item: T) => void;
  children: (item: T, column: KanbanColumn) => ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

interface KanbanItem {
  id: string;
  name: string;
  column: string;
  originalData: any;
}

export default function KanbanView<T extends Record<string, any>>({
  data,
  columns,
  statusField,
  onStatusChange,
  children,
  isLoading = false,
  emptyMessage = 'Nenhum item encontrado',
  className = '',
}: KanbanViewProps<T>) {
  const [kanbanData, setKanbanData] = useState<KanbanItem[]>([]);
  const previousDataRef = useRef<KanbanItem[]>([]);
  const isDraggingRef = useRef<boolean>(false);

  // Converter dados para formato Kanban
  useEffect(() => {
    const formattedData: KanbanItem[] = data.map(item => {
      const statusValue = String(item[statusField] || columns[0]?.value || '');
      return {
        id: item.id?.toString() || Math.random().toString(),
        name: item.name || item.title || 'Item',
        column: statusValue,
        originalData: item
      };
    });
    setKanbanData(formattedData);
    previousDataRef.current = formattedData;
  }, [data, statusField, columns]);

  // Handler para mudança de dados no Kanban
  const handleDataChange = (newData: any[]) => {
    const typedData: KanbanItem[] = newData.map(item => {
      const previousItem = previousDataRef.current.find(k => k.id === item.id);
      const originalData = previousItem?.originalData || 
                          data.find(d => d.id?.toString() === item.id) || {};
      
      return {
        ...item,
        originalData
      };
    });
    
    // Sempre atualizar a visualização
    setKanbanData(typedData);
    
    // Durante o arrasto, não processar mudanças
    if (isDraggingRef.current) {
      return;
    }
    
    // Quando não está arrastando, verificar mudanças
    const changedItems: Array<{item: KanbanItem, newColumn: string}> = [];
    
    typedData.forEach(item => {
      const previousItem = previousDataRef.current.find(k => k.id === item.id);
      if (previousItem && previousItem.column !== item.column) {
        changedItems.push({
          item: item,
          newColumn: item.column
        });
      }
    });
    
    // Atualizar referência
    previousDataRef.current = typedData;
    
    // Processar mudanças de status
    if (onStatusChange && changedItems.length > 0) {
      changedItems.forEach(({item, newColumn}) => {
        const columnValue = columns.find(col => String(col.value) === newColumn)?.value;
        
        if (item.originalData && columnValue !== undefined) {
          const itemId = item.originalData.id || item.id;
          onStatusChange(columnValue, itemId, item.originalData);
        }
      });
    }
  };
  
  // Handlers para controlar o estado de drag
  const handleDragStart = () => {
    isDraggingRef.current = true;
  };
  
  const handleDragEnd = () => {
    // Usar setTimeout para garantir que processa depois do último handleDataChange
    setTimeout(() => {
      isDraggingRef.current = false;
      // Forçar uma última verificação após o drag terminar
      if (kanbanData.length > 0) {
        handleDataChange(kanbanData);
      }
    }, 0);
  };

  // Calcular contagem para cada coluna
  const columnsWithCount = columns.map(col => ({
    ...col,
    count: kanbanData.filter(item => item.column === String(col.value)).length
  }));

  // Converter colunas para formato esperado pelo KanbanProvider
  const providerColumns = columnsWithCount.map(col => ({
    id: String(col.value),
    name: col.name,
    color: col.color,
    count: col.count
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <style>{`
        .kanban-scroll-container::-webkit-scrollbar {
          height: 6px;
        }
        .kanban-scroll-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .kanban-scroll-container::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 3px;
        }
        .kanban-scroll-container::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.7);
        }
      `}</style>
      <div 
        className="kanban-scroll-container overflow-x-auto pb-4 -mx-4 px-4 md:-mx-2 md:px-2"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
        }}
      >
        <div className="flex gap-4 min-w-max" style={{ width: 'max-content' }}>
          <KanbanProvider
            columns={providerColumns}
            data={JSON.parse(JSON.stringify(kanbanData)) as any}
            onDataChange={handleDataChange}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {(column: any) => {
              const originalColumn = columnsWithCount.find(col => String(col.value) === column.id);
              if (!originalColumn) return null;
              
              return (
                <KanbanBoard 
                  id={column.id} 
                  key={column.id}
                  className="w-[calc(100vw+40rem)] sm:w-[280px] md:w-[320px] flex-shrink-0 max-w-[320px]"
                >
                  <KanbanHeader className="mb-3">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {originalColumn.color && (
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: originalColumn.color }}
                          />
                        )}
                        <span className="font-medium">{originalColumn.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {column.count}
                      </span>
                    </div>
                  </KanbanHeader>
                  
                  <KanbanCards 
                    id={column.id}
                    className="space-y-2 min-h-[200px] sm:min-h-[400px] max-h-[calc(100vh-350px)] overflow-y-auto"
                    style={{ paddingRight: '4px' }}
                  >
                    {(item: any) => {
                      const kanbanItem = item as KanbanItem;
                      const { originalData } = kanbanItem;
                      
                      return (
                        <KanbanCard
                          column={column.id}
                          id={item.id}
                          key={item.id}
                          name={item.name}
                          className="bg-card border rounded-lg hover:shadow-md transition-shadow w-full"
                        >
                          {children(originalData, originalColumn)}
                        </KanbanCard>
                      );
                    }}
                  </KanbanCards>
                </KanbanBoard>
              );
            }}
          </KanbanProvider>
        </div>
      </div>
    </div>
  );
}