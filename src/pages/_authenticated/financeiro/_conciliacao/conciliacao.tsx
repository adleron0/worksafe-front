import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import Select from "@/components/general-components/Select";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/general-interfaces/api.interface";
import { cn } from "@/lib/utils";
import AccountSelect from "../-shared/AccountSelect";
import { FINANCIAL_ABILITY, formatMoney, useBankAccounts, useChartAccounts } from "../-shared/financial";
import { PAYABLES_KEY } from "../-shared/payables";
import { formatDate } from "../_receber/-components/options";

export const Route = createFileRoute("/_authenticated/financeiro/_conciliacao/conciliacao")({ component: Reconciliation });

interface Candidate { type: "payable" | "receivable"; mode: "baixar" | "vincular"; id: number; label: string; who: string; value: number; date: string }
interface Line { fitId: string; date: string; amount: number; memo: string; type: string; status: "conciliado" | "sugerido" | "sem_par"; candidates: Candidate[] }
interface Preview { bankAccountId: number; period: { from: string; to: string }; totals: { lines: number; reconciled: number; suggested: number; unmatched: number }; items: Line[] }
interface Choice { action: string; chartAccountId?: string; description?: string; otherBankAccountId?: string }

const STATUS = {
  conciliado: { text: "Já conciliada", className: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300", icon: "circle-check" },
  sugerido: { text: "Par encontrado", className: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300", icon: "link" },
  sem_par: { text: "Sem par", className: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300", icon: "circle-help" },
} as const;

/**
 * Conciliação bancária: sobe o extrato OFX do banco, o sistema procura cada
 * linha entre as contas lançadas (mesmo valor, data próxima) e você confirma.
 */
function Reconciliation() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { data: banks } = useBankAccounts();
  const { data: accounts } = useChartAccounts();
  const [bankAccountId, setBankAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [hideDone, setHideDone] = useState(true);

  const initialChoices = (data: Preview) => Object.fromEntries(data.items.map((line) => [line.fitId, { action: line.status === "sugerido" ? "cand:0" : "ignorar", description: line.memo }]));
  const { mutate: read, isPending: reading } = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("bankAccountId", bankAccountId);
      form.append("file", file!);
      return (await api.post<Preview>("financial/reconciliation/preview", form)).data;
    },
    onSuccess: (data) => { setPreview(data); setChoices(initialChoices(data)); },
    onError: (err: ApiError) => toast({ title: "Não foi possível ler o extrato", description: err.response?.data?.message, variant: "destructive" }),
  });
  const { mutate: apply, isPending: applying } = useMutation({
    mutationFn: async () => {
      const items = preview!.items.filter((line) => line.status !== "conciliado").map((line) => {
        const choice = choices[line.fitId] ?? { action: "ignorar" };
        if (choice.action.startsWith("cand:")) {
          const candidate = line.candidates[Number(choice.action.slice(5))];
          return { ...line, action: candidate.mode, type: candidate.type, targetId: candidate.id };
        }
        return { ...line, action: choice.action, chartAccountId: choice.chartAccountId || null, description: choice.description, otherBankAccountId: choice.otherBankAccountId };
      }).filter((item) => item.action !== "ignorar");
      if (!items.length) throw new Error("none");
      return (await api.post("financial/reconciliation/apply", { bankAccountId, items })).data;
    },
    onSuccess: (result) => {
      toast({ title: `${result.applied} linha(s) conciliada(s)`, description: result.errors?.length ? `Não deu em ${result.errors.length}: ${result.errors.map((e: { reason: string }) => e.reason).join("; ")}` : undefined, variant: result.errors?.length ? "default" : "success" });
      for (const k of [PAYABLES_KEY, "listContas a Receber", "financialBankBalances", "financialReports", "financialTransfers"]) queryClient.invalidateQueries({ queryKey: [k] });
      read();
    },
    onError: (err: ApiError | Error) => {
      if ((err as Error).message === "none") return toast({ title: "Escolha o que fazer em ao menos uma linha" });
      toast({ title: "Não foi possível conciliar", description: (err as ApiError).response?.data?.message, variant: "destructive" });
    },
  });

  if (!can(`view_${FINANCIAL_ABILITY}`)) return null;
  const bankOptions = (banks?.rows ?? []).filter((b) => b.type !== "gateway") as never[];
  const lines = (preview?.items ?? []).filter((line) => !hideDone || line.status !== "conciliado");
  const pending = (preview?.items ?? []).filter((line) => line.status !== "conciliado" && !(choices[line.fitId]?.action ?? "ignorar").startsWith("ignorar")).length;
  const setChoice = (fitId: string, patch: Partial<Choice>) => setChoices((prev) => ({ ...prev, [fitId]: { ...(prev[fitId] ?? { action: "ignorar" }), ...patch } }));

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Conciliação bancária</h1>
        <p className="text-sm text-muted-foreground">Suba o extrato OFX do banco (exportado no internet banking). Cada linha é comparada com as contas lançadas; você confirma e a baixa sai com a data do extrato. Importar o mesmo extrato de novo não baixa nada duas vezes.</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-end gap-3 rounded-lg border p-3 my-4">
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
      </div>

      {preview && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
            <span className="text-muted-foreground">{formatDate(preview.period.from)} a {formatDate(preview.period.to)} · {preview.totals.lines} linha(s):</span>
            <span className="rounded bg-green-100 dark:bg-green-950/50 px-2 py-0.5">{preview.totals.reconciled} já conciliada(s)</span>
            <span className="rounded bg-blue-100 dark:bg-blue-950/50 px-2 py-0.5">{preview.totals.suggested} com par</span>
            <span className="rounded bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5">{preview.totals.unmatched} sem par</span>
            <Button variant="link" size="sm" className="px-0" onClick={() => setHideDone((v) => !v)}>{hideDone ? "Mostrar as já conciliadas" : "Esconder as já conciliadas"}</Button>
            {can(`update_${FINANCIAL_ABILITY}`) && <Button className="ml-auto" disabled={applying || !pending} onClick={() => apply()}>Conciliar {pending} linha(s)</Button>}
          </div>
          <div className="rounded-lg border overflow-hidden">
            {!lines.length && <p className="p-6 text-sm text-center text-muted-foreground">Tudo conciliado.</p>}
            {lines.map((line) => {
              const status = STATUS[line.status];
              const choice = choices[line.fitId] ?? { action: "ignorar" };
              const options = [
                ...line.candidates.map((c, i) => ({ id: `cand:${i}`, name: `${c.mode === "baixar" ? "Baixar" : "Já baixada:"} ${c.label}${c.who ? ` · ${c.who}` : ""} · ${formatMoney(c.value)} · ${c.mode === "baixar" ? "venc." : "paga em"} ${formatDate(c.date)}` })),
                ...(line.amount < 0 ? [{ id: "criar", name: "Lançar como nova despesa já paga" }] : []),
                { id: "transferir", name: line.amount < 0 ? "Transferência para outra conta da empresa" : "Transferência vinda de outra conta da empresa" },
                { id: "ignorar", name: "Ignorar por enquanto" },
              ];
              return (
                <div key={line.fitId} className={cn("flex flex-col lg:flex-row lg:items-start gap-2 px-4 py-3 border-b last:border-b-0 text-sm", line.status === "conciliado" && "opacity-60")}>
                  <div className="lg:w-24 text-muted-foreground">{formatDate(line.date)}</div>
                  <div className="lg:w-4/12 min-w-0 break-words">{line.memo || "Sem histórico"}</div>
                  <div className={cn("lg:w-32 tabular-nums font-semibold lg:text-right", line.amount < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>{formatMoney(line.amount)}</div>
                  <div className="lg:w-32"><span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium", status.className)}><Icon name={status.icon} className="w-3 h-3" />{status.text}</span></div>
                  {line.status !== "conciliado" && (
                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                      <Select name={`choice-${line.fitId}`} options={options} state={choice.action} onChange={(_, v) => setChoice(line.fitId, { action: String(v) })} />
                      {choice.action === "criar" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input name="description" value={choice.description ?? ""} placeholder="Descrição" maxLength={255} onValueChange={(_, v) => setChoice(line.fitId, { description: String(v) })} />
                          <AccountSelect accounts={accounts ?? []} value={choice.chartAccountId ?? ""} nature="despesa" clearable onChange={(v) => setChoice(line.fitId, { chartAccountId: v })} placeholder="Conta do plano (opcional)" />
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
          <p className="text-xs text-muted-foreground mt-2">Entrada sem par: lance a conta a receber (ou dê baixa nela) e leia o extrato de novo. O par é procurado pelo valor exato, com vencimento até 20 dias de distância.</p>
        </>
      )}
    </>
  );
}
