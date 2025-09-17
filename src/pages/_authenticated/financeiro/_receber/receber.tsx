import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import Pagination from "@/components/general-components/Pagination";
import HeaderLists from "@/components/general-components/HeaderLists";
import SideForm from "@/components/general-components/SideForm";
import CalendarPicker from "@/components/general-components/Calendar";
import Select from "@/components/general-components/Select";
import StatusCards from "./-components/StatusCards";
import StatusCardsSkeleton from "./-components/StatusCardsSkeleton";
import ItemSkeleton from "./-skeletons/ItemSkeleton";
import ItemList from "./-components/FinancialRecordsItem";
import Form from "./-components/FinancialRecordsForm";
import SearchForm from "./-components/FinancialRecordsSearch";
import { IFinancialRecord } from "./-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

export const Route = createFileRoute('/_authenticated/financeiro/_receber/receber')(({
  component: List,
}))

function List() {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<IFinancialRecord | null>(null);

  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const [searchParams, setSearchParams] = useState<{
    limit: number;
    page: number;
    show: string[];
    'order-createdAt': string;
    accrualDate: string | null;
    '-aggregate': string;
    'in-status'?: string[];
  }>({
    limit: 10,
    page: 0,
    show: ['trainee', 'subscription'],
    'order-createdAt': 'desc',
    accrualDate: getCurrentMonth(), // Default to current month
    '-aggregate': 'status:count:sum:value'
  });
  const initialFormRef = useRef(searchParams);

  const entity = {
    name: "Conta a Receber",
    pluralName: "Contas a Receber",
    model: "financial-records",
    ability: "financeiro",
  }

  interface Response {
    rows: IFinancialRecord[];
    total: number;
    aggregations?: {
      [key: string]: {
        _count: number;
        _sum: {
          value: string;
        };
      };
    };
  }

  const { data, isLoading, isError, error } = useQuery<Response | undefined, ApiError>({
    queryKey: [`list${entity.pluralName}`, searchParams],
    queryFn: async () => {
      const params = Object.keys(searchParams)
        .filter((key) => searchParams[key as keyof typeof searchParams] !== null)
        .map((key) => ({
          key,
          value: searchParams[key as keyof typeof searchParams]
        }));
      return get(entity.model, '', params);
    },
  });

  const handleSearch = async (params: { [key: string]: any }) => {
    setSearchParams((prev) => ({ ...prev, ...params }));
  };

  const handleMonthChange = (_name: string, value: string | null) => {
    setSearchParams((prev) => ({
      ...prev,
      accrualDate: value || null, // When cleared, set to null to show all
      page: 0 // Reset page when changing month
    }));
  };

  const handleStatusChange = (_name: string, selectedStatus: string | string[]) => {
    const statusArray = Array.isArray(selectedStatus) ? selectedStatus : [selectedStatus];
    setSearchParams((prev) => ({
      ...prev,
      'in-status': statusArray.length > 0 && statusArray[0] !== '' ? statusArray : undefined,
      page: 0 // Reset page when changing filter
    }));
  };

  // Status options for the select
  const statusOptions = [
    { id: 'processing', name: 'Processando' },
    { id: 'waiting', name: 'Aguardando' },
    { id: 'received', name: 'Recebido' },
    { id: 'declined', name: 'Recusado' },
    { id: 'chargeback', name: 'Estorno' },
    { id: 'cancelled', name: 'Cancelado' },
    { id: 'overdue', name: 'Vencido' },
  ];

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
        showCreate={false}
        titlePage='Contas a Receber'
        descriptionPage='Gerencie todas as contas a receber.'
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 my-4 p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <CalendarPicker
            mode="month"
            name="monthSelector"
            value={searchParams.accrualDate}
            onValueChange={handleMonthChange}
            placeholder="Selecione o mês"
            fromYear={2020}
            toYear={2030}
          />
        </div>
        <div className="w-full sm:w-64">
          <Select
            name="statusFilter"
            options={statusOptions}
            state={searchParams['in-status'] || []}
            onChange={handleStatusChange}
            placeholder="Filtrar por status..."
            multiple={true}
          />
        </div>
      </div>

      {/* Status Cards */}
      {isLoading ? (
        <StatusCardsSkeleton />
      ) : (
        <StatusCards aggregations={data?.aggregations} />
      )}

      <SideForm
        openSheet={openSearch}
        setOpenSheet={setOpenSearch}
        title={`Buscar ${entity.pluralName}`}
        description={`Preencha os campos abaixo para filtrar ${entity.pluralName}.`}
        side="left"
        form={ <SearchForm onSearch={handleSearch} onClear={handleClear} openSheet={setOpenSearch} params={searchParams} /> }
      />

      <SideForm
        openSheet={openForm}
        setOpenSheet={setOpenForm}
        title={formData ? `Editar ${entity.name}` : `Cadastrar ${entity.name}`}
        description={formData ? `Edite as informações da ${entity.name}.` : `Preencha os campos abaixo para cadastrar uma nova ${entity.name}.`}
        side="right"
        form={ <Form formData={formData} setOpenForm={setOpenForm} entity={entity} /> }
      />

      <div className="space-y-2 mt-4">
        {isLoading
          ? skeletons.map((_, i) => <ItemSkeleton key={i} index={i} />)
          : isError
          ? <div className="w-full flex justify-center items-center font-medium text-destructive py-4 rounded border border-destructive">
              <p>Erro: {error?.response?.data?.message}</p>
            </div>
          : data?.rows && data.rows.length > 0
          ? data.rows.map((item: IFinancialRecord, i: number) => (
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
              <p>Nenhuma {entity.name} encontrada!</p>
            </div>
          )
        }
      </div>

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