// Serviços
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useWindowSize from "@/hooks/use-windowSize";
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
import Form from "./UserForm";
import SearchForm from "./UserSearch";
import UserRowActions from "./UserRowActions";
import { userColumns } from "./userColumns";
// Interfaces
import { IEntity } from "../-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

interface UsersListProps {
  title?: string;
  description?: string;
  defaultFilters?: Record<string, any>;
  showCreateButton?: boolean;
  entityName?: string;
  queryKey?: string;
  defaultIsSeller?: boolean;
}

const LIMITS = [10, 30, 50, 100, 200];
// filtros do painel lateral (contam no botão "Filtros")
const FILTER_KEYS = ["active", "cpf", "in-profileId", "createdAt"];

function UsersList({
  title = "Usuários do Sistema",
  description = "Administrar Usuários",
  defaultFilters = {},
  showCreateButton = true,
  entityName = "Usuário",
  queryKey = "listUsuários",
  defaultIsSeller = false
}: UsersListProps) {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<IEntity>();
  const [formType, setFormType] = useState("both");
  const [searchParams, setSearchParams] = useState<Record<string, any>>({
    limit: 10,
    page: 0,
    show: ['profile', 'permissions'],
    'order-active': 'desc',
    'order-name': 'asc',
    ...defaultFilters // Mescla filtros padrão
  });
  const initialFormRef = useRef(searchParams);

  // Define variáveis de entidade
  const entity = {
    name: entityName,
    pluralName: `${entityName}s`,
    model: "user",
    ability: "user",
  }

  interface Response {
    rows: IEntity[];
    total: number;
  }

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<Response | undefined, ApiError>({
    queryKey: [queryKey, searchParams],
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

  const { width } = useWindowSize();

  if (!can(`view_${entity.ability}`)) return null;

  const canCreate = showCreateButton && can(`create_${entity.ability}`);
  const openNew = () => { setFormData(undefined); setFormType("both"); setOpenForm(true); };
  const openEdit = (user: IEntity) => { setFormData(user); setFormType(""); setOpenForm(true); };
  const openPassword = (user: IEntity) => { setFormData(user); setFormType("only"); setOpenForm(true); };
  const isSet = (value: unknown) => value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.every((v) => v === undefined || v === null));
  const filterCount = FILTER_KEYS.filter((key) => isSet(searchParams[key])).length;
  const filtered = filterCount > 0 || !!searchParams['like-name'];

  return (
    <>
      <PageHeader title={title} description={description} />

      <ListCard>
        <ListToolbar search={{ value: searchParams['like-name'] ?? "", onChange: (text) => setSearchParams((prev) => ({ ...prev, 'like-name': text, page: 0 })), placeholder: "Buscar pelo nome" }}
          onOpenFilters={() => setOpenSearch(true)} filterCount={filterCount}>
          {canCreate && <Button onClick={openNew}><Icon name="user-plus" className="w-4 h-4" /> <span className="hidden sm:inline">Novo {entity.name}</span></Button>}
        </ListToolbar>

        <DataTable rows={data?.rows} columns={userColumns} getRowId={(user) => user.id ?? user.email} ariaLabel={entity.pluralName}
          loading={isLoading || isFetching} error={isError ? error?.response?.data?.message || "erro desconhecido" : null} onRetry={() => refetch()}
          rowClassName={(user) => (user.active ? undefined : "opacity-60")}
          actions={(user) => <UserRowActions user={user} onEdit={openEdit} onPassword={openPassword} />}
          empty={filtered
            ? <EmptyState icon="search-x" title={`Nenhum ${entity.name.toLowerCase()} com esses filtros.`} action={<Button variant="outline" size="sm" onClick={handleClear}>Limpar filtros</Button>} />
            : <EmptyState title={`Nenhum ${entity.name.toLowerCase()} encontrado!`} action={canCreate && <Button size="sm" onClick={openNew}><Icon name="user-plus" className="w-4 h-4" /> Novo {entity.name}</Button>} />} />

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
        form={ <SearchForm onSubmit={handleSearch} onClear={handleClear} openSheet={setOpenSearch} params={searchParams}/> }
      />

      {/* Formulário de cadastro */}
      {showCreateButton && (
        <SideForm
          openSheet={openForm}
          setOpenSheet={setOpenForm}
          title={formData
            ? formType === 'only'
              ? `Alterar senha de ${formData.name}`
              : `Editar ${entity.name} ${formData.name}`
            : `Cadastrar ${entity.name}`}
          description={formData
            ? formType === 'only'
              ? `Atenção com a ação a seguir, ela irá alterar a senha do ${entity.name} ${formData.name}.`
              : `Atenção com a ação a seguir, ela irá alterar os dados do ${entity.name} ${formData.name}.`
            : `Por favor, preencha com atenção todas as informações necessárias para cadastrar ${entity.name}.`}
          side={formType === 'only' ? (width && width > 768 ? "right" : "bottom") : "right"}
          form={ <Form openSheet={setOpenForm} formData={formData} onlyPassword={formType} defaultIsSeller={defaultIsSeller}/> }
        />
      )}
    </>
  );
}

export default UsersList;
