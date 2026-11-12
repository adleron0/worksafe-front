import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import Pagination from "@/components/general-components/Pagination";
import HeaderLists from "@/components/general-components/HeaderLists";
import SideForm from "@/components/general-components/SideForm";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/general-interfaces/api.interface";
import TaxonomyItem from "./TaxonomyItem";
import TaxonomyForm from "./TaxonomyForm";
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

  const { data, isLoading, isError, error } = useQuery<{ rows: ITaxonomy[]; total: number } | undefined, ApiError>({
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

  return (
    <>
      <HeaderLists
        titlePage={entity.pluralName}
        descriptionPage={entity.description}
        entityName={entity.name}
        ability={entity.ability}
        limit={data?.total || 0}
        showInputSearch={true}
        showSearch={false}
        showCreate={true}
        searchPlaceholder={`Buscar ${entity.name.toLowerCase()} pelo nome...`}
        searchParams={searchParams}
        onlimitChange={(name, value) => setSearchParams((prev) => ({ ...prev, [name]: value, page: 0 }))}
        openSearch={() => {}}
        openForm={setOpenForm}
        setFormData={setFormData}
        setFormType={() => {}}
        iconForm="plus"
        addButtonName={entity.article === "a" ? "Nova" : "Novo"}
        onTextSearch={handleTextSearch}
      />

      <SideForm
        openSheet={openForm}
        setOpenSheet={setOpenForm}
        title={formData ? `Editar ${entity.name.toLowerCase()} ${formData.name}` : `Nov${entity.article} ${entity.name.toLowerCase()}`}
        description={formData ? "Renomear atualiza todos os produtos que a usam." : entity.description}
        side="right"
        form={<TaxonomyForm key={formData?.id ?? "new"} formData={formData} openSheet={setOpenForm} entity={entity} />}
      />

      <div className="space-y-2 mt-4">
        {isLoading ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)
        ) : isError ? (
          <div className="w-full flex justify-center items-center font-medium text-destructive py-4 rounded border border-destructive">
            <p>Erro: {error?.response?.data?.message}</p>
          </div>
        ) : data?.rows?.length ? (
          data.rows.map((item, i) => (
            <TaxonomyItem key={item.id} item={item} index={i} entity={entity} setFormData={setFormData} setOpenForm={setOpenForm} />
          ))
        ) : (
          <div className="w-full flex justify-center items-center font-medium text-primary py-4 rounded border border-primary">
            <p>Nenhum{entity.article === "a" ? "a" : ""} {entity.name.toLowerCase()} cadastrad{entity.article}.</p>
          </div>
        )}
      </div>

      {data && data.total > searchParams.limit && (
        <div className="mt-4">
          <Pagination
            totalItems={data.total}
            itemsPerPage={searchParams.limit}
            currentPage={searchParams.page}
            onPageChange={(page) => setSearchParams((prev) => ({ ...prev, page }))}
            maxVisiblePages={5}
          />
        </div>
      )}
    </>
  );
}
