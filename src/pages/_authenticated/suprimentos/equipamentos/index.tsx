import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Pagination from "@/components/general-components/Pagination";
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

const LIMIT = 50;

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
  const [printing, setPrinting] = useState(false);
  const params = {
    page, limit: LIMIT, ...(search.trim() ? { search: search.trim() } : {}), ...(status ? { status } : {}), ...(holderType ? { holderType } : {}),
    ...(due ? { due: "1" } : {}), ...(initial.itemId ? { itemId: initial.itemId } : {}),
  };
  const { data, isLoading, error } = useQuery({
    queryKey: [EQUIP_KEYS.units, params],
    queryFn: () => stockApi.get<{ rows: UnitRow[]; total: number }>("units", params),
    placeholderData: (previous) => previous,
  });
  const reset = <T,>(setter: (value: T) => void) => (value: T) => { setter(value); setPage(0); };

  if (!can(`view_${EQUIP_ABILITY}`)) return null;
  const rows = data?.rows ?? [];
  const filtered = !!(search || status || holderType || due || initial.itemId);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Peças</h1>
          <p className="text-sm text-muted-foreground">Cada peça com etiqueta: onde está, a situação e os vencimentos de inspeção, calibração e vida útil.</p>
        </div>
        <Button type="button" variant="outline" disabled={!rows.length} onClick={() => setPrinting(true)}><Icon name="qr-code" className="w-4 h-4 mr-1" /> {rows.length && data && data.total > rows.length ? `Imprimir etiquetas desta página (${rows.length})` : `Imprimir etiquetas${rows.length ? ` (${rows.length})` : ""}`}</Button>
      </div>

      <div className="flex flex-col xl:flex-row xl:flex-wrap xl:items-center gap-3 my-4 p-4 rounded-lg border">
        <div className="w-full xl:w-72"><Input name="search" value={search} onValueChange={(_, value) => reset(setSearch)(String(value))} placeholder="Buscar por etiqueta, série ou item..." icon="search" /></div>
        <div className="w-full xl:w-52"><Select name="status" options={UNIT_STATUS_OPTIONS} state={status} clearable modal={false} placeholder="Todas (menos baixadas)" onChange={(_, value) => reset(setStatus)(String(value ?? ""))} /></div>
        <div className="w-full xl:w-52"><Select name="holderType" options={HOLDER_OPTIONS} state={holderType} clearable modal={false} placeholder="Em qualquer lugar" onChange={(_, value) => reset(setHolderType)(String(value ?? ""))} /></div>
        <div className="flex items-center gap-2">
          <Checkbox id="due" checked={due} onCheckedChange={(checked) => reset(setDue)(checked === true)} />
          <Label htmlFor="due">Só vencidos ou a vencer</Label>
        </div>
        {initial.itemId && <Button type="button" variant="ghost" size="sm" onClick={() => navigate({ to: "/suprimentos/equipamentos", search: {} })}>Tirar o filtro do item</Button>}
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {!error && (
        <div className="rounded-lg border overflow-hidden">
          <div className="hidden lg:flex items-center py-2 px-4 bg-primary font-semibold text-sm text-inverse-foreground">
            <div className="w-40">Etiqueta</div>
            <div className="flex-1">Item</div>
            <div className="w-44">Situação</div>
            <div className="w-56">Onde está</div>
            <div className="w-64">Vencimentos</div>
          </div>
          {isLoading && Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 w-full my-1" />)}
          {!isLoading && !rows.length && (filtered ? <p className="p-6 text-sm text-muted-foreground">Nenhuma peça com esses filtros.</p> : (
            <div className="p-6 text-sm grid gap-3 justify-items-start">
              <p className="font-medium">Nenhuma peça com etiqueta ainda.</p>
              <p className="text-muted-foreground">Cinto, talabarte, trava-quedas e instrumentos são controlados peça por peça. Cadastre o item como equipamento reutilizável e dê entrada: cada peça ganha uma etiqueta com QR, e a inspeção e a calibração passam a ser cobradas aqui.</p>
              {can("create_itens_estoque") && (
                <Button type="button" onClick={() => navigate({ to: "/suprimentos/estoque/itens/$itemId", params: { itemId: "novo" }, search: { tipo: "reutilizavel" } as never })}>
                  <Icon name="plus" className="w-4 h-4 mr-1" /> Cadastrar equipamento reutilizável
                </Button>
              )}
            </div>
          ))}
          {rows.map((unit) => (
            <button key={unit.id} type="button" onClick={() => navigate({ to: "/suprimentos/equipamentos/$unitId", params: { unitId: String(unit.id) } })}
              className="w-full text-left flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-3 border-b last:border-b-0 text-sm hover:bg-muted/40">
              <div className="lg:w-40">
                <p className="font-semibold tabular-nums">{unit.tag}</p>
                {unit.serialNumber && <p className="text-xs text-muted-foreground">série {unit.serialNumber}</p>}
              </div>
              <div className="flex-1 min-w-0 lg:pr-4 truncate">{unit.item}{unit.length !== null ? <span className="text-xs text-muted-foreground"> · {unit.length} m</span> : null}</div>
              <div className="lg:w-44"><UnitStatusBadge status={unit.status} needsInspection={unit.needsInspection} /></div>
              <div className="lg:w-56 text-muted-foreground truncate">{unit.holder}</div>
              <div className="lg:w-64 flex flex-wrap gap-1 items-center text-xs">
                {unit.dues.inspection && <DueStateBadge state={unit.dues.inspection} label="Inspeção" />}
                {unit.dues.calibration && <DueStateBadge state={unit.dues.calibration} label="Calibração" />}
                {unit.dues.life && <DueStateBadge state={unit.dues.life} label="Vida útil" />}
                {!unit.dues.inspection && !unit.dues.calibration && !unit.dues.life && <span className="text-muted-foreground">{unit.lifeEndsAt ? `vida até ${dateBr(unit.lifeEndsAt)}` : "—"}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
      {data && data.total > LIMIT && (
        <div className="mt-4"><Pagination totalItems={data.total} itemsPerPage={LIMIT} currentPage={page} onPageChange={setPage} maxVisiblePages={5} /></div>
      )}
      {printing && <PrintLabelsDialog units={rows.map((unit) => ({ tag: unit.tag, item: unit.item }))} onClose={() => setPrinting(false)} />}
    </>
  );
}
