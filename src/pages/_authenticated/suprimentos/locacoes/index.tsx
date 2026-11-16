import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import KanbanView, { KanbanColumn } from "@/components/general-components/KanbanView";
import Select from "@/components/general-components/Select";
import ViewToggle, { useStoredView } from "@/components/general-components/ViewToggle";
import { dateBr, errorMessage, money } from "../../comercial/-shared/commercial";
import { PERIOD_LABEL, RENTALS_ABILITY, RENTAL_KEYS, RENTAL_STAGES, RENTAL_STATUS_LABEL, RentalList, RentalRow, RentalStageBadge, RentalStatus, rentalsApi } from "../-shared/rentals";

export const Route = createFileRoute("/_authenticated/suprimentos/locacoes/")({
  component: RentalsPage,
});

const COLUMNS: KanbanColumn[] = RENTAL_STAGES.map(({ id, name, color }) => ({ id, name, value: id, color }));

/** Locações a clientes: o quadro (reservada, ativa, devolvida, encerrada) e a lista. */
function RentalsPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const [view, changeView] = useStoredView("worksafe.suprimentos.locacoes.view");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [boardKey, setBoardKey] = useState(0);
  const kanban = view === "kanban";

  const params = { ...(!kanban && status ? { status } : {}), ...(search.trim() ? { search: search.trim() } : {}) };
  const { data, isLoading, error } = useQuery({
    queryKey: [RENTAL_KEYS.list, params],
    queryFn: () => rentalsApi.get<RentalList>("", params),
    placeholderData: (previous) => previous,
  });
  const open = (id: number | "nova") => navigate({ to: "/suprimentos/locacoes/$rentalId", params: { rentalId: String(id) } });

  if (!can(`view_${RENTALS_ABILITY}`)) return null;
  const summary = data?.summary ?? {};
  const rows = data?.rows ?? [];
  const toBill = rows.filter((row) => row.toBill).length;

  /** Arrastar não muda a etapa: entregar, receber e encerrar pedem dados; abre a ficha. */
  const drop = (target: string | number, _id: string | number, rental: RentalRow) => {
    setBoardKey((value) => value + 1);
    if (String(target) === rental.status) return;
    toast({ title: `Para passar a "${RENTAL_STATUS_LABEL[String(target) as RentalStatus] ?? target}", use os botões da ficha`, description: "Entregar, receber de volta e encerrar pedem informações." });
    open(rental.id);
  };
  const empty = search || status ? "Nenhuma locação com esses filtros." : "Nenhuma locação ainda.";
  const when = (row: RentalRow) => `${dateBr(row.startDate)}${row.expectedEnd ? ` a ${dateBr(row.expectedEnd)}` : " · sem data de devolução"}`;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Locações</h1>
          <p className="text-sm text-muted-foreground">Equipamentos próprios alugados a clientes: reservar, entregar, faturar os períodos e receber de volta.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/suprimentos/locacoes/disponibilidade" })}><Icon name="chart-gantt" className="w-4 h-4 mr-1" /> Disponibilidade</Button>
          {can(`create_${RENTALS_ABILITY}`) && <Button onClick={() => open("nova")}><Icon name="plus" className="w-4 h-4 mr-1" /> Nova locação</Button>}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center gap-3 my-4 p-4 rounded-lg border">
        <ViewToggle view={view} onChange={changeView} />
        {!kanban && (
          <div className="w-full xl:w-60">
            <Select name="status" state={status} clearable placeholder="Todas, menos canceladas" modal={false}
              options={[...RENTAL_STAGES, { id: "cancelada" as const, name: "Canceladas" }].map(({ id, name }) => ({ id, name: `${name} (${summary[id] ?? 0})` }))}
              onChange={(_, value) => setStatus(String(value ?? ""))} />
          </div>
        )}
        <div className="w-full xl:w-80">
          <Input name="search" value={search} onValueChange={(_, value) => setSearch(String(value))} placeholder="Buscar por número ou cliente..." icon="search" />
        </div>
        {toBill > 0 && <p className="xl:ml-auto text-sm text-muted-foreground">{toBill} locação(ões) com período para faturar</p>}
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}

      {kanban && !error && (
        <div className="p-2">
          <KanbanView key={boardKey} data={rows.filter((row) => row.status !== "cancelada")} columns={COLUMNS} statusField="status" isLoading={isLoading} storageKey="worksafe.suprimentos.locacoes.kanban.hidden" columnWidth={270}
            emptyMessage={empty} onStatusChange={drop}>
            {(row: RentalRow) => (
              <button type="button" className="w-full p-3 space-y-2 text-left" onClick={() => open(row.id)}>
                <div>
                  <p className="font-medium text-sm truncate">{row.customer}</p>
                  <p className="text-xs text-muted-foreground truncate tabular-nums">{row.number}{row.fromContract ? " · da venda" : ""}</p>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="truncate">{row.summary}</p>
                  <p className="flex items-center gap-2"><Icon name="calendar" className="w-3 h-3 shrink-0" /> <span className={row.late ? "font-semibold text-red-600 dark:text-red-400" : ""}>{when(row)}{row.late ? " · atrasada" : ""}</span></p>
                  {row.toBill && <p className="text-amber-700 dark:text-amber-300">Período para faturar</p>}
                </div>
                <p className="pt-2 border-t text-sm font-semibold tabular-nums">{money(row.ratePerPeriod)} <span className="text-xs font-normal text-muted-foreground">por {PERIOD_LABEL[row.period]}</span></p>
              </button>
            )}
          </KanbanView>
        </div>
      )}

      {!kanban && !error && (
        <div className="rounded-lg border overflow-hidden">
          <div className="hidden lg:flex items-center py-2 px-4 bg-primary font-semibold text-sm text-inverse-foreground">
            <div className="w-36">Número</div>
            <div className="flex-1">Cliente e itens</div>
            <div className="w-36">Etapa</div>
            <div className="w-56">Período</div>
            <div className="w-40 text-right">Valor</div>
          </div>
          {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 w-full my-1" />)}
          {!isLoading && !rows.length && <p className="p-6 text-sm text-muted-foreground">{empty}</p>}
          {rows.map((row) => (
            <button key={row.id} type="button" onClick={() => open(row.id)} className="w-full text-left flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-3 border-b last:border-b-0 text-sm hover:bg-muted/40">
              <div className="lg:w-36 font-semibold tabular-nums">{row.number}</div>
              <div className="flex-1 min-w-0 lg:pr-4">
                <p className="font-medium truncate">{row.customer}</p>
                <p className="text-xs text-muted-foreground truncate">{row.summary}</p>
              </div>
              <div className="lg:w-36 flex flex-wrap gap-1"><RentalStageBadge status={row.status} late={row.late} />{row.toBill && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">Faturar</span>}</div>
              <div className="lg:w-56 text-xs text-muted-foreground">{when(row)}</div>
              <div className="lg:w-40 lg:text-right tabular-nums">{money(row.ratePerPeriod)}<span className="text-xs text-muted-foreground"> /{PERIOD_LABEL[row.period]}</span>{row.billed > 0 && <p className="text-xs text-muted-foreground">faturado {money(row.billed)}</p>}</div>
            </button>
          ))}
        </div>
      )}
      {(summary.cancelada ?? 0) > 0 && (kanban || !status) && (
        <p className="mt-3 text-xs text-muted-foreground">{summary.cancelada} locação(ões) cancelada(s) não aparecem aqui; na visão em lista, filtre por "Canceladas".</p>
      )}
    </>
  );
}
