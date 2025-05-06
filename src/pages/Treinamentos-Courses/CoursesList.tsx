import { useRef, useState } from "react";
// Serviços
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import Pagination from "@/components/general-components/Pagination";
// Template Page list-form
import HeaderLists from "@/components/general-components/HeaderLists";
import SideForm from "@/components/general-components/SideForm";
import ItemSkeleton from "./Skeletons/ItemSkeleton";
import ItemList from "./CoursesItem";
import Form from "./CoursesForm";
import ExamForm from "./CoursesExamForm";
import SearchForm from "./CoursesSeach";
// Interfaces
import { Courses as EntityInterface } from "./interfaces/courses.interface";
import { ApiError } from "@/general-interfaces/api.interface";

const List = () => {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<EntityInterface>();
  const [searchParams, setSearchParams] = useState({
    limit: 10,
    page: 0,
    'order-name': 'asc',
  });
  const initialFormRef = useRef(searchParams);

  // Define variáveis de entidade
  const entity = {
    name: "Curso",
    pluralName: "Cursos",
    model: "courses",
    ability: "treinamentos",
  }

  interface Response {
    rows: EntityInterface[];
    total: number;
  }

  const { 
    data, 
    isLoading, 
    isError, 
    error,
    refetch 
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

  interface SearchFormData {
    name?: string;
    active?: boolean;
    createdAt?: [Date | undefined, Date | undefined];
  }

  const handleSearch = async (params: SearchFormData) => {
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

  const totalPages = data ? Math.ceil(data.total / searchParams.limit) : 0;

  const skeletons = Array(5).fill(null);

  if (!can(`view_${entity.ability}`)) return null;

  return (
    <>
      <HeaderLists
        titlePage={`${entity.pluralName}`}
        descriptionPage={`Administrar nossos ${entity.pluralName}`}
        entityName={entity.name}
        ability={entity.ability}
        limit={data?.total || 0}
        searchParams={searchParams}
        onlimitChange={handleLimitChange}
        openSearch={setOpenSearch}
        openForm={setOpenForm}
        setFormData={setFormData} 
        setFormType={() => {}}
        iconForm="plus"
      />

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
          ? formData.formType === 'exam'
            ? `Exame do ${entity.name} ${formData.name}`
            : `Editar ${entity.name} ${formData.name}`
          : `Cadastrar ${entity.name}`}
        description={formData 
          ? formData.formType === 'exam'
            ? `Gerencie as questões do exame para o curso ${formData.name}.`
            : `Atenção com a ação a seguir, ela irá alterar os dados do ${entity.name} ${formData.name}.`
          : `Por favor, preencha com atenção todas as informações necessárias para cadastrar ${entity.name}.`}
        side="right"
        form={formData && formData.formType === 'exam' 
          ? <ExamForm courseData={formData} openSheet={setOpenForm} entity={entity} />
          : <Form formData={formData} openSheet={setOpenForm} entity={entity} />
        }
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
          ? data.rows.map((item: EntityInterface, i: number) => (
              <ItemList 
                key={item.id} 
                item={item} 
                entity={entity}
                index={i} 
                setFormData={setFormData} 
                setOpenForm={setOpenForm}
              />
            ))
          : (
            <div className="w-full flex justify-center items-center font-medium text-primary py-4 rounded border border-primary">
              <p>Nenhum {entity.name} encontrado!</p>
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

export default List;
