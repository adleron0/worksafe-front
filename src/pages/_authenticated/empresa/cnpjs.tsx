import { createFileRoute, useNavigate } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import StatusBadge from "@/components/general-components/StatusBadge";
import TagBadge from "@/components/general-components/TagBadge";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import { CompanyEntity, ENTITY_KINDS, formatCnpj, useEntities } from "@/components/general-components/EntitySelect";
import { Button } from "@/components/ui/button";
import { errorMessage } from "../comercial/-shared/commercial";

export const Route = createFileRoute("/_authenticated/empresa/cnpjs")({
  component: EntitiesPage,
});

/** Empresas do grupo: os CNPJs da WorkSafe (Treinamentos, Serviços...) num sistema só. */
function EntitiesPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const { all, isLoading, error, refetch } = useEntities(true);
  if (!can("config_empresas_grupo")) return null;
  const open = (row: CompanyEntity) => navigate({ to: "/empresa/cnpjs/$entityId", params: { entityId: String(row.id) } });

  const columns: DataColumn<CompanyEntity>[] = [
    {
      id: "name", header: "Empresa", className: "min-w-[240px]",
      cell: (row) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="size-2.5 rounded-full shrink-0" style={{ background: row.color ?? "hsl(var(--border))" }} />
          <div className="min-w-0">
            <p className="font-semibold truncate">{row.tradeName}</p>
            <p className="text-xs text-muted-foreground truncate">{row.corporateName}</p>
          </div>
        </div>
      ),
    },
    { id: "cnpj", header: "CNPJ", cell: (row) => <span className="tabular-nums whitespace-nowrap">{formatCnpj(row.cnpj)}</span> },
    {
      id: "kinds", header: "Frentes",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.kinds.length ? row.kinds.map((k) => <TagBadge key={k}>{ENTITY_KINDS.find((x) => x.id === k)?.name ?? k}</TagBadge>) : <span className="text-xs text-muted-foreground">nenhuma</span>}
        </div>
      ),
    },
    { id: "city", header: "Cidade", cell: (row) => <span className="text-muted-foreground whitespace-nowrap">{row.cityName ? `${row.cityName}/${row.uf ?? ""}` : "—"}</span> },
    {
      id: "status", header: "Situação",
      cell: (row) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <StatusBadge tone={row.active ? "success" : "neutral"} pulse={false}>{row.active ? "Ativo" : "Inativo"}</StatusBadge>
          {row.isDefault && <TagBadge icon="star">padrão</TagBadge>}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Empresas do grupo" description="Os CNPJs da WorkSafe. Cada nota, conta bancária, proposta, curso e funcionário diz de qual CNPJ é." className="mb-0" />
      <ListCard className="mt-3">
        <div className="flex justify-end">
          <Button onClick={() => navigate({ to: "/empresa/cnpjs/novo" })}><Icon name="plus" className="w-4 h-4" /> Novo CNPJ</Button>
        </div>
        <DataTable rows={all} columns={columns} getRowId={(row) => row.id} ariaLabel="Empresas do grupo" minWidth={760}
          loading={isLoading} error={error ? errorMessage(error) : null} onRetry={() => refetch()} onRowClick={open}
          rowClassName={(row) => (row.active ? undefined : "opacity-60")}
          empty={<EmptyState title="Nenhum CNPJ cadastrado." />} />
      </ListCard>
      <p className="mt-3 text-xs text-muted-foreground">
        Com um CNPJ só, o sistema funciona como sempre. Ao cadastrar o segundo, aparece o campo "Empresa" nos cadastros e o filtro nas listas e relatórios.
      </p>
    </>
  );
}
