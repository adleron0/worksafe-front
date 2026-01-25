import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import Pagination from "@/components/general-components/Pagination";
import HeaderLists from "@/components/general-components/HeaderLists";
import SideForm from "@/components/general-components/SideForm";
import ItemSkeleton from "./-skeletons/ItemSkeleton";
import ItemList from "./-components/ComentarioItem";
import Form from "./-components/ComentarioForm";
import SearchForm from "./-components/ComentarioSearch";
import { IComentario } from "./-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

export const Route = createFileRoute('/_authenticated/blog/_comentarios/comentarios')({
  component: List,
})

function List() {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<IComentario>();
  const [searchParams, setSearchParams] = useState<{
    limit: number;
    page: number;
    'order-createdAt': string;
    status?: string;
    'in-postId'?: number | number[];
  }>({
    limit: 10,
    page: 0,
    'order-createdAt': 'desc',
  });
  const initialFormRef = useRef(searchParams);

  const entity = {
    name: "Comentário",
    pluralName: "Comentários",
    model: "blog/comments",
    ability: "blog",
  }

  interface Response {
    rows: IComentario[];
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
      params.push({ key: 'show', value: 'visitor,post,replies' });
      return get(entity.model, '', params);
    },
  });

  interface SearchFormData {
    status?: string;
    'in-postId'?: number | number[];
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

  const handleLimitChange = (name: string, value: string | number) => {
    setSearchParams((prev) => ({ ...prev, [name]: value }));
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => ({ ...prev, page }));
  };

  const totalPages = data ? Math.ceil(data.total / searchParams.limit) : 0;

  const skeletons = Array(5).fill(null);

  const handleTextSearch = useCallback((text: string) => {
    setSearchParams(prev => ({
      ...prev,
      'like-content': text || undefined,
      page: 0
    }));
  }, []);

  if (!can(`view_${entity.ability}`)) return null;

  return (
    <>
      <HeaderLists
        titlePage={`${entity.pluralName}`}
        descriptionPage={`Moderar ${entity.pluralName} do Blog`}
        entityName={entity.name}
        ability={entity.ability}
        limit={data?.total || 0}
        showInputSearch={true}
        showCreate={false}
        searchPlaceholder={`Buscar por conteúdo do ${entity.name.toLowerCase()}...`}
        searchParams={searchParams}
        onlimitChange={handleLimitChange}
        openSearch={setOpenSearch}
        openForm={setOpenForm}
        setFormData={setFormData}
        setFormType={() => {}}
        iconForm="plus"
        onTextSearch={handleTextSearch}
      />

      <SideForm
        openSheet={openSearch}
        setOpenSheet={setOpenSearch}
        title={`Buscar ${entity.pluralName}`}
        description={`Preencha os campos abaixo para filtrar ${entity.pluralName}.`}
        side="left"
        form={<SearchForm onSubmit={handleSearch} onClear={handleClear} openSheet={setOpenSearch} params={searchParams} />}
      />

      <SideForm
        openSheet={openForm}
        setOpenSheet={setOpenForm}
        title={`Moderar ${entity.name}`}
        description={`Visualize e modere o ${entity.name}.`}
        side="right"
        form={<Form formData={formData} openSheet={setOpenForm} entity={entity} />}
      />

      <div className="space-y-2 mt-4">
        {isLoading
          ? skeletons.map((_, i) => <ItemSkeleton key={i} index={i} />)
          : isError
            ? <div className="w-full flex justify-center items-center font-medium text-destructive py-4 rounded border border-destructive">
              <p>Erro: {error?.response?.data?.message}</p>
            </div>
            : data?.rows && data.rows.length > 0
              ? data.rows.map((item: IComentario, i: number) => (
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
                  <p>Nenhum {entity.name} encontrado!</p>
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
}
