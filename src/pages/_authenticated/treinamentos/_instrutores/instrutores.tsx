import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from "react";
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
import Icon from "@/components/general-components/Icon";
import { Button } from "@/components/ui/button";
import Form from "./-components/InstructorsForm";
import SearchForm from "./-components/InstructorsSearch";
import SignatureForm from "./-components/InstructorsFormSignature";
import InstructorsRowActions from "./-components/InstructorsRowActions";
import { instructorsColumns } from "./-components/instructorsColumns";
import { LIMITS, countFilters } from "../-shared/lista";
// Interfaces
import { IEntity } from "./-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

export const Route = createFileRoute('/_authenticated/treinamentos/_instrutores/instrutores')({
  component: List,
})

function List() {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [openSignatureForm, setOpenSignatureForm] = useState(false);
  const [formData, setFormData] = useState<IEntity>();
  const [searchParams, setSearchParams] = useState<Record<string, any>>({
    limit: 10,
    page: 0,
    'order-name': 'asc',
  });
  const initialFormRef = useRef(searchParams);

  // Define variáveis de entidade
  const entity = {
    name: "Instrutor",
    pluralName: "Instrutores",
    model: "instructors",
    ability: "instrutores",
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

  const handleSearch = async (params: any) => {
    setSearchParams((prev) => ({
      ...prev,
      ...params,
    }));
  };

  const handleClear = () => {
    setSearchParams(initialFormRef.current);
  };

  if (!can(`view_${entity.ability}`)) return null;

  const canCreate = can(`create_${entity.ability}`);
  const canUpdate = can(`update_${entity.ability}`);
  const openNew = () => { setFormData(undefined); setOpenForm(true); };
  const openEdit = (item: IEntity) => { setFormData(item); setOpenForm(true); };
  const openSignature = (item: IEntity) => { setFormData(item); setOpenSignatureForm(true); };
  const filterCount = countFilters(searchParams, initialFormRef.current);

  return (
    <>
      <PageHeader title={entity.pluralName} description={`Administrar nossos ${entity.pluralName}`} />

      <ListCard>
        <ListToolbar onOpenFilters={() => setOpenSearch(true)} filterCount={filterCount}>
          {canCreate && <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Novo {entity.name}</span></Button>}
        </ListToolbar>

        <DataTable rows={data?.rows} columns={instructorsColumns} getRowId={(item) => item.id ?? item.cpf} ariaLabel={entity.pluralName}
          loading={isLoading || isFetching} error={isError ? error?.response?.data?.message || "erro desconhecido" : null} onRetry={() => refetch()}
          onRowClick={canUpdate ? openEdit : undefined}
          rowClassName={(item) => (!item.active ? "opacity-60" : undefined)}
          actions={(item) => <InstructorsRowActions item={item} entity={entity} onEdit={openEdit} onSignature={openSignature} />}
          empty={filterCount > 0
            ? <EmptyState icon="search-x" title="Nenhum instrutor com esses filtros." action={<Button variant="outline" size="sm" onClick={handleClear}>Limpar filtros</Button>} />
            : <EmptyState title="Nenhum instrutor encontrado." action={canCreate && <Button size="sm" onClick={openNew}><Icon name="plus" className="w-4 h-4" /> Novo {entity.name}</Button>} />} />

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
          : `Por favor, preencha com atenção todas as informações necessárias para cadastrar ${entity.name}.`}
        side="right"
        form={ <Form formData={formData} openSheet={setOpenForm} entity={entity} /> }
      />

      {/* Formulário de assinatura */}
      <SideForm
        openSheet={openSignatureForm}
        setOpenSheet={setOpenSignatureForm}
        title={`Assinatura do ${entity.name}`}
        description={`Carregue a assinatura do ${entity.name} ${formData?.name}.`}
        side="right"
        form={ <SignatureForm formData={formData} openSheet={setOpenSignatureForm} entity={entity} /> }
      />
    </>
  );
};
