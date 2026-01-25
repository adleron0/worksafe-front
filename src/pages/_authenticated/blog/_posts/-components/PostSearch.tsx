import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";
import { ApiError, Response } from "@/general-interfaces/api.interface";

interface SearchData {
  'like-title': string;
  status?: string;
  'in-categoryId'?: number | number[];
  featured?: boolean;
  createdAt?: [Date | undefined, Date | undefined];
}

interface SearchFormProps {
  onSubmit: (data: SearchData) => void;
  onClear: () => void;
  openSheet: (open: boolean) => void;
  params: Record<string, unknown>;
}

const PostSearch: React.FC<SearchFormProps> = ({ onSubmit, onClear, openSheet, params }) => {
  const [searchData, setSearchData] = useState<SearchData>({
    'like-title': "",
    status: undefined,
    'in-categoryId': undefined,
    featured: undefined,
    createdAt: undefined,
  });

  useEffect(() => {
    const newSearchData = { ...searchData };

    Object.keys(params).forEach((key) => {
      const paramKey = key as keyof typeof searchData;
      const value = params[key];

      if (paramKey === 'status' && (typeof value === 'string' || value === undefined)) {
        newSearchData.status = value as string | undefined;
      } else if (paramKey === 'like-title' && (typeof value === 'string' || value === undefined)) {
        newSearchData['like-title'] = value as string;
      } else if (paramKey === 'featured' && (typeof value === 'boolean' || value === undefined)) {
        newSearchData.featured = value as boolean | undefined;
      } else if (paramKey === 'in-categoryId' &&
        (typeof value === 'number' ||
          (Array.isArray(value) && value.every(item => typeof item === 'number')) ||
          value === undefined)) {
        newSearchData['in-categoryId'] = value as number | number[] | undefined;
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
      setSearchData(prev => ({ ...prev, status: value || undefined }));
    }
  };

  const handleFeaturedChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setSearchData(prev => ({ ...prev, featured: value === "true" ? true : value === "false" ? false : undefined }));
    }
  };

  const handleCategoryChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setSearchData(prev => ({ ...prev, 'in-categoryId': Number(value) }));
    } else if (Array.isArray(value)) {
      setSearchData(prev => ({ ...prev, 'in-categoryId': value.map(v => Number(v)) }));
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
      'like-title': "",
      status: undefined,
      'in-categoryId': undefined,
      featured: undefined,
      createdAt: undefined,
    });
    onClear();
    openSheet(false);
  };

  const statusOptions = [
    { id: "draft", name: "Rascunho" },
    { id: "published", name: "Publicado" },
    { id: "archived", name: "Arquivado" }
  ];

  const featuredOptions = [
    { id: "true", name: "Sim" },
    { id: "false", name: "Não" }
  ];

  // Busca de categorias
  const { data: categoryOptions, isFetching: isFetchingCategories } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listBlogCategories`],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 'all' },
        { key: 'order-name', value: 'asc' },
      ];
      return get('blog/categories', '', params);
    },
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Status */}
      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          name="status"
          options={statusOptions}
          state={searchData.status || ""}
          onChange={handleStatusChange}
          placeholder="Selecione status"
        />
      </div>

      {/* Título */}
      <div>
        <Label htmlFor="like-title">Título</Label>
        <Input
          id="like-title"
          name="like-title"
          placeholder="Digite o título"
          value={searchData['like-title']}
          onValueChange={handleChange}
        />
      </div>

      {/* Categoria */}
      <div>
        <Label htmlFor="in-categoryId">Categoria</Label>
        <Select
          name="in-categoryId"
          disabled={isFetchingCategories}
          options={categoryOptions?.rows || []}
          state={(() => {
            const categoryId = searchData['in-categoryId'];
            if (Array.isArray(categoryId)) {
              return categoryId.map((id: number) => id.toString());
            }
            return categoryId?.toString() || "";
          })()}
          onChange={handleCategoryChange}
          placeholder="Selecione a categoria"
        />
      </div>

      {/* Destaque */}
      <div>
        <Label htmlFor="featured">Destaque</Label>
        <Select
          name="featured"
          options={featuredOptions}
          state={searchData.featured?.toString() || ""}
          onChange={handleFeaturedChange}
          placeholder="Selecione"
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

export default PostSearch;
