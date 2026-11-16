import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Skeleton } from "@/components/ui/skeleton";
import DocStatusBadge from "@/components/general-components/DocStatusBadge";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { dateBr, errorMessage, todayIso } from "../../comercial/-shared/commercial";
import { stockApi } from "../-shared/stock";
import { EQUIP_ABILITY, EQUIP_KEYS } from "../-shared/equipment";

export const Route = createFileRoute("/_authenticated/suprimentos/equipamentos/vencimentos")({
  component: DuesPage,
});

interface DueRow { type: string; label: string; date: string | null; state: "vencido" | "a_vencer"; target: string; unitId?: number; itemId?: number; lotId?: number; where: string }
interface Dues { rows: DueRow[]; counts: { vencido: number; a_vencer: number } }

const TYPES = [
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
function DuesPage() {
  const { can } = useVerify();
  const [days, setDays] = useState("30");
  const [type, setType] = useState("");
  const [state, setState] = useState("");
  const [search, setSearch] = useState("");
  const params = { days, ...(type ? { type } : {}) };
  const { data, isLoading, error } = useQuery({
    queryKey: [EQUIP_KEYS.dues, params], queryFn: () => stockApi.get<Dues>("dues", params), placeholderData: (previous) => previous,
  });
  if (!can(`view_${EQUIP_ABILITY}`)) return null;
  const term = search.trim().toLowerCase();
  const rows = (data?.rows ?? []).filter((row) => (!state || row.state === state) && (!term || row.target.toLowerCase().includes(term)));
  const empty = type || state || search ? "Nada com esses filtros." : "Nada vencido ou a vencer no período. Tudo em dia.";

  return (
    <>
      <div>
        <h1 className="text-xl font-bold">Vencimentos</h1>
        <p className="text-sm text-muted-foreground">Inspeções, calibrações, vida útil das peças, validade dos lotes com saldo e CA dos EPIs.</p>
      </div>
      <div className="my-4 grid sm:grid-cols-2 gap-3">
        {CARDS.map((card) => (
          <button key={card.id} type="button" aria-pressed={state === card.id} onClick={() => setState(state === card.id ? "" : card.id)}
            className={cn("rounded-lg border p-4 text-left transition-colors hover:bg-muted/40", state === card.id && "border-primary bg-primary/5")}>
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Icon name={card.icon} className="w-4 h-4" /> {card.title}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{data?.counts[card.id] ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{card.hint}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-4 p-4 rounded-lg border">
        <div className="w-full xl:w-56"><Select name="days" state={days} options={HORIZONS} modal={false} onChange={(_, value) => setDays(String(value || "30"))} /></div>
        <div className="w-full xl:w-56"><Select name="type" state={type} clearable placeholder="Todos os tipos" modal={false} options={TYPES} onChange={(_, value) => setType(String(value ?? ""))} /></div>
        <div className="w-full xl:w-80"><Input name="search" value={search} onValueChange={(_, value) => setSearch(String(value))} placeholder="Buscar por etiqueta, lote ou item..." icon="search" /></div>
      </div>
      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {!error && (
        <div className="rounded-lg border overflow-hidden">
          <div className="hidden lg:flex items-center py-2 px-4 bg-primary font-semibold text-sm text-inverse-foreground">
            <div className="flex-1">Peça, lote ou item</div><div className="w-44">Vencimento</div><div className="w-28">Situação</div><div className="w-72">Quando</div><div className="w-48">Onde</div>
          </div>
          {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-full my-1" />)}
          {!isLoading && !rows.length && <p className="p-6 text-sm text-muted-foreground">{empty}</p>}
          {rows.map((row, index) => (
            <div key={`${row.type}-${row.unitId ?? row.lotId ?? row.itemId}-${index}`} className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-3 border-b last:border-b-0 text-sm hover:bg-muted/40">
              <div className="flex-1 min-w-0 lg:pr-4 font-medium truncate">
                {row.unitId ? <Link to="/suprimentos/equipamentos/$unitId" params={{ unitId: String(row.unitId) }} className="hover:underline">{row.target}</Link>
                  : row.itemId ? <Link to="/suprimentos/estoque/itens/$itemId" params={{ itemId: String(row.itemId) }} className="hover:underline">{row.target}</Link> : row.target}
              </div>
              <div className="lg:w-44">{row.label}</div>
              <div className="lg:w-28"><DocStatusBadge status={row.state} label={row.state === "vencido" ? "Vencido" : "A vencer"} /></div>
              <div className="lg:w-72 text-muted-foreground">{whenText(row)}</div>
              <div className="lg:w-48 text-muted-foreground truncate">{row.where || "—"}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
