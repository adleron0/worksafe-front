import { useRef, useState } from "react";
// Serviços
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import Pagination from "@/components/general-components/Pagination";
// Template Page list-form
import HeaderLists from "@/components/general-components/HeaderLists";
import SideForm from "@/components/general-components/SideForm";
import ItemSkeleton from "./skeletons/ItemSkeleton";
import ItemList from "./components/ReviewsItem";
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
  const [searchParams, setSearchParams] = useState({
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

  const { data, isLoading, isError, error } = useQuery<Response | undefined, ApiError>({
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
      <div className="px-4">
        <HeaderLists
          entityName={entity.name}
          ability={entity.ability}
          limit={data?.total || 0}
          searchParams={searchParams}
          onlimitChange={handleLimitChange}
          openSearch={setOpenSearch}
          openForm={() => {}} // Não há formulário nesta feature
          setFormData={() => {}} 
          setFormType={() => {}}
          iconForm="plus"
          showCreate={false} // Esconde o botão de criar
        />

        {/* Mostrar o curso sendo visualizado */}
        {courseName && (
          <div className="my-4 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Avaliações do curso: </span>
            <span className="text-sm text-muted-foreground">{courseName}</span>
          </div>
        )}

        {/* Busca avançada */}
        <SideForm
          openSheet={openSearch}
          setOpenSheet={setOpenSearch}
          title={`Buscar ${entity.pluralName}`}
          description={`Preencha os campos abaixo para filtrar ${entity.pluralName.toLowerCase()}.`}
          side="left"
          form={ <SearchForm onSearch={handleSearch} onClear={handleClear} openSheet={setOpenSearch} params={searchParams} /> }
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
            ? data.rows.map((item: IReview, i: number) => (
                <ItemList 
                  key={item.id} 
                  item={item} 
                  entity={entity}
                  index={i} 
                />
              ))
            : (
              <div className="w-full flex justify-center items-center font-medium text-primary py-4 rounded border border-primary">
                <p>Nenhuma {entity.name.toLowerCase()} encontrada!</p>
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
      </div>
    </>
  );
};

export default List;