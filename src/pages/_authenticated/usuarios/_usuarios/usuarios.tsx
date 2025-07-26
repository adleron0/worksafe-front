import { createFileRoute } from '@tanstack/react-router'
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
import ItemSkeleton from "./-skeletons/ItemSkeleton";
import ItemList from "./-components/UserItem";
import Form from "./-components/UserForm";
import SearchForm from "./-components/UserSearch";
// Interfaces
import { IEntity } from "./-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

export const Route = createFileRoute('/_authenticated/usuarios/_usuarios/usuarios')({
  component: List,
})

function List() {
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
  const entity = {
    name: "Usuário",
    pluralName: "Usuários",
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
        titlePage={`${entity.pluralName} do Sistema`}
        descriptionPage={`Administrar ${entity.pluralName}`}
        entityName={entity.name}
        ability={entity.ability}
        limit={data?.total || 0}
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
        title={`Buscar ${entity.pluralName}`}
        description={`Preencha os campos abaixo para filtrar ${entity.pluralName}.`}
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
            : `Editar ${entity.name} ${formData.name}`
          : `Cadastrar ${entity.name}`}
        description={formData 
          ? formType === 'only' 
            ? `Atenção com a ação a seguir, ela irá alterar a senha do ${entity.name} ${formData.name}.`
            : `Atenção com a ação a seguir, ela irá alterar os dados do ${entity.name} ${formData.name}.`
          : `Por favor, preencha com atenção todas as informações necessárias para cadastrar ${entity.name}.`}
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
              <p>Nenhum usuário encontrado!</p>
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
};