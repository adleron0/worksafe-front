// React and external libraries
import React, { useState, useEffect } from "react";

// UI Components
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import CalendarPicker from "@/components/general-components/Calendar";

interface SearchData {
  name: string;
  "gte-initialDate"?: string;
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
    name: "",
    "gte-initialDate": undefined as string | undefined,
  });

  // Load params into form state
  useEffect(() => {
    const newSearchData = { ...searchData };
    
    Object.keys(params).forEach((key) => {
      const paramKey = key as keyof typeof searchData;
      const value = params[key];
      
      // Type checking for each field
      if (paramKey === 'name' && (typeof value === 'string' || value === undefined)) {
        newSearchData.name = value as string;
      } else if (paramKey === 'gte-initialDate' && (typeof value === 'string' || value === undefined)) {
        newSearchData["gte-initialDate"] = value as string | undefined;
      }
    });
    
    setSearchData(newSearchData);
  }, [params]);

  const handleChange = (name: string, value: string | number | null) => {
    setSearchData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (_name: string, value: string | null) => {
    if (value) {
      // For single date picker, value is an ISO string
      setSearchData(prev => ({ ...prev, "gte-initialDate": value }));
    } else {
      setSearchData(prev => ({ ...prev, "gte-initialDate": undefined }));
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(searchData);
    openSheet(false);
  };

  const handleClear = () => {
    setSearchData({
      name: "",
      "gte-initialDate": undefined,
    });
    onClear();
    openSheet(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nome */}
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          placeholder="Digite o nome"
          value={searchData.name}
          onValueChange={handleChange}
        />
      </div>

      {/* Data Inicial */}
      <div>
        <Label htmlFor="initialDate">Início a partir de</Label>
        <CalendarPicker
          mode="single"
          name="initialDate"
          value={searchData["gte-initialDate"] || null}
          onValueChange={handleDateChange}
          placeholder="Selecione a data inicial"
          numberOfMonths={1}
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
