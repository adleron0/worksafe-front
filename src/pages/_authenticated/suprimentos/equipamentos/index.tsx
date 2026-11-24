import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import Select from "@/components/general-components/Select";
import { dateBr, errorMessage } from "../../comercial/-shared/commercial";
import { HOLDER_OPTIONS, stockApi } from "../-shared/stock";
import { DueStateBadge, EQUIP_ABILITY, EQUIP_KEYS, PrintLabelsDialog, UNIT_STATUS_OPTIONS, UnitRow, UnitStatusBadge } from "../-shared/equipment";

interface UnitsSearch { due?: "1"; status?: string; itemId?: number; holderType?: string }
export const Route = createFileRoute("/_authenticated/suprimentos/equipamentos/")({
  component: UnitsPage,
  validateSearch: (search: Record<string, unknown>): UnitsSearch => ({
    ...(search.due === "1" || search.due === 1 ? { due: "1" as const } : {}),
    ...(typeof search.status === "string" && search.status ? { status: search.status } : {}),
    ...(Number(search.itemId) > 0 ? { itemId: Number(search.itemId) } : {}),
    ...(typeof search.holderType === "string" && search.holderType ? { holderType: search.holderType } : {}),
  }),
});

const LIMITS = [10, 30, 50, 100];

/** Equipamentos: cada peça rastreada (etiqueta), onde está, a situação e o que vence. */
function UnitsPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const initial = Route.useSearch();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initial.status ?? "");
  const [holderType, setHolderType] = useState(initial.holderType ?? "");
  const [due, setDue] = useState(initial.due === "1");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(50);
  const [printing, setPrinting] = useState(false);
  const params = {
    page, limit, ...(search.trim() ? { search: search.trim() } : {}), ...(status ? { status } : {}), ...(holderType ? { holderType } : {}),
    ...(due ? { due: "1" } : {}), ...(initial.itemId ? { itemId: initial.itemId } : {}),
  };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [EQUIP_KEYS.units, params],
    queryFn: () => stockApi.get<{ rows: UnitRow[]; total: number }>("units", params),
    placeholderData: (previous) => previous,
  });
  const reset = <T,>(setter: (value: T) => void) => (value: T) => { setter(value); setPage(0); };

  if (!can(`view_${EQUIP_ABILITY}`)) return null;
  const rows = data?.rows ?? [];
  const filtered = !!(search || status || holderType || due || initial.itemId);

  const openUnit = (unit: UnitRow) => navigate({ to: "/suprimentos/equipamentos/$unitId", params: { unitId: String(unit.id) } });
  const clearFilters = () => { setSearch(""); setStatus(""); setHolderType(""); setDue(false); setPage(0); if (initial.itemId) navigate({ to: "/suprimentos/equipamentos", search: {} }); };
  const columns: DataColumn<UnitRow>[] = [
    {
      id: "tag", header: "Etiqueta", className: "w-36", cell: (unit) => (
        <div>
          <p className="font-semibold tabular-nums">{unit.tag}</p>
          {unit.serialNumber && <p className="text-xs text-muted-foreground">série {unit.serialNumber}</p>}
        </div>
      ),
    },
    { id: "item", header: "Item", cell: (unit) => <span className="truncate block max-w-sm">{unit.item}{unit.length !== null ? <span className="text-xs text-muted-foreground"> · {unit.length} m</span> : null}</span> },
    { id: "status", header: "Situação", className: "w-44", cell: (unit) => <UnitStatusBadge status={unit.status} needsInspection={unit.needsInspection} /> },
    { id: "holder", header: "Onde está", className: "text-muted-foreground", cell: (unit) => <span className="truncate block max-w-[13rem]">{unit.holder}</span> },
    {
      id: "dues", header: "Vencimentos", cell: (unit) => (
        <div className="flex flex-nowrap gap-1 items-center text-xs whitespace-nowrap">
          {unit.dues.inspection && <DueStateBadge state={unit.dues.inspection} label="Inspeção" />}
          {unit.dues.calibration && <DueStateBadge state={unit.dues.calibration} label="Calibração" />}
          {unit.dues.life && <DueStateBadge state={unit.dues.life} label="Vida útil" />}
          {!unit.dues.inspection && !unit.dues.calibration && !unit.dues.life && <span className="text-muted-foreground">{unit.lifeEndsAt ? `vida até ${dateBr(unit.lifeEndsAt)}` : "—"}</span>}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Peças" description="Cada peça com etiqueta: onde está, a situação e os vencimentos de inspeção, calibração e vida útil." />

      <ListCard>
        <ListToolbar search={{ value: search, onChange: (text) => reset(setSearch)(text), placeholder: "Buscar por etiqueta, série ou item..." }}>
          <Button type="button" variant="outline" disabled={!rows.length} onClick={() => setPrinting(true)}><Icon name="qr-code" className="w-4 h-4" /> <span className="hidden sm:inline">{rows.length && data && data.total > rows.length ? `Imprimir etiquetas desta página (${rows.length})` : `Imprimir etiquetas${rows.length ? ` (${rows.length})` : ""}`}</span></Button>
        </ListToolbar>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-52"><Select name="status" options={UNIT_STATUS_OPTIONS} state={status} clearable modal={false} placeholder="Todas (menos baixadas)" onChange={(_, value) => reset(setStatus)(String(value ?? ""))} /></div>
          <div className="w-full sm:w-52"><Select name="holderType" options={HOLDER_OPTIONS} state={holderType} clearable modal={false} placeholder="Em qualquer lugar" onChange={(_, value) => reset(setHolderType)(String(value ?? ""))} /></div>
          <div className="flex items-center gap-2">
            <Checkbox id="due" checked={due} onCheckedChange={(checked) => reset(setDue)(checked === true)} />
            <Label htmlFor="due">Só vencidos ou a vencer</Label>
          </div>
          {initial.itemId && <Button type="button" variant="ghost" size="sm" onClick={() => navigate({ to: "/suprimentos/equipamentos", search: {} })}>Tirar o filtro do item</Button>}
        </div>

        <DataTable rows={data?.rows} columns={columns} getRowId={(unit) => unit.id} ariaLabel="Peças"
          loading={isLoading || isFetching} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
          onRowClick={openUnit}
          empty={filtered
            ? <EmptyState icon="search-x" title="Nenhuma peça com esses filtros." action={<Button variant="outline" size="sm" onClick={clearFilters}>Limpar filtros</Button>} />
            : <EmptyState title="Nenhuma peça com etiqueta ainda."
              description="Cinto, talabarte, trava-quedas e instrumentos são controlados peça por peça. Cadastre o item como equipamento reutilizável e dê entrada: cada peça ganha uma etiqueta com QR, e a inspeção e a calibração passam a ser cobradas aqui."
              action={can("create_itens_estoque") && (
                <Button type="button" size="sm" onClick={() => navigate({ to: "/suprimentos/estoque/itens/$itemId", params: { itemId: "novo" }, search: { tipo: "reutilizavel" } as never })}>
                  <Icon name="plus" className="w-4 h-4" /> Cadastrar equipamento reutilizável
                </Button>
              )} />} />

        <ListFooter total={data?.total ?? 0} page={page} limit={limit} limits={LIMITS} onPageChange={setPage} onLimitChange={(value) => { setLimit(value); setPage(0); }} />
      </ListCard>
      {printing && <PrintLabelsDialog units={rows.map((unit) => ({ tag: unit.tag, item: unit.item }))} onClose={() => setPrinting(false)} />}
    </>
  );
}
