import React, { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
// Template Components
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Response } from "@/general-interfaces/api.interface";
import { ApiError } from "@/general-interfaces/api.interface";

interface SearchFormProps {
  onSearch: (params: { [key: string]: string | number | boolean | string[] }) => void;
  onClear: () => void;
  openSheet: (value: boolean) => void;
  params: { [key: string]: string | number | boolean | string[] };
}

const SearchForm = ({ onSearch, onClear, openSheet }: SearchFormProps) => {
  const [filters, setFilters] = useState({
    name: '',
    courseId: '',
    active: '',
  });
  const initialFormRef = useRef(filters);

  // Buscar cursos disponíveis
  const { 
    data: courses, 
    isLoading: isLoadingCourses,
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listCursos`],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 'all' },
        { key: 'active', value: true },
        { key: 'order-name', value: 'asc' },
      ];
      return get('courses', '', params);
    },
  });

  const handleChange = (name: string, value: string | number | boolean | null) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const searchParams: { [key: string]: any } = {};
    
    if (filters.name) {
      searchParams['search-name'] = filters.name;
    }
    
    if (filters.courseId) {
      searchParams.courseId = filters.courseId;
    }
    
    if (filters.active !== '') {
      searchParams.active = filters.active === 'true';
    }

    onSearch(searchParams);
    openSheet(false);
  };

  const handleClear = () => {
    setFilters(initialFormRef.current);
    onClear();
    openSheet(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          placeholder="Buscar por nome"
          value={filters.name}
          onValueChange={handleChange}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="courseId">Curso</Label>
        <Select 
          name="courseId"
          isLoading={isLoadingCourses}
          options={[
            { id: '', name: 'Todos os cursos' },
            ...(courses?.rows || [])
          ]}
          onChange={(name, value) => handleChange(name, typeof value === 'string' ? value : '')} 
          state={filters.courseId}
          placeholder="Filtrar por curso"
        />
      </div>

      <div>
        <Label htmlFor="active">Status</Label>
        <Select 
          name="active"
          options={[
            { id: '', name: 'Todos' },
            { id: 'true', name: 'Ativos' },
            { id: 'false', name: 'Inativos' },
          ]}
          onChange={(name, value) => handleChange(name, typeof value === 'string' ? value : '')} 
          state={filters.active}
          placeholder="Filtrar por status"
        />
      </div>

      <div className="flex gap-2 mt-4">
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