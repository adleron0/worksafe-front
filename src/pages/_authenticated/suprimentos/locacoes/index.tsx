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
import { PERIOD_LABEL, RENTALS_ABILITY, RENTAL_KEYS, RENTAL_STAGES, RENTAL_STAGE_LABEL, RentalList, RentalRow, RentalStage, RentalStageBadge, rentalsApi } from "../-shared/rentals";

export const Route = createFileRoute("/_authenticated/suprimentos/locacoes/")({
  component: RentalsPage,
});

const COLUMNS: KanbanColumn[] = RENTAL_STAGES.map(({ id, name, color }) => ({ id, name, value: id, color }));

/**
 * Ordens de locação: a esteira (a entregar, ativa, a devolver, atrasada,
 * devolvida, encerrada) e a lista. Toda OL nasce de uma proposta de locação
 * aceita; esta tela não cria locação nova.
 */
function RentalsPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const [view, changeView] = useStoredView("worksafe.suprimentos.locacoes.view", "kanban");
  const [stage, setStage] = useState("");
  const [search, setSearch] = useState("");
  const [boardKey, setBoardKey] = useState(0);
  const kanban = view === "kanban";

  const params = { ...(!kanban && stage ? (stage === "cancelada" ? { status: "cancelada" } : { stage }) : {}), ...(search.trim() ? { search: search.trim() } : {}) };
  const { data, isLoading, error } = useQuery({
    queryKey: [RENTAL_KEYS.list, params],
    queryFn: () => rentalsApi.get<RentalList>("", params),
    placeholderData: (previous) => previous,
  });
  const open = (id: number) => navigate({ to: "/suprimentos/locacoes/$rentalId", params: { rentalId: String(id) } });

  if (!can(`view_${RENTALS_ABILITY}`)) return null;
  const summary = data?.summary ?? {};
  const rows = data?.rows ?? [];
  const toBill = rows.filter((row) => row.toBill).length;

  /** Arrastar não muda a etapa: entregar, receber e encerrar pedem dados; abre a ficha. */
  const drop = (target: string | number, _id: string | number, rental: RentalRow) => {
    setBoardKey((value) => value + 1);
    if (String(target) === rental.stage) return;
    const to = RENTAL_STAGE_LABEL[String(target) as RentalStage] ?? String(target);
    toast({
      title: target === "a_devolver" || target === "atrasada" ? `"${to}" depende da devolução prevista` : `Para passar a "${to}", use os botões da ficha`,
      description: target === "a_devolver" || target === "atrasada" ? "Mude a data de devolução prevista na ficha da OL." : "Entregar, receber de volta e encerrar pedem informações.",
    });
    open(rental.id);
  };
  const empty = search || stage ? "Nenhuma ordem de locação com esses filtros." : "Nenhuma ordem de locação ainda. Ela nasce sozinha quando uma proposta de locação é aceita.";
  const when = (row: RentalRow) => `${dateBr(row.startDate)}${row.expectedEnd ? ` a ${dateBr(row.expectedEnd)}` : " · até devolver"}`;
  const billBadge = (row: RentalRow) => (row.toBill
    ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">{row.fromContract ? `A faturar ${money(row.pendingValue)}` : "Faturar"}</span>
    : null);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Ordens de locação</h1>
          <p className="text-sm text-muted-foreground">Cada proposta de locação aceita vira uma OL: entregar, acompanhar a devolução, faturar os períodos e acertar a caução.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/suprimentos/locacoes/disponibilidade" })}><Icon name="chart-gantt" className="w-4 h-4 mr-1" /> Disponibilidade</Button>
          {can("create_comercial") && <Button variant="outline" onClick={() => navigate({ to: "/comercial/propostas/nova", search: { tipo: "locacao" } })}><Icon name="plus" className="w-4 h-4 mr-1" /> Nova proposta de locação</Button>}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center gap-3 my-4 p-4 rounded-lg border">
        <ViewToggle view={view} onChange={changeView} />
        {!kanban && (
          <div className="w-full xl:w-60">
            <Select name="stage" state={stage} clearable placeholder="Todas, menos canceladas" modal={false}
              options={[...RENTAL_STAGES, { id: "cancelada" as const, name: "Canceladas" }].map(({ id, name }) => ({ id, name: `${name} (${summary[id] ?? 0})` }))}
              onChange={(_, value) => setStage(String(value ?? ""))} />
          </div>
        )}
        <div className="w-full xl:w-80">
          <Input name="search" value={search} onValueChange={(_, value) => setSearch(String(value))} placeholder="Buscar por número ou cliente..." icon="search" />
        </div>
        {toBill > 0 && <p className="xl:ml-auto text-sm text-muted-foreground">{toBill} ordem(ns) com período para faturar</p>}
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}

      {kanban && !error && (
        <div className="p-2">
          <KanbanView key={boardKey} data={rows.filter((row) => row.stage !== "cancelada")} columns={COLUMNS} statusField="stage" isLoading={isLoading} storageKey="worksafe.suprimentos.locacoes.kanban.hidden" columnWidth={260}
            emptyMessage={empty} onStatusChange={drop}>
            {(row: RentalRow) => (
              <button type="button" className="w-full p-3 space-y-2 text-left" onClick={() => open(row.id)}>
                <div>
                  <p className="font-medium text-sm truncate">{row.customer}</p>
                  <p className="text-xs text-muted-foreground truncate tabular-nums">{row.number}{row.contract ? ` · ${row.contract.number}` : " · sem venda"}</p>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="truncate">{row.summary}</p>
                  <p className="flex items-center gap-2"><Icon name="calendar" className="w-3 h-3 shrink-0" /> <span className={row.stage === "atrasada" ? "font-semibold text-red-600 dark:text-red-400" : ""}>{when(row)}</span></p>
                  {billBadge(row)}
                </div>
                <p className="pt-2 border-t text-sm font-semibold tabular-nums">{money(row.ratePerPeriod)} <span className="text-xs font-normal text-muted-foreground">por {PERIOD_LABEL[row.period]}{row.billing === "unico" ? " · pagamento único" : ""}</span></p>
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
            <div className="w-40">Etapa</div>
            <div className="w-56">Período</div>
            <div className="w-40 text-right">Valor</div>
          </div>
          {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 w-full my-1" />)}
          {!isLoading && !rows.length && <p className="p-6 text-sm text-muted-foreground">{empty}</p>}
          {rows.map((row) => (
            <button key={row.id} type="button" onClick={() => open(row.id)} className="w-full text-left flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-3 border-b last:border-b-0 text-sm hover:bg-muted/40">
              <div className="lg:w-36">
                <p className="font-semibold tabular-nums">{row.number}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{row.contract ? row.contract.number : "sem venda"}</p>
              </div>
              <div className="flex-1 min-w-0 lg:pr-4">
                <p className="font-medium truncate">{row.customer}</p>
                <p className="text-xs text-muted-foreground truncate">{row.summary}</p>
              </div>
              <div className="lg:w-40 flex flex-wrap gap-1"><RentalStageBadge stage={row.stage} />{billBadge(row)}</div>
              <div className="lg:w-56 text-xs text-muted-foreground">{when(row)}</div>
              <div className="lg:w-40 lg:text-right tabular-nums">{money(row.ratePerPeriod)}<span className="text-xs text-muted-foreground"> /{PERIOD_LABEL[row.period]}</span>{row.billed > 0 && <p className="text-xs text-muted-foreground">faturado {money(row.billed)}</p>}</div>
            </button>
          ))}
        </div>
      )}
      {(summary.cancelada ?? 0) > 0 && (kanban || !stage) && (
        <p className="mt-3 text-xs text-muted-foreground">{summary.cancelada} ordem(ns) de locação cancelada(s) não aparecem aqui; na visão em lista, filtre por "Canceladas".</p>
      )}
    </>
  );
}
