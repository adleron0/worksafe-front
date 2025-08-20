// React and external libraries
import React, { useState, useEffect } from "react";

// UI Components
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import DatePickerInput from "@/components/general-components/Calendar";

interface SearchData {
  courseName?: string;
  className?: string;
  expirationDate?: string;
  active?: string;
}

interface SearchFormProps {
  onSearch: (data: Record<string, unknown>) => void;
  onClear: () => void;
  openSheet: (open: boolean) => void;
  params: Record<string, unknown>;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, onClear, openSheet, params }) => {
  // Form state
  const [searchData, setSearchData] = useState<SearchData>({
    courseName: "",
    className: "",
    expirationDate: undefined,
    active: undefined,
  });

  // Load params into form state
  useEffect(() => {
    const newSearchData = { ...searchData };
    
    Object.keys(params).forEach((key) => {
      const paramKey = key as keyof typeof searchData;
      const value = params[key];
      
      // Type checking for each field
      if (paramKey === 'active' && (typeof value === 'string' || value === undefined)) {
        newSearchData.active = value as string | undefined;
      } else if (paramKey === 'courseName' && (typeof value === 'string' || value === undefined)) {
        newSearchData.courseName = value as string;
      } else if (paramKey === 'className' && (typeof value === 'string' || value === undefined)) {
        newSearchData.className = value as string;
      } else if (paramKey === 'expirationDate' && (typeof value === 'string' || value === undefined)) {
        newSearchData.expirationDate = value as string | undefined;
      }
    });
    
    setSearchData(newSearchData);
  }, [params]);

  const handleChange = (name: string, value: string | number | null) => {
    setSearchData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name: string, value: string | null) => {
    setSearchData(prev => ({ 
      ...prev, 
      [name]: value || undefined 
    }));
  };

  const handleStatusChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setSearchData(prev => ({ ...prev, active: value || undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchData as Record<string, unknown>);
    openSheet(false);
  };

  const handleClear = () => {
    setSearchData({
      courseName: "",
      className: "",
      expirationDate: undefined,
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

      {/* Data de Validade */}
      <div>
        <Label htmlFor="expirationDate">Validade até</Label>
        <DatePickerInput
          name="expirationDate"
          placeholder="Selecione a data de validade"
          value={searchData.expirationDate || undefined}
          onValueChange={handleDateChange}
        />
      </div>

      {/* Status */}
      <div>
        <Label htmlFor="active">Status</Label>
        <Select 
          name="active"
          options={statusOptions}
          state={searchData.active || ""}
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