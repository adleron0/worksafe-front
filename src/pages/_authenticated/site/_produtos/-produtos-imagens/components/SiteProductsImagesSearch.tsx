// React and external libraries
import React, { useState, useEffect } from "react";
// UI Components
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";

interface SearchData {
  searchName: string;
  active?: boolean;
}

interface SearchFormProps {
  onSubmit: (data: SearchData) => void;
  onClear: () => void;
  openSheet: (open: boolean) => void;
  params: Record<string, unknown>;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSubmit, onClear, openSheet, params }) => {
  // Form state
  const [searchData, setSearchData] = useState<SearchData>({
    searchName: "",
    active: undefined as boolean | undefined,
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
      } else if (paramKey === 'searchName' && (typeof value === 'string' || value === undefined)) {
        newSearchData.searchName = value as string;
      }
    });
    
    setSearchData(newSearchData);
  }, [params]);

  const handleChange = (name: string, value: string | number | null) => {
    setSearchData(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setSearchData(prev => ({ ...prev, active: value === "true" ? true : false }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(searchData);
    openSheet(false);
  };

  const handleClear = () => {
    setSearchData({
      searchName: "",
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
      {/* Status */}
      <div>
        <Label htmlFor="active">Status</Label>
        <Select 
          name="active"
          options={statusOptions}
          state={searchData.active?.toString() || ""}
          onChange={handleStatusChange}
          placeholder="Selecione status"
        />
      </div>

      {/* Nome */}
      <div>
        <Label htmlFor="searchName">Nome</Label>
        <Input
          id="searchName"
          name="searchName"
          placeholder="Digite o nome"
          value={searchData.searchName}
          onValueChange={handleChange}
        />
      </div>

      {/* Botões */}
      <div className="flex w-full space-x-2">
        <Button className="w-1/2" type="submit">
          Buscar
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-1/2"
          onClick={handleClear}
        >
          Limpar
        </Button>
      </div>
    </form>
  );
};

export default SearchForm;
