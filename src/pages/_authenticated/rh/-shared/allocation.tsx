import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import TimelineView from "@/components/general-components/TimelineView";
import { dateBr, errorMessage } from "../../comercial/-shared/commercial";
import { EmployeeRow, employeesApi } from "./employees";

/** Alocação dos funcionários: tipos (espelham a API) e o que é comum ao mapa e à ficha. */
export interface AllocationSpan {
  employeeId: number; orderId: number; number: string; title: string; status: string; role: string; start: string | null; end: string | null; customer: string | null; location: string | null;
  /** Parte do dia em que a pessoa está nesta obra. */
  shift?: "integral" | "manha" | "tarde" | "noite";
}
/** Atividade fora de OS de uma pessoa (aula, treinamento, atividade no CT...). */
export interface AllocationActivity {
  employeeId: number; activityId: number; typeId: number; typeName: string; color: string; occupies: boolean; location: string | null; notes: string | null;
  start: string; end: string; shift: "integral" | "manha" | "tarde" | "noite";
}
export interface AllocationClass {
  employeeId: number; classId: number; className: string; courseName: string | null; role: "instrutor" | "aluno"; location: string | null; start: string; end: string;
  shift: "integral" | "manha" | "tarde" | "noite";
}
export const CLASS_COLOR = { instrutor: "#7c3aed", aluno: "#0891b2" } as const;
export const CLASS_LABEL = { instrutor: "Aula", aluno: "Treinamento" } as const;
export interface Allocation {
  today: string; from: string; to: string; employees: EmployeeRow[]; spans: AllocationSpan[]; undated: AllocationSpan[];
  activities?: AllocationActivity[];
  /** Turmas em que a pessoa dá aula ou é aluna: saem do cadastro de turmas, pelo CPF. */
  classes?: AllocationClass[];
  unavailable: Array<{ employeeId: number; start: string; end: string | null; label: string }>;
  worked: Array<{ employeeId: number; date: string; orderId: number; hours: number }>;
}
export const ALLOCATION_KEY = "hrAllocation";
export const ALLOCATION_ABILITY = "alocacao";

export const addDays = (date: string, days: number) => new Date(new Date(`${date}T00:00:00.000Z`).getTime() + days * 86400000).toISOString().slice(0, 10);
export const overlaps = (aStart: string, aEnd: string | null, bStart: string, bEnd: string | null) => aStart <= (bEnd ?? "9999-12-31") && bStart <= (aEnd ?? "9999-12-31");
export const spanText = (start: string | null, end: string | null) => (!start ? "sem data marcada" : !end || end === start ? dateBr(start) : `${dateBr(start)} a ${dateBr(end)}`);

/** A parte do dia como a linha do tempo desenha. */
export const PART = { integral: "full", manha: "am", tarde: "pm", noite: "night" } as const;
export const PART_LABEL = { integral: "dia inteiro", manha: "manhã", tarde: "tarde", noite: "noite" } as const;

/** Uma cor por obra, sempre a mesma para a mesma OS. */
const COLORS = ["#2563eb", "#7c3aed", "#0891b2", "#c2410c", "#4d7c0f", "#be185d", "#0f766e", "#a16207"];
export const orderColor = (orderId: number) => COLORS[orderId % COLORS.length];
/** Obra ainda por começar aparece mais clara que a que está em andamento ou concluída. */
export const spanColor = (span: Pick<AllocationSpan, "orderId" | "status">) => (span.status === "em_execucao" || span.status === "concluida" || span.status === "encerrada" ? orderColor(span.orderId) : `color-mix(in oklab, ${orderColor(span.orderId)} 62%, white)`);

/** A aba Alocação da ficha: a linha do tempo da pessoa e a lista das obras. */
export function EmployeeAllocation({ employeeId }: { employeeId: number }) {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  // dos últimos dois meses aos próximos quatro
  const params = { from: addDays(today, -60), to: addDays(today, 120) };
  const { data, isLoading, error } = useQuery({ queryKey: [ALLOCATION_KEY, "employee", employeeId, params], queryFn: () => employeesApi.get<Allocation>(`${employeeId}/allocation`, params) });

  if (error) return <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>;
  if (isLoading || !data) return <div className="grid gap-3"><Skeleton className="h-28 w-full" /><Skeleton className="h-32 w-full" /></div>;
  const open = (orderId: number) => navigate({ to: "/servicos/ordens-de-servico/$orderId", params: { orderId: String(orderId) } });
  const openClass = (classId: number) => navigate({ to: "/treinamentos/turmas/$turmaId", params: { turmaId: String(classId) } });
  const employee = data.employees[0];
  const spans = [...data.spans].sort((a, b) => (b.start ?? "").localeCompare(a.start ?? ""));
  const hoursOf = (orderId: number) => data.worked.filter((row) => row.orderId === orderId).reduce((sum, row) => sum + row.hours, 0);
  const daysOf = (orderId: number) => data.worked.filter((row) => row.orderId === orderId).length;

  return (
    <div className="grid gap-4">
      <TimelineView from={data.from} to={data.to} today={data.today} dayWidth={22}
        rows={[{
          id: employee.id, title: employee.name, subtitle: employee.primaryRole ?? undefined,
          bars: [
            ...data.spans.filter((span) => span.start).map((span) => ({ id: `os${span.orderId}`, start: span.start as string, end: span.end ?? (span.start as string), label: span.number, color: spanColor(span), part: PART[span.shift ?? "integral"], hint: `${span.number} · ${span.title}`, onClick: () => open(span.orderId) })),
            ...(data.activities ?? []).map((item) => ({ id: `a${item.activityId}`, start: item.start, end: item.end, label: item.typeName, color: item.color, part: PART[item.shift], hint: [item.typeName, item.location].filter(Boolean).join(" · ") })),
            ...(data.classes ?? []).map((item) => ({ id: `c${item.classId}${item.role}`, start: item.start, end: item.end, label: `${CLASS_LABEL[item.role]}: ${item.className}`, color: CLASS_COLOR[item.role], part: PART[item.shift], hint: `${CLASS_LABEL[item.role]} · ${item.className}`, onClick: () => openClass(item.classId) })),
          ],
          bands: data.unavailable.map((item, index) => ({ id: index, start: item.start, end: item.end, label: item.label })),
          marks: data.worked.map((row) => ({ date: row.date, hint: `Trabalhou ${row.hours} h` })),
        }]} />
      <p className="-mt-2 text-xs text-muted-foreground">Barra: escalado na obra ou em atividade (meia altura: só manhã ou só tarde). Ponto: dia com RDO lançado para a pessoa. Faixa listrada: férias, afastamento ou suspensão.</p>
      {!!data.classes?.length && (
        <section className="rounded-lg border">
          <h2 className="border-b px-4 py-3 font-semibold">Turmas neste período</h2>
          {data.classes.map((item) => (
            <button key={`${item.classId}${item.role}`} type="button" onClick={() => openClass(item.classId)} className="flex w-full flex-col gap-1 border-b px-4 py-3 text-left text-sm last:border-b-0 hover:bg-muted/40 lg:flex-row lg:items-center lg:gap-0">
              <span className="flex min-w-0 flex-1 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CLASS_COLOR[item.role] }} /> <span className="font-medium">{item.className}</span> <span className="truncate text-muted-foreground">{[item.courseName, item.location].filter(Boolean).join(" · ")}</span></span>
              <span className="lg:w-56 text-muted-foreground">{spanText(item.start, item.end)}</span>
              <span className="lg:w-44 text-muted-foreground">{item.role === "instrutor" ? "dando aula" : "como aluno"}</span>
            </button>
          ))}
        </section>
      )}
      {!!data.activities?.length && (
        <section className="rounded-lg border">
          <h2 className="border-b px-4 py-3 font-semibold">Atividades neste período</h2>
          {data.activities.map((item) => (
            <div key={item.activityId} className="flex flex-col gap-1 border-b px-4 py-3 text-sm last:border-b-0 lg:flex-row lg:items-center lg:gap-0">
              <span className="flex min-w-0 flex-1 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /> <span className="font-medium">{item.typeName}</span> <span className="truncate text-muted-foreground">{[item.location, item.notes].filter(Boolean).join(" · ")}</span></span>
              <span className="lg:w-56 text-muted-foreground">{spanText(item.start, item.end)}</span>
              <span className="lg:w-44 text-muted-foreground">{PART_LABEL[item.shift]}</span>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-lg border">
        <h2 className="border-b px-4 py-3 font-semibold">Obras neste período</h2>
        {!spans.length && !data.undated.length && <p className="p-6 text-sm text-muted-foreground">Não foi escalado em nenhuma obra de {dateBr(data.from)} a {dateBr(data.to)}.</p>}
        {[...spans, ...data.undated].map((span) => (
          <button key={span.orderId} type="button" onClick={() => open(span.orderId)} className="flex w-full flex-col gap-1 border-b px-4 py-3 text-left text-sm last:border-b-0 hover:bg-muted/40 lg:flex-row lg:items-center lg:gap-0">
            <span className="flex min-w-0 flex-1 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: orderColor(span.orderId) }} /> <span className="font-medium tabular-nums">{span.number}</span> <span className="truncate text-muted-foreground">{[span.customer, span.title].filter(Boolean).join(" · ")}</span></span>
            <span className="lg:w-44 text-muted-foreground">{span.role || "—"}</span>
            <span className="lg:w-56 text-muted-foreground">{spanText(span.start, span.end)}</span>
            <span className="lg:w-44 text-muted-foreground flex items-center gap-1"><Icon name="clipboard-check" className="w-3 h-3" /> {daysOf(span.orderId) ? `${daysOf(span.orderId)} ${daysOf(span.orderId) === 1 ? "dia" : "dias"} em RDO · ${hoursOf(span.orderId)} h` : "sem RDO no período"}</span>
          </button>
        ))}
      </section>
    </div>
  );
}
