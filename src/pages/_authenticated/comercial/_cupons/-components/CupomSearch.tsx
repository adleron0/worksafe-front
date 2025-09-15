import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import DatePickerInput from "@/components/general-components/Calendar";
import { ApiError } from "@/general-interfaces/api.interface";
import { DiscountType } from "../-interfaces/entity.interface";

interface SearchData {
  code?: string;
  description?: string;
  sellerId?: number;
  discountType?: DiscountType;
  active?: boolean;
  firstPurchaseOnly?: boolean;
  courseId?: number;
  classId?: number;
  'validUntil-gte'?: string;
  'validUntil-lte'?: string;
  validityRange?: string;
}

interface SearchFormProps {
  onSearch: (data: SearchData) => void;
  onClear: () => void;
  openSheet: (open: boolean) => void;
  params: Record<string, unknown>;
}

interface Response {
  rows: any[];
  total: number;
}

const CupomSearch: React.FC<SearchFormProps> = ({ onSearch, onClear, openSheet, params }) => {
  const [searchData, setSearchData] = useState<SearchData>({
    code: "",
    description: "",
    sellerId: undefined,
    discountType: undefined,
    active: undefined,
    firstPurchaseOnly: undefined,
    courseId: undefined,
    classId: undefined,
    'validUntil-gte': "",
    'validUntil-lte': "",
    validityRange: "",
  });

  const { data: sellersData, isLoading: isLoadingSellers } = useQuery<
    Response | undefined,
    ApiError
  >({
    queryKey: [`sellers`],
    queryFn: async () => {
      const params = [
        { key: "limit", value: 'all' },
        { key: "active", value: true },
        { key: "isSeller", value: true },
        { key: "order-name", value: "asc" },
      ];
      return get("user", "", params);
    },
  });

  const { data: courses, isLoading: isLoadingCourses } = useQuery<
    Response | undefined,
    ApiError
  >({
    queryKey: [`listCursos`],
    queryFn: async () => {
      const params = [
        { key: "limit", value: 'all' },
        { key: "active", value: true },
        { key: "order-name", value: "asc" },
      ];
      return get("courses", "", params);
    },
  });

  const { data: classesData, isLoading: isLoadingClasses } = useQuery<
    Response | undefined,
    ApiError
  >({
    queryKey: [`listClasses`, searchData.courseId],
    queryFn: async () => {
      const params = [
        { key: "limit", value: 'all' },
        { key: "active", value: true },
        { key: "courseId", value: searchData.courseId },
        { key: "order-name", value: "asc" },
      ];
      return get("classes", "", params);
    },
    enabled: !!searchData.courseId,
  });

  useEffect(() => {
    const { code, description, sellerId, discountType, active, firstPurchaseOnly, courseId, classId } = params as any;
    const gteValue = params['validUntil-gte'] as string || "";
    const lteValue = params['validUntil-lte'] as string || "";
    const rangeValue = gteValue && lteValue ? `${gteValue}|${lteValue}` : "";

    setSearchData({
      code: code || "",
      description: description || "",
      sellerId: sellerId || undefined,
      discountType: discountType || undefined,
      active: active,
      firstPurchaseOnly: firstPurchaseOnly,
      courseId: courseId || undefined,
      classId: classId || undefined,
      'validUntil-gte': gteValue,
      'validUntil-lte': lteValue,
      validityRange: rangeValue,
    });
  }, [params]);

  const handleChange = (name: string, value: string | number | string[] | null) => {
    if (name === 'courseId') {
      if (!value || value === '') {
        setSearchData(prev => ({ ...prev, courseId: undefined, classId: undefined }));
      } else {
        const numValue = typeof value === 'string' ? (value !== '' ? Number(value) : undefined) : value as number;
        setSearchData(prev => ({ ...prev, courseId: numValue, classId: undefined }));
      }
    } else if (name === 'classId' || name === 'sellerId') {
      const numValue = value && value !== '' ? Number(value) : undefined;
      setSearchData(prev => ({ ...prev, [name]: numValue }));
    } else if (name === 'validityRange' && value) {
      // Parse range dates
      const [from, to] = (value as string).split('|');
      setSearchData(prev => ({
        ...prev,
        validityRange: value as string,
        'validUntil-gte': from || '',
        'validUntil-lte': to || ''
      }));
    } else if (name === 'active' || name === 'firstPurchaseOnly') {
      // Convert string to boolean
      const boolValue = value === 'true' ? true : value === 'false' ? false : undefined;
      setSearchData(prev => ({ ...prev, [name]: boolValue }));
    } else {
      setSearchData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filteredData = Object.entries(searchData).reduce((acc, [key, value]) => {
      if (value !== "" && value !== undefined && value !== null && key !== 'validityRange') {
        (acc as any)[key] = value;
      }
      return acc;
    }, {} as SearchData);
    onSearch(filteredData);
    openSheet(false);
  };

  const handleClear = () => {
    setSearchData({
      code: "",
      description: "",
      sellerId: undefined,
      discountType: undefined,
      active: undefined,
      firstPurchaseOnly: undefined,
      courseId: undefined,
      classId: undefined,
      'validUntil-gte': "",
      'validUntil-lte': "",
      validityRange: "",
    });
    onClear();
    openSheet(false);
  };

  const discountTypes = [
    { id: 'percentage', name: 'Porcentagem' },
    { id: 'fixed', name: 'Valor Fixo' },
  ];

  const statusOptions = [
    { id: 'true', name: 'Ativo' },
    { id: 'false', name: 'Inativo' },
  ];

  const firstPurchaseOptions = [
    { id: 'true', name: 'Sim' },
    { id: 'false', name: 'Não' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code">Código</Label>
        <Input
          id="code"
          name="code"
          value={searchData.code}
          onValueChange={handleChange}
          placeholder="Digite o código do cupom"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          name="description"
          value={searchData.description}
          onValueChange={handleChange}
          placeholder="Digite a descrição"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sellerId">Vendedor</Label>
        <Select
          name="sellerId"
          state={searchData.sellerId ? String(searchData.sellerId) : ''}
          onChange={handleChange}
          options={[
            { id: '', name: 'Todos' },
            ...(sellersData?.rows?.map((seller) => ({
              id: seller.id,
              name: seller.name
            })) || [])
          ]}
          isLoading={isLoadingSellers}
          placeholder="Selecione um vendedor"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="discountType">Tipo de Desconto</Label>
        <Select
          name="discountType"
          state={searchData.discountType || ''}
          onChange={handleChange}
          options={[
            { id: '', name: 'Todos' },
            ...discountTypes
          ]}
          placeholder="Selecione o tipo"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="active">Status</Label>
        <Select
          name="active"
          state={searchData.active !== undefined ? String(searchData.active) : ''}
          onChange={handleChange}
          options={[
            { id: '', name: 'Todos' },
            ...statusOptions
          ]}
          placeholder="Selecione o status"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="firstPurchaseOnly">Apenas Primeira Compra</Label>
        <Select
          name="firstPurchaseOnly"
          state={searchData.firstPurchaseOnly !== undefined ? String(searchData.firstPurchaseOnly) : ''}
          onChange={handleChange}
          options={[
            { id: '', name: 'Todos' },
            ...firstPurchaseOptions
          ]}
          placeholder="Selecione"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="courseId">Curso</Label>
        <Select
          name="courseId"
          state={searchData.courseId ? String(searchData.courseId) : ''}
          onChange={handleChange}
          options={[
            { id: '', name: 'Todos' },
            ...(courses?.rows?.map((course) => ({
              id: course.id,
              name: course.name
            })) || [])
          ]}
          isLoading={isLoadingCourses}
          placeholder="Selecione um curso"
        />
      </div>

      {searchData.courseId && (
        <div className="space-y-2">
          <Label htmlFor="classId">Turma</Label>
          <Select
            name="classId"
            state={searchData.classId ? String(searchData.classId) : ''}
            onChange={handleChange}
            options={[
              { id: '', name: 'Todas' },
              ...(classesData?.rows?.map((classItem) => ({
                id: classItem.id,
                name: classItem.name
              })) || [])
            ]}
            isLoading={isLoadingClasses}
            placeholder="Selecione uma turma"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="validityRange">Período de Validade</Label>
        <DatePickerInput
          mode="range"
          name="validityRange"
          value={searchData.validityRange}
          onValueChange={handleChange}
          placeholder="Selecione o período"
          numberOfMonths={2}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1">Buscar</Button>
        <Button type="button" variant="outline" onClick={handleClear} className="flex-1">
          Limpar
        </Button>
      </div>
    </form>
  );
};

export default CupomSearch;