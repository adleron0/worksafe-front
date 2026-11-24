import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import DocStatusBadge from "@/components/general-components/DocStatusBadge";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import StatusChips from "@/components/general-components/StatusChips";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import { cn } from "@/lib/utils";
import { dateBr, errorMessage, todayIso } from "../../comercial/-shared/commercial";
import { stockApi } from "./stock";
import { EQUIP_KEYS } from "./equipment";

/** Vencimentos (GET stock/dues): usado na tela "Inspeções e calibrações" e na rota antiga /vencimentos. */

interface DueRow { type: string; label: string; date: string | null; state: "vencido" | "a_vencer"; target: string; unitId?: number; itemId?: number; lotId?: number; where: string }
type DueLine = DueRow & { key: number };
interface Dues { rows: DueRow[]; counts: { vencido: number; a_vencer: number } }

export const DUE_TYPES = [
  { id: "inspecao", name: "Inspeção" }, { id: "calibracao", name: "Calibração" }, { id: "vida_util", name: "Fim da vida útil" },
  { id: "validade_lote", name: "Validade do lote" }, { id: "ca", name: "CA do EPI" },
];
const HORIZONS = [{ id: "30", name: "Próximos 30 dias" }, { id: "60", name: "Próximos 60 dias" }, { id: "90", name: "Próximos 90 dias" }, { id: "180", name: "Próximos 6 meses" }, { id: "365", name: "Próximo ano" }];
const CARDS = [
  { id: "vencido", title: "Vencidos", hint: "Já passou a data (ou nunca foi registrado)", icon: "circle-alert" },
  { id: "a_vencer", title: "A vencer", hint: "Dentro do período escolhido", icon: "calendar-clock" },
] as const;

const daysBetween = (date: string) => Math.round((new Date(`${date}T00:00:00`).getTime() - new Date(`${todayIso()}T00:00:00`).getTime()) / 86400000);
const whenText = (row: DueRow) => {
  if (!row.date) return "sem registro";
  const days = daysBetween(row.date);
  if (days < 0) return `venceu há ${-days} ${days === -1 ? "dia" : "dias"} (${dateBr(row.date)})`;
  if (days === 0) return `vence hoje (${dateBr(row.date)})`;
  return `vence em ${days} ${days === 1 ? "dia" : "dias"} (${dateBr(row.date)})`;
};

/** Vencimentos do estoque: inspeção, calibração, vida útil, validade de lote e CA, no molde do RH. */
export function DuesPanel({ initialType = "" }: { initialType?: string }) {
  const [days, setDays] = useState("30");
  const [type, setType] = useState(initialType);
  const [state, setState] = useState("");
  const [search, setSearch] = useState("");
  const params = { days, ...(type ? { type } : {}) };
  const navigate = useNavigate();
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [EQUIP_KEYS.dues, params], queryFn: () => stockApi.get<Dues>("dues", params), placeholderData: (previous) => previous,
  });
  const term = search.trim().toLowerCase();
  const rows = (data?.rows ?? []).filter((row) => (!state || row.state === state) && (!term || row.target.toLowerCase().includes(term)));
  const empty = type || state || search ? "Nada com esses filtros." : "Nada vencido ou a vencer no período. Tudo em dia.";

  const columns: DataColumn<DueLine>[] = [
    {
      id: "target", header: "Peça, lote ou item", cell: (row) => (
        <span className="font-medium truncate block max-w-sm">
          {row.unitId ? <Link to="/suprimentos/equipamentos/$unitId" params={{ unitId: String(row.unitId) }} className="hover:underline">{row.target}</Link>
            : row.itemId ? <Link to="/suprimentos/estoque/itens/$itemId" params={{ itemId: String(row.itemId) }} className="hover:underline">{row.target}</Link> : row.target}
        </span>
      ),
    },
    { id: "label", header: "Vencimento", className: "whitespace-nowrap", cell: (row) => row.label },
    { id: "state", header: "Situação", className: "w-28", cell: (row) => <DocStatusBadge status={row.state} label={row.state === "vencido" ? "Vencido" : "A vencer"} /> },
    { id: "when", header: "Quando", className: "text-muted-foreground whitespace-nowrap", cell: (row) => whenText(row) },
    { id: "where", header: "Onde", className: "text-muted-foreground", cell: (row) => <span className="truncate block max-w-[12rem]">{row.where || "—"}</span> },
  ];

  return (
    <>
      <StatusChips className="mt-4" ariaLabel="Tipo de vencimento" value={type || "todos"} onChange={(value) => setType(value === "todos" ? "" : value)}
        options={[{ value: "todos", label: "Tudo" }, ...DUE_TYPES.map((option) => ({ value: option.id, label: option.name }))]} />
      <div className="my-4 grid sm:grid-cols-2 gap-3">
        {CARDS.map((card) => (
          <button key={card.id} type="button" aria-pressed={state === card.id} onClick={() => setState(state === card.id ? "" : card.id)}
            className={cn("rounded-card border bg-card p-4 text-left transition-colors hover:bg-muted/40", state === card.id && "border-primary bg-primary/5")}>
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Icon name={card.icon} className="w-4 h-4" /> {card.title}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{data?.counts[card.id] ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{card.hint}</p>
          </button>
        ))}
      </div>
      <ListCard>
        <ListToolbar search={{ value: search, onChange: setSearch, placeholder: "Buscar por etiqueta, lote ou item..." }}>
          <div className="w-52"><Select name="days" state={days} options={HORIZONS} modal={false} onChange={(_, value) => setDays(String(value || "30"))} /></div>
        </ListToolbar>
        <DataTable rows={rows.map((row, key) => ({ ...row, key }))} columns={columns} getRowId={(row) => row.key} ariaLabel="Vencimentos" skeletonRows={4}
          loading={isLoading || isFetching} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
          onRowClick={(row) => {
            if (row.unitId) navigate({ to: "/suprimentos/equipamentos/$unitId", params: { unitId: String(row.unitId) } });
            else if (row.itemId) navigate({ to: "/suprimentos/estoque/itens/$itemId", params: { itemId: String(row.itemId) } });
          }}
          rowClassName={(row) => (row.unitId || row.itemId ? undefined : "cursor-default")}
          empty={<EmptyState icon={type || state || search ? "search-x" : "circle-check"} title={empty} />} />
      </ListCard>
    </>
  );
}
