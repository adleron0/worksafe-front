import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";

interface SearchData {
  trainee?: string;
  generalRating?: number | null;
  authorizationExposeReview?: boolean | null;
  active?: boolean | null;
}

interface SearchFormProps {
  onSearch: (data: SearchData) => void;
  onClear: () => void;
  openSheet: (open: boolean) => void;
  params: Record<string, unknown>;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, onClear, openSheet, params }) => {
  const [searchData, setSearchData] = useState<SearchData>({
    trainee: "",
    generalRating: null,
    authorizationExposeReview: null,
    active: null,
  });

  useEffect(() => {
    const newData: SearchData = {};
    
    if (params['trainee']) {
      newData.trainee = params['trainee'] as string;
    }
    if (params['generalRating'] !== undefined) {
      newData.generalRating = params['generalRating'] as number;
    }
    if (params['authorizationExposeReview'] !== undefined) {
      newData.authorizationExposeReview = params['authorizationExposeReview'] as boolean;
    }
    if (params['active'] !== undefined) {
      newData.active = params['active'] as boolean;
    }
    
    setSearchData(prev => ({ ...prev, ...newData }));
  }, [params]);

  const handleChange = (name: string, value: string | number | null) => {
    if (name === 'authorizationExposeReview' || name === 'active') {
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else value = null;
    }
    
    if (name === 'generalRating' && value !== null) {
      value = Number(value);
    }
    
    setSearchData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const filteredData: SearchData = {};
    
    if (searchData.trainee && searchData.trainee.trim()) {
      filteredData.trainee = searchData.trainee.trim();
    }
    if (searchData.generalRating !== null && searchData.generalRating !== undefined) {
      filteredData.generalRating = searchData.generalRating;
    }
    if (searchData.authorizationExposeReview !== null && searchData.authorizationExposeReview !== undefined) {
      filteredData.authorizationExposeReview = searchData.authorizationExposeReview;
    }
    if (searchData.active !== null && searchData.active !== undefined) {
      filteredData.active = searchData.active;
    }
    
    onSearch(filteredData);
    openSheet(false);
  };

  const handleClear = () => {
    setSearchData({
      trainee: "",
      generalRating: null,
      authorizationExposeReview: null,
      active: null,
    });
    onClear();
    openSheet(false);
  };

  const ratingOptions = [
    { value: "1", label: "1 Estrela" },
    { value: "2", label: "2 Estrelas" },
    { value: "3", label: "3 Estrelas" },
    { value: "4", label: "4 Estrelas" },
    { value: "5", label: "5 Estrelas" },
  ];

  const booleanOptions = [
    { value: "true", label: "Sim" },
    { value: "false", label: "Não" },
  ];

  const statusOptions = [
    { value: "true", label: "Ativo" },
    { value: "false", label: "Inativo" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="trainee">Aluno</Label>
        <Input
          id="trainee"
          name="trainee"
          placeholder="Nome do aluno"
          value={searchData.trainee || ""}
          onChange={(value) => handleChange("trainee", value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="generalRating">Avaliação Geral</Label>
        <Select
          id="generalRating"
          name="generalRating"
          options={ratingOptions}
          value={searchData.generalRating?.toString() || ""}
          onChange={(value) => handleChange("generalRating", value === "" ? null : value)}
          placeholder="Selecione a avaliação"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="authorizationExposeReview">Autorização para Exposição</Label>
        <Select
          id="authorizationExposeReview"
          name="authorizationExposeReview"
          options={booleanOptions}
          value={searchData.authorizationExposeReview?.toString() || ""}
          onChange={(value) => handleChange("authorizationExposeReview", value === "" ? null : value)}
          placeholder="Selecione uma opção"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="active">Status</Label>
        <Select
          id="active"
          name="active"
          options={statusOptions}
          value={searchData.active?.toString() || ""}
          onChange={(value) => handleChange("active", value === "" ? null : value)}
          placeholder="Selecione o status"
        />
      </div>

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