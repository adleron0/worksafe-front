import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";

interface SearchData {
  'like-name': string;
  'like-email': string;
  blocked?: boolean;
}

interface SearchFormProps {
  onSubmit: (data: SearchData) => void;
  onClear: () => void;
  openSheet: (open: boolean) => void;
  params: Record<string, unknown>;
}

const VisitanteSearch: React.FC<SearchFormProps> = ({ onSubmit, onClear, openSheet, params }) => {
  const [searchData, setSearchData] = useState<SearchData>({
    'like-name': "",
    'like-email': "",
    blocked: undefined,
  });

  useEffect(() => {
    const newSearchData = { ...searchData };

    Object.keys(params).forEach((key) => {
      const paramKey = key as keyof typeof searchData;
      const value = params[key];

      if (paramKey === 'blocked' && (typeof value === 'boolean' || value === undefined)) {
        newSearchData.blocked = value as boolean | undefined;
      } else if (paramKey === 'like-name' && (typeof value === 'string' || value === undefined)) {
        newSearchData['like-name'] = value as string;
      } else if (paramKey === 'like-email' && (typeof value === 'string' || value === undefined)) {
        newSearchData['like-email'] = value as string;
      }
    });

    setSearchData(newSearchData);
  }, [params]);

  const handleChange = (name: string, value: string | number | null) => {
    setSearchData(prev => ({ ...prev, [name]: value }));
  };

  const handleBlockedChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setSearchData(prev => ({ ...prev, blocked: value === "true" ? true : value === "false" ? false : undefined }));
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
      'like-email': "",
      blocked: undefined,
    });
    onClear();
    openSheet(false);
  };

  const blockedOptions = [
    { id: "false", name: "Ativo" },
    { id: "true", name: "Bloqueado" }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Status */}
      <div>
        <Label htmlFor="blocked">Status</Label>
        <Select
          name="blocked"
          options={blockedOptions}
          state={searchData.blocked?.toString() || ""}
          onChange={handleBlockedChange}
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

      {/* Email */}
      <div>
        <Label htmlFor="like-email">Email</Label>
        <Input
          id="like-email"
          name="like-email"
          placeholder="Digite o email"
          value={searchData['like-email']}
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

export default VisitanteSearch;
