import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";
import { ApiError, Response } from "@/general-interfaces/api.interface";

interface SearchData {
  status?: string;
  'in-postId'?: number | number[];
  createdAt?: [Date | undefined, Date | undefined];
}

interface SearchFormProps {
  onSubmit: (data: SearchData) => void;
  onClear: () => void;
  openSheet: (open: boolean) => void;
  params: Record<string, unknown>;
}

const ComentarioSearch: React.FC<SearchFormProps> = ({ onSubmit, onClear, openSheet, params }) => {
  const [searchData, setSearchData] = useState<SearchData>({
    status: undefined,
    'in-postId': undefined,
    createdAt: undefined,
  });

  useEffect(() => {
    const newSearchData = { ...searchData };

    Object.keys(params).forEach((key) => {
      const paramKey = key as keyof typeof searchData;
      const value = params[key];

      if (paramKey === 'status' && (typeof value === 'string' || value === undefined)) {
        newSearchData.status = value as string | undefined;
      } else if (paramKey === 'in-postId' &&
        (typeof value === 'number' ||
          (Array.isArray(value) && value.every(item => typeof item === 'number')) ||
          value === undefined)) {
        newSearchData['in-postId'] = value as number | number[] | undefined;
      } else if (paramKey === 'createdAt' && (Array.isArray(value) || value === undefined)) {
        newSearchData.createdAt = value as [Date | undefined, Date | undefined] | undefined;
      }
    });

    setSearchData(newSearchData);
  }, [params]);

  const handleStatusChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setSearchData(prev => ({ ...prev, status: value || undefined }));
    }
  };

  const handlePostChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setSearchData(prev => ({ ...prev, 'in-postId': Number(value) }));
    } else if (Array.isArray(value)) {
      setSearchData(prev => ({ ...prev, 'in-postId': value.map(v => Number(v)) }));
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
      status: undefined,
      'in-postId': undefined,
      createdAt: undefined,
    });
    onClear();
    openSheet(false);
  };

  const statusOptions = [
    { id: "pending", name: "Pendente" },
    { id: "published", name: "Aprovado" },
    { id: "rejected", name: "Rejeitado" }
  ];

  // Busca de posts
  const { data: postOptions, isFetching: isFetchingPosts } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listBlogPosts`],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 'all' },
        { key: 'order-title', value: 'asc' },
      ];
      return get('blog/posts', '', params);
    },
  });

  // Transformar posts para o formato esperado pelo Select
  const postOptionsFormatted = postOptions?.rows?.map((post: { id: number; title: string }) => ({
    id: post.id,
    name: post.title,
  })) || [];

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

      {/* Post */}
      <div>
        <Label htmlFor="in-postId">Post</Label>
        <Select
          name="in-postId"
          disabled={isFetchingPosts}
          options={postOptionsFormatted}
          state={(() => {
            const postId = searchData['in-postId'];
            if (Array.isArray(postId)) {
              return postId.map((id: number) => id.toString());
            }
            return postId?.toString() || "";
          })()}
          onChange={handlePostChange}
          placeholder="Selecione o post"
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

export default ComentarioSearch;
