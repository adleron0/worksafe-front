import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Pagination from "@/components/general-components/Pagination";
import Select from "@/components/general-components/Select";
import { formatPHONE } from "@/utils/phone-mask";
import { dateBr, errorMessage } from "../../comercial/-shared/commercial";
import { EMPLOYEES_ABILITY, EMPLOYEES_KEY, EMPLOYEE_OPTIONS_KEY, EmployeeList, EmployeeOptions, EmployeeStatusBadge, employeesApi } from "../-shared/employees";

export const Route = createFileRoute("/_authenticated/rh/_funcionarios/funcionarios")({
  component: EmployeesPage,
});

const LIMIT = 20;

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

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Funcionários</h1>
          <p className="text-sm text-muted-foreground">Quem trabalha para a empresa, a função de cada um e a situação de hoje.</p>
        </div>
        {can(`create_${EMPLOYEES_ABILITY}`) && <Button onClick={() => open("novo")}><Icon name="plus" className="w-4 h-4 mr-1" /> Novo funcionário</Button>}
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center gap-3 my-4 p-4 rounded-lg border">
        <div className="w-full xl:w-60">
          <Select name="status" state={status} clearable placeholder={`Todos em atividade (${working})`} modal={false}
            options={(options?.statuses ?? []).map(({ id, name }) => ({ id, name: `${name} (${summary[id] ?? 0})` }))}
            onChange={(_, value) => { setStatus(String(value ?? "")); setPage(0); }} />
        </div>
        <div className="w-full xl:w-60">
          <Select name="professionalId" state={professionalId} clearable placeholder="Todas as funções" modal={false} options={options?.professionals ?? []}
            onChange={(_, value) => { setProfessionalId(String(value ?? "")); setPage(0); }} />
        </div>
        <div className="w-full xl:w-80">
          <Input name="search" value={search} onValueChange={(_, value) => { setSearch(String(value)); setPage(0); }} placeholder={options?.canSeePersonal ? "Buscar por nome, matrícula ou CPF..." : "Buscar por nome ou matrícula..."} icon="search" />
        </div>
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}

      {!error && (
        <div className="rounded-lg border overflow-hidden">
          <div className="hidden xl:flex items-center py-2 px-4 bg-primary font-semibold text-sm text-inverse-foreground">
            <div className="flex-1">Funcionário</div>
            <div className="w-64">Função</div>
            <div className="w-56">Situação</div>
            <div className="w-40">Telefone</div>
            <div className="w-28">Admissão</div>
          </div>
          {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 w-full my-1" />)}
          {!isLoading && !data?.rows.length && <p className="p-6 text-sm text-muted-foreground">{empty}</p>}
          {data?.rows.map((row) => (
            <button key={row.id} type="button" onClick={() => open(row.id)}
              className="w-full text-left flex flex-col xl:flex-row xl:items-center gap-1 xl:gap-0 px-4 py-3 border-b last:border-b-0 text-sm hover:bg-muted/40">
              <div className="flex-1 min-w-0 xl:pr-4">
                <p className="font-medium truncate">{row.name}</p>
                <p className="text-xs text-muted-foreground truncate">{[row.registration && `matrícula ${row.registration}`, row.hasUser && "tem acesso ao sistema"].filter(Boolean).join(" · ") || "—"}</p>
              </div>
              <div className="xl:w-64 min-w-0 xl:pr-4">
                <p className="truncate">{row.primaryRole ?? <span className="text-muted-foreground">Sem função</span>}</p>
                {row.roles.length > 1 && <p className="text-xs text-muted-foreground truncate">também {row.roles.filter((role) => !role.isPrimary).map((role) => role.name).join(", ")}</p>}
              </div>
              <div className="xl:w-56"><EmployeeStatusBadge status={row.status} label={row.statusLabel} until={row.statusUntil} /></div>
              <div className="xl:w-40 text-muted-foreground tabular-nums">{row.phone ? formatPHONE(row.phone) : "—"}</div>
              <div className="xl:w-28 text-muted-foreground tabular-nums">{dateBr(row.admissionDate)}</div>
            </button>
          ))}
        </div>
      )}
      {data && data.total > LIMIT && (
        <div className="mt-4"><Pagination totalItems={data.total} itemsPerPage={LIMIT} currentPage={page} onPageChange={setPage} maxVisiblePages={5} /></div>
      )}
      {(summary.desligado ?? 0) > 0 && !status && (
        <p className="mt-3 text-xs text-muted-foreground">{summary.desligado} desligado(s) não aparecem aqui; filtre por "Desligado" para ver.</p>
      )}
    </>
  );
}
