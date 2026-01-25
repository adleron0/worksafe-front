import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";

interface SearchData {
  'like-name': string;
  active?: boolean;
}

interface SearchFormProps {
  onSubmit: (data: SearchData) => void;
  onClear: () => void;
  openSheet: (open: boolean) => void;
  params: Record<string, unknown>;
}

const TagSearch: React.FC<SearchFormProps> = ({ onSubmit, onClear, openSheet, params }) => {
  const [searchData, setSearchData] = useState<SearchData>({
    'like-name': "",
    active: undefined,
  });

  useEffect(() => {
    const newSearchData = { ...searchData };

    Object.keys(params).forEach((key) => {
      const paramKey = key as keyof typeof searchData;
      const value = params[key];

      if (paramKey === 'active' && (typeof value === 'boolean' || value === undefined)) {
        newSearchData.active = value as boolean | undefined;
      } else if (paramKey === 'like-name' && (typeof value === 'string' || value === undefined)) {
        newSearchData['like-name'] = value as string;
      }
    });

    setSearchData(newSearchData);
  }, [params]);

  const handleChange = (name: string, value: string | number | null) => {
    setSearchData(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setSearchData(prev => ({ ...prev, active: value === "true" ? true : value === "false" ? false : undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(searchData);
    openSheet(false);
  };

  const handleClear = () => {
    setSearchData({
      'like-name': "",
      active: undefined,
    });
    onClear();
    openSheet(false);
  };

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
        <Label htmlFor="like-name">Nome</Label>
        <Input
          id="like-name"
          name="like-name"
          placeholder="Digite o nome"
          value={searchData['like-name']}
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

export default TagSearch;
