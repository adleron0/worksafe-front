import { useRef, useState } from "react";
// Serviços
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
// Template Page list-form
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import SideForm from "@/components/general-components/SideForm";
import Form from "./components/ExamesForm";
import SearchForm from "./components/ExamesSearch";
import ExamesRowActions from "./components/ExamesRowActions";
import { examesColumns } from "./components/examesColumns";
import { LIMITS, countFilters } from "../../-shared/lista";
// Interfaces
import { IEntity } from "./interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

const List = ({ traineeId }: { traineeId: number }) => {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<IEntity | null>(null);
  const [searchParams, setSearchParams] = useState({
    limit: 10,
    page: 0,
    active: true,
    show: ['trainee', 'course', 'class'],
    traineeId: traineeId,
    'order-createdAt': 'desc',
  });
  const initialFormRef = useRef(searchParams);

  // Define variáveis de entidade
  const entity = {
    name: "Exame",
    pluralName: "Exames",
    model: "exames",
    ability: "classes",
  }

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

  const handleSearch = async (params: Record<string, any>) => {
    setSearchParams((prev) => ({
      ...prev,
      ...params,
    }));
  };

  const handleClear = () => {
    setSearchParams(initialFormRef.current);
  };

  const openDetails = (item: IEntity) => {
    setFormData(item);
    setOpenForm(true);
  };

  if (!can(`view_${entity.ability}`)) return null;

  const filterCount = countFilters(searchParams, initialFormRef.current);

  return (
    <div className="flex flex-col gap-3">
      <ListToolbar onOpenFilters={() => setOpenSearch(true)} filterCount={filterCount} />

      <DataTable rows={data?.rows} columns={examesColumns} getRowId={(item) => item.id ?? `${item.classId}-${item.createdAt}`} ariaLabel={entity.pluralName} minWidth={640}
        loading={isLoading || isFetching} error={isError ? error?.response?.data?.message || "erro desconhecido" : null} onRetry={() => refetch()}
        onRowClick={openDetails}
        rowClassName={(item) => (item.inactiveAt ? "opacity-60" : undefined)}
        actions={(item) => <ExamesRowActions item={item} entity={entity} onView={openDetails} />}
        empty={<EmptyState title="Nenhum exame encontrado." />} />

      <ListFooter total={data?.total ?? 0} page={searchParams.page} limit={searchParams.limit} limits={LIMITS}
        onPageChange={(page) => setSearchParams((prev) => ({ ...prev, page }))}
        onLimitChange={(limit) => setSearchParams((prev) => ({ ...prev, limit, page: 0 }))} />

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
          ? `Visualizando os detalhes do exame realizado.`
          : `Detalhes do exame.`}
        side="right"
        form={ <Form formData={formData} setOpenForm={setOpenForm} entity={entity} traineeId={traineeId} /> }
      />
    </div>
  );
};

export default List;
