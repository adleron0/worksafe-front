import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { ORDER_MOVES, OrderRow, OrderStatus, isForward, moveLabel } from "../../-shared/orders";

/** Menu ⋯ de uma OS (lista e cartão do kanban): abrir e as passagens de etapa que existem. */
export default function OrderRowActions({ row, canUpdate, onOpen, onMove, onCard = false }: {
  row: OrderRow; canUpdate: boolean; onOpen: (id: number) => void; onMove: (row: OrderRow, target: OrderStatus) => void; onCard?: boolean;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {onCard
          ? <Button className="h-6 w-6 p-0 shrink-0" variant="ghost" size="sm" aria-label={`Ações de ${row.number}`}><Icon name="ellipsis-vertical" className="w-3 h-3" /></Button>
          : <RowActionsTrigger label={`Ações de ${row.number}`} />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="gap-2" onSelect={() => onOpen(row.id)}><Icon name="eye" className="w-3.5 h-3.5" /> Abrir</DropdownMenuItem>
        {canUpdate && ORDER_MOVES[row.status].length > 0 && <DropdownMenuSeparator />}
        {canUpdate && ORDER_MOVES[row.status].map((target) => (
          <DropdownMenuItem key={target} className="gap-2" onSelect={() => onMove(row, target)}>
            <Icon name={target === "cancelada" ? "ban" : isForward(row.status, target) || row.status === "cancelada" ? "arrow-right" : "undo-2"} className="w-3.5 h-3.5" /> {moveLabel(row.status, target)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
