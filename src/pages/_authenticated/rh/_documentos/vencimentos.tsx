import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import { cn } from "@/lib/utils";
import { Tip, errorMessage } from "../../comercial/-shared/commercial";
import { DOCS_ABILITY, DOCS_EXPIRING_KEY, ExpiringList, documentsApi, openDocument } from "../-shared/documents";
import { expiringColumns } from "./-components/expiringColumns";

export const Route = createFileRoute("/_authenticated/rh/_documentos/vencimentos")({
  component: ExpiringPage,
});

const CARDS = [
  { id: "vencido", title: "Vencidos", hint: "A validade já passou", icon: "circle-alert" },
  { id: "a_vencer", title: "A vencer", hint: "Dentro do prazo de aviso de cada tipo", icon: "calendar-clock" },
  { id: "faltando", title: "Obrigatórios faltando", hint: "Ainda não foram enviados", icon: "file-question" },
] as const;

/** Vencimentos: só o que pede ação nos documentos de quem está na empresa. */
function ExpiringPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [typeId, setTypeId] = useState("");
  const [search, setSearch] = useState("");

  const params = { ...(status ? { status } : {}), ...(typeId ? { typeId } : {}), ...(search.trim() ? { search: search.trim() } : {}) };
  const { data, isLoading, error } = useQuery({
    queryKey: [DOCS_EXPIRING_KEY, params],
    queryFn: () => documentsApi.get<ExpiringList>("expiring", params),
    placeholderData: (previous) => previous,
  });

  if (!can(`view_${DOCS_ABILITY}`)) return null;
  const empty = status || typeId || search ? "Nada com esses filtros." : "Nenhum documento vencido, a vencer ou faltando. Tudo em dia.";

  return (
    <>
      <PageHeader title="Vencimentos" description="Documentos de funcionários vencidos, a vencer e obrigatórios que ainda não foram enviados." />

      <div className="mb-4 grid sm:grid-cols-3 gap-3">
        {CARDS.map((card) => (
          <button key={card.id} type="button" aria-pressed={status === card.id} onClick={() => setStatus(status === card.id ? "" : card.id)}
            className={cn("rounded-card border bg-card p-4 text-left transition-colors hover:bg-muted/40", status === card.id && "border-primary bg-primary/5")}>
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Icon name={card.icon} className="w-4 h-4" /> {card.title}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{data?.summary[card.id] ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{card.hint}</p>
          </button>
        ))}
      </div>

      <ListCard>
        <ListToolbar search={{ value: search, onChange: setSearch, placeholder: "Buscar pelo nome do funcionário..." }}>
          <div className="w-56 sm:w-72">
            <Select name="typeId" state={typeId} clearable placeholder="Todos os tipos de documento" modal={false} options={data?.types ?? []} onChange={(_, value) => setTypeId(String(value ?? ""))} />
          </div>
        </ListToolbar>
        <DataTable rows={data?.rows} columns={expiringColumns} getRowId={(row) => row.key} ariaLabel="Vencimentos" minWidth={760}
          loading={isLoading} error={error ? errorMessage(error) : null}
          onRowClick={(row) => navigate({ to: "/rh/funcionarios/$employeeId", params: { employeeId: String(row.employee.id) } })}
          actions={(row) => row.documentId && (
            <Tip text="Ver documento">
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Ver ${row.typeName} de ${row.employee.name}`}
                onClick={() => openDocument({ id: row.documentId as number, fileName: row.typeName })}><Icon name="eye" className="w-4 h-4" /></Button>
            </Tip>
          )}
          empty={<EmptyState icon={status || typeId || search ? "search-x" : "circle-check"} title={empty} />} />
        {data && data.total > data.rows.length && <p className="text-xs text-muted-foreground">Mostrando {data.rows.length} de {data.total}. Use os filtros para chegar aos demais.</p>}
      </ListCard>
    </>
  );
}
