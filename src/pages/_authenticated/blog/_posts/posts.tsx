import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRef, useState, useCallback } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import Icon from "@/components/general-components/Icon";
import SideForm from "@/components/general-components/SideForm";
import { Button } from "@/components/ui/button";
import { postColumns } from "./-components/postColumns";
import PostRowActions from "./-components/PostRowActions";
import { postEntity } from "./-interfaces/entity.interface";
import SearchForm from "./-components/PostSearch";
import { IPost } from "./-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { countFilters } from "../-shared/countFilters";

export const Route = createFileRoute('/_authenticated/blog/_posts/posts')({
  component: List,
})

function List() {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const navigate = useNavigate();
  // Ordenação rápida: "campo:asc" | "campo:desc"; vazio = padrão (mais recentes primeiro)
  const [order, setOrder] = useState("");
  const [searchParams, setSearchParams] = useState<{
    limit: number;
    page: number;
    'like-title'?: string;
    status?: string;
    'in-categoryId'?: number | number[];
    featured?: boolean;
  }>({
    limit: 10,
    page: 0,
  });
  const initialFormRef = useRef(searchParams);

  const entity = postEntity;

  interface Response {
    rows: IPost[];
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
    queryKey: [`list${entity.pluralName}`, searchParams, order],
    // ao reordenar/paginar, a lista atual fica na tela até chegar a nova (o cabeçalho com as setinhas não some)
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params: { key: string; value: unknown }[] = Object.keys(searchParams).map((key) => ({
        key,
        value: searchParams[key as keyof typeof searchParams]
      }));
      const [field, dir] = order ? order.split(":") : ["createdAt", "desc"];
      params.push({ key: `order-${field}`, value: dir });
      // empate (ex.: mesmo número de visualizações): mais recente primeiro, ordem estável
      if (field !== "createdAt") params.push({ key: "order-createdAt", value: "desc" });
      // Adiciona os relacionamentos
      params.push({ key: 'show', value: '[author,category,tags,_count]' });
      return get(entity.model, '', params);
    },
  });

  interface SearchFormData {
    'like-title': string;
    status?: string;
    'in-categoryId'?: number | number[];
    featured?: boolean;
  }

  const handleSearch = async (params: SearchFormData) => {
    setSearchParams((prev) => ({
      ...prev,
      ...params,
    }));
  };

  const handleClear = () => {
    setSearchParams(initialFormRef.current);
    setOrder("");
  };

  const handleSort = (next: string) => {
    setOrder(next);
    setSearchParams((prev) => ({ ...prev, page: 0 }));
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
      'like-title': text || undefined,
      page: 0
    }));
  }, []);

  if (!can(`view_${entity.ability}`)) return null;

  const filterCount = countFilters(searchParams, ['status', 'in-categoryId', 'featured', 'createdAt']);
  const hasFilters = filterCount > 0 || !!searchParams['like-title'];
  const columns = postColumns();
  const openNew = () => navigate({ to: "/blog/posts/novo" });
  const edit = (item: IPost) => navigate({ to: "/blog/posts/$postId", params: { postId: String(item.id) } });

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

      <ListCard>
        <ListToolbar
          search={{ value: searchParams['like-title'] ?? "", onChange: handleTextSearch, placeholder: `Buscar por título do ${entity.name.toLowerCase()}...` }}
          onOpenFilters={() => setOpenSearch(true)}
          filterCount={filterCount}
        >
          {can(`create_${entity.ability}`) && (
            <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Novo post</span></Button>
          )}
        </ListToolbar>

        <DataTable
          rows={data?.rows}
          columns={columns}
          getRowId={(item) => item.id ?? item.slug}
          ariaLabel={entity.pluralName}
          minWidth={960}
          order={order}
          onSort={handleSort}
          loading={isLoading || isFetching}
          error={isError ? error?.response?.data?.message || "erro desconhecido" : null}
          onRetry={() => refetch()}
          actions={(item) => <PostRowActions item={item} entity={entity} onEdit={edit} />}
          empty={hasFilters
            ? <EmptyState icon="search-x" title={`Nenhum ${entity.name.toLowerCase()} encontrado com esses filtros.`} action={<Button variant="outline" size="sm" onClick={handleClear}>Limpar filtros</Button>} />
            : <EmptyState title={`Nenhum ${entity.name.toLowerCase()} cadastrado.`} action={can(`create_${entity.ability}`) && <Button size="sm" onClick={openNew}><Icon name="plus" className="w-4 h-4" /> Novo post</Button>} />}
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
