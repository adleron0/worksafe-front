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
import { Button } from "@/components/ui/button";
import SideForm from "@/components/general-components/SideForm";
import { comentarioColumns } from "./-components/comentarioColumns";
import ComentarioRowActions from "./-components/ComentarioRowActions";
import Form from "./-components/ComentarioForm";
import SearchForm from "./-components/ComentarioSearch";
import { IComentario } from "./-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { countFilters } from "../-shared/countFilters";

export const Route = createFileRoute('/_authenticated/blog/_comentarios/comentarios')({
  component: List,
})

function List() {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<IComentario>();
  const [searchParams, setSearchParams] = useState<{
    limit: number;
    page: number;
    'order-createdAt': string;
    status?: string;
    'in-postId'?: number | number[];
    'like-content'?: string;
  }>({
    limit: 10,
    page: 0,
    'order-createdAt': 'desc',
  });
  const initialFormRef = useRef(searchParams);

  const entity = {
    name: "Comentário",
    pluralName: "Comentários",
    model: "blog/comments",
    ability: "blog",
  }

  interface Response {
    rows: IComentario[];
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
      params.push({ key: 'show', value: 'visitor,post,replies' });
      return get(entity.model, '', params);
    },
  });

  interface SearchFormData {
    status?: string;
    'in-postId'?: number | number[];
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
      'like-content': text || undefined,
      page: 0
    }));
  }, []);

  if (!can(`view_${entity.ability}`)) return null;

  const filterCount = countFilters(searchParams, ['status', 'in-postId']);
  const hasFilters = filterCount > 0 || !!searchParams['like-content'];
  const columns = comentarioColumns();
  const edit = (item: IComentario) => { setFormData(item); setOpenForm(true); };

  return (
    <>
      <PageHeader title={entity.pluralName} description={`Moderar ${entity.pluralName} do Blog`} />

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
        title={`Moderar ${entity.name}`}
        description={`Visualize e modere o ${entity.name}.`}
        side="right"
        form={<Form formData={formData} openSheet={setOpenForm} entity={entity} />}
      />

      <ListCard>
        <ListToolbar
          search={{ value: searchParams['like-content'] ?? "", onChange: handleTextSearch, placeholder: `Buscar por conteúdo do ${entity.name.toLowerCase()}...` }}
          onOpenFilters={() => setOpenSearch(true)}
          filterCount={filterCount}
        ></ListToolbar>

        <DataTable
          rows={data?.rows}
          columns={columns}
          getRowId={(item) => item.id ?? 0}
          ariaLabel={entity.pluralName}
          minWidth={960}
          loading={isLoading || isFetching}
          error={isError ? error?.response?.data?.message || "erro desconhecido" : null}
          onRetry={() => refetch()}
          actions={(item) => <ComentarioRowActions item={item} entity={entity} onView={edit} />}
          empty={hasFilters
            ? <EmptyState icon="search-x" title="Nenhum comentário encontrado com esses filtros." action={<Button variant="outline" size="sm" onClick={handleClear}>Limpar filtros</Button>} />
            : <EmptyState title="Nenhum comentário recebido." />}
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
