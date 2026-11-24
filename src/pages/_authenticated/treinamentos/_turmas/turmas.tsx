import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from "react";
// Serviços
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import Dialog from "@/components/general-components/Dialog";
import QuickFilter from "@/components/general-components/QuickFilter";
// Template Page list-form
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import SideForm from "@/components/general-components/SideForm";
import Icon from "@/components/general-components/Icon";
import { Button } from "@/components/ui/button";
import TurmasRowActions from "./-components/TurmasRowActions";
import { turmasColumns } from "./-components/turmasColumns";
import { LIMITS, countFilters } from "../-shared/lista";
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

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<Response | undefined, ApiError>({
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
  
  if (!can(`view_${entity.ability}`)) return null;

  const canCreate = can(`create_${entity.ability}`);
  const canOpen = can(`update_${entity.ability}`);
  const openNew = () => navigate({ to: "/treinamentos/turmas/nova" });
  const openClass = (item: IEntity) => navigate({ to: "/treinamentos/turmas/$turmaId", params: { turmaId: String(item.id) } });
  const filterCount = countFilters(searchParams, initialFormRef.current);
  const filtered = filterCount > 0 || status !== 'ativas' || period !== 'atuais';

  return (
    <>
      <PageHeader title={entity.pluralName} description={`Administrar nossos ${entity.pluralName}`} />

      <ListCard>
        {/* Filtros rápidos */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <QuickFilter label="Status" options={STATUS_OPTIONS} value={status} onChange={changeStatus} />
          <QuickFilter label="Período" options={PERIOD_OPTIONS} value={period} onChange={changePeriod} />
        </div>

        <ListToolbar onOpenFilters={() => setOpenSearch(true)} filterCount={filterCount}>
          {canCreate && <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Nova {entity.name}</span></Button>}
        </ListToolbar>

        <DataTable rows={data?.rows} columns={turmasColumns} getRowId={(item) => item.id ?? item.name} ariaLabel={entity.pluralName} minWidth={880}
          loading={isLoading || isFetching} error={isError ? error?.response?.data?.message || "erro desconhecido" : null} onRetry={() => refetch()}
          onRowClick={canOpen ? openClass : undefined}
          rowClassName={(item) => (!item.active ? "opacity-60" : undefined)}
          actions={(item) => (
            <TurmasRowActions item={item} entity={entity}
              onInstructors={(row) => { setFormData(row); setOpenInstrutoresModal(true); }}
              onSubscriptions={(row) => { setFormData(row); setOpenSubscriptionsModal(true); }} />
          )}
          empty={filtered
            ? <EmptyState icon="search-x" title="Nenhuma turma com esses filtros." action={<Button variant="outline" size="sm" onClick={handleClear}>Limpar filtros</Button>} />
            : <EmptyState title="Nenhuma turma encontrada." action={canCreate && <Button size="sm" onClick={openNew}><Icon name="plus" className="w-4 h-4" /> Nova {entity.name}</Button>} />} />

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

    </>
  );
};