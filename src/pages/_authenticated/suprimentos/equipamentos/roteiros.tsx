import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import StatusBadge from "@/components/general-components/StatusBadge";
import RowActions from "../-shared/row-actions";
import { errorMessage } from "../../comercial/-shared/commercial";
import { stockApi } from "../-shared/stock";
import { EQUIP_KEYS, PERM_INSPECT, Template } from "../-shared/equipment";

export const Route = createFileRoute("/_authenticated/suprimentos/equipamentos/roteiros")({
  component: TemplatesPage,
});

/** Roteiros de inspeção: as perguntas que o inspetor responde em cada tipo de equipamento. */
function TemplatesPage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const navigate = useNavigate();
  const openNew = () => navigate({ to: "/suprimentos/equipamentos/roteiros/novo" });
  const editRow = (template: Template) => navigate({ to: "/suprimentos/equipamentos/roteiros/$templateId", params: { templateId: String(template.id) } });
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [EQUIP_KEYS.templates, showInactive],
    queryFn: () => stockApi.get<Template[]>("inspection-templates", showInactive ? { all: "1" } : undefined),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: [EQUIP_KEYS.templates] });
  const { mutate: toggle } = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => stockApi.put<Template>(`inspection-templates/${id}`, { active }),
    onSuccess: (row) => { refresh(); toast({ title: row.active ? "Roteiro reativado" : "Roteiro inativado", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível alterar o roteiro", description: errorMessage(err), variant: "destructive" }),
  });
  if (!(can(`view_${PERM_INSPECT}`) || can(PERM_INSPECT) || can("view_equipamentos"))) return null;
  const canWrite = can(PERM_INSPECT);

  const columns: DataColumn<Template>[] = [
    {
      id: "name", header: "Roteiro", cell: (template) => (
        <div className="min-w-0 max-w-xl">
          <p className="font-medium flex items-center gap-2">{template.name} {!template.active && <StatusBadge tone="neutral">Inativo</StatusBadge>}</p>
          <p className="text-xs text-muted-foreground truncate">{template.items.map((q) => q.label).join(" · ")}</p>
        </div>
      ),
    },
    { id: "items", header: "Perguntas", className: "w-32 text-muted-foreground whitespace-nowrap", cell: (template) => `${template.items.length} pergunta(s)` },
  ];

  return (
    <>
      <PageHeader title="Roteiros de inspeção" description="As perguntas de cada inspeção. Os roteiros iniciais são um ponto de partida: revise com o responsável técnico." />
      <ListCard>
        <ListToolbar>
          <div className="flex items-center gap-2">
            <Checkbox id="showInactive" checked={showInactive} onCheckedChange={(checked) => setShowInactive(checked === true)} />
            <Label htmlFor="showInactive">Mostrar inativos</Label>
          </div>
          {canWrite && <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> Novo roteiro</Button>}
        </ListToolbar>
        <DataTable rows={data} columns={columns} getRowId={(template) => template.id} ariaLabel="Roteiros de inspeção" skeletonRows={4} minWidth={560}
          loading={isLoading} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
          rowClassName={(template) => (template.active ? undefined : "opacity-60")}
          onRowClick={canWrite ? editRow : undefined}
          actions={canWrite ? (template) => (
            <RowActions label={`Ações do roteiro ${template.name}`} actions={[
              { id: "edit", label: "Editar", icon: "pencil", onSelect: () => editRow(template) },
              { id: "toggle", label: template.active ? "Inativar" : "Reativar", icon: template.active ? "archive" : "archive-restore", separator: true, onSelect: () => toggle({ id: template.id, active: !template.active }) },
            ]} />
          ) : undefined}
          empty={<EmptyState title="Nenhum roteiro." />} />
      </ListCard>
    </>
  );
}
