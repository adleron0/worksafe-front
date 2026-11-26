import { createFileRoute, useNavigate } from '@tanstack/react-router'
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
import { EntityFilter } from "@/components/general-components/EntitySelect";
import CoursesRowActions from "./-components/CoursesRowActions";
import { coursesColumns } from "./-components/coursesColumns";
import { LIMITS, countFilters } from "../-shared/lista";
import ExamForm from "./-components/CoursesExamForm";
import SearchForm from "./-components/CoursesSearch";
// Interfaces
import { IEntity } from "./-interfaces/entity.interface";
import { COURSE_ENTITY } from "./-entity";
import { ApiError } from "@/general-interfaces/api.interface";

export const Route = createFileRoute('/_authenticated/treinamentos/_cursos/cursos')({
  component: List,
})

function List() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const [openSearch, setOpenSearch] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<IEntity>();
  const [searchParams, setSearchParams] = useState<Record<string, any>>({
    limit: 10,
    page: 0,
    'order-name': 'asc',
  });
  const initialFormRef = useRef(searchParams);

  // Define variáveis de entidade
  const entity = COURSE_ENTITY;

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
    name?: string;
    active?: boolean;
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
  
  if (!can(`view_${entity.ability}`)) return null;

  const canCreate = can(`create_${entity.ability}`);
  const canUpdate = can(`update_${entity.ability}`);
  const openNew = () => navigate({ to: "/treinamentos/cursos/novo" });
  const openEdit = (item: IEntity) => navigate({ to: "/treinamentos/cursos/$courseId", params: { courseId: String(item.id) } });
  const openExam = (item: IEntity) => { setFormData({ ...item, formType: 'exam' }); setOpenForm(true); };
  const filterCount = countFilters(searchParams, initialFormRef.current);

  return (
    <>
      <PageHeader title={entity.pluralName} description={`Administrar nossos ${entity.pluralName}`} />

      <ListCard>
        <ListToolbar onOpenFilters={() => setOpenSearch(true)} filterCount={filterCount}>
          <EntityFilter value={searchParams.entityId ?? null} onChange={(id) => setSearchParams((prev) => ({ ...prev, entityId: id ?? undefined, page: 0 }))} />
          {canCreate && <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Novo {entity.name}</span></Button>}
        </ListToolbar>

        <DataTable rows={data?.rows} columns={coursesColumns} getRowId={(item) => item.id ?? item.name} ariaLabel={entity.pluralName}
          loading={isLoading || isFetching} error={isError ? error?.response?.data?.message || "erro desconhecido" : null} onRetry={() => refetch()}
          onRowClick={canUpdate ? openEdit : undefined}
          rowClassName={(item) => (!item.active ? "opacity-60" : undefined)}
          actions={(item) => <CoursesRowActions item={item} entity={entity} onEdit={openEdit} onExam={openExam} />}
          empty={filterCount > 0
            ? <EmptyState icon="search-x" title="Nenhum curso com esses filtros." action={<Button variant="outline" size="sm" onClick={handleClear}>Limpar filtros</Button>} />
            : <EmptyState title="Nenhum curso encontrado." action={canCreate && <Button size="sm" onClick={openNew}><Icon name="plus" className="w-4 h-4" /> Novo {entity.name}</Button>} />} />

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

      {/* Exame do curso (editor de questões; o cadastro do curso abre em tela própria) */}
      <SideForm
        openSheet={openForm}
        setOpenSheet={setOpenForm}
        title={`Exame do ${entity.name} ${formData?.name ?? ""}`}
        description={`Gerencie as questões do exame para o curso ${formData?.name ?? ""}.`}
        side="right"
        form={formData ? <ExamForm courseData={formData} openSheet={setOpenForm} entity={entity} /> : null}
      />

    </>
  );
};
