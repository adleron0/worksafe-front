// React and external libraries
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
// UI Components
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
// Interfaces and validations
import { ApiError, Response } from "@/general-interfaces/api.interface";

interface SearchData {
  'like-name': string;
  active?: boolean;
  courseId?: number;
}

interface SearchFormProps {
  onSubmit: (data: SearchData) => void;
  onClear: () => void;
  openSheet: (open: boolean) => void;
  params: Record<string, unknown>;
}


const CertificateSearch: React.FC<SearchFormProps> = ({ onSubmit, onClear, openSheet, params }) => {
  // Form state
  const [searchData, setSearchData] = useState<SearchData>({
    'like-name': "",
    active: undefined as boolean | undefined,
    courseId: undefined as number | undefined,
  });

  // Load params into form state
  useEffect(() => {
    setSearchData({
      'like-name': (params['like-name'] as string) || "",
      active: params.active as boolean | undefined,
      courseId: params.courseId as number | undefined,
    });
  }, [params]);

  const handleChange = (name: string, value: string | number | null) => {
    setSearchData(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setSearchData(prev => ({ ...prev, active: value === "true" ? true : false }));
    }
  };


  const handleCourseChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setSearchData(prev => ({ ...prev, courseId: value ? Number(value) : undefined }));
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
      courseId: undefined,
    });
    onClear();
    openSheet(false);
  };

  // Options for selects
  const statusOptions = [
    { id: "true", name: "Ativo" },
    { id: "false", name: "Inativo" }
  ];

  // Buscar cursos
  const { 
    data: coursesData,
    isFetching: isFetchingCourses,
  } = useQuery<Response | undefined, ApiError>({
    queryKey: ["courses-search"],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 999 },
        { key: 'order-name', value: 'asc' },
      ];
      return get("courses", "", params);
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

      {/* Nome do certificado */}
      <div>
        <Label htmlFor="like-name">Nome do Certificado</Label>
        <Input
          id="like-name"
          name="like-name"
          placeholder="Digite o nome"
          value={searchData['like-name']}
          onValueChange={handleChange}
        />
      </div>

      {/* Curso */}
      <div>
        <Label htmlFor="courseId">Curso</Label>
        <Select 
          name="courseId"
          disabled={isFetchingCourses}
          options={coursesData?.rows || []}
          state={searchData.courseId?.toString() || ""}
          onChange={handleCourseChange}
          placeholder="Selecione o curso"
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
}

export default CertificateSearch;