import { useState } from "react";
import Select from "./Select";

// Exemplo de dados para o componente
const exampleOptions = [
  { id: "1", name: "Opção 1" },
  { id: "2", name: "Opção 2" },
  { id: "3", name: "Opção 3" },
  { id: "4", name: "Opção 4" },
  { id: "5", name: "Opção 5" },
];

const SelectExample = () => {
  // Estado para seleção única
  const [singleValue, setSingleValue] = useState<string>("");
  
  // Estado para seleção múltipla
  const [multipleValues, setMultipleValues] = useState<string[]>([]);

  // Manipuladores de mudança
  const handleSingleChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setSingleValue(value);
      console.log("Valor único selecionado:", value);
    }
  };

  const handleMultipleChange = (_name: string, value: string | string[]) => {
    if (Array.isArray(value)) {
      setMultipleValues(value);
      console.log("Valores múltiplos selecionados:", value);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Seleção Única</h3>
        <Select
          name="singleSelect"
          options={exampleOptions}
          state={singleValue}
          onChange={handleSingleChange}
          placeholder="Selecione uma opção"
        />
        <p className="mt-2 text-sm text-gray-500">
          Valor selecionado: {singleValue || "Nenhum"}
        </p>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Seleção Múltipla</h3>
        <Select
          name="multipleSelect"
          options={exampleOptions}
          state={multipleValues}
          onChange={handleMultipleChange}
          placeholder="Selecione várias opções"
          multiple={true}
        />
        <p className="mt-2 text-sm text-gray-500">
          Valores selecionados: {multipleValues.length > 0 
            ? multipleValues.join(", ") 
            : "Nenhum"}
        </p>
      </div>
    </div>
  );
};

export default SelectExample;
