// React and external libraries
import React, { useState, useEffect } from "react";

// UI Components
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";

interface SearchData {
  courseName?: string;
  className?: string;
  result?: string;
  active?: boolean;
}

interface SearchFormProps {
  onSearch: (data: SearchData) => void;
  onClear: () => void;
  openSheet: (open: boolean) => void;
  params: Record<string, unknown>;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, onClear, openSheet, params }) => {
  // Form state
  const [searchData, setSearchData] = useState<SearchData>({
    courseName: "",
    className: "",
    result: undefined,
    active: undefined,
  });

  // Load params into form state
  useEffect(() => {
    const newSearchData = { ...searchData };
    
    Object.keys(params).forEach((key) => {
      const paramKey = key as keyof typeof searchData;
      const value = params[key];
      
      // Type checking for each field
      if (paramKey === 'active' && (typeof value === 'boolean' || value === undefined)) {
        newSearchData.active = value as boolean | undefined;
      } else if (paramKey === 'courseName' && (typeof value === 'string' || value === undefined)) {
        newSearchData.courseName = value as string;
      } else if (paramKey === 'className' && (typeof value === 'string' || value === undefined)) {
        newSearchData.className = value as string;
      } else if (paramKey === 'result' && (typeof value === 'string' || value === undefined)) {
        newSearchData.result = value as string | undefined;
      }
    });
    
    setSearchData(newSearchData);
  }, [params]);

  const handleChange = (name: string, value: string | number | null) => {
    setSearchData(prev => ({ ...prev, [name]: value }));
  };

  const handleResultChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setSearchData(prev => ({ ...prev, result: value }));
    }
  };

  const handleStatusChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setSearchData(prev => ({ ...prev, active: value === "true" ? true : value === "false" ? false : undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchData);
    openSheet(false);
  };

  const handleClear = () => {
    setSearchData({
      courseName: "",
      className: "",
      result: undefined,
      active: undefined,
    });
    onClear();
    openSheet(false);
  };

  // Options for selects
  const statusOptions = [
    { id: "true", name: "Ativo" },
    { id: "false", name: "Inativo" }
  ];

  const resultOptions = [
    { id: "true", name: "Aprovado" },
    { id: "false", name: "Reprovado" }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nome do Curso */}
      <div>
        <Label htmlFor="courseName">Curso</Label>
        <Input 
          id="courseName"
          name="courseName"
          placeholder="Buscar por nome do curso"
          value={searchData.courseName || ""}
          onValueChange={handleChange}
        />
      </div>

      {/* Nome da Turma */}
      <div>
        <Label htmlFor="className">Turma</Label>
        <Input 
          id="className"
          name="className"
          placeholder="Buscar por nome da turma"
          value={searchData.className || ""}
          onValueChange={handleChange}
        />
      </div>

      {/* Resultado */}
      <div>
        <Label htmlFor="result">Resultado</Label>
        <Select 
          name="result"
          options={resultOptions}
          value={searchData.result || ""}
          onChange={handleResultChange}
          placeholder="Todos os resultados"
        />
      </div>

      {/* Status */}
      <div>
        <Label htmlFor="active">Status</Label>
        <Select 
          name="active"
          options={statusOptions}
          value={searchData.active !== undefined ? searchData.active.toString() : ""}
          onChange={handleStatusChange}
          placeholder="Todos os status"
        />
      </div>

      {/* Form Actions */}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          Buscar
        </Button>
        <Button type="button" variant="outline" onClick={handleClear} className="flex-1">
          Limpar
        </Button>
      </div>
    </form>
  );
};

export default SearchForm;