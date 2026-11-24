import { Link } from "@tanstack/react-router";
import Icon from "@/components/general-components/Icon";
import { SortButton } from "@/components/general-components/SortButton";
import StatusBadge, { StatusTone } from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IFinancialRecord } from "../-interfaces/entity.interface";
import { OPEN_STATUSES, formatCurrency, formatDate, paymentMethodLabel, todayInput } from "./options";

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  processing: { label: "Processando", tone: "info" },
  waiting: { label: "Aguardando", tone: "primary" },
  received: { label: "Recebido", tone: "success" },
  declined: { label: "Recusado", tone: "danger" },
  chargeback: { label: "Estorno", tone: "warning" },
  cancelled: { label: "Cancelado", tone: "neutral" },
  overdue: { label: "Vencido", tone: "danger" },
};
const GATEWAY: Record<string, string> = { manual: "Manual", asaas: "Asaas", infinitePay: "InfinitePay" };

/** Situação mostrada: manual não tem provedor para marcar atraso, então vale o vencimento. */
export function receivableStatus(item: IFinancialRecord, today?: string) {
  const isOpen = OPEN_STATUSES.includes(item.status);
  const late = isOpen && item.status !== "overdue" && !!item.dueDate && item.dueDate.slice(0, 10) < (today ?? todayInput());
  return STATUS[late ? "overdue" : item.status] ?? STATUS.processing;
}

const person = (item: IFinancialRecord) => item.customer?.name || item.trainee?.name || item.subscription?.name || "";
const muted = "text-xs text-muted-foreground";
const tag = "inline-flex items-center gap-1 rounded-chip border bg-muted/50 px-1.5 py-px text-[11px] font-medium text-muted-foreground whitespace-nowrap";

/** Texto com o resto num balão (a linha fica em uma linha só). */
function More({ children, lines }: { children: React.ReactNode; lines: Array<string | number | false | null | undefined> }) {
  const extra = lines.filter((line): line is string => typeof line === "string" && line !== "");
  if (!extra.length) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild><span className="cursor-help">{children}</span></TooltipTrigger>
      <TooltipContent className="max-w-xs space-y-0.5">{extra.map((line) => <p key={line}>{line}</p>)}</TooltipContent>
    </Tooltip>
  );
}

export function receivableColumns(today?: string, sort?: { order?: string; onSort: (order: string) => void }): DataColumn<IFinancialRecord>[] {
  return [
    {
      id: "customer", header: "Cliente/Aluno", mobile: "title", className: "min-w-[220px]",
      cell: (item) => {
        const who = person(item);
        const billing = item.customer?.contacts?.find((c) => c.defaultFinancial);
        const contact = item.trainee?.email || item.subscription?.email || (billing ? `Cobrança: ${billing.name} · ${billing.email}` : item.customer?.email);
        const plan = [item.chartAccount && `${item.chartAccount.code} ${item.chartAccount.name}`, item.costCenter?.name].filter(Boolean).join(" · ");
        const second = (who && item.description) || contact || plan;
        return (
          <div className="min-w-0 max-w-[20rem]">
            <p className="truncate">
              <span className="font-medium">{who || item.description || "Sem cliente"}</span>
              <span className="text-xs text-muted-foreground"> #{item.id}</span>
              {!who && <span className={`${tag} ml-1.5`}>sem cliente</span>}
            </p>
            {second && (
              <More lines={[contact && contact !== second && contact, who && item.description && item.description !== second && item.description, plan && plan !== second && plan]}>
                <p className={`${muted} truncate`}>{second}</p>
              </More>
            )}
          </div>
        );
      },
    },
    {
      id: "value", header: "Valor", sortField: "value", mobile: "end", className: "whitespace-nowrap",
      cell: (item) => {
        const net = item.netValue && Number(item.netValue) !== Number(item.value) ? Number(item.netValue) : null;
        return (
          <More lines={[
            item.receivedValue && Number(item.receivedValue) !== Number(item.netValue ?? item.value) && `Recebido: ${formatCurrency(item.receivedValue)}`,
            item.originalValue && Number(item.originalValue) !== Number(item.value) && `Original: ${formatCurrency(item.originalValue)}`,
            item.discount && Number(item.discount) > 0 && `Desconto: -${formatCurrency(item.discount)}`,
            item.commissionValue && Number(item.commissionValue) > 0 && `Comissão: ${formatCurrency(item.commissionValue)} (${item.commissionPercentage}%)`,
          ]}>
            <span className="block">
              <span className="font-medium tabular-nums">{formatCurrency(item.value)}</span>
              {net !== null && <span className={`${muted} block tabular-nums`}>Líquido {formatCurrency(net)}</span>}
            </span>
          </More>
        );
      },
    },
    {
      id: "dates", mobile: "meta", className: "whitespace-nowrap",
      header: sort ? <><SortButton label="Vencimento" field="dueDate" order={sort.order} onSort={sort.onSort} /> · <SortButton label="Recebimento" field="paidAt" order={sort.order} onSort={sort.onSort} /></> : "Vencimento",
      cell: (item) => (
        <div>
          <p className="tabular-nums">{formatDate(item.dueDate)}</p>
          {item.paidAt && (
            <More lines={[[paymentMethodLabel(item.paymentMethod), item.bankAccount?.name].filter(Boolean).join(" · "), item.statementRef && "Conciliada com o extrato"]}>
              <p className="tabular-nums text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                Recebido {formatDate(item.paidAt)}
                {item.statementRef && <Icon name="link-2" className="w-3 h-3" />}
                {item.receiptUrl && <a href={item.receiptUrl} target="_blank" rel="noreferrer" aria-label="Abrir comprovante" className="text-muted-foreground hover:text-primary"><Icon name="paperclip" className="w-3 h-3" /></a>}
              </p>
            </More>
          )}
        </div>
      ),
    },
    {
      id: "origin", header: "Origem", mobile: "meta",
      cell: (item) => (
        <div className="flex flex-wrap items-center gap-1 max-w-[10.5rem]">
          <span className={tag}><Icon name={item.gateway === "manual" ? "hand-coins" : "credit-card"} className="w-3 h-3" />{GATEWAY[item.gateway] ?? item.gateway}</span>
          {item.installmentNumber && item.installmentTotal && <span className={tag}>{item.installmentNumber}/{item.installmentTotal}</span>}
          {item.recurrenceId && <span className={tag}><Icon name="repeat" className="w-3 h-3" />mensal</span>}
          {item.contractId && (
            <Link to="/comercial/contratos/$contractId" params={{ contractId: String(item.contractId) }} className={`${tag} hover:text-foreground hover:border-primary/50`}>
              <Icon name="file-signature" className="w-3 h-3" />contrato
            </Link>
          )}
        </div>
      ),
    },
    {
      id: "invoice", header: "Nota fiscal", mobile: "hidden", className: "whitespace-nowrap",
      cell: (item) => {
        const fiscal = item.customer?.contacts?.find((c) => c.defaultFiscal);
        if (!item.invoiceNumber) return <More lines={[fiscal && `Enviar para ${fiscal.name} · ${fiscal.email}`]}><span className="text-muted-foreground">Sem NF</span></More>;
        return (
          <More lines={[item.invoiceIssuedAt && `Emitida em ${formatDate(item.invoiceIssuedAt)}`, fiscal && `Enviar para ${fiscal.name} · ${fiscal.email}`]}>
            <span className="inline-flex items-center gap-1">
              {item.invoiceNumber}
              {item.invoiceUrl && <a href={item.invoiceUrl} target="_blank" rel="noreferrer" aria-label="Abrir a nota fiscal" className="text-muted-foreground hover:text-primary"><Icon name="external-link" className="w-3 h-3" /></a>}
            </span>
          </More>
        );
      },
    },
    {
      id: "status", header: "Situação", mobile: "badge",
      cell: (item) => {
        if (item.inactiveAt) return <StatusBadge tone="neutral">Inativa</StatusBadge>;
        const status = receivableStatus(item, today);
        return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>;
      },
    },
  ];
}
