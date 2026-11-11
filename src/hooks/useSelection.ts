import { useState, useMemo } from 'react';

interface UseSelectionOptions {
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
}

/**
 * Hook para gerenciar seleção de itens em listas
 *
 * @example
 * ```tsx
 * const selection = useSelection(data?.rows || [], {
 *   onSelectionChange: (ids) => console.log('Selecionados:', ids)
 * });
 *
 * // Usar no componente
 * <Selectable
 *   id={item.id}
 *   checked={selection.isSelected(item.id)}
 *   onToggle={selection.toggleSelection}
 * />
 * ```
 */
export function useSelection<T extends { id: string | number }>(
  items: T[],
  options?: UseSelectionOptions
) {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  // Toggle seleção individual
  const toggleSelection = (id: string | number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    options?.onSelectionChange?.(Array.from(newSelected));
  };

  // Toggle selecionar todos
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
      options?.onSelectionChange?.([]);
    } else {
      const allIds = new Set(items.map(item => item.id));
      setSelectedIds(allIds);
      options?.onSelectionChange?.(Array.from(allIds));
    }
  };

  // Limpar seleção
  const clearSelection = () => {
    setSelectedIds(new Set());
    options?.onSelectionChange?.([]);
  };

  // Verificações
  const isSelected = (id: string | number) => selectedIds.has(id);

  const isAllSelected = useMemo(
    () => items.length > 0 && selectedIds.size === items.length,
    [items.length, selectedIds.size]
  );

  const isIndeterminate = useMemo(
    () => selectedIds.size > 0 && selectedIds.size < items.length,
    [items.length, selectedIds.size]
  );

  return {
    // Estado
    selectedIds: Array.from(selectedIds),
    selectedCount: selectedIds.size,

    // Ações
    toggleSelection,
    toggleSelectAll,
    clearSelection,

    // Verificações
    isSelected,
    isAllSelected,
    isIndeterminate,
    hasSelection: selectedIds.size > 0,
  };
}
