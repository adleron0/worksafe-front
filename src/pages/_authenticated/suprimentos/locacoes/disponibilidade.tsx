import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import TimelineView, { TimelineRow } from "@/components/general-components/TimelineView";
import { errorMessage, todayIso } from "../../comercial/-shared/commercial";
import { Availability, RENTALS_ABILITY, RENTAL_KEYS, RentalOptions, rentalsApi } from "../-shared/rentals";

export const Route = createFileRoute("/_authenticated/suprimentos/locacoes/disponibilidade")({
  component: AvailabilityPage,
});

const KIND = {
  locacao: { color: "#3b82f6", name: "Alugada" },
  reserva: { color: "#f59e0b", name: "Reservada" },
  obra: { color: "#64748b", name: "Na obra" },
  servico: { color: "#8b5cf6", name: "Calibração ou manutenção" },
  vencimento: { color: "#ef4444", name: "Calibração vence" },
} as const;
const addDays = (date: string, days: number) => new Date(new Date(`${date}T00:00:00.000Z`).getTime() + days * 86400000).toISOString().slice(0, 10);

/** Disponibilidade das peças alugáveis: locações, reservas, obra e serviço, dia a dia. */
function AvailabilityPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const [from, setFrom] = useState(todayIso());
  const [itemId, setItemId] = useState("");
  const to = addDays(from, 59);
  const params = { from, to, ...(itemId ? { itemId } : {}) };
  const { data, isLoading, error } = useQuery({
    queryKey: [RENTAL_KEYS.availability, params],
    queryFn: () => rentalsApi.get<Availability>("availability", params),
    placeholderData: (previous) => previous,
  });
  const { data: options } = useQuery({ queryKey: [RENTAL_KEYS.options], queryFn: () => rentalsApi.get<RentalOptions>("options") });

  if (!can(`view_${RENTALS_ABILITY}`)) return null;
  const rows: TimelineRow[] = (data?.rows ?? []).map((row) => ({
    id: row.unitId, title: row.tag, subtitle: `${row.item} · ${row.where}`,
    bars: row.bars.map((bar, index) => ({
      id: `${row.unitId}-${index}`, start: bar.start, end: bar.end, label: bar.label, color: KIND[bar.kind]?.color, hint: `${KIND[bar.kind]?.name ?? bar.kind}: ${bar.label}`,
      onClick: bar.rentalId ? () => navigate({ to: "/suprimentos/locacoes/$rentalId", params: { rentalId: String(bar.rentalId) } }) : undefined,
    })),
  }));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/suprimentos/locacoes" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Locações</Link>
          <h1 className="text-xl font-bold mt-1">Disponibilidade</h1>
          <p className="text-sm text-muted-foreground">Cada peça alugável e onde ela estará nos próximos 60 dias. Clique numa locação para abrir.</p>
        </div>
      </div>
      <div className="flex flex-col xl:flex-row xl:items-center gap-3 my-4 p-4 rounded-lg border">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">A partir de</span>
          <CalendarPicker mode="single" name="from" className="w-40" value={from} fromYear={2024} toYear={2040} onValueChange={(_, value) => { if (value) setFrom(String(value)); }} />
        </div>
        <div className="w-full xl:w-72">
          <Select name="itemId" options={(options?.items ?? []).filter((item) => item.tracking === "unidade").map(({ id, name }) => ({ id, name }))} state={itemId} clearable modal={false} placeholder="Todos os itens alugáveis" onChange={(_, value) => setItemId(String(value ?? ""))} />
        </div>
        <div className="xl:ml-auto flex flex-wrap gap-3 text-xs text-muted-foreground">
          {Object.entries(KIND).map(([key, kind]) => <span key={key} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: kind.color }} /> {kind.name}</span>)}
        </div>
      </div>
      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {isLoading && <Skeleton className="h-64 w-full" />}
      {data && <TimelineView from={data.from} to={data.to} today={todayIso()} rows={rows} emptyMessage="Nenhuma peça alugável. Marque o item como alugável e controlado por unidade." />}
      <p className="mt-3 text-xs text-muted-foreground">Itens alugados por quantidade (sem peça rastreada) não aparecem aqui: o saldo deles fica em Estoque → Saldos.</p>
    </>
  );
}
