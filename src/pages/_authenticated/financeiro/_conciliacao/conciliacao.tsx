import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import Select from "@/components/general-components/Select";
import Icon from "@/components/general-components/Icon";
import StatusBadge from "@/components/general-components/StatusBadge";
import Input from "@/components/general-components/Input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/general-interfaces/api.interface";
import { cn } from "@/lib/utils";
import AccountSelect from "../-shared/AccountSelect";
import { FINANCIAL_ABILITY, formatMoney, useBankAccounts, useChartAccounts } from "../-shared/financial";
import { PAYABLES_KEY, useSuppliers } from "../-shared/payables";
import { useCustomerOptions } from "../-shared/ledger";
import { formatDate } from "../_receber/-components/options";

export const Route = createFileRoute("/_authenticated/financeiro/_conciliacao/conciliacao")({
  component: Reconciliation,
  validateSearch: (search: Record<string, unknown>): { rascunho?: number } => (Number(search.rascunho) > 0 ? { rascunho: Number(search.rascunho) } : {}),
});

interface Candidate { type: "payable" | "receivable"; mode: "baixar" | "vincular"; id: number; label: string; who: string; value: number; date: string }
interface Line { fitId: string; date: string; amount: number; memo: string; type: string; status: "conciliado" | "sugerido" | "sem_par" | "antes_inicio"; candidates: Candidate[] }
interface Preview {
  bankAccountId: number; start: string | null; period: { from: string; to: string };
  totals: { lines: number; reconciled: number; suggested: number; unmatched: number; beforeStart: number };
  /** saldo do extrato (LEDGERBAL) x saldo do sistema no fim do mesmo dia */
  balance: { date: string; statement: number | null; system: number; opening: number };
  items: Line[];
}
interface Choice { action: string; chartAccountId?: string; description?: string; otherBankAccountId?: string; supplierId?: number; customerId?: number; costCenterId?: number }
interface Proposal { action: string; type?: "payable" | "receivable"; targetId?: number; chartAccountId?: number; costCenterId?: number; supplierId?: number; customerId?: number; otherBankAccountId?: number; description?: string }
/** Extrato lido pelo assistente (PDF) ou mandado pelo MCP: mesma conciliação, com a soma conferida e a ação proposta por linha. */
interface Draft extends Preview {
  id: number; status: "rascunho" | "nao_confere" | "parcial" | "lancado" | "descartado"; source: string; fileName: string | null;
  bankAccount: { id: number; name: string };
  check: { opening: number; closing: number; credits: number; debits: number; difference: number; ok: boolean };
  items: Array<Line & { proposed: Proposal | null }>;
}
interface DraftRow { id: number; bankAccount: string; status: Draft["status"]; source: string; fileName: string | null; periodFrom: string; periodTo: string; difference: number }
const DRAFT_STATUS: Record<Draft["status"], string> = { rascunho: "aguardando revisão", nao_confere: "soma não confere", parcial: "lançado em parte", lancado: "lançado", descartado: "descartado" };

const STATUS = {
  conciliado: { text: "Já conciliada", tone: "success" },
  sugerido: { text: "Par encontrado", tone: "info" },
  sem_par: { text: "Sem par", tone: "warning" },
  antes_inicio: { text: "Antes da data inicial", tone: "neutral" },
} as const;
const SETTLED = (status: Line["status"]) => status === "conciliado" || status === "antes_inicio";

/**
 * Conciliação bancária: sobe o extrato OFX do banco, o sistema procura cada
 * linha entre as contas lançadas (mesmo valor, data próxima) e você confirma.
 */
function Reconciliation() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { data: banks } = useBankAccounts();
  const { data: accounts } = useChartAccounts();
  const { data: customers } = useCustomerOptions();
  const { data: suppliers } = useSuppliers();
  const [bankAccountId, setBankAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [hideDone, setHideDone] = useState(true);
  const [statement, setStatement] = useState<number | null>(null);
  const { rascunho } = Route.useSearch();
  const navigate = useNavigate();
  const { data: draft, refetch: refetchDraft } = useQuery<Draft>({
    queryKey: ["financialStatementDraft", rascunho],
    queryFn: async () => (await api.get<Draft>(`financial/statement-drafts/${rascunho}`)).data,
    enabled: !!rascunho,
  });
  const { data: openDrafts } = useQuery<DraftRow[]>({
    queryKey: ["financialStatementDrafts"],
    queryFn: async () => (await api.get<DraftRow[]>("financial/statement-drafts", { params: { status: "rascunho,nao_confere,parcial" } })).data,
    enabled: !rascunho,
  });
  // rascunho aberto pelo link do assistente: carrega como se o extrato tivesse sido lido aqui
  useEffect(() => {
    if (!draft) return;
    setBankAccountId(String(draft.bankAccount.id));
    setPreview(draft);
    setStatement(draft.check.closing);
    setChoices(Object.fromEntries(draft.items.map((line) => {
      const p = line.proposed;
      if (!p) return [line.fitId, { action: "ignorar", description: line.memo }];
      if ((p.action === "baixar" || p.action === "vincular") && p.targetId) {
        const index = line.candidates.findIndex((c) => c.id === p.targetId && c.type === p.type);
        if (index >= 0) return [line.fitId, { action: `cand:${index}`, description: line.memo }];
      }
      return [line.fitId, {
        action: ["criar", "transferir", "ignorar"].includes(p.action) ? p.action : "ignorar", description: p.description ?? line.memo,
        chartAccountId: p.chartAccountId ? String(p.chartAccountId) : undefined, otherBankAccountId: p.otherBankAccountId ? String(p.otherBankAccountId) : undefined,
        supplierId: p.supplierId, customerId: p.customerId, costCenterId: p.costCenterId,
      }];
    })));
  }, [draft]);
  const { mutate: discard, isPending: discarding } = useMutation({
    mutationFn: async () => (await api.patch(`financial/statement-drafts/${rascunho}/discard`)).data,
    onSuccess: () => { toast({ title: "Extrato descartado" }); queryClient.invalidateQueries({ queryKey: ["financialStatementDrafts"] }); setPreview(null); navigate({ to: "/financeiro/conciliacao", search: {} }); },
    onError: (err: ApiError) => toast({ title: "Não foi possível descartar", description: err.response?.data?.message, variant: "destructive" }),
  });

  const initialChoices = (data: Preview) => Object.fromEntries(data.items.map((line) => [line.fitId, { action: line.status === "sugerido" ? "cand:0" : "ignorar", description: line.memo }]));
  const { mutate: read, isPending: reading } = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("bankAccountId", bankAccountId);
      form.append("file", file!);
      return (await api.post<Preview>("financial/reconciliation/preview", form)).data;
    },
    onSuccess: (data) => {
      // relendo o mesmo extrato (ex.: depois de conciliar), o saldo digitado à mão continua
      const same = preview?.bankAccountId === data.bankAccountId && preview?.balance.date === data.balance.date;
      setStatement((prev) => data.balance.statement ?? (same ? prev : null));
      setPreview(data); setChoices(initialChoices(data));
    },
    onError: (err: ApiError) => toast({ title: "Não foi possível ler o extrato", description: err.response?.data?.message, variant: "destructive" }),
  });
  const { mutate: apply, isPending: applying } = useMutation({
    mutationFn: async () => {
      const items = preview!.items.filter((line) => !SETTLED(line.status)).map((line) => {
        const choice = choices[line.fitId] ?? { action: "ignorar" };
        if (choice.action.startsWith("cand:")) {
          const candidate = line.candidates[Number(choice.action.slice(5))];
          return { ...line, action: candidate.mode, type: candidate.type, targetId: candidate.id };
        }
        return { ...line, action: choice.action, chartAccountId: choice.chartAccountId || null, description: choice.description, otherBankAccountId: choice.otherBankAccountId, supplierId: choice.supplierId, customerId: choice.customerId, costCenterId: choice.costCenterId };
      }).filter((item) => item.action !== "ignorar");
      if (!items.length) throw new Error("none");
      if (draft) return (await api.post(`financial/statement-drafts/${draft.id}/apply`, { items })).data;
      return (await api.post("financial/reconciliation/apply", { bankAccountId, items })).data;
    },
    onSuccess: (result) => {
      toast({ title: `${result.applied} linha(s) conciliada(s)`, description: result.errors?.length ? `Não deu em ${result.errors.length}: ${result.errors.map((e: { reason: string }) => e.reason).join("; ")}` : undefined, variant: result.errors?.length ? "default" : "success" });
      for (const k of [PAYABLES_KEY, "listContas a Receber", "financialBankBalances", "financialReports", "financialTransfers", "financialSetup", "financialStatementDrafts"]) queryClient.invalidateQueries({ queryKey: [k] });
      if (draft) refetchDraft(); else read();
    },
    onError: (err: ApiError | Error) => {
      if ((err as Error).message === "none") return toast({ title: "Escolha o que fazer em ao menos uma linha" });
      toast({ title: "Não foi possível conciliar", description: (err as ApiError).response?.data?.message, variant: "destructive" });
    },
  });

  if (!can(`view_${FINANCIAL_ABILITY}`)) return null;
  const bankOptions = (banks?.rows ?? []).filter((b) => b.type !== "gateway") as never[];
  const lines = (preview?.items ?? []).filter((line) => !hideDone || !SETTLED(line.status));
  const chosen = (preview?.items ?? []).filter((line) => !SETTLED(line.status) && !(choices[line.fitId]?.action ?? "ignorar").startsWith("ignorar"));
  const pending = chosen.length;
  // o que muda o saldo ao conciliar: baixar, lançar e transferir (vincular já estava no saldo)
  const moving = chosen.reduce((sum, line) => {
    const action = choices[line.fitId]?.action ?? "ignorar";
    if (action.startsWith("cand:")) return line.candidates[Number(action.slice(5))]?.mode === "baixar" ? sum + line.amount : sum;
    return ["criar", "transferir"].includes(action) ? sum + line.amount : sum;
  }, 0);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const diffNow = preview && statement !== null ? round2(statement - preview.balance.system) : null;
  const diffAfter = preview && statement !== null ? round2(statement - preview.balance.system - moving) : null;
  const setChoice = (fitId: string, patch: Partial<Choice>) => setChoices((prev) => ({ ...prev, [fitId]: { ...(prev[fitId] ?? { action: "ignorar" }), ...patch } }));

  return (
    <>
      <div>
        <h1 className="text-xl font-bold">Conciliação bancária</h1>
        <p className="text-sm text-muted-foreground">Suba o extrato OFX do banco (exportado no internet banking). Cada linha é comparada com as contas lançadas; você confirma e a baixa sai com a data do extrato. Importar o mesmo extrato de novo não baixa nada duas vezes.</p>
      </div>

      {draft && (
        <div className={cn("flex flex-wrap items-center gap-3 rounded-card border bg-card p-3 my-4 text-sm", draft.check.ok ? "border-green-300 dark:border-green-900" : "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40")}>
          <Icon name="file-text" className="w-5 h-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="font-medium break-words">{draft.source === "mcp" ? "Extrato enviado pelo assistente" : "Extrato lido do PDF pelo assistente"}{draft.fileName ? ` · ${draft.fileName}` : ""} · {draft.bankAccount.name} · {DRAFT_STATUS[draft.status]}</p>
            <p className="text-muted-foreground">
              {formatMoney(draft.check.opening)} + {formatMoney(draft.check.credits)} − {formatMoney(Math.abs(draft.check.debits))} = {formatMoney(draft.check.closing)}{" "}
              {draft.check.ok
                ? <span className="font-medium text-green-600 dark:text-green-400">· a soma confere</span>
                : <span className="font-medium text-amber-700 dark:text-amber-300">· a soma não confere: diferença de {formatMoney(draft.check.difference)}. Peça ao assistente para reler o extrato.</span>}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {draft.status !== "lancado" && draft.status !== "descartado" && can(`update_${FINANCIAL_ABILITY}`) && <Button variant="outline" size="sm" disabled={discarding} onClick={() => discard()}>Descartar</Button>}
            <Button variant="ghost" size="sm" onClick={() => { setPreview(null); navigate({ to: "/financeiro/conciliacao", search: {} }); }}>Subir um OFX</Button>
          </div>
        </div>
      )}
      {!rascunho && !!openDrafts?.length && (
        <div className="rounded-card border bg-card p-3 mt-4 text-sm">
          <p className="font-medium mb-2">Extratos lidos pelo assistente esperando revisão</p>
          <div className="flex flex-col gap-1">
            {openDrafts.map((row) => (
              <Link key={row.id} to="/financeiro/conciliacao" search={{ rascunho: row.id }} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded px-2 py-1.5 hover:bg-muted">
                <span className="font-medium">{row.bankAccount}</span>
                <span className="text-muted-foreground">{formatDate(row.periodFrom)} a {formatDate(row.periodTo)}</span>
                {row.fileName && <span className="text-muted-foreground truncate max-w-56">{row.fileName}</span>}
                <StatusBadge tone={row.status === "nao_confere" ? "warning" : "info"}>{DRAFT_STATUS[row.status]}</StatusBadge>
              </Link>
            ))}
          </div>
        </div>
      )}
      {!rascunho && <div className="flex flex-col md:flex-row md:items-end gap-3 rounded-card border bg-card p-3 my-4">
        <div className="w-full md:w-64">
          <Label>Conta do extrato <span>*</span></Label>
          <Select name="bank" options={bankOptions} state={bankAccountId} onChange={(_, v) => { setBankAccountId(String(v)); setPreview(null); }} placeholder="Selecione a conta" />
        </div>
        <div className="flex items-center gap-2">
          <input id="ofx" type="file" accept=".ofx,.OFX,application/x-ofx,text/plain" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); }} />
          <Button type="button" variant="outline" onClick={() => document.getElementById("ofx")?.click()}><Icon name="file-up" className="w-4 h-4" /> {file ? "Trocar arquivo" : "Escolher OFX"}</Button>
          <span className="text-sm text-muted-foreground truncate max-w-56">{file?.name ?? "Nenhum arquivo"}</span>
        </div>
        <Button className="md:ml-auto" disabled={!bankAccountId || !file || reading} onClick={() => read()}>{reading ? "Lendo..." : "Ler extrato"}</Button>
      </div>}

      {preview && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
            <span className="text-muted-foreground">{formatDate(preview.period.from)} a {formatDate(preview.period.to)} · {preview.totals.lines} linha(s):</span>
            <StatusBadge tone="success" pulse={false}>{preview.totals.reconciled} já conciliada(s)</StatusBadge>
            <StatusBadge tone="info" pulse={false}>{preview.totals.suggested} com par</StatusBadge>
            <StatusBadge tone="warning" pulse={false}>{preview.totals.unmatched} sem par</StatusBadge>
            {preview.totals.beforeStart > 0 && <StatusBadge tone="neutral" pulse={false}>{preview.totals.beforeStart} antes da data inicial</StatusBadge>}
            <Button variant="link" size="sm" className="px-0" onClick={() => setHideDone((v) => !v)}>{hideDone ? "Mostrar as já resolvidas" : "Esconder as já resolvidas"}</Button>
            {can(`update_${FINANCIAL_ABILITY}`) && <Button className="ml-auto" disabled={applying || !pending || (!!draft && (!draft.check.ok || draft.status === "lancado" || draft.status === "descartado"))} onClick={() => apply()}>{draft ? "Lançar" : "Conciliar"} {pending} linha(s)</Button>}
          </div>
          {!preview.start && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 p-3 mb-3 text-sm">
              <Icon name="flag" className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Esta conta ainda não tem data inicial. Defina em <Link to="/financeiro/implantacao" className="underline">Implantação</Link> para o sistema ignorar o que é anterior a ela e o saldo bater com o do banco.</span>
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-card border bg-card p-3 mb-3 text-sm">
            <div>
              <Label htmlFor="statement">Saldo do extrato em {formatDate(preview.balance.date)}</Label>
              <Input id="statement" name="statement" format="currency" value={statement ?? ""} className="mt-1"
                onValueChange={(_, v) => setStatement(v === "" || v === null || v === undefined ? null : Number(v))} />
              <p className="text-xs text-muted-foreground mt-1">{preview.balance.statement === null ? "O arquivo não traz o saldo: digite o do extrato." : "Lido do arquivo. Corrija se precisar."}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Saldo no sistema nessa data</p>
              <p className="text-lg font-semibold tabular-nums">{formatMoney(preview.balance.system)}</p>
              {preview.start && <p className="text-xs text-muted-foreground">desde {formatDate(preview.start)}, com saldo inicial de {formatMoney(preview.balance.opening)}</p>}
            </div>
            <BalanceDiff label="Diferença agora" value={diffNow} />
            <BalanceDiff label={`Depois de conciliar ${pending} linha(s)`} value={diffAfter} />
          </div>
          <div className="rounded-card border bg-card overflow-hidden">
            {!lines.length && <p className="p-6 text-sm text-center text-muted-foreground">Tudo conciliado.</p>}
            {lines.map((line) => {
              const status = STATUS[line.status];
              const choice = choices[line.fitId] ?? { action: "ignorar" };
              const options = [
                ...line.candidates.map((c, i) => ({ id: `cand:${i}`, name: `${c.mode === "baixar" ? "Baixar" : "Já baixada:"} ${c.label}${c.who ? ` · ${c.who}` : ""} · ${formatMoney(c.value)} · ${c.mode === "baixar" ? "venc." : "paga em"} ${formatDate(c.date)}` })),
                { id: "criar", name: line.amount < 0 ? "Lançar como nova despesa já paga" : "Lançar como nova receita já recebida (rendimento, estorno...)" },
                { id: "transferir", name: line.amount < 0 ? "Transferência para outra conta da empresa" : "Transferência vinda de outra conta da empresa" },
                { id: "ignorar", name: "Ignorar por enquanto" },
              ];
              return (
                <div key={line.fitId} className={cn("flex flex-wrap xl:flex-nowrap items-center xl:items-start gap-x-3 gap-y-2 px-4 py-2.5 border-b border-border/70 last:border-b-0 hover:bg-muted/40 transition-colors text-sm", SETTLED(line.status) && "opacity-60")}>
                  <div className="xl:w-24 shrink-0 text-muted-foreground">{formatDate(line.date)}</div>
                  <div className="flex-1 xl:flex-none xl:w-4/12 min-w-0 break-words">{line.memo || "Sem histórico"}</div>
                  <div className={cn("xl:w-32 shrink-0 tabular-nums font-semibold text-right", line.amount < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>{formatMoney(line.amount)}</div>
                  <div className="xl:w-32 shrink-0"><StatusBadge tone={status.tone} pulse={!SETTLED(line.status)}>{status.text}</StatusBadge></div>
                  {line.status === "antes_inicio" && <p className="w-full xl:w-auto xl:flex-1 text-xs text-muted-foreground">Já está dentro do saldo inicial. Nada a fazer.</p>}
                  {!SETTLED(line.status) && (
                    <div className="w-full xl:w-auto xl:flex-1 flex flex-col gap-2 min-w-0">
                      <Select name={`choice-${line.fitId}`} options={options} state={choice.action} onChange={(_, v) => setChoice(line.fitId, { action: String(v) })} />
                      {choice.action === "criar" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input name="description" value={choice.description ?? ""} placeholder="Descrição" maxLength={255} onValueChange={(_, v) => setChoice(line.fitId, { description: String(v) })} />
                          <AccountSelect accounts={accounts ?? []} value={choice.chartAccountId ?? ""} nature={line.amount < 0 ? "despesa" : "receita"} clearable onChange={(v) => setChoice(line.fitId, { chartAccountId: v })} placeholder="Conta do plano (opcional)" />
                          {line.amount > 0 ? (
                            <Select name={`customer-${line.fitId}`} options={(customers?.rows ?? []) as never[]} state={choice.customerId ? String(choice.customerId) : ""}
                              onChange={(_, v) => setChoice(line.fitId, { customerId: v ? Number(Array.isArray(v) ? v[0] : v) : undefined })} placeholder="Cliente (opcional: rendimento não tem)" clearable />
                          ) : (
                            <Select name={`supplier-${line.fitId}`} options={(suppliers?.rows ?? []) as never[]} state={choice.supplierId ? String(choice.supplierId) : ""}
                              onChange={(_, v) => setChoice(line.fitId, { supplierId: v ? Number(Array.isArray(v) ? v[0] : v) : undefined })} placeholder="Fornecedor (opcional)" clearable />
                          )}
                        </div>
                      )}
                      {choice.action === "transferir" && (
                        <Select name={`other-${line.fitId}`} options={bankOptions.filter((b: { id: number }) => String(b.id) !== bankAccountId)} state={choice.otherBankAccountId ?? ""}
                          onChange={(_, v) => setChoice(line.fitId, { otherBankAccountId: String(v) })} placeholder={line.amount < 0 ? "Para qual conta?" : "De qual conta?"} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">O par é procurado pelo valor exato, com vencimento até 20 dias de distância. Se a entrada for de um cliente com conta a receber lançada com outro valor, ajuste a conta e leia o extrato de novo.</p>
        </>
      )}
    </>
  );
}

function BalanceDiff({ label, value }: { label: string; value: number | null }) {
  const ok = value !== null && Math.abs(value) < 0.005;
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      {value === null ? <p className="text-lg font-semibold">—</p> : (
        <p className={cn("text-lg font-semibold tabular-nums flex items-center gap-1.5", ok ? "text-green-600 dark:text-green-400" : "text-amber-700 dark:text-amber-300")}>
          <Icon name={ok ? "circle-check" : "triangle-alert"} className="w-4 h-4" />{ok ? "Bate" : formatMoney(value)}
        </p>
      )}
      {value !== null && !ok && <p className="text-xs text-muted-foreground">{value > 0 ? "o banco tem mais que o sistema" : "o sistema tem mais que o banco"}</p>}
    </div>
  );
}
