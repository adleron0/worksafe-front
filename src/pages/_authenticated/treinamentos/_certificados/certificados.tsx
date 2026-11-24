import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState, useCallback } from "react";
// Serviços
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import Select from "@/components/general-components/Select";
import Calendar from "@/components/general-components/Calendar";
// Template Page list-form
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import SideForm from "@/components/general-components/SideForm";
import { Button } from "@/components/ui/button";
import CertificadosRowActions from "./-components/CertificadosRowActions";
import { certificadosColumns } from "./-components/certificadosColumns";
import { LIMITS, countFilters } from "../-shared/lista";
import Form from "./-components/CertificadosForm";
import EditForm from "./-components/CertificadosEditForm";
import SearchForm from "./-components/CertificadosSearch";
// Interfaces
import { ICertificate } from "./-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

export const Route = createFileRoute('/_authenticated/treinamentos/_certificados/certificados')({
  component: List,
})

function List({ traineeId, modalPopover }: { traineeId?: number, modalPopover?: boolean }) {
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
    'gte-expirationDate'?: string;
    'lte-expirationDate'?: string;
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

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<Response | undefined, ApiError>({
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
        const response = await get('classes', '', params) as { rows: ClassItem[] };
        if (!response.rows.length) {
          return [];
        }
        
        const classes = response?.rows?.map((item: ClassItem) => ({
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
        const response = await get('courses', '', params) as { rows: CourseItem[] };
        if (!response.rows.length) {
          return [];
        }
        
        const courses = response?.rows?.map((item: CourseItem) => ({
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

  const handleTextSearch = useCallback((text: string) => {
    setSearchParams(prev => ({
      ...prev,
      'like-trainee.name': text || undefined,
      page: 0 // Reset page when searching
    }));
  }, []);

  // Handler para o filtro de data
  const handleDateRangeChange = useCallback((_name: string, value: string | null) => {
    if (value) {
      // Parse do valor no formato "startDate|endDate"
      const [startDate, endDate] = value.split('|');
      setSearchParams(prev => ({
        ...prev,
        'gte-expirationDate': startDate || undefined,
        'lte-expirationDate': endDate || undefined,
        page: 0 // Reset page when searching
      }));
    } else {
      // Limpar filtros de data
      setSearchParams(prev => ({
        ...prev,
        'gte-expirationDate': undefined,
        'lte-expirationDate': undefined,
        page: 0
      }));
    }
  }, []);


  if (!can(`view_${entity.ability}`)) return null;

  const filterCount = countFilters(searchParams, initialFormRef.current, ['like-trainee.name', 'classId', 'courseId', 'gte-expirationDate', 'lte-expirationDate']);
  const filtered = filterCount > 0 || !!searchParams['like-trainee.name'] || !!searchParams.classId || !!searchParams.courseId || !!searchParams['gte-expirationDate'];
  const openView = (item: ICertificate) => { setFormData(item); setOpenForm(true); };
  const openEdit = (item: ICertificate) => { setEditData(item); setOpenEditForm(true); };

  return (
    <>
      <PageHeader title={entity.pluralName} description={`Administrar nossos ${entity.pluralName}`} />

      <ListCard>
        <div className="flex justify-start items-center gap-2 flex-wrap">
          {/* Select de turmas */}
          <div className="w-full sm:w-[250px]">
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
          <div className="w-full sm:w-[250px]">
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

          {/* Filtro de período de vencimento */}
          <div className="w-full sm:w-[280px]">
            <Calendar
              mode="range"
              name="expirationDateRange"
              value={
                searchParams['gte-expirationDate'] && searchParams['lte-expirationDate']
                  ? `${searchParams['gte-expirationDate']}|${searchParams['lte-expirationDate']}`
                  : null
              }
              onValueChange={handleDateRangeChange}
              placeholder="Período de Vencimento"
              buttonVariant="outline"
              className="w-full"
              fromYear={new Date().getFullYear() - 1}
              toYear={new Date().getFullYear() + 10}
            />
          </div>
        </div>

        <ListToolbar search={{ value: searchParams['like-trainee.name'] ?? "", onChange: handleTextSearch, placeholder: "Buscar por nome do aluno..." }}
          onOpenFilters={() => setOpenSearch(true)} filterCount={filterCount} />

        <DataTable rows={data?.rows} columns={certificadosColumns} getRowId={(item) => item.id ?? String(item.key)} ariaLabel={entity.pluralName}
          loading={isLoading || isFetching} error={isError ? error?.response?.data?.message || "erro desconhecido" : null} onRetry={() => refetch()}
          onRowClick={can(`view_${entity.ability}`) ? openView : undefined}
          rowClassName={(item) => (item.inactiveAt ? "opacity-60" : undefined)}
          actions={(item) => <CertificadosRowActions item={item} entity={entity} onView={openView} onEdit={openEdit} modalPopover={modalPopover} />}
          empty={filtered
            ? <EmptyState icon="search-x" title="Nenhum certificado com esses filtros." action={<Button variant="outline" size="sm" onClick={handleClear}>Limpar filtros</Button>} />
            : <EmptyState title="Nenhum certificado encontrado." />} />

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

    </>
  );
};

export default List;