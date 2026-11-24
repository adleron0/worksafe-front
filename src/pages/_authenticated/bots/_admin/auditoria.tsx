import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Select from "@/components/general-components/Select";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import { errorMessage } from "../../comercial/-shared/commercial";
import { STATUS_LABEL, UsageSummary, aiApi, dateTimeBr, usd } from "../-shared/bots";

interface AuditRow { id: number; createdAt: string; user: string; origin: string; bot: string | null; tool: string; title: string; status: string; input: unknown; outputSummary: string | null; durationMs: number }

export const Route = createFileRoute("/_authenticated/bots/_admin/auditoria")({
  component: AuditPage,
});

const ORIGIN: Record<string, string> = { bots: "Área de Bots", mcp: "App de IA (MCP)", schedule: "Agendamento" };
const STATUS_CLASS: Record<string, string> = {
  ok: "text-emerald-700 dark:text-emerald-400", pending: "text-amber-700 dark:text-amber-400", refused: "text-muted-foreground",
  denied: "text-rose-700 dark:text-rose-400", error: "text-rose-700 dark:text-rose-400",
};

const COLUMNS: DataColumn<AuditRow>[] = [
  { id: "when", header: "Quando", cell: (row) => <span className="whitespace-nowrap tabular-nums">{dateTimeBr(row.createdAt)}</span> },
  { id: "user", header: "Quem", cell: (row) => <span className="whitespace-nowrap">{row.user}</span> },
  { id: "origin", header: "Origem", cell: (row) => <span className="whitespace-nowrap text-muted-foreground">{ORIGIN[row.origin] ?? row.origin}</span> },
  { id: "bot", header: "Bot", cell: (row) => row.bot ?? <span className="text-muted-foreground">—</span> },
  { id: "title", header: "O quê", className: "min-w-[220px]", cell: (row) => <p className="truncate max-w-[24rem]">{row.title}</p> },
  { id: "status", header: "Resultado", cell: (row) => <span className={`whitespace-nowrap font-medium ${STATUS_CLASS[row.status] ?? ""}`}>{STATUS_LABEL[row.status] ?? row.status}</span> },
];

/** Tudo que os bots e os apps de IA fizeram, com quem pediu, e o gasto do mês com IA. */
function AuditPage() {
  const { can } = useVerify();
  const [page, setPage] = useState(0);
  const [origin, setOrigin] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<AuditRow | null>(null);
  const enabled = can("view_auditoria_bots");
  const usage = useQuery({ queryKey: ["aiUsage"], enabled, queryFn: () => aiApi.get<UsageSummary>("usage") });
  const audit = useQuery({ queryKey: ["aiAudit", page, origin, status], enabled, queryFn: () => aiApi.get<{ total: number; rows: AuditRow[] }>("audit", { page, origin: origin || undefined, status: status || undefined }) });
  if (!enabled) return null;

  return (
    <div className="grid gap-4">
      <PageHeader className="mb-0" title="Auditoria e gasto" description="Cada consulta e cada ação feita por um bot, por um app de IA conectado ou por um agendamento, com quem pediu. E quanto a IA custou neste mês." />
      {usage.data && (
        <div className="rounded-card border bg-card p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Gasto em {usage.data.month}</p>
              <p className="text-2xl font-bold">{usd(usage.data.spent)}</p>
            </div>
            <div className="min-w-48 flex-1">
              <p className="text-xs text-muted-foreground">Teto mensal: {usd(usage.data.budget)} {usage.data.percent !== null ? `(${usage.data.percent}%)` : ""}</p>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full ${Number(usage.data.percent) >= 90 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.min(100, usage.data.percent ?? 0)}%` }} />
              </div>
            </div>
          </div>
          {usage.data.rows.length > 0 && (
            <table className="mt-4 w-full text-xs">
              <thead><tr className="text-left text-muted-foreground"><th className="py-1">Modelo</th><th>Chamadas</th><th>Tokens (entrada / saída)</th><th className="text-right">Custo</th></tr></thead>
              <tbody>{usage.data.rows.map((row) => <tr key={`${row.provider}-${row.model}`} className="border-t"><td className="py-1">{row.provider} · {row.model}</td><td>{row.calls}</td><td>{row.inputTokens.toLocaleString("pt-BR")} / {row.outputTokens.toLocaleString("pt-BR")}</td><td className="text-right">{usd(row.costUsd)}</td></tr>)}</tbody>
            </table>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">Estimativa pela tabela de preços do sistema. O teto é a variável AI_MONTHLY_BUDGET_USD do servidor: ao chegar nele, os bots param e os relatórios sem IA continuam.</p>
        </div>
      )}
      <ListCard>
        <div className="flex flex-wrap gap-2">
          <div className="w-56"><Select name="auditOrigin" clearable options={Object.entries(ORIGIN).map(([id, name]) => ({ id, name }))} state={origin} onChange={(_, value) => { setOrigin(String(value ?? "")); setPage(0); }} placeholder="Todas as origens" /></div>
          <div className="w-56"><Select name="auditStatus" clearable options={Object.entries(STATUS_LABEL).filter(([id]) => id !== "running").map(([id, name]) => ({ id, name }))} state={status} onChange={(_, value) => { setStatus(String(value ?? "")); setPage(0); }} placeholder="Todos os resultados" /></div>
        </div>
        <DataTable rows={audit.data?.rows} columns={COLUMNS} getRowId={(row) => row.id} ariaLabel="Auditoria" minWidth={820}
          loading={audit.isLoading} error={audit.error ? errorMessage(audit.error) : null} onRetry={() => audit.refetch()}
          onRowClick={setOpen} empty={<EmptyState title="Nada registrado." />} />
        <ListFooter total={audit.data?.total ?? 0} page={page} limit={50} limits={[50]} onPageChange={setPage} />
      </ListCard>

      {open && (
        <Dialog open onOpenChange={(isOpen) => { if (!isOpen) setOpen(null); }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{open.title}</DialogTitle>
              <DialogDescription>{dateTimeBr(open.createdAt)} · {open.user} · {ORIGIN[open.origin] ?? open.origin}{open.bot ? ` · ${open.bot}` : ""}</DialogDescription>
            </DialogHeader>
            <div className="text-xs">
              <p className="font-medium">Ferramenta: {open.tool} · {open.durationMs} ms</p>
              <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-2">{JSON.stringify(open.input, null, 2)}</pre>
              {open.outputSummary && <p className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-muted-foreground">{open.outputSummary}</p>}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
