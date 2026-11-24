import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useRef, useState } from "react";
// Serviços
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
// Template Page list-form
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import Icon from "@/components/general-components/Icon";
import { Button } from "@/components/ui/button";
import SideForm from "@/components/general-components/SideForm";
import { siteServicesColumns } from "./-components/siteServicesColumns";
import SiteItemRowActions from "../-shared/SiteItemRowActions";
import { countFilters } from "../-shared/countFilters";
import Form from "./-components/SiteServicesForm";
import SearchForm from "./-components/SiteServicesSeach";
// Interfaces
import { IEntity } from "./-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

export const Route = createFileRoute('/_authenticated/site/_servicos/servicos')({
  component: List,
})

function List() {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const [openForm, setOpenForm] = useState(false);
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
  const entity = {
    name: "Serviços do Site",
    pluralName: "Serviços do Site",
    model: "site-services",
    ability: "servicos_site",
  }

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
      return get(entity.model, '', params);
    },
  });

  const handleSearch = async (params: any) => {
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
  const columns = siteServicesColumns();
  const openNew = () => { setFormData(undefined); setOpenForm(true); };
  const edit = (item: IEntity) => { setFormData(item); setOpenForm(true); };

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

      {/* Formulário de cadastro */}
      <SideForm
        openSheet={openForm}
        setOpenSheet={setOpenForm}
        title={formData 
          ? `Editar ${entity.name} ${formData.name}`
          : `Cadastrar ${entity.name}`}
        description={formData 
          ? `Atenção com a ação a seguir, ela irá alterar os dados do ${entity.name} ${formData.name}.`
          : `Por favor, preencha com atenção todas as informações necessárias para cadastrar ${entity.name}.`}
        side="right"
        form={ <Form formData={formData} openSheet={setOpenForm} entity={entity} /> }
      />

      {/* Listagem de items */}
      <ListCard>
        <ListToolbar
          search={{ value: searchParams['like-name'] ?? "", onChange: handleTextSearch, placeholder: "Buscar pelo nome..." }}
          onOpenFilters={() => setOpenSearch(true)}
          filterCount={filterCount}
        >
          {can(`create_${entity.ability}`) && (
            <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Novo serviço</span></Button>
          )}
        </ListToolbar>

        <DataTable
          rows={data?.rows}
          columns={columns}
          getRowId={(item) => item.id ?? item.name}
          ariaLabel={entity.pluralName}
          minWidth={800}
          loading={isLoading || isFetching}
          error={isError ? error?.response?.data?.message || "erro desconhecido" : null}
          onRetry={() => refetch()}
          actions={(item) => <SiteItemRowActions item={item} entity={entity} onEdit={edit} />}
          empty={hasFilters
            ? <EmptyState icon="search-x" title="Nenhum serviço encontrado com esses filtros." action={<Button variant="outline" size="sm" onClick={handleClear}>Limpar filtros</Button>} />
            : <EmptyState title="Nenhum serviço cadastrado." action={can(`create_${entity.ability}`) && <Button size="sm" onClick={openNew}><Icon name="plus" className="w-4 h-4" /> Novo serviço</Button>} />}
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
};
