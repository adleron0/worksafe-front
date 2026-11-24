import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useRef, useState } from "react";
// Serviços
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import Dialog from "@/components/general-components/Dialog";
// Template Page list-form
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import Icon from "@/components/general-components/Icon";
import { Button } from "@/components/ui/button";
import SideForm from "@/components/general-components/SideForm";
import { siteProductsColumns } from "./-components/siteProductsColumns";
import SiteItemRowActions from "../-shared/SiteItemRowActions";
import { countFilters } from "../-shared/countFilters";
import { siteProductsEntity } from "./-interfaces/entity.interface";
import SearchForm from "./-components/SiteProductsSeach";
import SiteProductsImagesList from "./-produtos-imagens/produtos-imagens";
// Interfaces
import { IEntity } from "@/pages/_authenticated/site/_produtos/-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

export const Route = createFileRoute('/_authenticated/site/_produtos/produtos')({
  component: List,
})

function List() {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const navigate = useNavigate();
  const [openImageModal, setOpenImageModal] = useState(false);
  const [formData, setFormData] = useState<IEntity>();
  const [searchParams, setSearchParams] = useState<{
    limit: number;
    page: number;
    'order-name': string;
    'like-name'?: string;
  }>({
    limit: 10,
    page: 0,
    'order-name': 'asc',
  });
  const initialFormRef = useRef(searchParams);

  // Define variáveis de entidade
  const entity = siteProductsEntity;

  interface Response {
    rows: IEntity[];
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
      params.push({ key: 'show', value: 'category,brand' });
      return get(entity.model, '', params);
    },
  });

  const handleSearch = async (params: {
    name?: string;
    active?: boolean;
    createdAt?: [Date | undefined, Date | undefined];
  }) => {
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
    setSearchParams((prev) => ({ ...prev, 'like-name': text || undefined, page: 0 }));
  }, []);

  if (!can(`view_${entity.ability}`)) return null;

  const filterCount = countFilters(searchParams, ['active', 'createdAt']);
  const hasFilters = filterCount > 0 || !!searchParams['like-name'];
  const columns = siteProductsColumns();
  const openNew = () => navigate({ to: "/site/produtos/novo" });
  const edit = (item: IEntity) => navigate({ to: "/site/produtos/$productId", params: { productId: String(item.id) } });
  const openImages = (item: IEntity) => { setFormData(item); setOpenImageModal(true); };

  return (
    <>
      <PageHeader title={entity.pluralName} description={`Administrar nossos ${entity.pluralName}`} />

      {/* Busca avançada */}
      <SideForm
        openSheet={openSearch}
        setOpenSheet={setOpenSearch}
        title={`Buscar ${entity.pluralName}`}
        description={`Preencha os campos abaixo para filtrar ${entity.pluralName}.`}
        side="left"
        form={ <SearchForm onSubmit={handleSearch} onClear={handleClear} openSheet={setOpenSearch} params={searchParams} /> }
      />

      {/* Listagem de items */}
      <ListCard>
        <ListToolbar
          search={{ value: searchParams['like-name'] ?? "", onChange: handleTextSearch, placeholder: "Buscar pelo nome..." }}
          onOpenFilters={() => setOpenSearch(true)}
          filterCount={filterCount}
        >
          {can(`create_${entity.ability}`) && (
            <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Novo produto</span></Button>
          )}
        </ListToolbar>

        <DataTable
          rows={data?.rows}
          columns={columns}
          getRowId={(item) => item.id ?? item.name}
          ariaLabel={entity.pluralName}
          minWidth={1040}
          loading={isLoading || isFetching}
          error={isError ? error?.response?.data?.message || "erro desconhecido" : null}
          onRetry={() => refetch()}
          actions={(item) => <SiteItemRowActions item={item} entity={entity} onEdit={edit} onImages={openImages} />}
          empty={hasFilters
            ? <EmptyState icon="search-x" title="Nenhum produto encontrado com esses filtros." action={<Button variant="outline" size="sm" onClick={handleClear}>Limpar filtros</Button>} />
            : <EmptyState title="Nenhum produto cadastrado." action={can(`create_${entity.ability}`) && <Button size="sm" onClick={openNew}><Icon name="plus" className="w-4 h-4" /> Novo produto</Button>} />}
        />

        <ListFooter
          total={data?.total ?? 0}
          page={searchParams.page}
          limit={searchParams.limit}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </ListCard>

      {/* Imagens do produto */}
      <Dialog 
        open={openImageModal}
        onOpenChange={setOpenImageModal}
        showBttn={false}
        showHeader={true}
        title={`Imagens do ${entity.name} ${formData?.name}`}
        description="Gestão de imagens do produto."
      >
        <SiteProductsImagesList productId={formData?.id || 0} />
      </Dialog>
    </>
  );
};
