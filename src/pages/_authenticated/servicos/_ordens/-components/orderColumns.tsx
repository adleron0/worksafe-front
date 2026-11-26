import Icon from "@/components/general-components/Icon";
import { EntityBadge } from "@/components/general-components/EntitySelect";
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
        <EntityBadge id={row.entityId} className="mt-0.5" />
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
  { id: "progress", header: "Andamento", className: "w-48", cell: (row) => <OrderProgress row={row} /> },
];

/** Obra andando: avanço × previsto e o RDO de hoje; antes disso, a mobilização. */
export function OrderProgress({ row }: { row: OrderRow }) {
  const progress = row.progress;
  if (!progress || progress.done === null) {
    if (row.status === "concluida" || row.status === "encerrada" || row.status === "cancelada") return <span className={muted}>—</span>;
    return <span className={`${muted} tabular-nums`}>Mobilização {row.checklist.done}/{row.checklist.total}</span>;
  }
  const late = progress.planned !== null && progress.done + 5 < progress.planned;
  return (
    <div className="grid gap-1 min-w-[150px]">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={`font-semibold tabular-nums ${late ? "text-red-600 dark:text-red-400" : ""}`}>{Math.round(progress.done)}%</span>
        {progress.planned !== null && <span className="text-muted-foreground tabular-nums">previsto {Math.round(progress.planned)}%</span>}
      </div>
      <div className="relative h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden="true">
        <div className={`h-full rounded-full ${late ? "bg-red-500" : "bg-primary"}`} style={{ width: `${Math.min(100, progress.done)}%` }} />
      </div>
      {progress.todayReport && (
        <span className={`text-xs inline-flex items-center gap-1 ${progress.todayReport === "nenhum" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
          <Icon name={progress.todayReport === "fechado" ? "circle-check" : progress.todayReport === "rascunho" ? "file-pen" : "circle-alert"} className="w-3 h-3" />
          {progress.todayReport === "fechado" ? "RDO de hoje fechado" : progress.todayReport === "rascunho" ? "RDO de hoje em rascunho" : "Sem RDO hoje"}
        </span>
      )}
    </div>
  );
}
