import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import { ApiError, Response } from "@/general-interfaces/api.interface";

interface SearchData {
  title?: string;
  courseId?: number;
  isActive?: boolean;
  version?: string;
}

interface SearchFormProps {
  onSearch: (data: SearchData) => void;
  onClear: () => void;
  openSheet: (open: boolean) => void;
  params: Record<string, unknown>;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, onClear, openSheet, params }) => {
  const [searchData, setSearchData] = useState<SearchData>({
    title: "",
    courseId: undefined,
    isActive: undefined,
    version: "",
  });

  // Buscar cursos para o select
  const { 
    data: courses, 
    isLoading: isLoadingCourses,
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listCursosSearch`],
    queryFn: async () => {
      const queryParams = [
        { key: 'limit', value: 999 },
        { key: 'active', value: true },
        { key: 'order-name', value: 'asc' },
      ];
      return get('courses', '', queryParams);
    },
  });

  useEffect(() => {
    // Carregar params no form state
    if (params) {
      setSearchData({
        title: (params.title as string) || "",
        courseId: params.courseId ? Number(params.courseId) : undefined,
        isActive: params.isActive !== undefined ? params.isActive as boolean : undefined,
        version: (params.version as string) || "",
      });
    }
  }, [params]);

  const handleChange = (name: string, value: string | number | null) => {
    setSearchData(prev => ({ 
      ...prev, 
      [name]: value === "" || value === null ? undefined : value 
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filtrar apenas campos preenchidos
    const filteredData = Object.entries(searchData).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== "" && value !== null) {
        acc[key as keyof SearchData] = value;
      }
      return acc;
    }, {} as SearchData);

    onSearch(filteredData);
    openSheet(false);
  };

  const handleClear = () => {
    setSearchData({
      title: "",
      courseId: undefined,
      isActive: undefined,
      version: "",
    });
    onClear();
    openSheet(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          placeholder="Buscar por título"
          value={searchData.title}
          onValueChange={handleChange}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="courseId">Curso</Label>
        <Select
          name="courseId"
          disabled={isLoadingCourses}
          options={[
            { id: '', name: 'Todos os cursos' },
            ...(courses?.rows || [])
          ]}
          onChange={(name, value) => handleChange(name, value ? +value : null)}
          state={searchData.courseId ? String(searchData.courseId) : ""}
          placeholder="Selecione o curso"
        />
      </div>

      <div>
        <Label htmlFor="version">Versão</Label>
        <Input
          id="version"
          name="version"
          placeholder="Buscar por versão"
          value={searchData.version}
          onValueChange={handleChange}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="isActive">Status</Label>
        <Select
          name="isActive"
          options={[
            { id: '', name: 'Todos' },
            { id: 'true', name: 'Ativo' },
            { id: 'false', name: 'Inativo' }
          ]}
          onChange={(name, value) => {
            if (value === '') {
              handleChange(name, null);
            } else {
              handleChange(name, value === 'true');
            }
          }}
          state={searchData.isActive !== undefined ? String(searchData.isActive) : ""}
          placeholder="Selecione o status"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          Buscar
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleClear} 
          className="flex-1"
        >
          Limpar
        </Button>
      </div>
    </form>
  );
};

export default SearchForm;