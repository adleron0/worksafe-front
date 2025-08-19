import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from "react";
// Serviços
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import Pagination from "@/components/general-components/Pagination";
import Select from "@/components/general-components/Select";
// Template Page list-form
import HeaderLists from "@/components/general-components/HeaderLists";
import SideForm from "@/components/general-components/SideForm";
import ItemSkeleton from "./-skeletons/ItemSkeleton";
import ItemList from "./-components/CertificadosItem";
import Form from "./-components/CertificadosForm";
import EditForm from "./-components/CertificadosEditForm";
import SearchForm from "./-components/CertificadosSearch";
// Interfaces
import { ICertificate } from "./-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

export const Route = createFileRoute('/_authenticated/treinamentos/_certificados/certificados')({
  component: List,
})

function List({ traineeId }: { traineeId: number | undefined }) {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [openEditForm, setOpenEditForm] = useState(false);
  const [formData, setFormData] = useState<ICertificate | null>(null);
  const [editData, setEditData] = useState<ICertificate | undefined>(undefined);
  const [searchParams, setSearchParams] = useState<{
    limit: number;
    page: number;
    active: boolean;
    show: string[];
    traineeId: number | null;
    'order-createdAt': string;
    classId: number | null;
    courseId: number | null;
    'like-trainee.name'?: string;
  }>({
    limit: 10,
    page: 0,
    active: true,
    show: ['trainee', 'course', 'class'],
    traineeId: traineeId ? Number(traineeId) : null,
    'order-createdAt': 'desc',
    classId: null,
    courseId: null,
  });
  const initialFormRef = useRef(searchParams);

  // Define variáveis de entidade
  const entity = {
    name: "Certificado",
    pluralName: "Certificados",
    model: "trainee-certificate",
    ability: "classes",
  }

  interface Response {
    rows: ICertificate[];
    total: number;
  }

  const { 
    data, 
    isLoading, 
    isError, 
    error, 
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listCertificados`, searchParams],
    queryFn: async () => {
      const params = Object.keys(searchParams).map((key) => ({
        key,
        value: searchParams[key as keyof typeof searchParams]
      }));
      return get(entity.model, '', params);
    },
  });

  const handleSearch = async (params: Record<string, unknown>) => {
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

  // Filtros de busca
   // Interface para um único item da classe
    interface ClassItem {
      id: number;
      name: string;
      active: boolean;
      initialDate: string;
    }
  
    // Tipo que o Select espera
    interface SelectOption {
      [key: string]: string | number;
    }
  
    const { 
      data: classesData, 
    } = useQuery<SelectOption[], ApiError>({
      queryKey: [`listClasses`],
      queryFn: async () => {
        const params = [
          { key: 'all', value: true },
          { key: 'order-name', value: 'asc' },
        ];
        const response = await get('classes', '', params);
        if (!response || !Array.isArray(response)) {
          return [];
        }
        
        const classes = response.map((item: ClassItem) => ({
          id: item.id,
          name: `${item.name} (${new Date(item.initialDate).toLocaleDateString('pt-BR')})`,
        }));
        
        // Adiciona opção "Todas as turmas" no início com valor especial
        return [
          { id: "all", name: "Todas as turmas" },
          ...classes
        ];
      },
    });

    // Interface para curso
    interface CourseItem {
      id: number;
      name: string;
      active: boolean;
    }

    // Query para buscar cursos
    const { 
      data: coursesData, 
    } = useQuery<SelectOption[], ApiError>({
      queryKey: [`listCourses`],
      queryFn: async () => {
        const params = [
          { key: 'all', value: true },
          { key: 'order-name', value: 'asc' },
        ];
        const response = await get('courses', '', params);
        if (!response || !Array.isArray(response)) {
          return [];
        }
        
        const courses = response.map((item: CourseItem) => ({
          id: item.id,
          name: item.name,
        }));
        
        // Adiciona opção "Todos os cursos" no início
        return [
          { id: "all", name: "Todos os cursos" },
          ...courses
        ];
      },
    });

  const skeletons = Array(5).fill(null);

  if (!can(`view_${entity.ability}`)) return null;

  return (
    <>
      <div className="space-y-4">
        <HeaderLists
          titlePage={`${entity.pluralName}`}
          descriptionPage={`Administrar nossos ${entity.pluralName}`}
          entityName={entity.name}
          ability={entity.ability}
          limit={data?.total || 0}
          showCreate={false}
          showInputSearch={true}
          searchPlaceholder="Buscar por nome do aluno..."
          searchParams={searchParams}
          onlimitChange={handleLimitChange}
          openSearch={setOpenSearch}
          openForm={setOpenForm}
          setFormData={setFormData} 
          setFormType={() => {}}
          iconForm="award"
          onTextSearch={(text) => {
            setSearchParams(prev => ({
              ...prev,
              'like-trainee.name': text || undefined,
              page: 0 // Reset page when searching
            }));
          }}
        />
        <div className="flex justify-start items-center px-2 gap-2">
          {/* Select de turmas */}
          <div className="w-[250px]">
            <Select
              name="classId"
              options={classesData}
              state={searchParams.classId?.toString() || "all"}
              label="name"
              value="id"
              placeholder="Selecione uma turma"
              onChange={(name, value) => {
                const selectedValue = value === "all" ? null : value ? Number(value) : null;
                setSearchParams((prev) => ({ ...prev, [name]: selectedValue }));
              }}
              disabled={classesData?.length === 0}
            />
          </div>
          
          {/* Select de cursos */}
          <div className="w-[250px]">
            <Select
              name="courseId"
              options={coursesData}
              state={searchParams.courseId?.toString() || "all"}
              label="name"
              value="id"
              placeholder="Selecione um curso"
              onChange={(name, value) => {
                const selectedValue = value === "all" ? null : value ? Number(value) : null;
                setSearchParams((prev) => ({ ...prev, [name]: selectedValue }));
              }}
              disabled={coursesData?.length === 0}
            />
          </div>
        </div>
      </div>

      {/* Busca avançada */}
      <SideForm
        openSheet={openSearch}
        setOpenSheet={setOpenSearch}
        title={`Buscar ${entity.pluralName}`}
        description={`Preencha os campos abaixo para filtrar ${entity.pluralName}.`}
        side="left"
        form={ <SearchForm onSearch={handleSearch} onClear={handleClear} openSheet={setOpenSearch} params={searchParams} /> }
      />

      {/* Formulário de visualização */}
      <SideForm
        openSheet={openForm}
        setOpenSheet={setOpenForm}
        title={`Detalhes do ${entity.name}`}
        description={formData 
          ? `Visualizando os detalhes do certificado.`
          : `Detalhes do certificado.`}
        side="right"
        form={ <Form formData={formData} setOpenForm={setOpenForm} entity={entity} traineeId={traineeId || undefined} /> }
      />

      {/* Formulário de edição */}
      <SideForm
        openSheet={openEditForm}
        setOpenSheet={setOpenEditForm}
        title={`Editar ${entity.name}`}
        description={`Edite as configurações do certificado.`}
        side="right"
        form={ <EditForm formData={editData} openSheet={setOpenEditForm} entity={entity} /> }
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
          ? data.rows.map((item: ICertificate, i: number) => (
              <ItemList 
                key={item.id} 
                item={item} 
                entity={entity}
                index={i} 
                setFormData={setFormData} 
                setOpenForm={setOpenForm}
                setEditData={setEditData}
                setOpenEditForm={setOpenEditForm}
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
      {data && data.total > searchParams.limit && (
        <Pagination
          currentPage={searchParams.page}
          totalItems={data.total}
          itemsPerPage={searchParams.limit}
          onPageChange={handlePageChange}
        />
      )}
    </>
  );
};

export default List;