import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
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
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { ApiError } from "@/general-interfaces/api.interface";
import { useBackToList } from "@/hooks/use-back-to-list";
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
  /** formulário na gaveta lateral (cadastros com até 4 campos) */
  renderForm?: (props: { formData?: T; close: () => void; onSaved: () => void }) => React.ReactNode;
  /** formulário em tela própria (cadastros com mais de 4 campos): rotas de novo e de edição */
  pages?: SimplePages;
  inactivateWarning?: string;
  /** filtros extras da lista (ex.: entityId), mandados para a API */
  listParams?: Array<{ key: string; value: string | number }>;
  /** campos extras na barra da lista (ex.: filtro de empresa) */
  toolbarExtra?: React.ReactNode;
}

/** Rotas das telas de cadastro: `edit` tem um parâmetro (`param`) com o id. */
export interface SimplePages { list: string; new: string; edit: string; param: string }

/** Listagem + gaveta de cadastro dos cadastros simples do financeiro. */
export default function SimpleCrud<T extends Row>({ entity, columns, renderForm, pages, inactivateWarning, listParams = [], toolbarExtra }: SimpleCrudProps<T>) {
  const { can } = useVerify();
  const navigate = useNavigate();
  const { showLoader, hideLoader } = useLoader();
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<T>();
  const [confirm, setConfirm] = useState<{ item: T; action: "active" | "inactive" } | null>(null);
  const [searchParams, setSearchParams] = useState<{ limit: number; page: number; "like-name"?: string }>({ limit: 30, page: 0 });
  const listKey = simpleListKey(entity);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<{ rows: T[]; total: number } | undefined, ApiError>({
    queryKey: [listKey, searchParams, listParams],
    queryFn: () => get(entity.model, "", [
      ...Object.entries(searchParams).map(([key, value]) => ({ key, value })),
      ...listParams,
      { key: "order-name", value: "asc" },
      { key: "show", value: "_count" },
    ]),
  });

  const invalidate = useSimpleInvalidate(entity);

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
  const openNew = () => {
    if (pages) navigate({ to: pages.new as never });
    else { setFormData(undefined); setOpenForm(true); }
  };
  const edit = (item: T) => {
    if (pages) navigate({ to: pages.edit as never, params: { [pages.param]: String(item.id) } as never });
    else { setFormData(item); setOpenForm(true); }
  };

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
          {toolbarExtra}
          {canCreate && <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">{novo}</span></Button>}
        </ListToolbar>

        <DataTable rows={data?.rows} columns={columns} getRowId={(item) => item.id} ariaLabel={entity.pluralName} minWidth={560}
          loading={isLoading || isFetching} error={isError ? error?.response?.data?.message || "erro desconhecido" : null} onRetry={() => refetch()}
          isRowClickable={(item) => canUpdate && !item.inactiveAt}
          onRowClick={(item) => { if (canUpdate && !item.inactiveAt) edit(item); }}
          rowClassName={(item) => (item.inactiveAt ? "opacity-60" : undefined)}
          actions={rowActions}
          empty={searchParams["like-name"] || listParams.length
            ? <EmptyState icon="search-x" title={searchParams["like-name"] ? "Nada encontrado com esse nome." : "Nada encontrado com esse filtro."} action={<Button variant="outline" size="sm" onClick={() => handleTextSearch("")}>Limpar busca</Button>} />
            : <EmptyState title={`Nenhum${entity.article === "a" ? "a" : ""} ${entity.name.toLowerCase()} cadastrad${entity.article}.`} action={canCreate && <Button size="sm" onClick={openNew}><Icon name="plus" className="w-4 h-4" /> {novo}</Button>} />} />

        <ListFooter total={data?.total ?? 0} page={searchParams.page} limit={searchParams.limit} limits={[10, 30, 50, 100]}
          onPageChange={(page) => setSearchParams((prev) => ({ ...prev, page }))} onLimitChange={(limit) => setSearchParams((prev) => ({ ...prev, limit, page: 0 }))} />
      </ListCard>

      {renderForm && (
        <SideForm
          openSheet={openForm}
          setOpenSheet={setOpenForm}
          title={formData ? `Editar ${formData.name}` : novo}
          description={entity.description}
          side="right"
          form={<div key={formData?.id ?? "new"}>{renderForm({ formData, close: () => setOpenForm(false), onSaved: invalidate })}</div>}
        />
      )}
      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }}
          title={`${confirm.action === "inactive" ? "Inativar" : "Reativar"} ${confirm.item.name}?`}
          description={confirm.action === "inactive" ? (inactivateWarning ?? "Deixa de aparecer para novos lançamentos. Os lançamentos já feitos continuam ligados.") : "Volta a aparecer para novos lançamentos."}
          onConfirm={() => { toggle({ item: confirm.item, action: confirm.action }); setConfirm(null); }} />
      )}
    </>
  );
}

const simpleListKey = (entity: SimpleEntity) => `list${entity.pluralName}`;

/** Atualiza a listagem e os seletores de outras telas depois de salvar ou inativar. */
export function useSimpleInvalidate(entity: SimpleEntity) {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [simpleListKey(entity)] });
    for (const key of entity.optionKeys ?? []) queryClient.invalidateQueries({ queryKey: [key] });
  }, [queryClient, entity]);
}

/**
 * Tela própria de cadastro/edição de um cadastro simples (no lugar da gaveta):
 * cabeçalho com "voltar", carrega o registro pela API na edição e entrega ao formulário
 * o `close` (volta para a lista) e o `onSaved` (atualiza a listagem).
 */
export function SimpleFormPage<T extends Row>({ entity, pages, id, renderForm }: {
  entity: SimpleEntity;
  pages: SimplePages;
  /** id do registro na edição; sem id é cadastro novo */
  id?: string;
  renderForm: (props: { formData?: T; close: () => void; onSaved: () => void }) => React.ReactNode;
}) {
  const { can } = useVerify();
  const back = useBackToList(pages.list);
  const onSaved = useSimpleInvalidate(entity);
  const { data, isLoading, isError } = useQuery<T | undefined>({
    queryKey: [`${simpleListKey(entity)}Item`, id],
    queryFn: () => get<T>(entity.model, String(id)),
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
    enabled: Boolean(id),
  });
  if (!can(`${id ? "update" : "create"}_${FINANCIAL_ABILITY}`)) return null;
  const novo = `${entity.article === "a" ? "Nova" : "Novo"} ${entity.name.toLowerCase()}`;
  const missing = `${entity.name} não encontrad${entity.article}.`;
  return (
    <>
      <FormPageHeader backTo={pages.list} backLabel={entity.pluralName} title={id ? (data ? `Editar ${data.name}` : `Editar ${entity.name.toLowerCase()}`) : novo}
        description={entity.description} />
      {!id ? renderForm({ close: back, onSaved })
        : isLoading ? <FormPageSkeleton />
          : isError || !data ? <EmptyState icon="search-x" title={missing} />
            : data.inactiveAt ? <EmptyState title={`${entity.name} inativ${entity.article}.`} description="Reative na lista para editar." />
              : <div key={data.id}>{renderForm({ formData: data, close: back, onSaved })}</div>}
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
