// Serviços
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useWindowSize from "@/hooks/use-windowSize";
import useVerify from "@/hooks/use-verify";
import Pagination from "@/components/general-components/Pagination";
// Template Page
import HeaderLists from "@/components/general-components/HeaderLists";
import SideForm from "@/components/general-components/SideForm";
import ItemSkeleton from "../-skeletons/ItemSkeleton";
import ItemList from "./UserItem";
import Form from "./UserForm";
import SearchForm from "./UserSearch";
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
  const [searchParams, setSearchParams] = useState({
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

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [queryKey, searchParams],
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

  const handleLimitChange = (name: string, value: string | number) => {
    setSearchParams((prev) => ({ ...prev, [name]: value }));
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => ({ ...prev, page }));
  };

  const totalPages = data ? Math.ceil(data.total / searchParams.limit) : 0;

  const skeletons = Array(5).fill(null);
  const { width } = useWindowSize();

  if (!can(`view_${entity.ability}`)) return null;

  return (
    <>
      <HeaderLists
        titlePage={title}
        descriptionPage={description}
        entityName={entity.name}
        ability={showCreateButton ? entity.ability : undefined}
        limit={data?.total || 0}
        searchParams={searchParams}
        onlimitChange={handleLimitChange}
        openSearch={setOpenSearch}
        openForm={showCreateButton ? setOpenForm : undefined}
        setFormData={showCreateButton ? setFormData : undefined}
        setFormType={showCreateButton ? setFormType : undefined}
        iconForm="user-plus"
      />

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

      {/* Listagem de items */}
      <div className="space-y-2 mt-4">
        {isLoading
          ? skeletons.map((_, i) => <ItemSkeleton key={i} index={i} />)
          : isError
          ? <div className="w-full flex justify-center items-center font-medium text-destructive py-4 rounded border border-destructive">
              <p>Erro: {error?.response?.data?.message}</p>
            </div>
          : data?.rows && data.rows.length > 0
          ? data.rows.map((user: IEntity, i: number) => (
              <ItemList
                key={user.id}
                user={user}
                index={i}
                setFormData={setFormData}
                setFormType={setFormType}
                setOpenForm={setOpenForm}
              />
            ))
          : (
            <div className="w-full flex justify-center items-center font-medium text-primary py-4 rounded border border-primary">
              <p>Nenhum {entity.name.toLowerCase()} encontrado!</p>
            </div>
          )
        }
      </div>

      {/* Paginação */}
      <div className="mt-4">
        {totalPages >= 1 && (
            <Pagination
              totalItems={data?.total || 0}
              itemsPerPage={searchParams.limit}
              currentPage={searchParams.page}
              onPageChange={handlePageChange}
              maxVisiblePages={5}
            />
          )}
      </div>
    </>
  );
}

export default UsersList;