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
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, Cross2Icon } from "@radix-ui/react-icons";

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
    onChange?: (name: string, value: string | string[]) => void;
}

const Select = ({ 
    name = "",
    options = [],
    state = "",
    label = "name",
    value = "id",
    placeholder = "Selecione uma opção",
    multiple = false,
    onChange = () => {},
}: SelectProps) => {
  const isInitialMount = useRef(true);
  const [key, setKey] = useState(0); // Usado para forçar a re-renderização
  const [selectedItems, setSelectedItems] = useState<string[]>(
    multiple ? (Array.isArray(state) ? state : state ? [state] : []) : []
  );

  // Força uma re-renderização quando as opções ou o estado mudam
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Forçar re-renderização quando as opções ou o estado mudam
    setKey(prev => prev + 1);
    
    // Atualiza selectedItems quando state muda
    if (multiple) {
      setSelectedItems(Array.isArray(state) ? state : state ? [state] : []);
    }
    
    console.log(`Select ${name} - state: ${state}, options count: ${options.length}`);
  }, [options, state, name, multiple]);

  const handleValueChange = (newValue: string) => {
    onChange(name, newValue);
  };

  const handleMultipleValueChange = (itemValue: string) => {
    const newSelectedItems = selectedItems.includes(itemValue)
      ? selectedItems.filter(item => item !== itemValue)
      : [...selectedItems, itemValue];
    
    setSelectedItems(newSelectedItems);
    onChange(name, newSelectedItems);
  };

  const handleSelectAll = () => {
    // If all items are already selected, deselect all
    const allOptionValues = options.map(option => String(option[value]));
    const allSelected = allOptionValues.every(val => selectedItems.includes(val));
    
    const newSelectedItems = allSelected ? [] : allOptionValues;
    setSelectedItems(newSelectedItems);
    onChange(name, newSelectedItems);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dropdown from opening/closing
    setSelectedItems([]);
    onChange(name, []);
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
  
  // Renderiza o componente de seleção múltipla
  if (multiple) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between font-normal"
            key={key}
          >
            <span className="truncate">{getSelectedLabels()}</span>
            <div className="flex items-center">
              {selectedItems.length > 0 && (
                <Cross2Icon 
                  className="h-3 w-3 opacity-50 mr-0.5 hover:opacity-100 cursor-pointer" 
                  onClick={handleClearAll}
                />
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
                {options.map((option) => (
                <DropdownMenuCheckboxItem
                  className="cursor-pointer"
                  key={option[value]}
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
    <UiSelect
      key={key} // Força re-renderização quando a chave muda
      value={typeof state === 'string' ? state : ''}
      onValueChange={handleValueChange}
      defaultValue={typeof state === 'string' ? state : ''}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options && options.length > 0 ? (
          options.map((option) => (
            <SelectItem 
              key={option[value]} 
              value={String(option[value])}
            >
              {option[label]}
            </SelectItem>
          ))
        ) : (
          <SelectItem value="no-options" disabled>
            Nenhuma opção disponível
          </SelectItem>
        )}
      </SelectContent>
    </UiSelect>
  );
}

export default Select;
