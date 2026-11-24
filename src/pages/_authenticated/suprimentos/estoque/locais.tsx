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
import { errorMessage } from "../../comercial/-shared/commercial";
import RowActions from "../-shared/row-actions";
import { Location, STOCK_ABILITY, STOCK_KEYS, stockApi } from "../-shared/stock";

export const Route = createFileRoute("/_authenticated/suprimentos/estoque/locais")({
  component: LocationsPage,
});

/** Locais de estoque: almoxarifado, container, veículo... de onde o material sai e para onde volta. */
function LocationsPage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showInactive, setShowInactive] = useState(false);
  const openNew = () => navigate({ to: "/suprimentos/estoque/locais/novo" });
  const editRow = (row: Location) => navigate({ to: "/suprimentos/estoque/locais/$locationId", params: { locationId: String(row.id) } });
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [STOCK_KEYS.locations, showInactive],
    queryFn: () => stockApi.get<Location[]>("locations", showInactive ? { all: "1" } : undefined),
  });
  const refresh = () => { for (const key of [STOCK_KEYS.locations, STOCK_KEYS.options]) queryClient.invalidateQueries({ queryKey: [key] }); };
  const { mutate: toggle } = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => stockApi.patch<{ ok: boolean }>(`locations/${id}/${active ? "active" : "inactive"}`),
    onSuccess: (_, { active }) => { refresh(); toast({ title: active ? "Local reativado" : "Local inativado", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível alterar o local", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`view_${STOCK_ABILITY}`)) return null;
  const rows = data ?? [];

  const columns: DataColumn<Location>[] = [
    {
      id: "name", header: "Local", cell: (row) => (
        <div className="min-w-0 max-w-sm">
          <p className="font-medium flex items-center gap-2">{row.name} {!row.active && <StatusBadge tone="neutral">Inativo</StatusBadge>}</p>
          {row.notes && <p className="text-xs text-muted-foreground truncate">{row.notes}</p>}
        </div>
      ),
    },
    { id: "kind", header: "Tipo", className: "text-muted-foreground whitespace-nowrap", cell: (row) => row.kindLabel },
    { id: "place", header: "Lugar", className: "text-muted-foreground", cell: (row) => <span className="truncate block max-w-[13rem]">{row.place ?? "—"}</span> },
    { id: "responsible", header: "Responsável", className: "text-muted-foreground", cell: (row) => <span className="truncate block max-w-[11rem]">{row.responsible ?? "Sem responsável"}</span> },
    { id: "items", header: "Itens", align: "right", className: "w-24 tabular-nums whitespace-nowrap", cell: (row) => `${row.items} item(ns)` },
  ];
  const actions = (row: Location) => (
    <RowActions label={`Ações do local ${row.name}`} actions={[
      { id: "edit", label: "Editar", icon: "pencil", hidden: !can(`update_${STOCK_ABILITY}`), onSelect: () => editRow(row) },
      { id: "inactive", label: "Inativar", icon: "archive", hidden: !(row.active && can(`inactive_${STOCK_ABILITY}`)), separator: true, onSelect: () => toggle({ id: row.id, active: false }),
        confirm: { title: `Inativar "${row.name}"?`, description: "Só dá para inativar um local sem saldo: transfira o que estiver nele antes." } },
      { id: "active", label: "Reativar", icon: "archive-restore", hidden: !(!row.active && can(`activate_${STOCK_ABILITY}`)), separator: true, onSelect: () => toggle({ id: row.id, active: true }) },
    ]} />
  );

  return (
    <>
      <PageHeader title="Locais de estoque" description="Onde o material fica guardado. Obras, funcionários e locações não entram aqui: o sistema controla à parte." />
      <ListCard>
        <ListToolbar>
          <div className="flex items-center gap-2 mr-auto">
            <Checkbox id="showInactive" checked={showInactive} onCheckedChange={(checked) => setShowInactive(checked === true)} />
            <Label htmlFor="showInactive">Mostrar inativos</Label>
          </div>
          {can(`create_${STOCK_ABILITY}`) && <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> Novo local</Button>}
        </ListToolbar>
        <DataTable rows={rows} columns={columns} getRowId={(row) => row.id} ariaLabel="Locais de estoque" skeletonRows={3}
          loading={isLoading} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
          rowClassName={(row) => (row.active ? undefined : "opacity-60")} actions={actions}
          onRowClick={can(`update_${STOCK_ABILITY}`) ? editRow : undefined}
          empty={<EmptyState title="Nenhum local de estoque ainda." />} />
      </ListCard>
    </>
  );
}
