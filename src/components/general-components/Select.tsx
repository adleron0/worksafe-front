import {
    Select as UiSelect,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import { useEffect, useState, useRef } from "react";

interface SelectProps {
    name?: string;
    options?: any[];
    state?: string;
    label?: string;
    value?: string;
    placeholder?: string;
    onChange?: (name: string, value: any) => void;
}

const Select = ({ 
    name = "",
    options = [],
    state = "",
    label = "name",
    value = "id",
    placeholder = "Selecione uma opção",
    onChange = () => {},
}: SelectProps) => {
  const isInitialMount = useRef(true);
  const [key, setKey] = useState(0); // Usado para forçar a re-renderização

  // Força uma re-renderização quando as opções ou o estado mudam
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Forçar re-renderização quando as opções ou o estado mudam
    setKey(prev => prev + 1);
    
    console.log(`Select ${name} - state: ${state}, options count: ${options.length}`);
  }, [options, state, name]);

  const handleValueChange = (newValue: string) => {
    onChange(name, newValue);
  };
  
  return (
    <UiSelect
      key={key} // Força re-renderização quando a chave muda
      value={state}
      onValueChange={handleValueChange}
      defaultValue={state}
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
