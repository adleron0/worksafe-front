import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState, useCallback } from "react";
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
import SideForm from "@/components/general-components/SideForm";
import { Button } from "@/components/ui/button";
import Form from "./-components/AlunosForm";
import SearchForm from "./-components/AlunosSearch";
import AlunosRowActions from "./-components/AlunosRowActions";
import { alunosColumns } from "./-components/alunosColumns";
import { LIMITS, countFilters } from "../-shared/lista";
// Interfaces
import { IEntity } from "./-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

export const Route = createFileRoute('/_authenticated/treinamentos/_alunos/alunos')({
  component: List,
})

function List() {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [formData] = useState<IEntity>();
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
    name: "Aluno",
    pluralName: "Alunos",
    model: "trainee",
    ability: "treinamentos",
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
        value: searchParams[key as keyof typeof searchParams]
      }));
      return get(entity.model, '', params);
    },
  });

  interface SearchFormData {
    'like-name': string;
    active?: boolean;
    cpf: string;
    'in-customerId'?: number | number[];
    'gte-birthDate'?: string;
    createdAt?: [Date | undefined, Date | undefined];
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

  const handleTextSearch = useCallback((text: string) => {
    setSearchParams(prev => ({
      ...prev,
      'like-name': text || undefined,
      page: 0 // Reset page when searching
    }));
  }, []);

  if (!can(`view_${entity.ability}`)) return null;

  const filterCount = countFilters(searchParams, initialFormRef.current, ['like-name']);
  const filtered = filterCount > 0 || !!searchParams['like-name'];

  return (
    <>
      <PageHeader title={entity.pluralName} description={`Administrar nossos ${entity.pluralName}`} />

      <ListCard>
        <ListToolbar search={{ value: searchParams['like-name'] ?? "", onChange: handleTextSearch, placeholder: "Buscar por nome do aluno..." }}
          onOpenFilters={() => setOpenSearch(true)} filterCount={filterCount} />

        <DataTable rows={data?.rows} columns={alunosColumns} getRowId={(item) => item.id ?? item.cpf} ariaLabel={entity.pluralName}
          loading={isLoading || isFetching} error={isError ? error?.response?.data?.message || "erro desconhecido" : null} onRetry={() => refetch()}
          rowClassName={(item) => (item.inactiveAt ? "opacity-60" : undefined)}
          actions={(item) => <AlunosRowActions item={item} entity={entity} />}
          empty={filtered
            ? <EmptyState icon="search-x" title="Nenhum aluno com esses filtros." action={<Button variant="outline" size="sm" onClick={handleClear}>Limpar filtros</Button>} />
            : <EmptyState title="Nenhum aluno encontrado." />} />

        <ListFooter total={data?.total ?? 0} page={searchParams.page} limit={searchParams.limit} limits={LIMITS}
          onPageChange={(page) => setSearchParams((prev) => ({ ...prev, page }))}
          onLimitChange={(limit) => setSearchParams((prev) => ({ ...prev, limit, page: 0 }))} />
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

      {/* Formulário de cadastro */}
      <SideForm
        openSheet={openForm}
        setOpenSheet={setOpenForm}
        title={formData 
          ? `Editar ${entity.name} ${formData.name}`
          : `Cadastrar ${entity.name}`}
        description={formData 
          ? `Atenção com a ação a seguir, ela irá alterar os dados do ${entity.name} ${formData.name}.`
          : `Por favor, preencha com atenção todas as informações necessárias para cadastrar o ${entity.name}.`}
        side="right"
        form={<Form formData={formData} openSheet={setOpenForm} entity={entity} />}
      />
    </>
  );
};
