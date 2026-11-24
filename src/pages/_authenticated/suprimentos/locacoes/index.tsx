import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import Icon from "@/components/general-components/Icon";
import StatusBadge from "@/components/general-components/StatusBadge";
import KanbanView, { KanbanColumn } from "@/components/general-components/KanbanView";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import StatusChips, { StatusChipOption } from "@/components/general-components/StatusChips";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
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
  const { data, isLoading, isFetching, error, refetch } = useQuery({
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
    ? <StatusBadge tone="warning">{row.fromContract ? `A faturar ${money(row.pendingValue)}` : "Faturar"}</StatusBadge>
    : null);

  const stageOptions: StatusChipOption[] = [
    { value: "todas", label: "Todas, menos canceladas" },
    ...RENTAL_STAGES.map(({ id, name, color }) => ({ value: id, label: name, color, count: summary[id] ?? 0 })),
    { value: "cancelada", label: "Canceladas", color: "#6b7280", count: summary.cancelada ?? 0 },
  ];
  const columns: DataColumn<RentalRow>[] = [
    {
      id: "number", header: "Número", className: "w-32", cell: (row) => (
        <div>
          <p className="font-semibold tabular-nums">{row.number}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{row.contract ? row.contract.number : "sem venda"}</p>
        </div>
      ),
    },
    {
      id: "customer", header: "Cliente e itens", cell: (row) => (
        <div className="min-w-0 max-w-md">
          <p className="font-medium truncate">{row.customer}</p>
          <p className="text-xs text-muted-foreground truncate">{row.summary}</p>
        </div>
      ),
    },
    { id: "stage", header: "Etapa", className: "whitespace-nowrap", cell: (row) => <span className="inline-flex items-center gap-1"><RentalStageBadge stage={row.stage} />{billBadge(row)}</span> },
    { id: "when", header: "Período", className: "text-xs text-muted-foreground whitespace-nowrap", cell: (row) => when(row) },
    {
      id: "value", header: "Valor", align: "right", className: "w-36 tabular-nums whitespace-nowrap", cell: (row) => (
        <div>
          <p>{money(row.ratePerPeriod)}<span className="text-xs text-muted-foreground"> /{PERIOD_LABEL[row.period]}</span></p>
          {row.billed > 0 && <p className="text-xs text-muted-foreground">faturado {money(row.billed)}</p>}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Ordens de locação" description="Cada proposta de locação aceita vira uma OL: entregar, acompanhar a devolução, faturar os períodos e acertar a caução." />

      <ListCard>
        {!kanban && <StatusChips options={stageOptions} value={stage || "todas"} onChange={(value) => setStage(value === "todas" ? "" : value)} ariaLabel="Etapa" />}

        <ListToolbar search={{ value: search, onChange: setSearch, placeholder: "Buscar por número ou cliente..." }}>
          {toBill > 0 && <p className="hidden md:block text-sm text-muted-foreground">{toBill} ordem(ns) com período para faturar</p>}
          <ViewToggle view={view} onChange={changeView} />
          <Button variant="outline" onClick={() => navigate({ to: "/suprimentos/locacoes/disponibilidade" })}><Icon name="chart-gantt" className="w-4 h-4" /> <span className="hidden sm:inline">Disponibilidade</span></Button>
          {can("create_comercial") && <Button onClick={() => navigate({ to: "/comercial/propostas/nova", search: { tipo: "locacao" } })}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Nova proposta de locação</span></Button>}
        </ListToolbar>

        {kanban && error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
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

        {!kanban && (
          <DataTable rows={data?.rows} columns={columns} getRowId={(row) => row.id} ariaLabel="Ordens de locação"
            loading={isLoading || isFetching} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
            onRowClick={(row) => open(row.id)}
            empty={search || stage
              ? <EmptyState icon="search-x" title={empty} action={<Button variant="outline" size="sm" onClick={() => { setSearch(""); setStage(""); }}>Limpar filtros</Button>} />
              : <EmptyState title="Nenhuma ordem de locação ainda." description="Ela nasce sozinha quando uma proposta de locação é aceita." />} />
        )}
        {(summary.cancelada ?? 0) > 0 && (kanban || !stage) && (
          <p className="text-xs text-muted-foreground">{summary.cancelada} ordem(ns) de locação cancelada(s) não aparecem aqui; na visão em lista, filtre por "Canceladas".</p>
        )}
      </ListCard>
    </>
  );
}
