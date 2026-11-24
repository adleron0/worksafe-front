import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import Icon from "@/components/general-components/Icon";
import TagBadge from "@/components/general-components/TagBadge";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import { errorMessage } from "../../comercial/-shared/commercial";
import { DOCS_ABILITY, DOCS_EXPIRING_KEY, DOCS_KEY, DOC_TYPES_KEY, DocType, DocTypes, documentsApi } from "../-shared/documents";
import DocumentTypeRowActions from "./-components/DocumentTypeRowActions";

export const Route = createFileRoute("/_authenticated/rh/_documentos/tipos-de-documento")({
  component: DocumentTypesPage,
});

const columnsOf = (folders: DocTypes["folders"]): DataColumn<DocType>[] => [
  { id: "name", header: "Tipo", className: "min-w-[200px]", cell: (type) => <p className="font-medium truncate max-w-[18rem]">{type.name}</p> },
  {
    id: "folder", header: "Pasta",
    cell: (type) => <span className="inline-flex items-center gap-1.5 text-muted-foreground whitespace-nowrap"><Icon name="folder" className="w-3.5 h-3.5" /> {folders.find((folder) => folder.id === type.folder)?.name ?? type.folder}</span>,
  },
  {
    id: "validity", header: "Validade",
    cell: (type) => <span className="text-muted-foreground whitespace-nowrap">{type.expires ? `Vence${type.validityMonths ? ` em ${type.validityMonths} ${type.validityMonths === 1 ? "mês" : "meses"}` : ""} · aviso ${type.warnDays} dias antes` : "Não vence"}</span>,
  },
  {
    id: "rules", header: "Regras",
    cell: (type) => (type.required || type.inIntegration
      ? (
        <div className="flex gap-1">
          {type.required && <TagBadge icon="asterisk">{type.requiredProfessionalIds.length ? `Obrigatório para ${type.requiredProfessionalIds.length} ${type.requiredProfessionalIds.length === 1 ? "função" : "funções"}` : "Obrigatório para todos"}</TagBadge>}
          {type.inIntegration && <TagBadge icon="log-in">Entra na integração</TagBadge>}
        </div>
      )
      : <span className="text-muted-foreground">—</span>),
  },
];

/** Tipos de documento: em que pasta fica, se vence, quando avisar, se é obrigatório e se entra na integração de obra. */
function DocumentTypesPage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const openNew = () => navigate({ to: "/rh/tipos-de-documento/novo" });
  const editRow = (type: DocType) => navigate({ to: "/rh/tipos-de-documento/$typeId", params: { typeId: String(type.id) } });
  const canWrite = can(`update_${DOCS_ABILITY}`);

  const { data, isLoading, error } = useQuery({ queryKey: [DOC_TYPES_KEY], queryFn: () => documentsApi.get<DocTypes>("types") });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [DOC_TYPES_KEY] });
    queryClient.invalidateQueries({ queryKey: [DOCS_KEY] });
    queryClient.invalidateQueries({ queryKey: [DOCS_EXPIRING_KEY] });
  };
  const { mutate: inactivate } = useMutation({
    mutationFn: (id: number) => documentsApi.patch<DocType>(`types/${id}/inactive`),
    onSuccess: () => { refresh(); toast({ title: "Tipo de documento inativado", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível inativar", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`view_${DOCS_ABILITY}`)) return null;

  // na ordem das pastas, como antes (uma pasta depois da outra)
  const rows = data ? data.folders.flatMap((folder) => data.rows.filter((type) => type.folder === folder.id)) : undefined;

  return (
    <>
      <PageHeader title="Tipos de documento" description="O que cada funcionário pode ter na pasta: se vence, com quanta antecedência avisar e o que é obrigatório." />

      <ListCard>
        {canWrite && <ListToolbar><Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Novo tipo</span></Button></ListToolbar>}
        <DataTable rows={rows} columns={columnsOf(data?.folders ?? [])} getRowId={(type) => type.id} ariaLabel="Tipos de documento" minWidth={760}
          loading={isLoading} error={error ? errorMessage(error) : null}
          onRowClick={canWrite ? editRow : undefined}
          actions={canWrite ? (type) => (
            <DocumentTypeRowActions name={type.name} onEdit={() => editRow(type)} onInactivate={() => inactivate(type.id)}
              inactivateDescription="O tipo deixa de aparecer para novos envios. Os documentos que já existem continuam nas pastas." />
          ) : undefined}
          empty={<EmptyState title="Nenhum tipo de documento cadastrado." />} />
      </ListCard>
    </>
  );
}
