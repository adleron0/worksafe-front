import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import { cn } from "@/lib/utils";
import { dateBr, errorMessage } from "../../comercial/-shared/commercial";
import { Pill, qty, stockApi } from "../-shared/stock";
import { EmployeePpePanel, PPE_ABILITY, PPE_KEYS, PpeDeliverDialog, PpeEmployeeRow, PpePendingRow, PpeReturnDialog, usePpeEmployee } from "../-shared/ppe";

export const Route = createFileRoute("/_authenticated/suprimentos/estoque/epi")({
  component: PpePage,
  validateSearch: (search: Record<string, unknown>): { employeeId?: number } => (Number(search.employeeId) > 0 ? { employeeId: Number(search.employeeId) } : {}),
});

const PENDING_TONE: Record<PpePendingRow["kind"], "red" | "amber"> = { desligado: "red", ca: "red", troca: "amber" };

/** Entregas de EPI: escolhe o funcionário, vê o que está com ele, entrega, troca e recolhe. */
function PpePage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const { employeeId } = Route.useSearch();
  const [search, setSearch] = useState("");
  const [showTerminated, setShowTerminated] = useState(false);
  const [dialog, setDialog] = useState<"deliver" | "return" | "exchange" | null>(null);
  const [tab, setTab] = useState("funcionarios");
  const params = { ...(search.trim() ? { search: search.trim() } : {}), ...(showTerminated ? { all: "1" } : {}) };
  const { data: employees, isLoading, error } = useQuery({
    queryKey: [PPE_KEYS.employees, params],
    queryFn: () => stockApi.get<PpeEmployeeRow[]>("ppe/employees", params),
    placeholderData: (previous) => previous,
  });
  const { data: pending, isLoading: pendingLoading } = useQuery({ queryKey: [PPE_KEYS.pending], queryFn: () => stockApi.get<PpePendingRow[]>("ppe/pending") });
  const { data: chosen } = usePpeEmployee(employeeId ?? null);
  const choose = (id: number | undefined) => navigate({ to: "/suprimentos/estoque/epi", search: id ? { employeeId: id } : {}, replace: true });

  if (!can(`view_${PPE_ABILITY}`)) return null;
  const pendingCount = pending?.length ?? 0;

  return (
    <>
      <div>
        <h1 className="text-xl font-bold">Entregas de EPI</h1>
        <p className="text-sm text-muted-foreground">Escolha o funcionário para ver o que está com ele, entregar com a assinatura na tela, trocar ou recolher.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList>
          <TabsTrigger value="funcionarios">Funcionários</TabsTrigger>
          <TabsTrigger value="pendencias">Pendências{pendingCount ? ` (${pendingCount})` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value="funcionarios" className="mt-4">
          <div className="grid lg:grid-cols-[320px_1fr] gap-4 items-start">
            <section className="rounded-lg border">
              <div className="p-3 border-b grid gap-2">
                <Input name="search" value={search} onValueChange={(_, value) => setSearch(String(value))} placeholder="Buscar funcionário..." icon="search" />
                <div className="flex items-center gap-2">
                  <Checkbox id="showTerminated" checked={showTerminated} onCheckedChange={(checked) => setShowTerminated(checked === true)} />
                  <Label htmlFor="showTerminated" className="text-xs">Incluir desligados</Label>
                </div>
              </div>
              {error && <p className="p-3 text-destructive text-sm">Erro: {errorMessage(error)}</p>}
              {isLoading && <div className="p-3 grid gap-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>}
              {!isLoading && !employees?.length && <p className="p-3 text-sm text-muted-foreground">Nenhum funcionário encontrado.</p>}
              <ul className="max-h-[60vh] overflow-y-auto divide-y">
                {employees?.map((employee) => (
                  <li key={employee.id}>
                    <button type="button" onClick={() => choose(employee.id)} className={cn("w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted/40", employee.id === employeeId && "bg-primary/10 font-medium")}>
                      <span className="flex-1 min-w-0 truncate">{employee.name}</span>
                      {employee.terminated && <Pill tone="red">Desligado</Pill>}
                      {employee.holding > 0 && <span className="text-xs text-muted-foreground tabular-nums">{qty(employee.holding)} item(ns)</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <div className="min-w-0">
              {!employeeId && <p className="rounded-lg border p-6 text-sm text-muted-foreground">Escolha um funcionário na lista.</p>}
              {employeeId && (
                <>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{chosen?.employee.name ?? "..."}</h2>
                    {chosen?.employee.admissionDate && <span className="text-xs text-muted-foreground">admitido em {dateBr(chosen.employee.admissionDate)}</span>}
                    <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => choose(undefined)}><Icon name="x" className="w-3 h-3 mr-1" /> Fechar</Button>
                  </div>
                  <EmployeePpePanel employeeId={employeeId} onDeliver={() => setDialog("deliver")} onReturn={() => setDialog("return")} onExchange={() => setDialog("exchange")} />
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pendencias" className="mt-4">
          <p className="text-sm text-muted-foreground mb-3">Troca periódica vencida ou próxima, CA vencido nas mãos de alguém e desligados que ainda têm EPI ou equipamento.</p>
          <div className="rounded-card border bg-card overflow-hidden">
            {pendingLoading && <Skeleton className="h-24 w-full" />}
            {!pendingLoading && !pendingCount && <p className="p-6 text-sm text-muted-foreground">Nenhuma pendência.</p>}
            {pending?.map((row, index) => (
              <button key={index} type="button" onClick={() => { choose(row.employeeId); setTab("funcionarios"); }} className="w-full text-left flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-3 px-4 py-2.5 border-b border-border/70 last:border-b-0 hover:bg-muted/40 transition-colors text-sm hover:bg-muted/40">
                <div className="lg:w-40"><Pill tone={PENDING_TONE[row.kind]}>{row.label}</Pill></div>
                <div className="lg:w-56 font-medium truncate">{row.employee}</div>
                <div className="flex-1 min-w-0 truncate">{qty(row.quantity)} · {row.item}{row.tag ? ` (peça ${row.tag})` : ""}</div>
                <div className="lg:w-32 text-xs text-muted-foreground">{row.date ? dateBr(row.date) : ""}</div>
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {chosen && dialog === "deliver" && <PpeDeliverDialog employee={chosen.employee} onClose={() => setDialog(null)} />}
      {chosen && dialog === "exchange" && <PpeDeliverDialog employee={chosen.employee} exchange holding={chosen.holding} onClose={() => setDialog(null)} />}
      {chosen && dialog === "return" && <PpeReturnDialog employee={chosen.employee} holding={chosen.holding} onClose={() => setDialog(null)} />}
    </>
  );
}
