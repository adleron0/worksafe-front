import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from "react";
// Serviços
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import Pagination from "@/components/general-components/Pagination";
import Dialog from "@/components/general-components/Dialog";
import QuickFilter from "@/components/general-components/QuickFilter";
// Template Page list-form
import HeaderLists from "@/components/general-components/HeaderLists";
import SideForm from "@/components/general-components/SideForm";
import ItemSkeleton from "./-skeletons/ItemSkeleton";
import ItemList from "./-components/TurmasItem";
import SearchForm from "./-components/TurmasSearch";
import TurmasInstrutoresList from "@/pages/_authenticated/treinamentos/_instrutores/-turmas-instrutores/TurmasInstrutoresList";
import Subscriptions from "@/pages/_authenticated/treinamentos/_inscricoes/inscricoes";
// Interfaces
import { IEntity } from "./-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

export const Route = createFileRoute('/_authenticated/treinamentos/_turmas/turmas')({
  component: List,
})

type StatusFilter = 'ativas' | 'inativas' | 'todas';
type PeriodFilter = 'atuais' | 'andamento' | 'proximas' | 'encerradas' | 'todas';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ativas', label: 'Ativas' },
  { value: 'inativas', label: 'Inativas' },
  { value: 'todas', label: 'Todas' },
];

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'atuais', label: 'Atuais' },
  { value: 'andamento', label: 'Em andamento' },
  { value: 'proximas', label: 'Próximas' },
  { value: 'encerradas', label: 'Encerradas' },
  { value: 'todas', label: 'Todas' },
];

const STATUS_PARAMS: Record<StatusFilter, Record<string, any>> = {
  ativas: { active: 'true' },
  inativas: { active: 'false' },
  todas: {},
};

/** Dia local (AAAA-MM-DD) deslocado em `offset` dias; toISOString daria o dia em UTC. */
const localDay = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Recorte de período. A API trata data sem hora como início do dia em gte e fim
 * do dia em lte. "Atuais" = ainda não terminou (ou sem fim, começando hoje em
 * diante) ou turma de período ilimitado (sempre aberta). Os outros recortes só
 * olham turmas com período definido: as ilimitadas guardam datas antigas que
 * não valem mais.
 */
const periodParams = (period: PeriodFilter): Record<string, any> => {
  const today = localDay();
  switch (period) {
    case 'atuais':
      return { or: [
        { 'gte-finalDate': today },
        { 'null-finalDate': 'true', 'gte-initialDate': today },
        { periodClass: 'UNLIMITED' },
      ] };
    case 'andamento':
      return { periodClass: 'LIMITED', 'lte-initialDate': today, 'gte-finalDate': today };
    case 'proximas':
      return { periodClass: 'LIMITED', 'gte-initialDate': localDay(1) };
    case 'encerradas':
      return { periodClass: 'LIMITED', 'lte-finalDate': localDay(-1) };
    default:
      return {};
  }
};

function List() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const [openSearch, setOpenSearch] = useState(false);
  const [openInstrutoresModal, setOpenInstrutoresModal] = useState(false);
  const [openSubscriptionsModal, setOpenSubscriptionsModal] = useState(false);
  const [formData, setFormData] = useState<IEntity>();
  const [searchParams, setSearchParams] = useState<Record<string, any>>({
    limit: 10,
    page: 0,
    'order-name': 'asc',
  });
  // Por padrão: só as ativas e as do período atual (em andamento, próximas ou sem período)
  const [status, setStatus] = useState<StatusFilter>('ativas');
  const [period, setPeriod] = useState<PeriodFilter>('atuais');
  const initialFormRef = useRef(searchParams);

  // Define variáveis de entidade
  const entity = {
    name: "Turma",
    pluralName: "Turmas",
    model: "classes",
    ability: "classes",
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
    queryKey: [`list${entity.pluralName}`, searchParams, status, period],
    queryFn: async () => {
      // campo vazio da busca avançada não pode apagar o recorte dos filtros rápidos
      const filled = Object.fromEntries(Object.entries(searchParams).filter(([, v]) => v !== undefined && v !== null && v !== ''));
      const merged: Record<string, any> = { ...STATUS_PARAMS[status], ...periodParams(period), ...filled };
      const params = Object.keys(merged).map((key) => ({ key, value: merged[key] }));
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
    setStatus('ativas');
    setPeriod('atuais');
  };

  const changeStatus = (value: StatusFilter) => {
    setStatus(value);
    setSearchParams((prev) => ({ ...prev, page: 0 }));
  };

  const changePeriod = (value: PeriodFilter) => {
    setPeriod(value);
    setSearchParams((prev) => ({ ...prev, page: 0 }));
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
        openForm={() => {
          navigate({ to: "/treinamentos/turmas/nova" });
        }}
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

      {/* Filtros rápidos */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <QuickFilter label="Status" options={STATUS_OPTIONS} value={status} onChange={changeStatus} />
        <QuickFilter label="Período" options={PERIOD_OPTIONS} value={period} onChange={changePeriod} />
      </div>

      {/* Listagem de items */}
      <div className="space-y-2 mt-4">
        {isLoading
          ? skeletons.map((_, i) => <ItemSkeleton key={i} index={i} />)
          : isError
          ? <div className="w-full flex justify-center items-center font-medium text-destructive py-4 rounded border border-destructive">
              <p>Erro: {error?.response?.data?.message}</p>
            </div>
          : data?.rows && data.rows.length > 0 
          ? data.rows.map((item: IEntity, i: number) => (
              <ItemList
                key={item.id}
                item={item}
                entity={entity}
                index={i}
                setFormData={setFormData}
                openInstructorsModal={setOpenInstrutoresModal}
                openSubscriptionsModal={setOpenSubscriptionsModal}
              />
            ))
          : (
            <div className="w-full flex justify-center items-center font-medium text-primary py-4 rounded border border-primary">
              <p>Nenhum {entity.name} encontrado!</p>
            </div>
          )
        }
      </div>

      {/* Modal de instrutores */}
      <Dialog 
        open={openInstrutoresModal}
        onOpenChange={setOpenInstrutoresModal}
        showBttn={false}
        showHeader={true}
        title={`Instrutores da Turma ${formData?.name}`}
        description="Gestão de instrutores da turma."
      >
        <TurmasInstrutoresList classId={formData?.id || 0} />
      </Dialog>

      {/* Modal de inscrições */}
      <Dialog 
        open={openSubscriptionsModal}
        onOpenChange={setOpenSubscriptionsModal}
        showBttn={false}
        showHeader={false}
        title={`Inscrições da Turma ${formData?.name}`}
        description="Lista de alunos inscritos nesta turma."
      >
        <Subscriptions classId={formData?.id || 0} modalPopover={true} />
      </Dialog>

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