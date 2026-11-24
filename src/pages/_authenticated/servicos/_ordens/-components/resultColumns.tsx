import type { DataColumn } from "@/components/general-components/DataTable";
import { cn } from "@/lib/utils";
import { decimal, money } from "../../../comercial/-shared/commercial";
import { OrderStageBadge } from "../../-shared/orders";
import { MarginTag, ResultRow, Versus } from "../../-shared/results";

const muted = "text-xs text-muted-foreground";

export const resultColumns: DataColumn<ResultRow>[] = [
  {
    id: "order", header: "Obra", className: "min-w-[240px]",
    cell: (row) => (
      <div className="min-w-0 max-w-[22rem]">
        <p className="font-medium truncate">{row.customer}</p>
        <p className={`${muted} truncate`}><span className="font-semibold tabular-nums">{row.number}</span> · {row.title}</p>
      </div>
    ),
  },
  {
    id: "status", header: "Etapa",
    cell: (row) => (
      <div>
        <OrderStageBadge status={row.status} />
        <p className={`${muted} tabular-nums whitespace-nowrap`}>
          {row.frozen ? "resultado congelado" : row.progress !== null ? `${decimal(row.progress, 0)}% feito` : ""}
          {!row.frozen && row.pending > 0 ? `${row.progress !== null ? " · " : ""}${row.pending} em aberto` : ""}
        </p>
      </div>
    ),
  },
  { id: "revenue", header: "Receita", align: "right", cell: (row) => <span className="tabular-nums whitespace-nowrap">{money(row.budget.revenue)}</span> },
  {
    id: "budget", header: "Lucro orçado", align: "right",
    cell: (row) => (
      <div className="tabular-nums whitespace-nowrap">
        {money(row.budget.profit)}
        <p className="text-xs"><MarginTag margin={row.budget.margin} showLabel={false} /></p>
      </div>
    ),
  },
  {
    id: "projected", header: "Lucro projetado", align: "right",
    cell: (row) => (
      <div className="tabular-nums whitespace-nowrap">
        <span className={cn("font-semibold", row.projected.profit < 0 && "text-red-600 dark:text-red-400")}>{money(row.projected.profit)}</span>
        <p className="text-xs"><MarginTag margin={row.projected.margin} showLabel={false} /> · <Versus projected={row.projected.profit} budget={row.budget.profit} /></p>
      </div>
    ),
  },
];
