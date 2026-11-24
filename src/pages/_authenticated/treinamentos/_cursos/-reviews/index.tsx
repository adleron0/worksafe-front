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
import ReviewsRowActions from "./components/ReviewsRowActions";
import { reviewsColumns } from "./components/reviewsColumns";
import { LIMITS, countFilters } from "../../-shared/lista";
import SearchForm from "./components/ReviewsSearch";
// Interfaces
import { IReview } from "./interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

interface ListProps {
  courseId: number;
  courseName?: string;
}

const List = ({ courseId, courseName }: ListProps) => {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const [searchParams, setSearchParams] = useState<Record<string, any>>({
    limit: 10,
    page: 0,
    show: ['trainee', 'course', 'class'],
    courseId: courseId,
    'order-createdAt': 'desc',
  });
  const initialFormRef = useRef(searchParams);

  // Define variáveis de entidade
  const entity = {
    name: "Avaliação",
    pluralName: "Avaliações",
    model: "reviews",
    ability: "classes",
  }

  interface Response {
    rows: IReview[];
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
    // Filtrar parâmetros vazios
    const filteredParams: Record<string, any> = {};
    
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        // Para trainee, vamos fazer busca por nome
        if (key === 'trainee') {
          filteredParams['trainee.name'] = params[key];
        } else if (key === 'active') {
          // Se active é false, significa que queremos inativos (inactiveAt not null)
          // Se active é true, significa que queremos ativos (inactiveAt is null)
          if (params[key] === false) {
            filteredParams['inactiveAt'] = 'not_null';
          } else {
            filteredParams['inactiveAt'] = 'null';
          }
        } else {
          filteredParams[key] = params[key];
        }
      }
    });
    
    setSearchParams((prev) => ({ 
      ...prev, 
      ...filteredParams,
      page: 0 // Reset para primeira página ao buscar
    }));
  };

  const handleClear = () => {
    setSearchParams(initialFormRef.current);
  };
  
  if (!can(`view_${entity.ability}`)) return null;

  const filterCount = countFilters(searchParams, initialFormRef.current);

  return (
    <div className="px-4 flex flex-col gap-3">
      {/* Mostrar o curso sendo visualizado */}
      {courseName && (
        <div className="p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">Avaliações do curso: </span>
          <span className="text-sm text-muted-foreground">{courseName}</span>
        </div>
      )}

      <ListToolbar onOpenFilters={() => setOpenSearch(true)} filterCount={filterCount} />

      <DataTable rows={data?.rows} columns={reviewsColumns} getRowId={(item) => item.id} ariaLabel={entity.pluralName} minWidth={680}
        loading={isLoading || isFetching} error={isError ? error?.response?.data?.message || "erro desconhecido" : null} onRetry={() => refetch()}
        rowClassName={(item) => (item.inactiveAt ? "opacity-60" : undefined)}
        actions={(item) => <ReviewsRowActions item={item} entity={entity} />}
        empty={<EmptyState title="Nenhuma avaliação encontrada." />} />

      <ListFooter total={data?.total ?? 0} page={searchParams.page} limit={searchParams.limit} limits={LIMITS}
        onPageChange={(page) => setSearchParams((prev) => ({ ...prev, page }))}
        onLimitChange={(limit) => setSearchParams((prev) => ({ ...prev, limit, page: 0 }))} />

      {/* Busca avançada */}
      <SideForm
        openSheet={openSearch}
        setOpenSheet={setOpenSearch}
        title={`Buscar ${entity.pluralName}`}
        description={`Preencha os campos abaixo para filtrar ${entity.pluralName.toLowerCase()}.`}
        side="left"
        form={ <SearchForm onSearch={handleSearch} onClear={handleClear} openSheet={setOpenSearch} params={searchParams} /> }
      />
    </div>
  );
};

export default List;
