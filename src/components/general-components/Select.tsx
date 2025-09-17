import {
    Select as UiSelect,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, Cross2Icon } from "@radix-ui/react-icons";
import { Skeleton } from "@/components/ui/skeleton";

interface OptionType {
    [key: string]: string | number;
}

interface SelectProps {
    name?: string;
    options?: OptionType[];
    state?: string | string[];
    label?: string;
    value?: string;
    placeholder?: string;
    multiple?: boolean;
    disabled?: boolean;
    isLoading?: boolean;
    clearable?: boolean;
    onChange?: (name: string, value: string | string[]) => void;
    callBacks?: ((name: string, value: string | string[]) => void)[];
    modal?: boolean;
}

const Select = ({ 
    name = "",
    options = [],
    state = "",
    label = "name",
    value = "id",
    placeholder = "Selecione uma opção",
    multiple = false,
    disabled = false,
    isLoading = false,
    clearable = false,
    onChange = () => {},
    callBacks = [],
    modal = true,
}: SelectProps) => {
  const [selectedItems, setSelectedItems] = useState<string[]>(
    multiple ? (Array.isArray(state) ? state : state ? [state] : []) : []
  );

  // Atualiza selectedItems quando state muda (apenas para multiple)
  useEffect(() => {
    if (multiple) {
      setSelectedItems(Array.isArray(state) ? state : state ? [state] : []);
    }
  }, [state, multiple]);

  const handleValueChange = (newValue: string) => {
    onChange(name, newValue);
    // Execute all callback functions after onChange
    callBacks.forEach(callback => callback(name, newValue));
  };

  const handleMultipleValueChange = (itemValue: string) => {
    const newSelectedItems = selectedItems.includes(itemValue)
      ? selectedItems.filter(item => item !== itemValue)
      : [...selectedItems, itemValue];
    
    setSelectedItems(newSelectedItems);
    onChange(name, newSelectedItems);
    // Execute all callback functions after onChange
    callBacks.forEach(callback => callback(name, newSelectedItems));
  };

  const handleSelectAll = () => {
    // If all items are already selected, deselect all
    const allOptionValues = options.map(option => String(option[value]));
    const allSelected = allOptionValues.every(val => selectedItems.includes(val));
    
    const newSelectedItems = allSelected ? [] : allOptionValues;
    setSelectedItems(newSelectedItems);
    onChange(name, newSelectedItems);
    // Execute all callback functions after onChange
    callBacks.forEach(callback => callback(name, newSelectedItems));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    setSelectedItems([]);
    onChange(name, []);
    // Execute all callback functions after onChange
    callBacks.forEach(callback => callback(name, []));
  };

  const handleClearSingle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(name, "");
    // Execute all callback functions after onChange
    callBacks.forEach(callback => callback(name, ""));
  };

  const getSelectedLabels = () => {
    if (!selectedItems.length) return placeholder;
    
    const selectedOptions = options.filter(option => 
      selectedItems.includes(String(option[value]))
    );
    
    if (selectedOptions.length <= 2) {
      return selectedOptions.map(option => option[label]).join(", ");
    }
    
    return `${selectedOptions.length} itens selecionados`;
  };
  
  // Se está carregando, exibe skeleton
  if (isLoading) {
    return <Skeleton className="h-10 w-full bg-muted" />;
  }
  
  // Renderiza o componente de seleção múltipla
  if (multiple) {
    return (
      <DropdownMenu modal={modal}>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={disabled}
            variant="outline"
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{getSelectedLabels()}</span>
            <div className="flex items-center pointer-events-auto">
              {selectedItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="h-4 w-4 mr-1 flex items-center justify-center hover:bg-background p-0.5 rounded transition-colors cursor-pointer"
                >
                  <Cross2Icon className="h-3 w-3 opacity-50 hover:opacity-100" />
                </button>
              )}
              <ChevronDownIcon className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-full min-w-[200px] p-0" 
          style={{ 
            width: 'var(--radix-dropdown-menu-trigger-width)'
          }}
        >
          {options && options.length > 0 ? (
            <div className="flex flex-col">
              {/* Fixed header with "Select All" option */}
              <div className="sticky top-0 z-10 bg-background border-b">
                <DropdownMenuCheckboxItem
                  className="cursor-pointer font-semibold py-2"
                  checked={options.length > 0 && selectedItems.length === options.length}
                  onCheckedChange={handleSelectAll}
                >
                  Selecionar Todos
                </DropdownMenuCheckboxItem>
              </div>
              
              {/* Scrollable options list */}
              <div 
                className="overflow-y-auto"
                style={{ maxHeight: '250px' }}
              >
                {options.map((option, index) => (
                <DropdownMenuCheckboxItem
                  className="cursor-pointer hover:bg-muted"
                  key={option[value] !== undefined ? option[value] : `option-${index}`}
                  checked={selectedItems.includes(String(option[value]))}
                  onCheckedChange={() => handleMultipleValueChange(String(option[value]))}
                >
                  {option[label]}
                </DropdownMenuCheckboxItem>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Nenhuma opção disponível
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  // Renderiza o componente de seleção única (original)
  return (
    <div className="relative w-full">
      <UiSelect
        value={typeof state === 'string' ? state : ''}
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="w-full" disabled={disabled}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
      <SelectContent>
        {options && options.length > 0 ? (
          options.map((option, index) => {
            const optionValue = option[value];
            const optionLabel = option[label];
            
            // Garantir que temos uma key única
            const keyValue = optionValue !== undefined && optionValue !== null 
              ? `${name}-${optionValue}` 
              : `${name}-fallback-${index}`;
            
            // Garantir que temos um value válido
            const itemValue = optionValue !== undefined && optionValue !== null 
              ? String(optionValue) 
              : '';
            
            // Não renderizar opções sem value
            if (!itemValue) {
              return null;
            }
            
            return (
              <SelectItem 
                key={keyValue} 
                value={itemValue}
              >
                {optionLabel || 'Sem nome'}
              </SelectItem>
            );
          })
        ) : (
          <SelectItem value="no-options" disabled>
            Nenhuma opção disponível
          </SelectItem>
        )}
      </SelectContent>
    </UiSelect>
      {clearable && state && typeof state === 'string' && (
        <button
          type="button"
          onClick={handleClearSingle}
          className="absolute right-8 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
          disabled={disabled}
        >
          <Cross2Icon className="h-3 w-3 opacity-50 hover:opacity-100" />
        </button>
      )}
    </div>
  );
}

export default Select;
