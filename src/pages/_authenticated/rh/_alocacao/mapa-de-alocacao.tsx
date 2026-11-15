import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import TimelineView, { TimelineRow } from "@/components/general-components/TimelineView";
import { dateBr, errorMessage, todayIso } from "../../comercial/-shared/commercial";
import { ALLOCATION_ABILITY, ALLOCATION_KEY, Allocation, addDays, overlaps, spanColor, spanText } from "../-shared/allocation";
import { EmployeeStatusBadge, employeesApi } from "../-shared/employees";

export const Route = createFileRoute("/_authenticated/rh/_alocacao/mapa-de-alocacao")({
  component: AllocationPage,
});

const WINDOWS = [{ id: "14", name: "2 semanas" }, { id: "28", name: "4 semanas" }, { id: "56", name: "8 semanas" }, { id: "91", name: "3 meses" }];

/** Mapa de alocação: quem está em qual obra, quem está livre e quem está indisponível. */
function AllocationPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const [from, setFrom] = useState(() => addDays(todayIso(), -3));
  const [size, setSize] = useState("28");
  const [roleId, setRoleId] = useState("");
  // "quem está livre de tal dia a tal dia?"
  const [freeFrom, setFreeFrom] = useState("");
  const [freeTo, setFreeTo] = useState("");

  const to = addDays(from, Number(size) - 1);
  const params = { from, to };
  const { data, isLoading, error } = useQuery({ queryKey: [ALLOCATION_KEY, params], queryFn: () => employeesApi.get<Allocation>("allocation", params), placeholderData: (previous) => previous });

  if (!can(`view_${ALLOCATION_ABILITY}`)) return null;
  const openOrder = (orderId: number) => navigate({ to: "/servicos/ordens-de-servico/$orderId", params: { orderId: String(orderId) } });
  const openEmployee = (id: number) => navigate({ to: "/rh/funcionarios/$employeeId", params: { employeeId: String(id) } });

  const searching = !!freeFrom;
  const searchTo = freeTo || freeFrom;
  const roles = new Map<number, string>();
  for (const employee of data?.employees ?? []) for (const role of employee.roles) roles.set(role.id, role.name);
  const employees = (data?.employees ?? []).filter((employee) => !roleId || employee.roles.some((role) => String(role.id) === roleId));
  /** Livre no período procurado: sem obra, sem indisponibilidade e ainda na empresa. */
  const isFree = (id: number, terminationDate: string | null) => searching
    && !(data?.spans ?? []).some((span) => span.employeeId === id && span.start && overlaps(span.start, span.end, freeFrom, searchTo))
    && !(data?.unavailable ?? []).some((item) => item.employeeId === id && overlaps(item.start, item.end, freeFrom, searchTo))
    && !(terminationDate && terminationDate <= searchTo);
  const free = employees.filter((employee) => isFree(employee.id, employee.terminationDate));
  const outside = searching && data && (freeFrom < data.from || searchTo > data.to);

  const rows: TimelineRow[] = employees.map((employee) => ({
    id: employee.id, title: employee.name, subtitle: employee.primaryRole ?? "Sem função", onTitleClick: () => openEmployee(employee.id), highlight: isFree(employee.id, employee.terminationDate),
    bars: (data?.spans ?? []).filter((span) => span.employeeId === employee.id && span.start).map((span) => ({
      id: span.orderId, start: span.start as string, end: span.end ?? (span.start as string), label: `${span.number}${span.customer ? ` · ${span.customer}` : ""}`, color: spanColor(span),
      hint: `${span.number} · ${span.title} · ${spanText(span.start, span.end)}`, onClick: () => openOrder(span.orderId),
    })),
    bands: (data?.unavailable ?? []).filter((item) => item.employeeId === employee.id).map((item, index) => ({ id: index, start: item.start, end: item.end, label: item.label })),
    marks: (data?.worked ?? []).filter((row) => row.employeeId === employee.id).map((row) => ({ date: row.date, hint: `Trabalhou ${row.hours} h` })),
  }));
  // hoje: quem está em obra e quem está livre (a visão do celular)
  const todayOf = (id: number) => (data?.spans ?? []).filter((span) => span.employeeId === id && span.start && overlaps(span.start, span.end, data!.today, data!.today));
  const awayToday = (id: number) => (data?.unavailable ?? []).find((item) => item.employeeId === id && overlaps(item.start, item.end, data!.today, data!.today));

  return (
    <>
      <div>
        <h1 className="text-xl font-bold">Mapa de alocação</h1>
        <p className="text-sm text-muted-foreground">Onde cada funcionário está escalado, quem está livre e quem está de férias ou afastado. Sai da equipe das ordens de serviço, dos RDOs e do histórico.</p>
      </div>

      <div className="my-4 grid gap-3 rounded-lg border p-4 lg:grid-cols-[auto_auto_1fr_auto] lg:items-end">
        <div>
          <Label className="text-xs">A partir de</Label>
          <div className="mt-1 flex items-center gap-1">
            <Button type="button" variant="outline" size="sm" className="h-9 w-9 p-0" aria-label="Voltar uma semana" onClick={() => setFrom(addDays(from, -7))}><Icon name="chevron-left" className="w-4 h-4" /></Button>
            <CalendarPicker mode="single" name="from" className="w-40" value={from} fromYear={2024} toYear={2040} onValueChange={(_, value) => { if (value) setFrom(String(value)); }} />
            <Button type="button" variant="outline" size="sm" className="h-9 w-9 p-0" aria-label="Avançar uma semana" onClick={() => setFrom(addDays(from, 7))}><Icon name="chevron-right" className="w-4 h-4" /></Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setFrom(addDays(todayIso(), -3))}>Hoje</Button>
          </div>
        </div>
        <div className="w-full lg:w-40">
          <Label className="text-xs">Mostrar</Label>
          <Select name="size" options={WINDOWS} state={size} modal={false} onChange={(_, value) => setSize(String(value ?? "28"))} placeholder="Período" />
        </div>
        <div className="w-full lg:max-w-xs">
          <Label className="text-xs">Função</Label>
          <Select name="roleId" options={[...roles.entries()].map(([id, name]) => ({ id: String(id), name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))} state={roleId} clearable modal={false} placeholder="Todas as funções"
            onChange={(_, value) => setRoleId(String(value ?? ""))} />
        </div>
        <div>
          <Label className="text-xs">Quem está livre de / até</Label>
          <div className="mt-1 flex items-center gap-1">
            <CalendarPicker mode="single" name="freeFrom" className="w-36" value={freeFrom} placeholder="De" fromYear={2024} toYear={2040} onValueChange={(_, value) => setFreeFrom(String(value ?? ""))} />
            <CalendarPicker mode="single" name="freeTo" className="w-36" value={freeTo} placeholder="Até" fromYear={2024} toYear={2040} onValueChange={(_, value) => setFreeTo(String(value ?? ""))} />
          </div>
        </div>
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {isLoading && <Skeleton className="h-64 w-full" />}

      {searching && data && (
        <div className="mb-4 rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm">
          <p className="font-semibold">{free.length} {free.length === 1 ? "pessoa livre" : "pessoas livres"} de {spanText(freeFrom, searchTo)}{roleId ? ` na função ${roles.get(Number(roleId))}` : ""}</p>
          {free.length > 0 && <p className="mt-1 text-muted-foreground">{free.map((employee) => `${employee.name}${employee.primaryRole ? ` (${employee.primaryRole})` : ""}`).join(" · ")}</p>}
          {outside && <p className="mt-1 text-amber-700 dark:text-amber-400">As datas procuradas passam do período mostrado ({dateBr(data.from)} a {dateBr(data.to)}): aumente o período ou mude o início para a resposta valer.</p>}
        </div>
      )}

      {data && (
        <>
          {/* telas largas: o mapa */}
          <div className="hidden md:block">
            <TimelineView from={data.from} to={data.to} today={data.today} rows={rows} focus={searching ? { start: freeFrom, end: searchTo } : null}
              emptyMessage={roleId ? "Ninguém com essa função." : "Nenhum funcionário cadastrado. Cadastre em RH → Funcionários."} />
            <p className="mt-2 text-xs text-muted-foreground">Barra: escalado na obra (mais clara enquanto a obra não começou). Ponto: dia com RDO lançado. Faixa listrada: férias, afastamento ou suspensão. Duas barras na mesma pessoa no mesmo dia são conflito de escala.</p>
          </div>
          {/* celular: quem está onde hoje */}
          <div className="md:hidden rounded-lg border">
            <h2 className="border-b px-4 py-3 font-semibold">Hoje, {dateBr(data.today)}</h2>
            {!employees.length && <p className="p-6 text-sm text-muted-foreground">Nenhum funcionário para mostrar.</p>}
            {employees.map((employee) => {
              const now = todayOf(employee.id);
              const away = awayToday(employee.id);
              return (
                <button key={employee.id} type="button" onClick={() => openEmployee(employee.id)} className="flex w-full flex-col gap-1 border-b px-4 py-3 text-left text-sm last:border-b-0">
                  <span className="font-medium">{employee.name}</span>
                  <span className="text-xs text-muted-foreground">{employee.primaryRole ?? "Sem função"}</span>
                  {away ? <span className="text-xs text-amber-700 dark:text-amber-400">{away.label} ({spanText(away.start, away.end)})</span>
                    : now.length ? now.map((span) => <span key={span.orderId} className="text-xs">Em {span.number}{span.customer ? ` · ${span.customer}` : ""} ({spanText(span.start, span.end)})</span>)
                    : <span className="text-xs text-green-700 dark:text-green-400">Livre</span>}
                </button>
              );
            })}
          </div>

          {data.undated.length > 0 && (
            <section className="mt-4 rounded-lg border">
              <h2 className="border-b px-4 py-3 font-semibold">Escalados em obra ainda sem data</h2>
              {data.undated.filter((span) => employees.some((employee) => employee.id === span.employeeId)).map((span) => (
                <button key={`${span.employeeId}-${span.orderId}`} type="button" onClick={() => openOrder(span.orderId)} className="flex w-full flex-wrap items-center gap-2 border-b px-4 py-2 text-left text-sm last:border-b-0 hover:bg-muted/40">
                  <span className="font-medium">{data.employees.find((employee) => employee.id === span.employeeId)?.name}</span>
                  <span className="text-muted-foreground">{span.number} · {span.title}</span>
                </button>
              ))}
            </section>
          )}
          {data.employees.some((employee) => employee.status !== "ativo") && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">Hoje: {data.employees.filter((employee) => employee.status !== "ativo").map((employee) => <span key={employee.id} className="inline-flex items-center gap-1">{employee.name} <EmployeeStatusBadge status={employee.status} label={employee.statusLabel} until={employee.statusUntil} /></span>)}</p>
          )}
        </>
      )}
    </>
  );
}
