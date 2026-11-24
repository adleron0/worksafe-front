import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import Icon from "@/components/general-components/Icon";
import { Button } from "@/components/ui/button";
import SideForm from "@/components/general-components/SideForm";
import { categoriaColumns } from "./-components/categoriaColumns";
import ActiveRowActions from "../-shared/ActiveRowActions";
import Form from "./-components/CategoriaForm";
import SearchForm from "./-components/CategoriaSearch";
import { ICategoria } from "./-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { countFilters } from "../-shared/countFilters";

export const Route = createFileRoute('/_authenticated/blog/_categorias/categorias')({
  component: List,
})

function List() {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<ICategoria>();
  const [searchParams, setSearchParams] = useState<{
    limit: number;
    page: number;
    'order-name': string;
    'like-name'?: string;
    active?: boolean;
  }>({
    limit: 10,
    page: 0,
    'order-name': 'asc',
  });
  const initialFormRef = useRef(searchParams);

  const entity = {
    name: "Categoria",
    pluralName: "Categorias",
    model: "blog/categories",
    ability: "blog",
  }

  interface Response {
    rows: ICategoria[];
    total: number;
  }

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`list${entity.pluralName}`, searchParams],
    queryFn: async () => {
      const params = Object.keys(searchParams).map((key) => ({
        key,
        value: searchParams[key as keyof typeof searchParams]
      }));
      params.push({ key: 'show', value: '_count' });
      return get(entity.model, '', params);
    },
  });

  interface SearchFormData {
    'like-name': string;
    active?: boolean;
  }

  const handleSearch = async (params: SearchFormData) => {
    setSearchParams((prev) => ({
      ...prev,
      ...params,
    }));
  };

  const handleClear = () => {
    setSearchParams(initialFormRef.current);
  };

  const handleLimitChange = (limit: number) => {
    setSearchParams((prev) => ({ ...prev, limit, page: 0 }));
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => ({ ...prev, page }));
  };

  const handleTextSearch = useCallback((text: string) => {
    setSearchParams(prev => ({
      ...prev,
      'like-name': text || undefined,
      page: 0
    }));
  }, []);

  if (!can(`view_${entity.ability}`)) return null;

  const filterCount = countFilters(searchParams, ['active']);
  const hasFilters = filterCount > 0 || !!searchParams['like-name'];
  const columns = categoriaColumns();
  const openNew = () => { setFormData(undefined); setOpenForm(true); };
  const edit = (item: ICategoria) => { setFormData(item); setOpenForm(true); };

  return (
    <>
      <PageHeader title={entity.pluralName} description={`Administrar ${entity.pluralName} do Blog`} />

      <SideForm
        openSheet={openSearch}
        setOpenSheet={setOpenSearch}
        title={`Buscar ${entity.pluralName}`}
        description={`Preencha os campos abaixo para filtrar ${entity.pluralName}.`}
        side="left"
        form={<SearchForm onSubmit={handleSearch} onClear={handleClear} openSheet={setOpenSearch} params={searchParams} />}
      />

      <SideForm
        openSheet={openForm}
        setOpenSheet={setOpenForm}
        title={formData
          ? `Editar ${entity.name} ${formData.name}`
          : `Cadastrar ${entity.name}`}
        description={formData
          ? `Atenção com a ação a seguir, ela irá alterar os dados da ${entity.name} ${formData.name}.`
          : `Por favor, preencha com atenção todas as informações necessárias para cadastrar a ${entity.name}.`}
        side="right"
        form={<Form formData={formData} openSheet={setOpenForm} entity={entity} />}
      />

      <ListCard>
        <ListToolbar
          search={{ value: searchParams['like-name'] ?? "", onChange: handleTextSearch, placeholder: `Buscar por nome da ${entity.name.toLowerCase()}...` }}
          onOpenFilters={() => setOpenSearch(true)}
          filterCount={filterCount}
        >
          {can(`create_${entity.ability}`) && (
            <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Nova categoria</span></Button>
          )}
        </ListToolbar>

        <DataTable
          rows={data?.rows}
          columns={columns}
          getRowId={(item) => item.id ?? 0}
          ariaLabel={entity.pluralName}
          minWidth={720}
          loading={isLoading || isFetching}
          error={isError ? error?.response?.data?.message || "erro desconhecido" : null}
          onRetry={() => refetch()}
          actions={(item) => <ActiveRowActions item={item} entity={entity} onEdit={edit} />}
          empty={hasFilters
            ? <EmptyState icon="search-x" title="Nenhuma categoria encontrada com esses filtros." action={<Button variant="outline" size="sm" onClick={handleClear}>Limpar filtros</Button>} />
            : <EmptyState title="Nenhuma categoria cadastrada." action={can(`create_${entity.ability}`) && <Button size="sm" onClick={openNew}><Icon name="plus" className="w-4 h-4" /> Nova categoria</Button>} />}
        />

        <ListFooter
          total={data?.total ?? 0}
          page={searchParams.page}
          limit={searchParams.limit}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </ListCard>
    </>
  );
}
