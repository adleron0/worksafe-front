import { useRef, useState } from "react";
// Serviços
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useWindowSize from "@/hooks/use-windowSize";
import useVerify from "@/hooks/use-verify";
import Pagination from "@/components/general-components/Pagination";
// Template Page list-form
import HeaderLists from "@/components/general-components/HeaderLists";
import SideForm from "@/components/general-components/SideForm";
import ItemSkeleton from "./Skeletons/ItemSkeleton";
import ItemList from "./UserItem";
import Form from "./UserForm";
import SearchForm from "./UserSeach";
// Interfaces
import { IEntity } from "./interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

const Users = () => {
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
  });
  const initialFormRef = useRef(searchParams);

  // Define variáveis de entidade
  const entityName = "Usuário";
  const entityPluralName = "Usuários";
  const ability = "user";

  interface UsersResponse {
    rows: IEntity[];
    total: number;
  }

  const { 
    data: usersData, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useQuery<UsersResponse | undefined, ApiError>({
    queryKey: ['listCompanyUsers', searchParams],
    queryFn: async () => {
      const params = Object.keys(searchParams).map((key) => ({
        key,
        value: searchParams[key as keyof typeof searchParams]
      }));
      return get('user', '', params);
    },
  });

  const handleSearch = async (params: any) => {
    setSearchParams((prev) => ({
      ...prev,
      ...params,
    }));
    refetch();
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

  const totalPages = usersData ? Math.ceil(usersData.total / searchParams.limit) : 0;

  const skeletons = Array(5).fill(null);
  const { width } = useWindowSize();

  if (!can('view_user')) return null;

  return (
    <>
      <HeaderLists
        titlePage={`${entityPluralName} do Sistema`}
        descriptionPage={`Administrar ${entityPluralName}`}
        entityName={entityName}
        ability={ability}
        limit={usersData?.total || 0}
        searchParams={searchParams}
        onlimitChange={handleLimitChange}
        openSearch={setOpenSearch}
        openForm={setOpenForm}
        setFormData={setFormData} 
        setFormType={setFormType}
        iconForm="user-plus"
      />

      {/* Busca avançada */}
      <SideForm
        openSheet={openSearch}
        setOpenSheet={setOpenSearch}
        title={`Buscar ${entityPluralName}`}
        description={`Preencha os campos abaixo para filtrar ${entityPluralName}.`}
        side="left"
        form={ <SearchForm onSubmit={handleSearch} onClear={handleClear} openSheet={setOpenSearch} params={searchParams}/> }
      />

      {/* Formulário de cadastro */}
      <SideForm
        openSheet={openForm}
        setOpenSheet={setOpenForm}
        title={formData 
          ? formType === 'only' 
            ? `Alterar senha de ${formData.name}` 
            : `Editar ${entityName} ${formData.name}`
          : `Cadastrar ${entityName}`}
        description={formData 
          ? formType === 'only' 
            ? `Atenção com a ação a seguir, ela irá alterar a senha do ${entityName} ${formData.name}.`
            : `Atenção com a ação a seguir, ela irá alterar os dados do ${entityName} ${formData.name}.`
          : `Por favor, preencha com atenção todas as informações necessárias para cadastrar ${entityName}.`}
        side={formType === 'only' ? (width && width > 768 ? "right" : "bottom") : "right"}
        form={ <Form openSheet={setOpenForm} formData={formData} onlyPassword={formType}/> }
      />

      {/* Listagem de items */}
      <div className="space-y-2 mt-4">
        {isLoading
          ? skeletons.map((_, i) => <ItemSkeleton key={i} index={i} />)
          : isError
          ? <div className="w-full flex justify-center items-center font-medium text-destructive py-4 rounded border border-destructive">
              <p>Erro: {error?.response?.data?.message}</p>
            </div>
          : usersData?.rows && usersData.rows.length > 0 
          ? usersData.rows.map((user: IEntity, i: number) => (
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
              <p>Nenhum usuário encontrado!</p>
            </div>
          )
        }
      </div>

      {/* Paginação */}
      <div className="mt-4">
        {totalPages >= 1 && (
            <Pagination
              totalItems={usersData?.total || 0}
              itemsPerPage={searchParams.limit}
              currentPage={searchParams.page}
              onPageChange={handlePageChange}
              maxVisiblePages={5}
            />
          )}
      </div>
    </>
  );
};

export default Users;
