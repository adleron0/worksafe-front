import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import SideForm from "@/components/general-components/SideForm";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import { Button } from "@/components/ui/button";
import Form from "./-components/CupomForm";
import SearchForm from "./-components/CupomSearch";
import CupomRowActions from "./-components/CupomRowActions";
import { cupomColumns } from "./-components/cupomColumns";
import { ICupom } from "./-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

export const Route = createFileRoute('/_authenticated/comercial/_cupons/cupons')({
  component: List,
})

const LIMITS = [10, 30, 50, 100, 200];
// filtros do painel lateral (contam no botão "Filtros"; a faixa de validade conta uma vez)
const FILTER_KEYS = ["code", "description", "sellerId", "discountType", "active", "firstPurchaseOnly", "courseId", "classId"];

function List() {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<ICupom | null>(null);
  const [searchParams, setSearchParams] = useState<Record<string, any>>({
    limit: 10,
    page: 0,
    show: ['seller', 'class', 'course', '_count'],
    'order-code': 'asc',
  });
  const initialFormRef = useRef(searchParams);

  const entity = {
    name: "Cupom",
    pluralName: "Cupons",
    model: "coupon",
    ability: "cupoms",
  }

  interface Response {
    rows: ICupom[];
    total: number;
  }

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<Response | undefined, ApiError>({
    queryKey: [`list${entity.pluralName}`, searchParams],
    queryFn: async () => {
      const params = Object.keys(searchParams).map((key) => ({
        key,
        value: searchParams[key]
      }));
      return get(entity.model, '', params);
    },
  });

  const handleSearch = async (params: { [key: string]: any }) => {
    setSearchParams((prev) => ({ ...prev, ...params }));
  };

  const handleClear = () => {
    setSearchParams(initialFormRef.current);
  };

  if (!can(`view_${entity.ability}`)) return null;

  const canCreate = can(`create_${entity.ability}`);
  const openNew = () => { setFormData(null); setOpenForm(true); };
  const openEdit = (item: ICupom) => { setFormData(item); setOpenForm(true); };
  const isSet = (value: unknown) => value !== undefined && value !== null && value !== "";
  const filterCount = FILTER_KEYS.filter((key) => isSet(searchParams[key])).length
    + (isSet(searchParams['validUntil-gte']) || isSet(searchParams['validUntil-lte']) ? 1 : 0);

  return (
    <>
      <PageHeader title={entity.pluralName} description="Cupons de desconto, com vendedor, limite de uso e validade." />

      <ListCard>
        <ListToolbar onOpenFilters={() => setOpenSearch(true)} filterCount={filterCount}>
          {canCreate && <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Novo {entity.name}</span></Button>}
        </ListToolbar>

        <DataTable rows={data?.rows} columns={cupomColumns} getRowId={(item) => item.id} ariaLabel={entity.pluralName}
          loading={isLoading || isFetching} error={isError ? error?.response?.data?.message || "erro desconhecido" : null} onRetry={() => refetch()}
          rowClassName={(item) => (item.active ? undefined : "opacity-60")}
          actions={(item) => <CupomRowActions item={item} entity={entity} onEdit={openEdit} />}
          empty={filterCount > 0
            ? <EmptyState icon="search-x" title="Nenhum cupom com esses filtros." action={<Button variant="outline" size="sm" onClick={handleClear}>Limpar filtros</Button>} />
            : <EmptyState title={`Nenhum ${entity.name} encontrado!`} action={canCreate && <Button size="sm" onClick={openNew}><Icon name="plus" className="w-4 h-4" /> Novo {entity.name}</Button>} />} />

        <ListFooter total={data?.total ?? 0} page={searchParams.page} limit={searchParams.limit} limits={LIMITS}
          onPageChange={(page) => setSearchParams((prev) => ({ ...prev, page }))} onLimitChange={(limit) => setSearchParams((prev) => ({ ...prev, limit }))} />
      </ListCard>

      <SideForm
        openSheet={openSearch}
        setOpenSheet={setOpenSearch}
        title={`Buscar ${entity.pluralName}`}
        description={`Preencha os campos abaixo para filtrar ${entity.pluralName.toLowerCase()}.`}
        side="left"
        form={ <SearchForm onSearch={handleSearch} onClear={handleClear} openSheet={setOpenSearch} params={searchParams} /> }
      />

      <SideForm
        openSheet={openForm}
        setOpenSheet={setOpenForm}
        title={formData ? `Editar ${entity.name}` : `Cadastrar ${entity.name}`}
        description={formData ? `Edite os dados do ${entity.name.toLowerCase()} abaixo.` : `Preencha os dados do novo ${entity.name.toLowerCase()}.`}
        side="right"
        form={ <Form formData={formData} setOpenForm={setOpenForm} entity={entity} /> }
      />
    </>
  );
}
