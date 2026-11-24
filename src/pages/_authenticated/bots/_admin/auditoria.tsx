import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Pagination from "@/components/general-components/Pagination";
import Select from "@/components/general-components/Select";
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

/** Tudo que os bots e os apps de IA fizeram, com quem pediu, e o gasto do mês com IA. */
function AuditPage() {
  const { can } = useVerify();
  const [page, setPage] = useState(0);
  const [origin, setOrigin] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const enabled = can("view_auditoria_bots");
  const usage = useQuery({ queryKey: ["aiUsage"], enabled, queryFn: () => aiApi.get<UsageSummary>("usage") });
  const audit = useQuery({ queryKey: ["aiAudit", page, origin, status], enabled, queryFn: () => aiApi.get<{ total: number; rows: AuditRow[] }>("audit", { page, origin: origin || undefined, status: status || undefined }) });
  if (!enabled) return null;

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-bold">Auditoria e gasto</h1>
        <p className="text-sm text-muted-foreground">Cada consulta e cada ação feita por um bot, por um app de IA conectado ou por um agendamento, com quem pediu. E quanto a IA custou neste mês.</p>
      </div>
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
      <div className="flex flex-wrap gap-2">
        <div className="w-56"><Select name="auditOrigin" clearable options={Object.entries(ORIGIN).map(([id, name]) => ({ id, name }))} state={origin} onChange={(_, value) => { setOrigin(String(value ?? "")); setPage(0); }} placeholder="Todas as origens" /></div>
        <div className="w-56"><Select name="auditStatus" clearable options={Object.entries(STATUS_LABEL).filter(([id]) => id !== "running").map(([id, name]) => ({ id, name }))} state={status} onChange={(_, value) => { setStatus(String(value ?? "")); setPage(0); }} placeholder="Todos os resultados" /></div>
      </div>
      {audit.error && <p className="text-destructive">Erro: {errorMessage(audit.error)}</p>}
      {audit.isLoading && <Skeleton className="h-40 w-full" />}
      {audit.data && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-left"><tr><th className="px-3 py-2">Quando</th><th>Quem</th><th>Origem</th><th>Bot</th><th>O quê</th><th>Resultado</th><th></th></tr></thead>
            <tbody>
              {!audit.data.rows.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Nada registrado.</td></tr>}
              {audit.data.rows.map((row) => (
                <Fragment key={row.id}>
                  <tr className="border-t">
                    <td className="whitespace-nowrap px-3 py-2">{dateTimeBr(row.createdAt)}</td>
                    <td>{row.user}</td>
                    <td>{ORIGIN[row.origin] ?? row.origin}</td>
                    <td>{row.bot ?? "—"}</td>
                    <td>{row.title}</td>
                    <td className={STATUS_CLASS[row.status] ?? ""}>{STATUS_LABEL[row.status] ?? row.status}</td>
                    <td className="pr-2 text-right"><Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => setOpen(open === row.id ? null : row.id)}>{open === row.id ? "Fechar" : "Detalhes"}</Button></td>
                  </tr>
                  {open === row.id && (
                    <tr className="bg-muted/30">
                      <td colSpan={7} className="px-3 py-2">
                        <p className="font-medium">Ferramenta: {row.tool} · {row.durationMs} ms</p>
                        <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap">{JSON.stringify(row.input, null, 2)}</pre>
                        {row.outputSummary && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{row.outputSummary}</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {audit.data && audit.data.total > 50 && <Pagination totalItems={audit.data.total} itemsPerPage={50} currentPage={page} onPageChange={setPage} />}
    </div>
  );
}
