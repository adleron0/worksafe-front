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
import ItemList from "./components/SubscriptionItem";
import SearchForm from "./components/SubscriptionSearch";
import SubscriptionForm from "./components/SubscriptionForm";
// Interfaces
import { IEntity } from "./interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

const List = ({ classId }: { classId: number }) => {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<IEntity>();
  const [searchParams, setSearchParams] = useState({
    limit: 10,
    page: 0,
    // show: ['class', 'company'],
    classId: classId,
    'order-name': 'asc',
  });
  const initialFormRef = useRef(searchParams);

  // Define variáveis de entidade
  const entity = {
    name: "Inscrição",
    pluralName: "Inscrições",
    model: "subscription",
    ability: "treinamentos",
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
    queryKey: [`list${entity.pluralName}`, searchParams],
    queryFn: async () => {
      const params = Object.keys(searchParams).map((key) => ({
        key,
        value: searchParams[key as keyof typeof searchParams]
      }));
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
        openForm={() => {
          setFormData(undefined);
          setOpenForm(true);
        }}
        setFormData={setFormData} 
        setFormType={() => {}}
        iconForm="plus"
        addButtonName="Nova"
      />

      {/* Error */}
      {isError && (
        <div className="p-6 text-center">
          <p className="text-red-500">
            {error?.response?.data?.message || `Erro ao carregar ${entity.pluralName}`}
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="p-2">
          {skeletons.map((_, index) => (
            <ItemSkeleton key={index} />
          ))}
        </div>
      )}

      {/* Content */}
      {data && data.rows.length > 0 ? (
        <div className="p-2">
          {data.rows.map((item, index) => (
            <ItemList
              key={item.id}
              item={item}
              index={index}
              entity={entity}
              setFormData={setFormData}
              setOpenForm={setOpenForm}
            />
          ))}
          {totalPages > 1 && (
            <Pagination
              currentPage={searchParams.page}
              totalItems={data.total}
              itemsPerPage={searchParams.limit}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      ) : (
        !isLoading && (
          <div className="p-6 text-center">
            <p className="text-gray-500">Nenhuma inscrição encontrada</p>
          </div>
        )
      )}

      {/* Search Form */}
      <SideForm
        openSheet={openSearch}
        setOpenSheet={setOpenSearch}
        title="Buscar Inscrições"
        form={<SearchForm onSearch={handleSearch} onClear={handleClear} searchParams={searchParams} />}
      />

      {/* Form */}
      <SideForm
        openSheet={openForm}
        setOpenSheet={setOpenForm}
        title={formData?.id ? `Editar ${entity.name}` : `Nova ${entity.name}`}
        form={
          <SubscriptionForm
            formData={formData}
            openSheet={setOpenForm}
            entity={entity}
            classId={classId}
          />
        }
      />
    </>
  );
};

export default List;