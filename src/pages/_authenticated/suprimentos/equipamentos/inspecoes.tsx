import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import StatusBadge from "@/components/general-components/StatusBadge";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { dateBr, errorMessage } from "../../comercial/-shared/commercial";
import { DueState, stockApi } from "../-shared/stock";
import { DuesPanel } from "../-shared/equipment-dues";
import { DueStateBadge, EQUIP_ABILITY, EQUIP_KEYS, INSPECTION_RESULTS, InspectionDialog, InspectionTarget, PERM_INSPECT, UnitRow, UnitStatusBadge } from "../-shared/equipment";

export const Route = createFileRoute("/_authenticated/suprimentos/equipamentos/inspecoes")({
  component: InspectionsPage,
  // view: aba inicial; tipo: filtro inicial dos vencimentos (inspecao, calibracao, vida_util, validade_lote, ca)
  validateSearch: (search: Record<string, unknown>): { view?: "registradas" | "vencimentos"; tipo?: string } => ({
    ...(search.view === "registradas" || search.view === "vencimentos" ? { view: search.view } : {}),
    ...(typeof search.tipo === "string" && search.tipo ? { tipo: search.tipo } : {}),
  }),
});

interface Todo {
  units: Array<UnitRow & { reason: string; templateId: number | null }>;
  lots: Array<{ id: number; number: string; itemId: number; item: string; nextInspectionAt: string | null; state: DueState; templateId: number | null }>;
}
interface Done {
  total: number;
  rows: Array<{ id: number; date: string; kind: string; kindLabel: string; result: string; resultLabel: string; unitId: number | null; lotId: number | null; target: string; inspector: string | null; notes: string | null; nextDueAt: string | null }>;
}

/** Inspeções e calibrações: o que inspecionar agora, tudo o que vence (inspeção, calibração, vida útil, lote, CA) e o que já foi registrado. */
function InspectionsPage() {
  const { can } = useVerify();
  const initial = Route.useSearch();
  const [view, setView] = useState<string>(initial.view ?? (initial.tipo ? "vencimentos" : "fazer"));
  const [inspecting, setInspecting] = useState<InspectionTarget | null>(null);
  if (!(can(`view_${EQUIP_ABILITY}`) || can(`view_${PERM_INSPECT}`))) return null;
  return (
    <>
      <PageHeader title="Inspeções e calibrações" description="O que inspecionar agora, o que vai vencer e o histórico. Peça com inspeção ou calibração vencida não sai do estoque."
        actions={can(`view_${EQUIP_ABILITY}`) && (
          <Button asChild variant="outline"><Link to="/suprimentos/equipamentos/calibracao"><Icon name="gauge" className="w-4 h-4" /> Calibração e manutenção</Link></Button>
        )} />
      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="fazer">A fazer</TabsTrigger>
          {can(`view_${EQUIP_ABILITY}`) && <TabsTrigger value="vencimentos">Vencimentos</TabsTrigger>}
          <TabsTrigger value="registradas">Registradas</TabsTrigger>
        </TabsList>
        <TabsContent value="fazer"><TodoList onInspect={setInspecting} /></TabsContent>
        {can(`view_${EQUIP_ABILITY}`) && <TabsContent value="vencimentos"><DuesPanel initialType={initial.tipo ?? ""} /></TabsContent>}
        <TabsContent value="registradas"><DoneList /></TabsContent>
      </Tabs>
      {inspecting && <InspectionDialog target={inspecting} onClose={() => setInspecting(null)} />}
    </>
  );
}

type TodoUnit = Todo["units"][number];
type TodoLot = Todo["lots"][number];

function TodoList({ onInspect }: { onInspect: (target: InspectionTarget) => void }) {
  const { can } = useVerify();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: [EQUIP_KEYS.inspections, "fazer"], queryFn: () => stockApi.get<Todo>("inspections") });
  const canInspect = can(PERM_INSPECT);
  const units = data?.units ?? [], lots = data?.lots ?? [];
  const unitColumns: DataColumn<TodoUnit>[] = [
    {
      id: "unit", header: "Peça", cell: (unit) => (
        <div className="min-w-0 max-w-md">
          <p className="truncate"><Link to="/suprimentos/equipamentos/$unitId" params={{ unitId: String(unit.id) }} className="font-semibold tabular-nums hover:underline">{unit.tag}</Link><span className="text-muted-foreground"> · {unit.item}</span></p>
          <p className="text-xs text-muted-foreground truncate">{unit.holder}</p>
        </div>
      ),
    },
    { id: "status", header: "Situação", className: "w-44", cell: (unit) => <UnitStatusBadge status={unit.status} /> },
    {
      id: "reason", header: "Motivo", className: "whitespace-nowrap", cell: (unit) => (
        <span className="inline-flex items-center gap-2">
          <span className={cn("text-xs font-medium", unit.reason === "Vencida" || unit.reason === "Extraordinária" ? "text-red-600 dark:text-red-400" : "")}>{unit.reason}</span>
          {unit.nextInspectionAt && <span className="text-xs text-muted-foreground">{dateBr(unit.nextInspectionAt)}</span>}
        </span>
      ),
    },
    ...(canInspect ? [{
      id: "inspect", header: "", align: "right" as const, className: "w-36", cell: (unit: TodoUnit) => (
        <Button type="button" size="sm" variant="outline" onClick={() => onInspect({ unitId: unit.id, label: `${unit.tag} · ${unit.item}`, templateId: unit.templateId, kind: unit.reason === "Extraordinária" ? "extraordinaria" : unit.reason === "Esperando inspeção" ? "recebimento" : "periodica" })}><Icon name="list-checks" className="w-3 h-3" /> Inspecionar</Button>
      ),
    }] : []),
  ];
  const lotColumns: DataColumn<TodoLot>[] = [
    { id: "lot", header: "Lote", cell: (lot) => <span className="truncate block max-w-md"><span className="font-semibold">Lote {lot.number}</span><span className="text-muted-foreground"> · <Link to="/suprimentos/estoque/itens/$itemId" params={{ itemId: String(lot.itemId) }} className="hover:underline">{lot.item}</Link></span></span> },
    { id: "state", header: "Vencimento", className: "whitespace-nowrap", cell: (lot) => <span className="inline-flex items-center gap-2"><DueStateBadge state={lot.state} /> <span className="text-xs text-muted-foreground">{lot.nextInspectionAt ? dateBr(lot.nextInspectionAt) : "sem registro"}</span></span> },
    ...(canInspect ? [{
      id: "inspect", header: "", align: "right" as const, className: "w-36", cell: (lot: TodoLot) => (
        <Button type="button" size="sm" variant="outline" onClick={() => onInspect({ lotId: lot.id, label: `Lote ${lot.number} · ${lot.item}`, templateId: lot.templateId })}><Icon name="list-checks" className="w-3 h-3" /> Inspecionar</Button>
      ),
    }] : []),
  ];
  return (
    <div className="mt-4 grid gap-4">
      <ListCard>
        <h2 className="font-semibold text-sm">Peças ({units.length})</h2>
        <DataTable rows={units} columns={unitColumns} getRowId={(unit) => unit.id} ariaLabel="Peças para inspecionar" skeletonRows={4}
          loading={isLoading} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
          empty={<EmptyState icon="circle-check" title="Nenhuma peça para inspecionar." />} />
      </ListCard>
      {lots.length > 0 && (
        <ListCard>
          <h2 className="font-semibold text-sm">Lotes ({lots.length})</h2>
          <DataTable rows={lots} columns={lotColumns} getRowId={(lot) => lot.id} ariaLabel="Lotes para inspecionar" minWidth={560} />
        </ListCard>
      )}
    </div>
  );
}

type DoneRow = Done["rows"][number];
const DONE_LIMIT = 50;
const DONE_COLUMNS: DataColumn<DoneRow>[] = [
  { id: "date", header: "Data", className: "w-24 tabular-nums", cell: (row) => dateBr(row.date) },
  {
    id: "target", header: "Peça ou lote", cell: (row) => (
      <div className="min-w-0 max-w-md">
        <p className="truncate">{row.unitId ? <Link to="/suprimentos/equipamentos/$unitId" params={{ unitId: String(row.unitId) }} className="hover:underline">{row.target}</Link> : row.target}</p>
        {row.notes && <p className="text-xs text-muted-foreground truncate">{row.notes}</p>}
      </div>
    ),
  },
  { id: "kind", header: "Tipo", className: "whitespace-nowrap", cell: (row) => row.kindLabel },
  { id: "result", header: "Resultado", className: "whitespace-nowrap", cell: (row) => <StatusBadge tone={row.result === "reprovado" ? "danger" : row.result === "aprovado" ? "success" : "warning"}>{row.resultLabel}</StatusBadge> },
  { id: "inspector", header: "Inspetor", className: "text-muted-foreground", cell: (row) => <span className="truncate block max-w-[12rem]">{row.inspector ?? "—"}</span> },
];

function DoneList() {
  const [result, setResult] = useState("");
  const [page, setPage] = useState(0);
  const params = { view: "registradas", page, ...(result ? { result } : {}) };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [EQUIP_KEYS.inspections, params], queryFn: () => stockApi.get<Done>("inspections", params), placeholderData: (previous) => previous,
  });
  return (
    <ListCard className="mt-4">
      <ListToolbar>
        <div className="w-full sm:w-60 mr-auto"><Select name="result" options={INSPECTION_RESULTS} state={result} clearable modal={false} placeholder="Qualquer resultado" onChange={(_, value) => { setResult(String(value ?? "")); setPage(0); }} /></div>
      </ListToolbar>
      <DataTable rows={data?.rows} columns={DONE_COLUMNS} getRowId={(row) => row.id} ariaLabel="Inspeções registradas" skeletonRows={4}
        loading={isLoading || isFetching} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
        empty={<EmptyState title={result ? "Nenhuma inspeção com esse resultado." : "Nenhuma inspeção registrada."} />} />
      <ListFooter total={data?.total ?? 0} page={page} limit={DONE_LIMIT} onPageChange={setPage} />
    </ListCard>
  );
}
