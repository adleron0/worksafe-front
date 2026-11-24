import { createFileRoute, useNavigate } from '@tanstack/react-router'
// Serviços
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
// Template Page
import SideForm from "@/components/general-components/SideForm";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import { Button } from "@/components/ui/button";
import SearchForm from "./-components/CustomerSeach";
import CustomerRowActions from "./-components/CustomerRowActions";
import { customerColumns } from "./-components/customerColumns";
// Interfaces
import { IEntity } from "./-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

export const Route = createFileRoute('/_authenticated/clientes/')({
  component: List,
})

const LIMITS = [10, 30, 50, 100, 200];
// filtros do painel lateral (contam no botão "Filtros")
const FILTER_KEYS = ["active", "cnpj", "createdAt"];

function List() {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState<Record<string, any>>({
    limit: 10,
    page: 0,
    show: ['state', 'city', 'rank'],
    'order-active': 'desc',
    'order-name': 'asc',
  });
  const initialFormRef = useRef(searchParams);

  // Define variáveis de entidade
  const entity = {
    name: "Cliente",
    pluralName: "Clientes",
    model: "customer",
    ability: "clientes",
  }

  interface Response {
    rows: IEntity[];
    total: number;
  }

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<Response | undefined, ApiError>({
    queryKey: [`list${entity.pluralName}`, searchParams],
    queryFn: async () => {
      const params = Object.keys(searchParams).map((key) => ({
        key,
        value: searchParams[key]
      }));
      return get(entity.model, '', params);
    },
  });

  const handleSearch = async (params: any) => {
    setSearchParams((prev) => ({ ...prev, ...params }));
  };

  const handleClear = () => {
    setSearchParams(initialFormRef.current);
  };

  if (!can(`view_${entity.ability}`)) return null;

  const canCreate = can(`create_${entity.ability}`);
  const openNew = () => navigate({ to: "/clientes/$customerId", params: { customerId: "novo" } });
  const open = (item: IEntity) => navigate({ to: "/clientes/$customerId", params: { customerId: String(item.id) } });
  const isSet = (value: unknown) => value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.every((v) => v === undefined || v === null));
  const filterCount = FILTER_KEYS.filter((key) => isSet(searchParams[key])).length;
  const filtered = filterCount > 0 || !!searchParams['like-name'];

  return (
    <>
      <PageHeader title={entity.pluralName} description={`Administrar nossos ${entity.pluralName}`} />

      <ListCard>
        <ListToolbar search={{ value: searchParams['like-name'] ?? "", onChange: (text) => setSearchParams((prev) => ({ ...prev, 'like-name': text, page: 0 })), placeholder: "Buscar pelo nome" }}
          onOpenFilters={() => setOpenSearch(true)} filterCount={filterCount}>
          {canCreate && <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Novo {entity.name}</span></Button>}
        </ListToolbar>

        <DataTable rows={data?.rows} columns={customerColumns} getRowId={(item) => item.id ?? item.cnpj} ariaLabel={entity.pluralName}
          loading={isLoading || isFetching} error={isError ? error?.response?.data?.message || "erro desconhecido" : null} onRetry={() => refetch()}
          onRowClick={open}
          rowClassName={(item) => (item.active ? undefined : "opacity-60")}
          actions={(item) => <CustomerRowActions item={item} entity={entity} onOpen={open} />}
          empty={filtered
            ? <EmptyState icon="search-x" title="Nenhum cliente com esses filtros." action={<Button variant="outline" size="sm" onClick={handleClear}>Limpar filtros</Button>} />
            : <EmptyState title="Nenhum cliente encontrado!" action={canCreate && <Button size="sm" onClick={openNew}><Icon name="plus" className="w-4 h-4" /> Novo {entity.name}</Button>} />} />

        <ListFooter total={data?.total ?? 0} page={searchParams.page} limit={searchParams.limit} limits={LIMITS}
          onPageChange={(page) => setSearchParams((prev) => ({ ...prev, page }))} onLimitChange={(limit) => setSearchParams((prev) => ({ ...prev, limit }))} />
      </ListCard>

      {/* Busca avançada */}
      <SideForm
        openSheet={openSearch}
        setOpenSheet={setOpenSearch}
        title={`Buscar ${entity.pluralName}`}
        description={`Preencha os campos abaixo para filtrar ${entity.pluralName}.`}
        side="left"
        form={ <SearchForm onSubmit={handleSearch} onClear={handleClear} openSheet={setOpenSearch} params={searchParams} /> }
      />
    </>
  );
};
