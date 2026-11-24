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
import ListFooter from "@/components/general-components/ListFooter";
import StatusChips from "@/components/general-components/StatusChips";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import { errorMessage } from "../../comercial/-shared/commercial";
import { EMPLOYEES_ABILITY, EMPLOYEES_KEY, EMPLOYEE_OPTIONS_KEY, EmployeeList, EmployeeOptions, employeesApi } from "../-shared/employees";
import { employeeColumns } from "./-components/employeeColumns";

export const Route = createFileRoute("/_authenticated/rh/_funcionarios/funcionarios")({
  component: EmployeesPage,
});

const LIMIT = 20;
const STATUS_COLOR: Record<string, string> = { ativo: "#22c55e", ferias: "#3b82f6", afastado: "#f59e0b", suspenso: "#ef4444", indisponivel: "#f59e0b", desligado: "#6b7280" };

/** Funcionários: quem trabalha para a empresa, a função de cada um e a situação de hoje. */
function EmployeesPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const params = { page, limit: LIMIT, ...(status ? { status } : {}), ...(professionalId ? { professionalId } : {}), ...(search.trim() ? { search: search.trim() } : {}) };
  const { data, isLoading, error } = useQuery({
    queryKey: [EMPLOYEES_KEY, params],
    queryFn: () => employeesApi.get<EmployeeList>("", params),
    placeholderData: (previous) => previous,
  });
  const { data: options } = useQuery({ queryKey: [EMPLOYEE_OPTIONS_KEY], queryFn: () => employeesApi.get<EmployeeOptions>("options") });
  const open = (id: number | "novo") => navigate({ to: "/rh/funcionarios/$employeeId", params: { employeeId: String(id) } });

  if (!can(`view_${EMPLOYEES_ABILITY}`)) return null;
  const summary = data?.summary ?? {};
  const working = Object.entries(summary).reduce((sum, [key, count]) => (key === "desligado" ? sum : sum + (count ?? 0)), 0);
  const empty = search || status || professionalId ? "Nenhum funcionário com esses filtros." : "Nenhum funcionário cadastrado ainda.";

  const canCreate = can(`create_${EMPLOYEES_ABILITY}`);

  return (
    <>
      <PageHeader title="Funcionários" description="Quem trabalha para a empresa, a função de cada um e a situação de hoje." />

      <ListCard>
        <StatusChips value={status} onChange={(value) => { setStatus(value); setPage(0); }}
          options={[
            { value: "", label: "Todos em atividade", count: working },
            ...(options?.statuses ?? []).map(({ id, name }) => ({ value: id as string, label: name, count: summary[id] ?? 0, color: STATUS_COLOR[id] })),
          ]} />
        <ListToolbar search={{ value: search, onChange: (text) => { setSearch(text); setPage(0); }, placeholder: options?.canSeePersonal ? "Buscar por nome, matrícula ou CPF..." : "Buscar por nome ou matrícula..." }}>
          <div className="w-48 sm:w-60">
            <Select name="professionalId" state={professionalId} clearable placeholder="Todas as funções" modal={false} options={options?.professionals ?? []}
              onChange={(_, value) => { setProfessionalId(String(value ?? "")); setPage(0); }} />
          </div>
          {canCreate && <Button onClick={() => open("novo")}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Novo funcionário</span></Button>}
        </ListToolbar>

        <DataTable rows={data?.rows} columns={employeeColumns} getRowId={(row) => row.id} ariaLabel="Funcionários" minWidth={880}
          loading={isLoading} error={error ? errorMessage(error) : null} onRowClick={(row) => open(row.id)}
          empty={search || status || professionalId
            ? <EmptyState icon="search-x" title={empty} />
            : <EmptyState title={empty} action={canCreate && <Button size="sm" onClick={() => open("novo")}><Icon name="plus" className="w-4 h-4" /> Novo funcionário</Button>} />} />

        <ListFooter total={data?.total ?? 0} page={page} limit={LIMIT} limits={[LIMIT]} onPageChange={setPage} />
        {(summary.desligado ?? 0) > 0 && !status && (
          <p className="text-xs text-muted-foreground">{summary.desligado} desligado(s) não aparecem aqui; filtre por "Desligado" para ver.</p>
        )}
      </ListCard>
    </>
  );
}
