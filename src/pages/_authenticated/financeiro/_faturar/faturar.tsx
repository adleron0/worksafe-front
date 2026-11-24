import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import KanbanView, { KanbanColumn } from "@/components/general-components/KanbanView";
import Select from "@/components/general-components/Select";
import ViewToggle, { useStoredView } from "@/components/general-components/ViewToggle";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import StatusChips from "@/components/general-components/StatusChips";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import { commercialApi, errorMessage, money } from "../../comercial/-shared/commercial";
import { BillDialog, MeasurementBillDialog } from "../../comercial/-shared/billing";
import { WorkBillDialog } from "../../comercial/_contratos/-WorkMeasurements";
import type { WorkLine } from "../../comercial/-shared/measurement";
import { BILLING_KEY, BillingQueue, BillingRow, Contract } from "../../comercial/-shared/contracts";
import { KIND_LABEL, KindBadge } from "../../comercial/-shared/proposals";
import { CustomerOrderTag, STAGES, SaleLink, billingColumns, billingDetail, installmentLabel, isMeasurement, isWork } from "./-components/billingColumns";
import BillingRowActions from "./-components/BillingRowActions";

export const Route = createFileRoute("/_authenticated/financeiro/_faturar/faturar")({
  component: BillingPage,
});

const COLUMNS: KanbanColumn[] = STAGES.map(({ id, name, color }) => ({ id, name, value: id, color }));

/**
 * "A faturar": as parcelas das vendas fechadas (propostas aceitas) e as medições
 * das locações (períodos vencidos, avarias, frete), na etapa em que estão.
 * Registrar a nota fiscal cria a conta a receber.
 */
function BillingPage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");
  const [stage, setStage] = useState("");
  const [billing, setBilling] = useState<BillingRow | null>(null);
  // refaz o quadro quando um cartão é arrastado (a etapa muda pela nota e pela baixa, não por arrasto)
  const [boardKey, setBoardKey] = useState(0);
  const [view, changeView] = useStoredView("worksafe.financeiro.faturar.view");

  const params = { ...(search.trim() ? { search: search.trim() } : {}), ...(kind ? { kind } : {}) };
  const { data, isLoading, error } = useQuery({
    queryKey: [BILLING_KEY, params],
    queryFn: () => commercialApi.get<BillingQueue>("contracts/billing", params),
    placeholderData: (previous) => previous,
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [BILLING_KEY] });
    // o que muda aqui também muda em Contas a Receber
    queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0] ?? "").startsWith("list") });
  };
  const { mutate: unbill } = useMutation({
    mutationFn: (row: BillingRow) => commercialApi.post<Contract>(isMeasurement(row) ? `contracts/${row.contractId}/measurements/${row.measurementId}/unbill` : `contracts/${row.contractId}/installments/${row.id}/unbill`),
    onSuccess: () => { refresh(); toast({ title: "Faturamento desfeito", description: "O título saiu do Contas a Receber.", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível desfazer", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can("view_financeiro")) return null;
  const canBill = can("create_financeiro");
  const canUnbill = can("inactive_financeiro");
  const canOpenSale = can("view_comercial");
  const summary = data?.summary;
  const rows = data?.rows ?? [];
  const listed = stage ? rows.filter((row) => row.stage === stage) : rows;

  /** O que dá para fazer com a parcela, na lista e no cartão. */
  const actions = (row: BillingRow) => (
    <>
      {row.stage === "liberada" && canBill && (
        <Button type="button" size="sm" className="h-7 gap-1 px-2" onClick={() => setBilling(row)}><Icon name="receipt" className="w-3.5 h-3.5" /> Registrar NF</Button>
      )}
      {row.stage === "aguardando" && canBill && !isMeasurement(row) && (
        <Button type="button" size="sm" variant="outline" className="h-7 gap-1 px-2" onClick={() => setBilling(row)}>Faturar mesmo assim</Button>
      )}
      {row.stage === "faturada" && canUnbill && (
        <ConfirmDialog title={isMeasurement(row) ? "Desfazer esta medição?" : "Desfazer o faturamento desta parcela?"}
          description={isWork(row) ? "A conta a receber do boletim é cancelada, a caução dele volta e o boletim fica aprovado. Só o boletim mais novo do contrato pode ser desfeito." : isMeasurement(row) ? "A conta a receber da medição é cancelada e os períodos e cobranças dela voltam a ficar pendentes. Use quando a nota foi lançada errada." : "A conta a receber desta parcela é cancelada e a parcela volta a ficar sem nota. Use quando a nota foi lançada errada."}
          onConfirm={() => unbill(row)}>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2">Desfazer</Button>
        </ConfirmDialog>
      )}
    </>
  );
  const detail = billingDetail;
  const sale = (row: BillingRow) => <SaleLink row={row} canOpenSale={canOpenSale} />;
  const order = (row: BillingRow) => <CustomerOrderTag row={row} />;
  const filtered = !!(search || kind || stage);

  return (
    <>
      <PageHeader title="A faturar" description="Parcelas das propostas aceitas, boletins de medição de obra aprovados e medições das locações (cada período vencido). Registrar a nota fiscal cria a conta a receber; a baixa é feita em Contas a Receber." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        {STAGES.map((item) => (
          <div key={item.id} className="rounded-card border bg-card p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} /> {item.name}{item.id === "recebida" && data ? ` (${data.recentDays} dias)` : ""}</p>
            <p className="font-semibold tabular-nums">{summary ? money(summary[item.id].total) : "—"}</p>
            <p className="text-xs text-muted-foreground">{summary ? `${summary[item.id].count} ${summary[item.id].count === 1 ? "item" : "itens"}` : item.hint}</p>
          </div>
        ))}
      </div>

      <ListCard>
        <ViewToggle view={view} onChange={changeView} />
        {view === "lista" && (
          <StatusChips ariaLabel="Etapa" value={stage} onChange={setStage}
            options={[{ value: "", label: "Todas as etapas", count: summary ? STAGES.reduce((sum, item) => sum + summary[item.id].count, 0) : undefined },
              ...STAGES.map(({ id, name, color }) => ({ value: id as string, label: name, count: summary?.[id].count ?? 0, color }))]} />
        )}
        <ListToolbar search={{ value: search, onChange: setSearch, placeholder: "Buscar por cliente, venda ou pedido do cliente..." }}>
          <div className="w-48 sm:w-56">
            <Select name="kind" state={kind} clearable placeholder="Todos os tipos" modal={false}
              options={Object.entries(KIND_LABEL).map(([id, name]) => ({ id, name }))} onChange={(_, value) => setKind(String(value ?? ""))} />
          </div>
        </ListToolbar>

        {view === "kanban" && error && <p className="text-sm text-destructive font-medium">Erro: {errorMessage(error)}</p>}
        {view === "kanban" && !error && (
          <div>
            <KanbanView key={boardKey} data={rows} columns={COLUMNS} statusField="stage" isLoading={isLoading} storageKey="worksafe.financeiro.faturar.kanban.hidden" columnWidth={280}
              emptyMessage={search || kind ? "Nenhuma parcela com esses filtros." : "Nenhuma parcela por aqui. Elas aparecem quando uma proposta é aceita."}
              onStatusChange={() => {
                toast({ title: "A etapa muda sozinha", description: "Registre a nota fiscal para faturar; a baixa em Contas a Receber marca como recebida." });
                setBoardKey((value) => value + 1);
              }}>
              {(row: BillingRow) => (
                <div className="p-3 space-y-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{row.customer.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{sale(row)} · {row.title}</p>
                  </div>
                  <KindBadge kind={row.kind} />
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="truncate">{installmentLabel(row)}</p>
                    <p>{detail(row)}</p>
                    <p className="truncate">{order(row)}</p>
                  </div>
                  <div className="pt-2 border-t flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold tabular-nums">{money(row.value)}</p>
                    <div className="flex gap-1">{actions(row)}</div>
                  </div>
                </div>
              )}
            </KanbanView>
          </div>
        )}

        {view === "lista" && (
          <DataTable rows={data ? listed : undefined} columns={billingColumns({ canOpenSale })} getRowId={(row) => row.id} ariaLabel="A faturar" minWidth={960}
            loading={isLoading} error={error ? errorMessage(error) : null}
            actions={(row) => <BillingRowActions row={row} canBill={canBill} canUnbill={canUnbill} onBill={() => setBilling(row)} onUnbill={() => unbill(row)} />}
            empty={<EmptyState icon={filtered ? "search-x" : "inbox"} title={filtered ? "Nenhuma parcela com esses filtros." : "Nenhuma parcela por aqui. Elas aparecem quando uma proposta é aceita."} />} />
        )}
      </ListCard>

      {billing && isWork(billing) && billing.measurementId && (
        <WorkBillDialog contract={{ id: billing.contractId, number: billing.contractNumber, customer: billing.customer, customerOrder: billing.customerOrder, retentionRates: billing.retentionRates }}
          measurement={{ id: billing.measurementId, label: billing.description?.split(" ")[0] ?? "BM", lines: (billing.lines ?? []) as WorkLine[], invoiceValue: billing.invoiceValue ?? billing.value, depositValue: billing.depositValue ?? 0, value: billing.value }}
          onClose={() => setBilling(null)} onDone={refresh} />
      )}
      {billing && isMeasurement(billing) && !isWork(billing) && billing.rental && (
        <MeasurementBillDialog contract={{ id: billing.contractId, number: billing.contractNumber, customer: billing.customer, customerOrder: billing.customerOrder, retentionRates: billing.retentionRates }}
          rental={{ id: billing.rental.id, number: billing.rental.number ?? "" }} lines={billing.lines ?? []} onClose={() => setBilling(null)} onDone={refresh} />
      )}
      {billing && !isMeasurement(billing) && (
        <BillDialog contract={{ id: billing.contractId, number: billing.contractNumber, customer: billing.customer, customerOrder: billing.customerOrder, retentionRates: billing.retentionRates }} installment={{ ...billing, id: Number(billing.id) }}
          onClose={() => setBilling(null)} onDone={refresh} />
      )}
    </>
  );
}
