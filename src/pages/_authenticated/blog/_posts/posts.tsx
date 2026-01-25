import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import Pagination from "@/components/general-components/Pagination";
import HeaderLists from "@/components/general-components/HeaderLists";
import SideForm from "@/components/general-components/SideForm";
import Dialog from "@/components/general-components/Dialog";
import { Button } from "@/components/ui/button";
import ItemSkeleton from "./-skeletons/ItemSkeleton";
import ItemList from "./-components/PostItem";
import Form from "./-components/PostForm";
import SearchForm from "./-components/PostSearch";
import { IPost } from "./-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

export const Route = createFileRoute('/_authenticated/blog/_posts/posts')({
  component: List,
})

function List() {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<IPost>();
  const [searchParams, setSearchParams] = useState<{
    limit: number;
    page: number;
    'order-createdAt': string;
    'like-title'?: string;
    status?: string;
    'in-categoryId'?: number | number[];
    featured?: boolean;
  }>({
    limit: 10,
    page: 0,
    'order-createdAt': 'desc',
  });
  const initialFormRef = useRef(searchParams);

  const entity = {
    name: "Post",
    pluralName: "Posts",
    model: "blog/posts",
    ability: "blog",
  }

  interface Response {
    rows: IPost[];
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
      // Adiciona os relacionamentos
      params.push({ key: 'show', value: '[author,category,tags,_count]' });
      return get(entity.model, '', params);
    },
  });

  interface SearchFormData {
    'like-title': string;
    status?: string;
    'in-categoryId'?: number | number[];
    featured?: boolean;
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
      'like-title': text || undefined,
      page: 0
    }));
  }, []);

  if (!can(`view_${entity.ability}`)) return null;

  return (
    <>
      <HeaderLists
        titlePage={`${entity.pluralName}`}
        descriptionPage={`Administrar ${entity.pluralName} do Blog`}
        entityName={entity.name}
        ability={entity.ability}
        limit={data?.total || 0}
        showInputSearch={true}
        showCreate={true}
        searchPlaceholder={`Buscar por título do ${entity.name.toLowerCase()}...`}
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

      <Dialog
        open={openForm}
        onOpenChange={setOpenForm}
        showBttn={false}
        title={formData
          ? `Editar ${entity.name} "${formData.title}"`
          : `Cadastrar ${entity.name}`}
        description={formData
          ? `Atenção com a ação a seguir, ela irá alterar os dados do ${entity.name} "${formData.title}".`
          : `Por favor, preencha com atenção todas as informações necessárias para cadastrar o ${entity.name}.`}
        className="sm:max-w-[900px]"
        classNameContent="pb-0"
        footer={
          <div className="flex gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenForm(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" form="post-form" className="flex-1">
              {formData ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        }
      >
        <Form formData={formData} openSheet={setOpenForm} entity={entity} />
      </Dialog>

      <div className="space-y-2 mt-4">
        {isLoading
          ? skeletons.map((_, i) => <ItemSkeleton key={i} index={i} />)
          : isError
            ? <div className="w-full flex justify-center items-center font-medium text-destructive py-4 rounded border border-destructive">
              <p>Erro: {error?.response?.data?.message}</p>
            </div>
            : data?.rows && data.rows.length > 0
              ? data.rows.map((item: IPost, i: number) => (
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
