import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import SideForm from "@/components/general-components/SideForm";
import Icon from "@/components/general-components/Icon";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/general-interfaces/api.interface";
import TaxonomyForm from "./TaxonomyForm";
import TaxonomyRowActions from "./TaxonomyRowActions";
import { taxonomyColumns } from "./taxonomyColumns";
import { ITaxonomy, TaxonomyEntity } from "./types";

/** Tela de listagem/cadastro compartilhada por Categorias da Loja e Marcas. */
export default function TaxonomyList({ entity }: { entity: TaxonomyEntity }) {
  const { can } = useVerify();
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<ITaxonomy>();
  const [searchParams, setSearchParams] = useState<{ limit: number; page: number; "like-name"?: string }>({
    limit: 30,
    page: 0,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<{ rows: ITaxonomy[]; total: number } | undefined, ApiError>({
    queryKey: [`list${entity.pluralName}`, searchParams],
    queryFn: () =>
      get(entity.model, "", [
        ...Object.entries(searchParams).map(([key, value]) => ({ key, value })),
        { key: "order-name", value: "asc" },
        { key: "show", value: "_count" },
      ]),
  });

  const handleTextSearch = useCallback((text: string) => {
    setSearchParams((prev) => ({ ...prev, "like-name": text || undefined, page: 0 }));
  }, []);

  if (!can(`view_${entity.ability}`)) return null;

  const canCreate = can(`create_${entity.ability}`);
  const novo = `Nov${entity.article} ${entity.name.toLowerCase()}`;
  const openNew = () => { setFormData(undefined); setOpenForm(true); };
  const edit = (item: ITaxonomy) => { setFormData(item); setOpenForm(true); };

  return (
    <>
      <PageHeader title={entity.pluralName} description={entity.description} />

      <SideForm
        openSheet={openForm}
        setOpenSheet={setOpenForm}
        title={formData ? `Editar ${entity.name.toLowerCase()} ${formData.name}` : novo}
        description={formData ? "Renomear atualiza todos os produtos que a usam." : entity.description}
        side="right"
        form={<TaxonomyForm key={formData?.id ?? "new"} formData={formData} openSheet={setOpenForm} entity={entity} />}
      />

      <ListCard>
        <ListToolbar search={{ value: searchParams["like-name"] ?? "", onChange: handleTextSearch, placeholder: `Buscar ${entity.name.toLowerCase()} pelo nome...` }}>
          {canCreate && <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">{novo}</span></Button>}
        </ListToolbar>

        <DataTable
          rows={data?.rows}
          columns={taxonomyColumns(entity)}
          getRowId={(item) => item.id ?? item.name}
          ariaLabel={entity.pluralName}
          minWidth={560}
          loading={isLoading || isFetching}
          error={isError ? error?.response?.data?.message || "erro desconhecido" : null}
          onRetry={() => refetch()}
          actions={(item) => <TaxonomyRowActions item={item} entity={entity} onEdit={edit} />}
          empty={searchParams["like-name"]
            ? <EmptyState icon="search-x" title="Nada encontrado com esse nome." action={<Button variant="outline" size="sm" onClick={() => handleTextSearch("")}>Limpar busca</Button>} />
            : <EmptyState title={`Nenhum${entity.article === "a" ? "a" : ""} ${entity.name.toLowerCase()} cadastrad${entity.article}.`} action={canCreate && <Button size="sm" onClick={openNew}><Icon name="plus" className="w-4 h-4" /> {novo}</Button>} />}
        />

        <ListFooter
          total={data?.total ?? 0}
          page={searchParams.page}
          limit={searchParams.limit}
          onPageChange={(page) => setSearchParams((prev) => ({ ...prev, page }))}
          onLimitChange={(limit) => setSearchParams((prev) => ({ ...prev, limit, page: 0 }))}
        />
      </ListCard>
    </>
  );
}
