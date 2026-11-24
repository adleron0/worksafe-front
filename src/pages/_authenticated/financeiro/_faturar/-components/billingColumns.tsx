import { Link } from "@tanstack/react-router";
import Icon from "@/components/general-components/Icon";
import type { DataColumn } from "@/components/general-components/DataTable";
import { dateBr, money } from "../../../comercial/-shared/commercial";
import { BillingRow, BillingStage, dueRuleText } from "../../../comercial/-shared/contracts";
import { KindBadge } from "../../../comercial/-shared/proposals";

export const STAGES: Array<{ id: BillingStage; name: string; color: string; hint: string }> = [
  { id: "aguardando", name: "Aguardando", color: "#9ca3af", hint: "A condição combinada ainda não aconteceu" },
  { id: "liberada", name: "A faturar", color: "#f59e0b", hint: "Já pode emitir a nota fiscal" },
  { id: "faturada", name: "Faturadas", color: "#3b82f6", hint: "Com nota, esperando o pagamento" },
  { id: "recebida", name: "Recebidas", color: "#22c55e", hint: "Pagas recentemente" },
];

export const isWork = (row: BillingRow) => row.source === "obra";
export const isMeasurement = (row: BillingRow) => row.source === "medicao" || row.source === "obra";
export const installmentLabel = (row: BillingRow) => (isMeasurement(row)
  ? row.description ?? "Medição da locação"
  : `${row.total > 1 ? `Parcela ${row.number}/${row.total}` : "Pagamento único"}${row.description ? ` · ${row.description}` : ""}`);

/** Situação da parcela em uma frase. */
export const billingDetail = (row: BillingRow) => (row.record
  ? `NF ${row.record.invoiceNumber ?? "—"} de ${dateBr(row.record.invoiceIssuedAt)} · ${row.record.paid ? `paga em ${dateBr(row.record.paidAt)}` : `vence em ${dateBr(row.record.dueDate)}`}`
  : row.waitingFor ? `Espera ${row.waitingFor}` : isWork(row) ? `Boletim aprovado · nota de ${money(row.invoiceValue ?? row.value)}${row.depositValue ? ` (caução ${money(row.depositValue)})` : ""}` : isMeasurement(row) ? `Medição da locação · ${row.lines?.length ?? 0} item(ns)` : `Combinado: ${dueRuleText(row)} · vencimento sugerido ${dateBr(row.suggestedDue)}`);

/** Número da venda: link para o contrato quando a pessoa vê o comercial. */
export function SaleLink({ row, canOpenSale }: { row: BillingRow; canOpenSale: boolean }) {
  return canOpenSale
    ? <Link to="/comercial/contratos/$contractId" params={{ contractId: String(row.contractId) }} className="underline hover:text-foreground">{row.contractNumber}</Link>
    : <span>{row.contractNumber}</span>;
}

/** Pedido de compra do cliente (ou o aviso de que ainda não chegou). */
export function CustomerOrderTag({ row }: { row: BillingRow }) {
  return row.customerOrder.number
    ? <span className="inline-flex items-center gap-1"><Icon name="file-check" className="w-3 h-3 shrink-0" /> Pedido {row.customerOrder.number}</span>
    : <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400"><Icon name="file-question" className="w-3 h-3 shrink-0" /> Sem pedido do cliente</span>;
}

const muted = "text-xs text-muted-foreground";

export const billingColumns = ({ canOpenSale }: { canOpenSale: boolean }): DataColumn<BillingRow>[] => [
  {
    id: "customer", header: "Cliente e venda", className: "min-w-[200px]",
    cell: (row) => (
      <div className="min-w-0 max-w-[16rem]">
        <p className="font-medium truncate">{row.customer.name}</p>
        <p className={`${muted} truncate`}><SaleLink row={row} canOpenSale={canOpenSale} /> · {row.title}</p>
      </div>
    ),
  },
  { id: "kind", header: "Tipo", cell: (row) => <KindBadge kind={row.kind} /> },
  {
    id: "installment", header: "Parcela", className: "min-w-[240px]",
    cell: (row) => (
      <div className="min-w-0 max-w-[22rem]">
        <p className="font-medium truncate">{installmentLabel(row)}</p>
        <p className={`${muted} truncate`}>{billingDetail(row)}</p>
      </div>
    ),
  },
  { id: "order", header: "Pedido do cliente", cell: (row) => <span className={`${muted} whitespace-nowrap`}><CustomerOrderTag row={row} /></span> },
  {
    id: "stage", header: "Etapa",
    cell: (row) => {
      const current = STAGES.find((item) => item.id === row.stage);
      return (
        <span className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium bg-muted whitespace-nowrap">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: current?.color }} /> {current?.name ?? row.stage}
        </span>
      );
    },
  },
  { id: "value", header: "Valor", align: "right", cell: (row) => <span className="font-semibold tabular-nums whitespace-nowrap">{money(row.value)}</span> },
];
