import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { FILES_ABILITY, FILES_KEY, FileType, filesApi } from "../-shared/files";
import DocumentTypeRowActions from "../../rh/_documentos/-components/DocumentTypeRowActions";

export const Route = createFileRoute("/_authenticated/arquivos/_pastas/tipos-de-documento")({
  component: FileTypesPage,
});

const COLUMNS: DataColumn<FileType>[] = [
  { id: "name", header: "Tipo", className: "min-w-[220px]", cell: (type) => <p className="font-medium truncate max-w-[20rem]">{type.name}</p> },
  {
    id: "validity", header: "Validade",
    cell: (type) => <span className="text-muted-foreground whitespace-nowrap">{type.expires ? `Vence${type.validityMonths ? ` em ${type.validityMonths} ${type.validityMonths === 1 ? "mês" : "meses"}` : ""} · aviso ${type.warnDays} dias antes` : "Não vence"}</span>,
  },
  { id: "required", header: "Obrigatório", cell: (type) => (type.required ? <TagBadge icon="asterisk">Obrigatório</TagBadge> : <span className="text-muted-foreground">—</span>) },
];

/** Tipos de documento da empresa: se vence, a validade sugerida, quando avisar e se é obrigatório ter um vigente. */
function FileTypesPage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const openNew = () => navigate({ to: "/arquivos/tipos-de-documento/novo" });
  const editRow = (type: FileType) => navigate({ to: "/arquivos/tipos-de-documento/$typeId", params: { typeId: String(type.id) } });
  const canManage = can(`manage_${FILES_ABILITY}`);

  const { data, isLoading, error } = useQuery({ queryKey: [FILES_KEY, "types"], queryFn: () => filesApi.get<{ rows: FileType[] }>("types") });
  const refresh = () => queryClient.invalidateQueries({ queryKey: [FILES_KEY] });
  const { mutate: inactivate } = useMutation({
    mutationFn: (id: number) => filesApi.patch<FileType>(`types/${id}/inactive`),
    onSuccess: () => { refresh(); toast({ title: "Tipo de documento inativado", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível inativar", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`view_${FILES_ABILITY}`)) return null;

  return (
    <>
      <PageHeader title="Tipos de documento" description="Os documentos da empresa que têm validade ou que não podem faltar. As validades são sugestões: confira com o que cada documento diz." />

      <ListCard>
        <ListToolbar>
          <Button asChild variant="outline"><Link to="/arquivos/vencimentos"><Icon name="calendar-clock" className="w-4 h-4" /> <span className="hidden sm:inline">Vencimentos</span></Link></Button>
          {canManage && <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Novo tipo</span></Button>}
        </ListToolbar>
        <DataTable rows={data?.rows} columns={COLUMNS} getRowId={(type) => type.id} ariaLabel="Tipos de documento" minWidth={640}
          loading={isLoading} error={error ? errorMessage(error) : null}
          onRowClick={canManage ? editRow : undefined}
          actions={canManage ? (type) => (
            <DocumentTypeRowActions name={type.name} onEdit={() => editRow(type)} onInactivate={() => inactivate(type.id)}
              inactivateDescription="O tipo deixa de poder ser escolhido e de ser cobrado como obrigatório. Os arquivos que já o usam continuam com ele." />
          ) : undefined}
          empty={<EmptyState title="Nenhum tipo de documento." />} />
      </ListCard>
    </>
  );
}
