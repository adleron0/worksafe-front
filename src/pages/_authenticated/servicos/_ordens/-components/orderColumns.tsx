import Icon from "@/components/general-components/Icon";
import type { DataColumn } from "@/components/general-components/DataTable";
import { OrderRow, OrderStageBadge, periodText } from "../../-shared/orders";

const muted = "text-xs text-muted-foreground";

/** Pedido de compra do cliente (ou o aviso de que ainda não chegou). */
export function CustomerOrder({ row }: { row: OrderRow }) {
  return row.customerOrderNumber
    ? <span className="inline-flex items-center gap-1"><Icon name="file-check" className="w-3 h-3 shrink-0" /> Pedido {row.customerOrderNumber}</span>
    : <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400"><Icon name="file-question" className="w-3 h-3 shrink-0" /> Sem pedido do cliente</span>;
}

export const orderColumns: DataColumn<OrderRow>[] = [
  {
    id: "number", header: "Número", className: "w-44",
    cell: (row) => (
      <div className="min-w-0">
        <p className="font-semibold tabular-nums">{row.number}</p>
        <p className={`${muted} whitespace-nowrap`}><CustomerOrder row={row} /></p>
      </div>
    ),
  },
  {
    id: "customer", header: "Cliente e serviço", className: "min-w-[240px]",
    cell: (row) => (
      <div className="min-w-0 max-w-[22rem]">
        <p className="font-medium truncate">{row.customer.name}</p>
        <p className={`${muted} truncate`}>{row.title}{row.responsible ? ` · ${row.responsible}` : ""}</p>
      </div>
    ),
  },
  { id: "status", header: "Etapa", cell: (row) => <OrderStageBadge status={row.status} late={row.late} /> },
  { id: "period", header: "Quando", cell: (row) => <span className={`${muted} whitespace-nowrap`}>{periodText(row)}</span> },
  { id: "checklist", header: "Mobilização", align: "right", cell: (row) => <span className="tabular-nums text-muted-foreground">{row.checklist.done}/{row.checklist.total}</span> },
];
