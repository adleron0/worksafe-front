import { Link } from "@tanstack/react-router";
import Icon from "@/components/general-components/Icon";
import { SortButton } from "@/components/general-components/SortButton";
import StatusBadge, { StatusTone } from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatMoney } from "../-shared/financial";
import { DueState, Payable, dueState } from "../-shared/payables";
import { CopyButton } from "../-shared/ledger";
import { formatDate, paymentMethodLabel } from "../_receber/-components/options";

const STATE: Record<DueState, { label: string; tone: StatusTone }> = {
  atrasada: { label: "Atrasada", tone: "danger" },
  hoje: { label: "Vence hoje", tone: "warning" },
  aberta: { label: "A vencer", tone: "primary" },
  paga: { label: "Paga", tone: "success" },
};
const muted = "text-xs text-muted-foreground";
const tag = "inline-flex items-center gap-1 rounded-chip border bg-muted/50 px-1.5 py-px text-[11px] font-medium text-muted-foreground whitespace-nowrap";

/** Conteúdo com o resto num balão (a linha fica curta). */
function More({ children, lines }: { children: React.ReactNode; lines: Array<string | number | false | null | undefined> }) {
  const extra = lines.filter((line): line is string => typeof line === "string" && line !== "");
  if (!extra.length) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild><span>{children}</span></TooltipTrigger>
      <TooltipContent className="max-w-xs space-y-0.5">{extra.map((line) => <p key={line}>{line}</p>)}</TooltipContent>
    </Tooltip>
  );
}

export function payableColumns(today: string, sort?: { order?: string; onSort: (order: string) => void }): DataColumn<Payable>[] {
  return [
    {
      id: "description", header: "Conta", sortField: "description", mobile: "title", className: "min-w-[220px]",
      cell: (item) => {
        const plan = [item.chartAccount && `${item.chartAccount.code} ${item.chartAccount.name}`, item.costCenter?.name].filter(Boolean).join(" · ");
        return (
          <div className="min-w-0 max-w-[20rem]">
            <p className="truncate">
              <span className="font-medium">{item.description}</span>
              {item.installmentNumber && item.installmentTotal && <span className={`${tag} ml-1.5`}>{item.installmentNumber}/{item.installmentTotal}</span>}
              {item.recurrenceId && <span className={`${tag} ml-1.5`}><Icon name="repeat" className="w-3 h-3" />mensal</span>}
            </p>
            <More lines={[plan]}>
              <p className={`${muted} truncate`}>
                {item.supplier?.name ?? "Sem fornecedor"} <span className="opacity-70">· #{item.id}</span>
                {item.serviceOrder && (
                  <> · <Link to="/servicos/ordens-de-servico/$orderId" params={{ orderId: String(item.serviceOrder.id) }} className="underline hover:text-foreground">{item.serviceOrder.number}</Link></>
                )}
              </p>
            </More>
          </div>
        );
      },
    },
    {
      id: "value", header: "Valor", sortField: "value", mobile: "end", className: "whitespace-nowrap",
      cell: (item) => {
        const extras = Number(item.interestValue ?? 0) + Number(item.fineValue ?? 0) - Number(item.discountValue ?? 0);
        const paidDiffers = item.paidValue && Number(item.paidValue) !== Number(item.value);
        return (
          <More lines={[paidDiffers && extras !== 0 && `${extras > 0 ? "+" : "−"}${formatMoney(Math.abs(extras))} ${extras > 0 ? "de juros/multa" : "de desconto"}`]}>
            <span className="block">
              <span className="font-medium tabular-nums">{formatMoney(item.value)}</span>
              {paidDiffers && <span className={`${muted} block tabular-nums`}>Pago {formatMoney(item.paidValue!)}</span>}
            </span>
          </More>
        );
      },
    },
    {
      id: "dates", mobile: "meta", className: "whitespace-nowrap",
      header: sort ? <><SortButton label="Vencimento" field="dueDate" order={sort.order} onSort={sort.onSort} /> · <SortButton label="Pagamento" field="paidAt" order={sort.order} onSort={sort.onSort} /></> : "Vencimento",
      cell: (item) => (
        <div>
          <p className="tabular-nums">{formatDate(item.dueDate)}</p>
          {item.paidAt && (
            <More lines={[[item.paymentMethod && paymentMethodLabel(item.paymentMethod), item.bankAccount?.name].filter(Boolean).join(" · "), item.statementRef && "Conciliada com o extrato"]}>
              <p className="tabular-nums text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                Pago {formatDate(item.paidAt)}
                {item.statementRef && <Icon name="link-2" className="w-3 h-3" />}
              </p>
            </More>
          )}
        </div>
      ),
    },
    {
      id: "docs", header: "Documentos", mobile: "meta",
      cell: (item) => {
        const isOpen = item.status === "aberta" && !item.inactiveAt;
        const files = [["Boleto", item.billUrl, "receipt-text"], ["Nota", item.invoiceUrl, "file-text"], ["Comprovante", item.receiptUrl, "paperclip"]].filter(([, url]) => url) as Array<[string, string, string]>;
        const copy = isOpen && (item.barcode || item.pixCode || item.supplier?.pixKey);
        if (!item.documentNumber && !files.length && !copy) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap items-center gap-1 max-w-[13rem]">
            {item.documentNumber && <span className="text-xs mr-0.5">Nº {item.documentNumber}</span>}
            {files.map(([label, url, icon]) => (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <a href={url} target="_blank" rel="noreferrer" aria-label={`Abrir ${label.toLowerCase()}`} className={`${tag} hover:text-foreground hover:border-primary/50`}><Icon name={icon} className="w-3 h-3" /></a>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            ))}
            {isOpen && item.barcode && <CopyButton text={item.barcode} label="Linha digitável" className="rounded-chip text-[11px] py-px" />}
            {isOpen && item.pixCode && <CopyButton text={item.pixCode} label="PIX" className="rounded-chip text-[11px] py-px" />}
            {isOpen && !item.barcode && !item.pixCode && item.supplier?.pixKey && <CopyButton text={item.supplier.pixKey} label="Chave PIX" className="rounded-chip text-[11px] py-px" />}
          </div>
        );
      },
    },
    {
      id: "status", header: "Situação", mobile: "badge",
      cell: (item) => {
        if (item.inactiveAt) return <StatusBadge tone="neutral">Excluída</StatusBadge>;
        const state = STATE[dueState(item, today)];
        return <StatusBadge tone={state.tone}>{state.label}</StatusBadge>;
      },
    },
  ];
}
