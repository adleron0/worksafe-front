// React and external libraries
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
// UI Components
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import CalendarPicker from "@/components/general-components/Calendar";
import Select from "@/components/general-components/Select";
// Interfaces and validations
import { ApiError, Response } from "@/general-interfaces/api.interface";

interface SearchData {
  searchName: string;
  active?: boolean;
  cpf: string;
  'in-profileId'?: number | number[];
  createdAt?: [Date | undefined, Date | undefined];
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
    cpf: "",
    'in-profileId': undefined as number | number[] | undefined,
    createdAt: undefined as [Date | undefined, Date | undefined] | undefined,
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
      } else if (paramKey === 'cpf' && (typeof value === 'string' || value === undefined)) {
        newSearchData.cpf = value as string;
      } else if (paramKey === 'in-profileId' && 
                (typeof value === 'number' || 
                 (Array.isArray(value) && value.every(item => typeof item === 'number')) || 
                 value === undefined)) {
        newSearchData['in-profileId'] = value as number | number[] | undefined;
      } else if (paramKey === 'createdAt' && (Array.isArray(value) || value === undefined)) {
        newSearchData.createdAt = value as [Date | undefined, Date | undefined] | undefined;
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

  const handleRoleChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setSearchData(prev => ({ ...prev, 'in-profileId': Number(value) }));
    } else if (Array.isArray(value)) {
      // Convert array of strings to array of numbers
      setSearchData(prev => ({ ...prev, 'in-profileId': value.map(v => Number(v)) }));
    }
  };

  const handleDateChange = (_name: string, value: string | null) => {
    if (value) {
      const [startStr, endStr] = value.split('|');
      const startDate = startStr ? new Date(startStr) : undefined;
      const endDate = endStr ? new Date(endStr) : undefined;
      
      if (startDate && endDate) {
        setSearchData(prev => ({ ...prev, createdAt: [startDate, endDate] }));
      } else {
        setSearchData(prev => ({ ...prev, createdAt: undefined }));
      }
    } else {
      setSearchData(prev => ({ ...prev, createdAt: undefined }));
    }
  };

  // Convert createdAt to string format for CalendarPicker
  const getDateRangeValue = () => {
    const { createdAt } = searchData;
    if (createdAt && createdAt[0] && createdAt[1]) {
      return `${createdAt[0].toISOString()}|${createdAt[1].toISOString()}`;
    }
    return null;
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
      cpf: "",
      'in-profileId': undefined,
      createdAt: undefined,
    });
    onClear();
    openSheet(false);
  };

  // Options for selects
  const statusOptions = [
    { id: "true", name: "Ativo" },
    { id: "false", name: "Inativo" }
  ];

  // Buscas de valores para variaveis de formulário
  const { 
    data: roleOptions, 
    isFetching: isFetchingProfiles,
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listPerfis`],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 999 },
        { key: 'order-id', value: 'asc' },
      ];
      return get('profiles', '', params);
    },
  });

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

      {/* CPF */}
      <div>
        <Label htmlFor="cpf">CPF</Label>
        <Input
          id="cpf"
          name="cpf"
          placeholder="Digite o CPF"
          format="cpf"
          value={searchData.cpf}
          onValueChange={handleChange}
        />
      </div>

      {/* Função (Select com multiple) */}
      <div>
        <Label htmlFor="in-profileId">Função</Label>
        <Select 
          name="in-profileId"
          disabled={isFetchingProfiles}
          options={roleOptions?.rows || []}
          state={(() => {
            const profileId = searchData['in-profileId'];
            if (Array.isArray(profileId)) {
              return profileId.map((id: number) => id.toString());
            }
            return profileId?.toString() || "";
          })()}
          onChange={handleRoleChange}
          placeholder="Selecione a função"
          multiple
        />
      </div>

      {/* Data de Criação (Range Picker) */}
      <div>
        <Label htmlFor="createdAt">Data de Criação</Label>
        <CalendarPicker
          mode="range"
          name="dateRange"
          value={getDateRangeValue()}
          onValueChange={handleDateChange}
          placeholder="Selecione uma data"
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
