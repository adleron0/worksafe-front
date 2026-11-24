import { createFileRoute, useNavigate } from '@tanstack/react-router'
import useVerify from "@/hooks/use-verify";
import { useState } from "react";
import { listAreasCompany } from "@/services/specific/areaService";
import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/general-interfaces/api.interface";
import { Area } from "./-interfaces/area.interface";
import AreaForm from "./-components/AreaForm";
import AreasSearchForm from "./-components/AreasSearchForm";
import AreaRowActions from "./-components/AreaRowActions";
import { areaColumns } from "./-components/areaColumns";

export const Route = createFileRoute('/_authenticated/inventarios/areas/')({
  component: Areas,
})

const LIMITS = [10, 30, 50, 100, 200];
const INITIAL = { limit: 10, pagination: 0, active: true };

function Areas() {
  const { can, has } = useVerify();
  const navigate = useNavigate();
  const [openSearch, setOpenSearch] = useState(false);
  // undefined = gaveta fechada; null = nova área; Area = edição
  const [formArea, setFormArea] = useState<Area | null | undefined>(undefined);
  const [searchParams, setSearchParams] = useState<Record<string, any>>(INITIAL);

  const handleSearch = async (params: any) => {
    setSearchParams((prev) => ({
      ...prev,
      ...params,
    }));
    await listAreasCompany(params);
  };

  const handleClear = () => {
    setSearchParams(INITIAL);
  };

  interface AreasResponse {
    areas: Area[];
    total: number;
  }

  const { data: areasData, isLoading, isFetching, isError, error, refetch } = useQuery<AreasResponse, ApiError>({
    queryKey: ['listAreasCompany', searchParams],
    queryFn: () => listAreasCompany(searchParams),
  });

  if (!can('view_inventarios') || !has('Confinus')) return null;

  const open = (area: Area) => navigate({ to: `/inventarios/areas/${area.id}` });
  const filterCount = (searchParams.name ? 1 : 0)
    + (Array.isArray(searchParams.createdAt) && searchParams.createdAt.some(Boolean) ? 1 : 0)
    + (searchParams.active !== undefined && searchParams.active !== true ? 1 : 0);

  return (
    <>
      <PageHeader title="Mapa de Área" description="Mapa de Áreas de Espaços Confinados" />

      <ListCard>
        <ListToolbar onOpenFilters={() => setOpenSearch(true)} filterCount={filterCount}>
          <Button onClick={() => setFormArea(null)}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Nova Área</span></Button>
        </ListToolbar>

        <DataTable rows={areasData?.areas} columns={areaColumns} getRowId={(area) => `${area.id}-${area.name}`} ariaLabel="Áreas" minWidth={560}
          loading={isLoading || isFetching} error={isError ? error?.response?.data?.message || "erro desconhecido" : null} onRetry={() => refetch()}
          onRowClick={open}
          rowClassName={(area) => (area.inactiveAt ? "opacity-60" : undefined)}
          actions={(area) => <AreaRowActions area={area} onOpen={open} onEdit={setFormArea} />}
          empty={filterCount > 0
            ? <EmptyState icon="search-x" title="Nenhuma área com esses filtros." action={<Button variant="outline" size="sm" onClick={handleClear}>Limpar filtros</Button>} />
            : <EmptyState title="Nenhuma área ativa encontrada!" action={<Button size="sm" onClick={() => setFormArea(null)}><Icon name="plus" className="w-4 h-4" /> Nova Área</Button>} />} />

        <ListFooter total={areasData?.total ?? 0} page={searchParams.pagination} limit={searchParams.limit} limits={LIMITS}
          onPageChange={(page) => setSearchParams((prev) => ({ ...prev, pagination: page }))} onLimitChange={(limit) => setSearchParams((prev) => ({ ...prev, limit }))} />
      </ListCard>

      <AreasSearchForm onSubmit={handleSearch} onClear={handleClear} params={searchParams} open={openSearch} onOpenChange={setOpenSearch} />
      <AreaForm key={formArea?.id ?? "new"} areaToEdit={formArea ?? undefined} open={formArea !== undefined} onOpenChange={(next) => { if (!next) setFormArea(undefined); }} />
    </>
  );
}
