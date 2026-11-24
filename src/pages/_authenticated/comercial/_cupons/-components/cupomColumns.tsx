import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Icon from "@/components/general-components/Icon";
import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ICupom } from "../-interfaces/entity.interface";

const muted = "text-xs text-muted-foreground";
const tag = "inline-flex items-center gap-1 rounded-chip border bg-muted/50 px-1.5 py-px text-[11px] font-medium text-muted-foreground whitespace-nowrap";
const money = (value: number | string) => `R$ ${Number(value).toFixed(2).replace(".", ",")}`;

/** Data do backend (ISO com fuso ou AAAA-MM-DD) sem deslocar o dia. */
function parseDay(date: Date | string, hour: number, minute = 0, second = 0) {
  if (typeof date !== "string") return date;
  const day = date.includes("T") ? date.split("T")[0] : date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const [year, month, dayOfMonth] = day.split("-").map(Number);
    return new Date(year, month - 1, dayOfMonth, hour, minute, second);
  }
  return new Date(date);
}

export function formatCupomDate(date?: Date | string) {
  if (!date) return "Sem prazo";
  try {
    return format(parseDay(date, 12), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "Data inválida";
  }
}

export function isCupomExpired(item: ICupom) {
  if (!item.validUntil) return false;
  const validDate = parseDay(item.validUntil, 23, 59, 59); // fim do dia
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return validDate < today;
}

const discount = (item: ICupom) => (item.discountType === "percentage" ? `${item.discountValue}%` : money(item.discountValue));
const usage = (item: ICupom) => `${item._count?.financialRecords || 0}/${item.usageLimit ? item.usageLimit : "∞"}`;

export const cupomColumns: DataColumn<ICupom>[] = [
  {
    id: "code", header: "Cupom", className: "min-w-[220px]",
    cell: (item) => (
      <div className="min-w-0 max-w-[18rem]">
        <p className="flex items-center gap-1.5 min-w-0">
          <Icon name="ticket" className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="font-semibold text-primary truncate">{item.code}</span>
          {item.course && (
            <Tooltip>
              <TooltipTrigger asChild><span className={`${tag}`}><Icon name="square-library" className="w-3 h-3" />curso</span></TooltipTrigger>
              <TooltipContent>Vinculado ao curso {item.course.name}</TooltipContent>
            </Tooltip>
          )}
          {item.class && (
            <Tooltip>
              <TooltipTrigger asChild><span className={`${tag}`}><Icon name="clipboard-list" className="w-3 h-3" />turma</span></TooltipTrigger>
              <TooltipContent>Vinculado à turma {item.class.name}</TooltipContent>
            </Tooltip>
          )}
        </p>
        {item.description && <p className={`${muted} truncate`}>{item.description}</p>}
      </div>
    ),
  },
  {
    id: "discount", header: "Desconto", className: "whitespace-nowrap",
    cell: (item) => (
      <div>
        <p className="font-medium tabular-nums">{discount(item)}</p>
        {item.minPurchaseValue && <p className={`${muted} tabular-nums`}>Mín: {money(item.minPurchaseValue)}</p>}
      </div>
    ),
  },
  {
    id: "seller", header: "Vendedor",
    cell: (item) => (item.seller
      ? (
        <div className="min-w-0 max-w-[14rem]">
          <p className="truncate">{item.seller.name}</p>
          {item.commissionType && item.commissionValue && (
            <p className={`${muted} truncate`}>Comissão: {item.commissionType === "percentage" ? `${item.commissionValue}%` : money(item.commissionValue)}</p>
          )}
        </div>
      )
      : <span className="text-muted-foreground">—</span>),
  },
  { id: "usage", header: "Uso", className: "whitespace-nowrap", cell: (item) => <span className="tabular-nums">{usage(item)}</span> },
  {
    id: "validUntil", header: "Validade", className: "whitespace-nowrap",
    cell: (item) => <span className={`tabular-nums ${isCupomExpired(item) ? "text-destructive" : ""}`}>{formatCupomDate(item.validUntil)}</span>,
  },
  {
    id: "status", header: "Situação",
    cell: (item) => <StatusBadge tone={item.active ? "success" : "neutral"}>{item.active ? "Ativo" : "Inativo"}</StatusBadge>,
  },
];
