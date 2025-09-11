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
  'like-name': string;
  active?: boolean;
  cpf: string;
  'in-customerId'?: number | number[];
  'gte-birthDate'?: string;
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
    'like-name': "",
    active: undefined as boolean | undefined,
    cpf: "",
    'in-customerId': undefined as number | number[] | undefined,
    'gte-birthDate': undefined as string | undefined,
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
      } else if (paramKey === 'like-name' && (typeof value === 'string' || value === undefined)) {
        newSearchData['like-name'] = value as string;
      } else if (paramKey === 'cpf' && (typeof value === 'string' || value === undefined)) {
        newSearchData.cpf = value as string;
      } else if (paramKey === 'in-customerId' && 
                (typeof value === 'number' || 
                 (Array.isArray(value) && value.every(item => typeof item === 'number')) || 
                 value === undefined)) {
        newSearchData['in-customerId'] = value as number | number[] | undefined;
      } else if (paramKey === 'gte-birthDate' && (typeof value === 'string' || value === undefined)) {
        newSearchData['gte-birthDate'] = value as string | undefined;
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

  const handleCustomerChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setSearchData(prev => ({ ...prev, 'in-customerId': Number(value) }));
    } else if (Array.isArray(value)) {
      // Convert array of strings to array of numbers
      setSearchData(prev => ({ ...prev, 'in-customerId': value.map(v => Number(v)) }));
    }
  };

  const handleBirthDateChange = (_name: string, value: string | null) => {
    if (value) {
      // For single date picker, value is an ISO string
      setSearchData(prev => ({ ...prev, 'gte-birthDate': value }));
    } else {
      setSearchData(prev => ({ ...prev, 'gte-birthDate': undefined }));
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
      'like-name': "",
      active: undefined,
      cpf: "",
      'in-customerId': undefined,
      'gte-birthDate': undefined,
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
    data: customerOptions, 
    isFetching: isFetchingCustomers,
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listCustomers`],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 'all' },
        { key: 'order-name', value: 'asc' },
      ];
      return get('customers', '', params);
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
        <Label htmlFor="like-name">Nome</Label>
        <Input
          id="like-name"
          name="like-name"
          placeholder="Digite o nome"
          value={searchData['like-name']}
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

      {/* Cliente/Empresa (Select com multiple) */}
      <div>
        <Label htmlFor="in-customerId">Empresa</Label>
        <Select 
          name="in-customerId"
          disabled={isFetchingCustomers}
          options={customerOptions?.rows || []}
          state={(() => {
            const customerId = searchData['in-customerId'];
            if (Array.isArray(customerId)) {
              return customerId.map((id: number) => id.toString());
            }
            return customerId?.toString() || "";
          })()}
          onChange={handleCustomerChange}
          placeholder="Selecione a empresa"
          multiple
        />
      </div>

      {/* Data de Nascimento */}
      <div>
        <Label htmlFor="birthDate">Data de Nascimento (a partir de)</Label>
        <CalendarPicker
          mode="single"
          name="birthDate"
          value={searchData['gte-birthDate'] || null}
          onValueChange={handleBirthDateChange}
          placeholder="Selecione a data"
          numberOfMonths={1}
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