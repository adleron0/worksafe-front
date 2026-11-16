import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import Pagination from "@/components/general-components/Pagination";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { dateBr, errorMessage } from "../../comercial/-shared/commercial";
import { DueState, stockApi } from "../-shared/stock";
import { DueStateBadge, EQUIP_ABILITY, EQUIP_KEYS, INSPECTION_RESULTS, InspectionDialog, InspectionTarget, PERM_INSPECT, UnitRow, UnitStatusBadge } from "../-shared/equipment";

export const Route = createFileRoute("/_authenticated/suprimentos/equipamentos/inspecoes")({
  component: InspectionsPage,
  validateSearch: (search: Record<string, unknown>): { view?: "registradas" } => (search.view === "registradas" ? { view: "registradas" } : {}),
});

interface Todo { units: Array<UnitRow & { reason: string }>; lots: Array<{ id: number; number: string; itemId: number; item: string; nextInspectionAt: string | null; state: DueState }> }
interface Done {
  total: number;
  rows: Array<{ id: number; date: string; kind: string; kindLabel: string; result: string; resultLabel: string; unitId: number | null; lotId: number | null; target: string; inspector: string | null; notes: string | null; nextDueAt: string | null }>;
}

/** Inspeções: o que está para inspecionar (peças e lotes) e o que já foi registrado. */
function InspectionsPage() {
  const { can } = useVerify();
  const initial = Route.useSearch();
  const [view, setView] = useState<"fazer" | "registradas">(initial.view === "registradas" ? "registradas" : "fazer");
  const [inspecting, setInspecting] = useState<InspectionTarget | null>(null);
  if (!(can(`view_${EQUIP_ABILITY}`) || can(`view_${PERM_INSPECT}`))) return null;
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Inspeções</h1>
          <p className="text-sm text-muted-foreground">Peças e lotes com inspeção vencida, a vencer em 30 dias, esperando inspeção ou com inspeção extraordinária pedida.</p>
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          <Button size="sm" variant={view === "fazer" ? "default" : "ghost"} onClick={() => setView("fazer")}>A fazer</Button>
          <Button size="sm" variant={view === "registradas" ? "default" : "ghost"} onClick={() => setView("registradas")}>Registradas</Button>
        </div>
      </div>
      {view === "fazer" ? <TodoList onInspect={setInspecting} /> : <DoneList />}
      {inspecting && <InspectionDialog target={inspecting} onClose={() => setInspecting(null)} />}
    </>
  );
}

function TodoList({ onInspect }: { onInspect: (target: InspectionTarget) => void }) {
  const { can } = useVerify();
  const { data, isLoading, error } = useQuery({ queryKey: [EQUIP_KEYS.inspections, "fazer"], queryFn: () => stockApi.get<Todo>("inspections") });
  const canInspect = can(PERM_INSPECT);
  if (error) return <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>;
  if (isLoading) return <div className="mt-4 grid gap-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  const units = data?.units ?? [], lots = data?.lots ?? [];
  return (
    <div className="mt-4 grid gap-4">
      <section className="rounded-lg border overflow-hidden">
        <h2 className="px-4 py-2 bg-muted/50 font-semibold text-sm">Peças ({units.length})</h2>
        {units.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhuma peça para inspecionar.</p>}
        {units.map((unit) => (
          <div key={unit.id} className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-0 px-4 py-3 border-t text-sm">
            <div className="flex-1 min-w-0 lg:pr-4">
              <Link to="/suprimentos/equipamentos/$unitId" params={{ unitId: String(unit.id) }} className="font-semibold tabular-nums hover:underline">{unit.tag}</Link>
              <span className="text-muted-foreground"> · {unit.item}</span>
              <p className="text-xs text-muted-foreground truncate">{unit.holder}</p>
            </div>
            <div className="lg:w-44"><UnitStatusBadge status={unit.status} /></div>
            <div className="lg:w-56 flex flex-wrap items-center gap-2">
              <span className={cn("text-xs font-medium", unit.reason === "Vencida" || unit.reason === "Extraordinária" ? "text-red-600 dark:text-red-400" : "")}>{unit.reason}</span>
              {unit.nextInspectionAt && <span className="text-xs text-muted-foreground">{dateBr(unit.nextInspectionAt)}</span>}
            </div>
            <div className="lg:w-44 flex lg:justify-end">
              {canInspect && <Button type="button" size="sm" variant="outline" onClick={() => onInspect({ unitId: unit.id, label: `${unit.tag} · ${unit.item}`, kind: unit.reason === "Extraordinária" ? "extraordinaria" : unit.reason === "Esperando inspeção" ? "recebimento" : "periodica" })}><Icon name="list-checks" className="w-3 h-3 mr-1" /> Inspecionar</Button>}
            </div>
          </div>
        ))}
      </section>
      {lots.length > 0 && (
        <section className="rounded-lg border overflow-hidden">
          <h2 className="px-4 py-2 bg-muted/50 font-semibold text-sm">Lotes ({lots.length})</h2>
          {lots.map((lot) => (
            <div key={lot.id} className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-0 px-4 py-3 border-t text-sm">
              <div className="flex-1 min-w-0 lg:pr-4">
                <span className="font-semibold">Lote {lot.number}</span>
                <span className="text-muted-foreground"> · <Link to="/suprimentos/estoque/itens/$itemId" params={{ itemId: String(lot.itemId) }} className="hover:underline">{lot.item}</Link></span>
              </div>
              <div className="lg:w-56 flex items-center gap-2"><DueStateBadge state={lot.state} /> <span className="text-xs text-muted-foreground">{lot.nextInspectionAt ? dateBr(lot.nextInspectionAt) : "sem registro"}</span></div>
              <div className="lg:w-44 flex lg:justify-end">
                {canInspect && <Button type="button" size="sm" variant="outline" onClick={() => onInspect({ lotId: lot.id, label: `Lote ${lot.number} · ${lot.item}` })}><Icon name="list-checks" className="w-3 h-3 mr-1" /> Inspecionar</Button>}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function DoneList() {
  const [result, setResult] = useState("");
  const [page, setPage] = useState(0);
  const params = { view: "registradas", page, ...(result ? { result } : {}) };
  const { data, isLoading, error } = useQuery({
    queryKey: [EQUIP_KEYS.inspections, params], queryFn: () => stockApi.get<Done>("inspections", params), placeholderData: (previous) => previous,
  });
  return (
    <>
      <div className="flex flex-col xl:flex-row gap-3 my-4 p-4 rounded-lg border">
        <div className="w-full xl:w-60"><Select name="result" options={INSPECTION_RESULTS} state={result} clearable modal={false} placeholder="Qualquer resultado" onChange={(_, value) => { setResult(String(value ?? "")); setPage(0); }} /></div>
      </div>
      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {!error && (
        <div className="rounded-lg border overflow-hidden">
          <div className="hidden lg:flex items-center py-2 px-4 bg-primary font-semibold text-sm text-inverse-foreground">
            <div className="w-28">Data</div><div className="flex-1">Peça ou lote</div><div className="w-36">Tipo</div><div className="w-48">Resultado</div><div className="w-48">Inspetor</div>
          </div>
          {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-full my-1" />)}
          {!isLoading && !data?.rows.length && <p className="p-6 text-sm text-muted-foreground">Nenhuma inspeção registrada.</p>}
          {data?.rows.map((row) => (
            <div key={row.id} className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-3 border-b last:border-b-0 text-sm">
              <div className="lg:w-28 tabular-nums">{dateBr(row.date)}</div>
              <div className="flex-1 min-w-0 lg:pr-4">
                {row.unitId ? <Link to="/suprimentos/equipamentos/$unitId" params={{ unitId: String(row.unitId) }} className="hover:underline">{row.target}</Link> : row.target}
                {row.notes && <p className="text-xs text-muted-foreground truncate">{row.notes}</p>}
              </div>
              <div className="lg:w-36">{row.kindLabel}</div>
              <div className={cn("lg:w-48 font-medium", row.result === "reprovado" ? "text-red-600 dark:text-red-400" : row.result === "aprovado" ? "text-green-700 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>{row.resultLabel}</div>
              <div className="lg:w-48 text-muted-foreground truncate">{row.inspector ?? "—"}</div>
            </div>
          ))}
        </div>
      )}
      {data && data.total > 50 && <div className="mt-4"><Pagination totalItems={data.total} itemsPerPage={50} currentPage={page} onPageChange={setPage} maxVisiblePages={5} /></div>}
    </>
  );
}
