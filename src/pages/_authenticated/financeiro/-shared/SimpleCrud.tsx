import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, patch, post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { useLoader } from "@/context/GeneralContext";
import Pagination from "@/components/general-components/Pagination";
import HeaderLists from "@/components/general-components/HeaderLists";
import SideForm from "@/components/general-components/SideForm";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ApiError } from "@/general-interfaces/api.interface";
import { FINANCIAL_ABILITY } from "./financial";

export interface SimpleEntity {
  name: string;
  pluralName: string;
  model: string;
  article: "o" | "a";
  description: string;
  /** chaves de consulta a invalidar além da listagem (seletores em outras telas) */
  optionKeys?: string[];
}

interface Row { id: number; name: string; inactiveAt?: string | null }

interface SimpleCrudProps<T extends Row> {
  entity: SimpleEntity;
  /** colunas além de nome e ações: cabeçalho e célula */
  header: React.ReactNode;
  renderRow: (item: T) => React.ReactNode;
  renderForm: (props: { formData?: T; close: () => void; onSaved: () => void }) => React.ReactNode;
  inactivateWarning?: string;
}

/** Listagem + gaveta de cadastro dos cadastros simples do financeiro. */
export default function SimpleCrud<T extends Row>({ entity, header, renderRow, renderForm, inactivateWarning }: SimpleCrudProps<T>) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<T>();
  const [searchParams, setSearchParams] = useState<{ limit: number; page: number; "like-name"?: string }>({ limit: 30, page: 0 });
  const listKey = `list${entity.pluralName}`;

  const { data, isLoading, isError, error } = useQuery<{ rows: T[]; total: number } | undefined, ApiError>({
    queryKey: [listKey, searchParams],
    queryFn: () => get(entity.model, "", [
      ...Object.entries(searchParams).map(([key, value]) => ({ key, value })),
      { key: "order-name", value: "asc" },
      { key: "show", value: "_count" },
    ]),
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [listKey] });
    for (const key of entity.optionKeys ?? []) queryClient.invalidateQueries({ queryKey: [key] });
  }, [queryClient, listKey, entity.optionKeys]);

  const { mutate: toggle } = useMutation({
    mutationFn: ({ item, action }: { item: T; action: "active" | "inactive" }) => {
      showLoader(action === "active" ? "Reativando..." : "Inativando...");
      return patch(`${entity.model}/${action}/${item.id}`, "");
    },
    onSuccess: (_, { action }) => {
      hideLoader();
      toast({ title: `${entity.name} ${action === "active" ? "reativad" : "inativad"}${entity.article}!`, variant: "success" });
      invalidate();
    },
    onError: (err: ApiError) => {
      hideLoader();
      toast({ title: "Não foi possível concluir", description: err.response?.data?.message || "Erro desconhecido.", variant: "destructive" });
    },
  });

  const handleTextSearch = useCallback((text: string) => {
    setSearchParams((prev) => ({ ...prev, "like-name": text || undefined, page: 0 }));
  }, []);

  if (!can(`view_${FINANCIAL_ABILITY}`)) return null;

  return (
    <>
      <HeaderLists
        titlePage={entity.pluralName}
        descriptionPage={entity.description}
        entityName={entity.name}
        ability={FINANCIAL_ABILITY}
        limit={data?.total || 0}
        showInputSearch
        showSearch={false}
        showCreate
        searchPlaceholder="Buscar pelo nome..."
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
        title={formData ? `Editar ${formData.name}` : `Nov${entity.article} ${entity.name.toLowerCase()}`}
        description={entity.description}
        side="right"
        form={<div key={formData?.id ?? "new"}>{renderForm({ formData, close: () => setOpenForm(false), onSaved: invalidate })}</div>}
      />

      <div className="mt-4 rounded-lg border overflow-hidden">
        <div className="hidden lg:flex items-center py-2 px-4 bg-primary font-semibold text-sm text-inverse-foreground">
          {header}
          <div className="w-20 text-right">Ações</div>
        </div>
        {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-full my-1" />)}
        {isError && <p className="p-4 text-destructive font-medium">Erro: {error?.response?.data?.message}</p>}
        {!isLoading && !isError && !data?.rows?.length && (
          <p className="p-4 text-sm text-muted-foreground">Nenhum{entity.article === "a" ? "a" : ""} {entity.name.toLowerCase()} cadastrad{entity.article}.</p>
        )}
        {data?.rows?.map((item) => (
          <div key={item.id} className={`relative flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-3 border-b last:border-b-0 text-sm ${item.inactiveAt ? "opacity-60" : ""}`}>
            {renderRow(item)}
            <div className="absolute top-2 right-2 lg:static lg:w-20 flex justify-end">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button className="h-8 w-8 rounded-full p-0" variant="outline" size="sm" aria-label={`Ações de ${item.name}`}>
                    <Icon name="ellipsis-vertical" className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {can(`update_${FINANCIAL_ABILITY}`) && !item.inactiveAt && (
                    <DropdownMenuItem className="gap-2" onSelect={() => { setFormData(item); setOpenForm(true); }}>
                      <Icon name="pencil" className="w-3 h-3" /> Editar
                    </DropdownMenuItem>
                  )}
                  {!item.inactiveAt && can(`inactive_${FINANCIAL_ABILITY}`) && (
                    <DropdownMenuItem className="p-0" onSelect={(event) => event.preventDefault()}>
                      <ConfirmDialog title={`Inativar ${item.name}?`}
                        description={inactivateWarning ?? "Deixa de aparecer para novos lançamentos. Os lançamentos já feitos continuam ligados."}
                        onConfirm={() => toggle({ item, action: "inactive" })} titleBttn="Inativar" iconBttn="power-off" />
                    </DropdownMenuItem>
                  )}
                  {item.inactiveAt && can(`activate_${FINANCIAL_ABILITY}`) && (
                    <DropdownMenuItem className="p-0" onSelect={(event) => event.preventDefault()}>
                      <ConfirmDialog title={`Reativar ${item.name}?`} description="Volta a aparecer para novos lançamentos."
                        onConfirm={() => toggle({ item, action: "active" })} titleBttn="Reativar" iconBttn="power" />
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {data && data.total > searchParams.limit && (
        <div className="mt-4">
          <Pagination totalItems={data.total} itemsPerPage={searchParams.limit} currentPage={searchParams.page}
            onPageChange={(page) => setSearchParams((prev) => ({ ...prev, page }))} maxVisiblePages={5} />
        </div>
      )}
    </>
  );
}

/** Estado e envio de um formulário simples (POST/PUT multipart do CRUD). */
export function useSimpleSave<T extends Row>(entity: SimpleEntity, formData: T | undefined, close: () => void, onSaved: () => void) {
  const { showLoader, hideLoader } = useLoader();
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      showLoader("Salvando...");
      return formData ? put(entity.model, String(formData.id), data) : post(entity.model, "", data);
    },
    onSuccess: () => {
      hideLoader();
      toast({ title: `${entity.name} ${formData ? "atualizad" : "cadastrad"}${entity.article}!`, variant: "success" });
      onSaved();
      close();
    },
    onError: (err: ApiError) => {
      hideLoader();
      setError(err.response?.data?.message || "Erro desconhecido.");
    },
  });
  return { save: mutation.mutate, isPending: mutation.isPending, error, setError };
}
