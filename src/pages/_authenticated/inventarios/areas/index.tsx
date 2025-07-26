import { createFileRoute } from '@tanstack/react-router'
import useVerify from "@/hooks/use-verify";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Pagination from "@/components/general-components/Pagination";
import { listAreasCompany } from "@/services/areaService";
import { useQuery } from "@tanstack/react-query";
import AreaItemSkeleton from "./-skeletons/areaItemSkeleton";
import { ApiError } from "@/general-interfaces/api.interface";
import { Area } from "./-interfaces/area.interface";
import AreaItem from "./-components/AreaItem";
import AreaForm from "./-components/AreaForm";
import AreasSearchForm from "./-components/AreasSearchForm";

export const Route = createFileRoute('/_authenticated/inventarios/areas/')({
  component: Areas,
})

function Areas() {
  const { can, has } = useVerify();
  const [searchParams, setSearchParams] = useState({
    limit: 10,
    pagination: 0,
    active: true,
  });


  const handleSearch = async (params: any) => {
    setSearchParams((prev) => ({
      ...prev,
      ...params,
    }));
    await listAreasCompany(params);
  };

  const handleClear = () => {
    setSearchParams({
      limit: 10,
      pagination: 0,
      active: true,
    });
  };

  interface AreasResponse {
    areas: Area[];
    total: number;
  }

  const { data: areasData, isLoading, isError, error } = useQuery<AreasResponse, ApiError>({
    queryKey: ['listAreasCompany', searchParams],
    queryFn: () => listAreasCompany(searchParams),
  });

  const handleLimitChange = (name: string, value: string | number) => {
    setSearchParams((prev) => ({ ...prev, [name]: value }));
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => ({ ...prev, pagination: page }));
  };

  const totalPages = areasData ? Math.ceil(areasData.total / searchParams.limit) : 0;

  const skeletons = Array(3).fill(null);
    
  if (!can('view_inventarios') || !has('Confinus')) return null;

  return (
    <>
      <div className="flex flex-col md:flex-row mb-4 items-start justify-between md:items-center">
        <div>
          <h1 className="text-xl font-bold">Mapa de Área</h1>
          <span className="text-gray-600 dark:text-gray-100">Mapa de Áreas de Espaços Confinados</span>
        </div>
      </div>

      <div className="flex justify-between items-center my-4">
      <div className="flex justify-start items-center gap-2">
          <div className="flex items-baseline gap-2">
            <Label htmlFor="limit">Itens</Label>
            <Select
              onValueChange={(value) => handleLimitChange("limit", Number(value))}
              value={searchParams.limit.toString()}
              
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value={`${areasData?.total || 0}`}>{areasData?.total || 0}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AreasSearchForm onSubmit={handleSearch} onClear={handleClear} params={searchParams} />
        </div>
        
        <AreaForm />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
        {isLoading
          ? skeletons.map((_, i) => <AreaItemSkeleton key={i} />)
          : isError
          ? <p className="px-2 py-4 border border-destructive rounded-md">Erro: {error?.response?.data?.message}</p>
          : areasData?.areas && areasData.areas.length > 0 
          ? areasData.areas.map((area: Area) => (
              <AreaItem key={`${area.id}-${area.name}`} area={area} />
            ))
          : <p className="px-2 py-4 border border-primary/30 text-primary rounded-md">Nenhuma área ativa encontrada!</p>
        }
      </div>
      <div className="mt-4">
        {totalPages >= 1 && (
            <Pagination
              totalItems={areasData?.total || 0}
              itemsPerPage={searchParams.limit}
              currentPage={searchParams.pagination}
              onPageChange={handlePageChange}
              maxVisiblePages={5}
            />
          )}
      </div>
    </>
  );
};
