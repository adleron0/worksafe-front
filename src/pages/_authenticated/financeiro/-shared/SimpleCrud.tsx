import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, patch, post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { useLoader } from "@/context/GeneralContext";
import SideForm from "@/components/general-components/SideForm";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { DataColumn, EmptyState, RowActionsTrigger } from "@/components/general-components/DataTable";
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
  /** colunas da tabela (as ações entram sozinhas no fim) */
  columns: DataColumn<T>[];
  renderForm: (props: { formData?: T; close: () => void; onSaved: () => void }) => React.ReactNode;
  inactivateWarning?: string;
}

/** Listagem + gaveta de cadastro dos cadastros simples do financeiro. */
export default function SimpleCrud<T extends Row>({ entity, columns, renderForm, inactivateWarning }: SimpleCrudProps<T>) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<T>();
  const [confirm, setConfirm] = useState<{ item: T; action: "active" | "inactive" } | null>(null);
  const [searchParams, setSearchParams] = useState<{ limit: number; page: number; "like-name"?: string }>({ limit: 30, page: 0 });
  const listKey = `list${entity.pluralName}`;

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<{ rows: T[]; total: number } | undefined, ApiError>({
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
  const canCreate = can(`create_${FINANCIAL_ABILITY}`);
  const canUpdate = can(`update_${FINANCIAL_ABILITY}`);
  const novo = `${entity.article === "a" ? "Nova" : "Novo"} ${entity.name.toLowerCase()}`;
  const openNew = () => { setFormData(undefined); setOpenForm(true); };
  const edit = (item: T) => { setFormData(item); setOpenForm(true); };

  const rowActions = (item: T) => {
    const canEdit = canUpdate && !item.inactiveAt;
    const canInactive = !item.inactiveAt && can(`inactive_${FINANCIAL_ABILITY}`);
    const canActive = !!item.inactiveAt && can(`activate_${FINANCIAL_ABILITY}`);
    if (!canEdit && !canInactive && !canActive) return null;
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações de ${item.name}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit && <DropdownMenuItem className="gap-2" onSelect={() => edit(item)}><Icon name="pencil" className="w-3.5 h-3.5" /> Editar</DropdownMenuItem>}
          {canInactive && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm({ item, action: "inactive" })}><Icon name="power-off" className="w-3.5 h-3.5" /> Inativar</DropdownMenuItem>}
          {canActive && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm({ item, action: "active" })}><Icon name="power" className="w-3.5 h-3.5" /> Reativar</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
      <PageHeader title={entity.pluralName} description={entity.description} />

      <ListCard>
        <ListToolbar search={{ value: searchParams["like-name"] ?? "", onChange: handleTextSearch, placeholder: "Buscar pelo nome" }}>
          {canCreate && <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">{novo}</span></Button>}
        </ListToolbar>

        <DataTable rows={data?.rows} columns={columns} getRowId={(item) => item.id} ariaLabel={entity.pluralName} minWidth={560}
          loading={isLoading || isFetching} error={isError ? error?.response?.data?.message || "erro desconhecido" : null} onRetry={() => refetch()}
          onRowClick={(item) => { if (canUpdate && !item.inactiveAt) edit(item); }}
          rowClassName={(item) => (item.inactiveAt ? "opacity-60" : undefined)}
          actions={rowActions}
          empty={searchParams["like-name"]
            ? <EmptyState icon="search-x" title="Nada encontrado com esse nome." action={<Button variant="outline" size="sm" onClick={() => handleTextSearch("")}>Limpar busca</Button>} />
            : <EmptyState title={`Nenhum${entity.article === "a" ? "a" : ""} ${entity.name.toLowerCase()} cadastrad${entity.article}.`} action={canCreate && <Button size="sm" onClick={openNew}><Icon name="plus" className="w-4 h-4" /> {novo}</Button>} />} />

        <ListFooter total={data?.total ?? 0} page={searchParams.page} limit={searchParams.limit} limits={[10, 30, 50, 100]}
          onPageChange={(page) => setSearchParams((prev) => ({ ...prev, page }))} onLimitChange={(limit) => setSearchParams((prev) => ({ ...prev, limit, page: 0 }))} />
      </ListCard>

      <SideForm
        openSheet={openForm}
        setOpenSheet={setOpenForm}
        title={formData ? `Editar ${formData.name}` : novo}
        description={entity.description}
        side="right"
        form={<div key={formData?.id ?? "new"}>{renderForm({ formData, close: () => setOpenForm(false), onSaved: invalidate })}</div>}
      />
      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }}
          title={`${confirm.action === "inactive" ? "Inativar" : "Reativar"} ${confirm.item.name}?`}
          description={confirm.action === "inactive" ? (inactivateWarning ?? "Deixa de aparecer para novos lançamentos. Os lançamentos já feitos continuam ligados.") : "Volta a aparecer para novos lançamentos."}
          onConfirm={() => { toggle({ item: confirm.item, action: confirm.action }); setConfirm(null); }} />
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
