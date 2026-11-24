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
import Icon from "@/components/general-components/Icon";
import { Button } from "@/components/ui/button";
import { siteProductsImagesColumns } from "./components/siteProductsImagesColumns";
import SiteProductsImagesRowActions from "./components/SiteProductsImagesRowActions";
import Form from "./components/SiteProductsImagesForm";
import SearchForm from "./components/SiteProductsImagesSearch";
// Interfaces
import { IEntity } from "./interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

const List = ({ productId }: { productId: number }) => {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<IEntity>();
  const [searchParams, setSearchParams] = useState({
    limit: 10,
    page: 0,
    show: ['product'],
    productId: productId,
    'order-id': 'desc',
  });
  const initialFormRef = useRef(searchParams);

  // Define variáveis de entidade
  const entity = {
    name: "Imagem do Produto",
    pluralName: "Imagens do Produto",
    model: "site_productsimages",
    ability: "loja_site",
  }

  interface Response {
    rows: IEntity[];
    total: number;
  }

  const { 
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
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
  
  const handleLimitChange = (limit: number) => {
    setSearchParams((prev) => ({ ...prev, limit, page: 0 }));
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => ({ ...prev, page }));
  };

  if (!can(`view_${entity.ability}`)) return null;

  const canCreate = can(`create_${entity.ability}`);
  const openNew = () => { setFormData(undefined); setOpenForm(true); };
  const edit = (item: IEntity) => { setFormData(item); setOpenForm(true); };

  return (
    <>
      {canCreate && (
        <ListToolbar className="mb-3">
          <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> Vincular</Button>
        </ListToolbar>
      )}

      {/* Busca avançada */}
      <SideForm
        openSheet={openSearch}
        setOpenSheet={setOpenSearch}
        title={`Buscar ${entity.pluralName}`}
        description={`Preencha os campos abaixo para filtrar ${entity.pluralName}.`}
        side="left"
        form={ <SearchForm onSubmit={handleSearch} onClear={handleClear} openSheet={setOpenSearch} params={searchParams} /> }
      />

      {/* Formulário de cadastro */}
      <SideForm
        openSheet={openForm}
        setOpenSheet={setOpenForm}
        title={formData 
          ? `Editar ${entity.name}`
          : `Vincular ${entity.name}`}
        description={formData 
          ? `Atenção com a ação a seguir, ela irá alterar os dados do ${entity.name}.`
          : `Por favor, preencha com atenção todas as informações necessárias para vincular ${entity.name}.`}
        side="right"
        form={ <Form formData={formData} openSheet={setOpenForm} entity={entity} productId={productId} /> }
      />

      {/* Listagem de items */}
      <div className="rounded-card border bg-card px-3 py-1">
        <DataTable
          rows={data?.rows}
          columns={siteProductsImagesColumns()}
          getRowId={(item) => item.id ?? item.name}
          ariaLabel={entity.pluralName}
          minWidth={480}
          skeletonRows={4}
          loading={isLoading || isFetching}
          error={isError ? error?.response?.data?.message || "erro desconhecido" : null}
          onRetry={() => refetch()}
          actions={(item) => <SiteProductsImagesRowActions item={item} entity={entity} onEdit={edit} />}
          empty={<EmptyState icon="image" title="Nenhuma imagem vinculada a este produto." action={canCreate && <Button size="sm" onClick={openNew}><Icon name="plus" className="w-4 h-4" /> Vincular</Button>} />}
        />
      </div>

      <ListFooter
        className="mt-3"
        total={data?.total ?? 0}
        page={searchParams.page}
        limit={searchParams.limit}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
      />
    </>
  );
};

export default List;
