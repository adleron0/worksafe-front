import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import KanbanView, { KanbanColumn } from "@/components/general-components/KanbanView";
import Select from "@/components/general-components/Select";
import ViewToggle, { useStoredView } from "@/components/general-components/ViewToggle";
import { cn } from "@/lib/utils";
import { commercialApi, dateBr, errorMessage, money } from "../../comercial/-shared/commercial";
import { BillDialog, MeasurementBillDialog } from "../../comercial/-shared/billing";
import { BILLING_KEY, BillingQueue, BillingRow, BillingStage, Contract, dueRuleText } from "../../comercial/-shared/contracts";
import { KIND_LABEL, KindBadge } from "../../comercial/-shared/proposals";

export const Route = createFileRoute("/_authenticated/financeiro/_faturar/faturar")({
  component: BillingPage,
});

const STAGES: Array<{ id: BillingStage; name: string; color: string; hint: string }> = [
  { id: "aguardando", name: "Aguardando", color: "#9ca3af", hint: "A condição combinada ainda não aconteceu" },
  { id: "liberada", name: "A faturar", color: "#f59e0b", hint: "Já pode emitir a nota fiscal" },
  { id: "faturada", name: "Faturadas", color: "#3b82f6", hint: "Com nota, esperando o pagamento" },
  { id: "recebida", name: "Recebidas", color: "#22c55e", hint: "Pagas recentemente" },
];
const COLUMNS: KanbanColumn[] = STAGES.map(({ id, name, color }) => ({ id, name, value: id, color }));

const isMeasurement = (row: BillingRow) => row.source === "medicao";
const installmentLabel = (row: BillingRow) => (isMeasurement(row)
  ? row.description ?? "Medição da locação"
  : `${row.total > 1 ? `Parcela ${row.number}/${row.total}` : "Pagamento único"}${row.description ? ` · ${row.description}` : ""}`);

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
          description={isMeasurement(row) ? "A conta a receber da medição é cancelada e os períodos e cobranças dela voltam a ficar pendentes. Use quando a nota foi lançada errada." : "A conta a receber desta parcela é cancelada e a parcela volta a ficar sem nota. Use quando a nota foi lançada errada."}
          onConfirm={() => unbill(row)}>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2">Desfazer</Button>
        </ConfirmDialog>
      )}
    </>
  );
  /** Situação da parcela em uma frase. */
  const detail = (row: BillingRow) => (row.record
    ? `NF ${row.record.invoiceNumber ?? "—"} de ${dateBr(row.record.invoiceIssuedAt)} · ${row.record.paid ? `paga em ${dateBr(row.record.paidAt)}` : `vence em ${dateBr(row.record.dueDate)}`}`
    : row.waitingFor ? `Espera ${row.waitingFor}` : isMeasurement(row) ? `Medição da locação · ${row.lines?.length ?? 0} item(ns)` : `Combinado: ${dueRuleText(row)} · vencimento sugerido ${dateBr(row.suggestedDue)}`);
  const sale = (row: BillingRow) => (canOpenSale
    ? <Link to="/comercial/contratos/$contractId" params={{ contractId: String(row.contractId) }} className="underline hover:text-foreground">{row.contractNumber}</Link>
    : <span>{row.contractNumber}</span>);
  const order = (row: BillingRow) => (row.customerOrder.number
    ? <span className="inline-flex items-center gap-1"><Icon name="file-check" className="w-3 h-3 shrink-0" /> Pedido {row.customerOrder.number}</span>
    : <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400"><Icon name="file-question" className="w-3 h-3 shrink-0" /> Sem pedido do cliente</span>);

  return (
    <>
      <div>
        <h1 className="text-xl font-bold">A faturar</h1>
        <p className="text-sm text-muted-foreground">Parcelas das propostas aceitas e medições das locações (cada período vencido). Registrar a nota fiscal cria a conta a receber; a baixa é feita em Contas a Receber.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 my-4">
        {STAGES.map((item) => (
          <div key={item.id} className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} /> {item.name}{item.id === "recebida" && data ? ` (${data.recentDays} dias)` : ""}</p>
            <p className="font-semibold tabular-nums">{summary ? money(summary[item.id].total) : "—"}</p>
            <p className="text-xs text-muted-foreground">{summary ? `${summary[item.id].count} ${summary[item.id].count === 1 ? "item" : "itens"}` : item.hint}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-4 p-4 rounded-lg border">
        <ViewToggle view={view} onChange={changeView} />
        {view === "lista" && (
          <div className="w-full xl:w-56">
            <Select name="stage" state={stage} clearable placeholder="Todas as etapas" modal={false}
              options={STAGES.map(({ id, name }) => ({ id, name: `${name} (${summary?.[id].count ?? 0})` }))} onChange={(_, value) => setStage(String(value ?? ""))} />
          </div>
        )}
        <div className="w-full xl:w-80">
          <Input name="search" value={search} onValueChange={(_, value) => setSearch(String(value))} placeholder="Buscar por cliente, venda ou pedido do cliente..." icon="search" />
        </div>
        <div className="w-full xl:w-56">
          <Select name="kind" state={kind} clearable placeholder="Todos os tipos" modal={false}
            options={Object.entries(KIND_LABEL).map(([id, name]) => ({ id, name }))} onChange={(_, value) => setKind(String(value ?? ""))} />
        </div>
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}

      {view === "kanban" && !error && (
        <div className="p-2">
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

      {view === "lista" && !error && (
        <div className="rounded-lg border overflow-hidden">
          <div className="hidden lg:flex items-center py-2 px-4 bg-primary font-semibold text-sm text-inverse-foreground">
            <div className="w-56">Cliente e venda</div>
            <div className="flex-1">Parcela</div>
            <div className="w-28">Etapa</div>
            <div className="w-32 text-right">Valor</div>
            <div className="w-44 text-right">Ações</div>
          </div>
          {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 w-full my-1" />)}
          {!isLoading && !listed.length && <p className="p-6 text-sm text-muted-foreground">{search || kind || stage ? "Nenhuma parcela com esses filtros." : "Nenhuma parcela por aqui. Elas aparecem quando uma proposta é aceita."}</p>}
          {listed.map((row) => {
            const current = STAGES.find((item) => item.id === row.stage)!;
            return (
              <div key={row.id} className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-3 border-b last:border-b-0 text-sm hover:bg-muted/40">
                <div className="lg:w-56 min-w-0 lg:pr-3">
                  <p className="font-medium truncate">{row.customer.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{sale(row)} · {row.title}</p>
                  <KindBadge kind={row.kind} className="mt-0.5" />
                </div>
                <div className="flex-1 min-w-0 lg:pr-3">
                  <p className="font-medium">{installmentLabel(row)}</p>
                  <p className="text-xs text-muted-foreground">{detail(row)}</p>
                  <p className="text-xs text-muted-foreground">{order(row)}</p>
                </div>
                <div className="lg:w-28">
                  <span className={cn("inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium bg-muted")}>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: current.color }} /> {current.name}
                  </span>
                </div>
                <div className="lg:w-32 lg:text-right font-semibold tabular-nums">{money(row.value)}</div>
                <div className="lg:w-44 flex lg:justify-end gap-1">{actions(row)}</div>
              </div>
            );
          })}
        </div>
      )}

      {billing && isMeasurement(billing) && billing.rental && (
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
