import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import CalendarPicker from "@/components/general-components/Calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/general-interfaces/api.interface";
import { cn } from "@/lib/utils";
import { FINANCIAL_ABILITY, bankTypeLabel, financialApi, formatMoney, gatewayOptions } from "../-shared/financial";
import { formatDate } from "../_receber/-components/options";

export const Route = createFileRoute("/_authenticated/financeiro/_implantacao/implantacao")({ component: Setup });

const SETUP_KEY = "financialSetup";

interface SetupAccount {
  id: number; name: string; type: string; bankName: string | null; gateway: string | null; isDefault: boolean;
  openingBalance: number; openingBalanceDate: string | null; start: string | null; ownDate: boolean; balance: number;
}
interface Bucket { count: number; total: number }
interface SetupData {
  today: string; startDate: string | null; suggestedStartDate: string;
  accounts: SetupAccount[];
  before: { date: string; received: Bucket; paid: Bucket };
  overdue: { payables: Bucket; receivables: Bucket };
  progress: { openPayables: number; openReceivables: number; receivedSince: number; paidSince: number; transfersSince: number; reconciled: number };
}

const plusDays = (day: string, days: number) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const firstOfMonth = (day: string, back: number) => {
  const d = new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1 - back, 1));
  return d.toISOString().slice(0, 10);
};

/**
 * Implantação do financeiro: a data a partir da qual o sistema acompanha o
 * caixa e o saldo de cada conta naquela data. Antes dela, nada mexe no saldo.
 */
function Setup() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<SetupData | undefined>({ queryKey: [SETUP_KEY], queryFn: () => get("financial", "setup") });
  const [startDate, setStartDate] = useState("");
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!data?.accounts) return;
    setStartDate(data.startDate ?? data.suggestedStartDate);
    setBalances(Object.fromEntries(data.accounts.map((a) => [a.id, a.openingBalance])));
  }, [data]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => financialApi.put<SetupData>("setup", { startDate, accounts: (data?.accounts ?? []).map((a) => ({ id: a.id, openingBalance: balances[a.id] ?? 0 })) }),
    onSuccess: (result) => {
      queryClient.setQueryData([SETUP_KEY], result);
      for (const k of ["financialBankBalances", "financialReports", "listContas Bancárias", "optionsBankAccounts", "dashboard"]) queryClient.invalidateQueries({ queryKey: [k] });
      toast({ title: "Implantação salva", description: `O financeiro acompanha o caixa desde ${formatDate(result.startDate ?? "")}.`, variant: "success" });
    },
    onError: (err: ApiError) => toast({ title: "Não foi possível salvar", description: err.response?.data?.message, variant: "destructive" }),
  });

  const total = useMemo(() => (data?.accounts ?? []).reduce((sum, a) => sum + Number(balances[a.id] ?? 0), 0), [data, balances]);
  if (!can(`view_${FINANCIAL_ABILITY}`)) return null;
  const canEdit = can(`update_${FINANCIAL_ABILITY}`);
  const eve = startDate ? plusDays(startDate, -1) : "";
  const changingDate = !!data?.startDate && data.startDate !== startDate;
  const future = !!data && !!startDate && startDate > data.today;
  const submit = () => {
    if (!startDate) return toast({ title: "Escolha a data inicial" });
    if (future) return toast({ title: "A data inicial não pode ser futura" });
    if (changingDate) return setConfirm(true);
    save();
  };

  return (
    <>
      <div>
        <h1 className="text-xl font-bold">Implantação do financeiro</h1>
        <p className="text-sm text-muted-foreground">
          Escolha a data a partir da qual o sistema acompanha o caixa e informe quanto havia em cada conta. Dali em diante, lance as contas e concilie os extratos: o saldo do sistema passa a bater com o do banco.
        </p>
      </div>

      {isLoading || !data?.accounts ? (
        <div className="flex flex-col gap-3 my-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : (
        <div className="flex flex-col gap-4 my-4">
          <div className={cn("flex items-start gap-3 rounded-card border bg-card p-3 text-sm",
            data.startDate ? "border-green-300 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200" : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200")}>
            <Icon name={data.startDate ? "circle-check" : "flag"} className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              {data.startDate
                ? <>O financeiro acompanha o caixa desde <b>{formatDate(data.startDate)}</b>. Movimentos com data anterior continuam no sistema (e na DRE), mas não mexem no saldo.</>
                : <>Ainda sem data inicial: hoje o saldo das contas soma tudo o que já foi baixado, de qualquer data. Defina a data e os saldos abaixo para começar.</>}
            </p>
          </div>

          {/* 1. data */}
          <section className="rounded-card border bg-card p-4">
            <h2 className="font-semibold flex items-center gap-2"><Step n={1} /> Data inicial</h2>
            <div className="flex flex-col md:flex-row md:items-end gap-3 mt-3">
              <div className="w-full md:w-56">
                <Label htmlFor="startDate">A partir de</Label>
                <CalendarPicker mode="natural" name="startDate" value={startDate} onValueChange={(_, v) => setStartDate(String(Array.isArray(v) ? v[0] ?? "" : v ?? ""))}
                  placeholder="dd/mm/aaaa" className="mt-1" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setStartDate(firstOfMonth(data.today, 1))}>1º dia do mês anterior</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setStartDate(firstOfMonth(data.today, 0))}>1º dia deste mês</Button>
              </div>
            </div>
            {future && <p className="text-sm text-red-500 mt-2">A data inicial não pode ser futura.</p>}
            {startDate && !future && (
              <p className="text-xs text-muted-foreground mt-2">
                O saldo de cada conta é o do <b>fim do dia {formatDate(eve)}</b>. No extrato do banco, é o "saldo anterior" que aparece no dia {formatDate(startDate)}.
                Tudo o que entrou ou saiu a partir de {formatDate(startDate)} precisa ser lançado no sistema.
              </p>
            )}
          </section>

          {/* 2. saldos */}
          <section className="rounded-card border bg-card p-4">
            <h2 className="font-semibold flex items-center gap-2"><Step n={2} /> Saldo de cada conta{eve && !future ? ` no fim de ${formatDate(eve)}` : ""}</h2>
            {!data.accounts.length ? (
              <p className="text-sm text-muted-foreground mt-3">
                Nenhuma conta ativa. <Link to="/financeiro/contas-bancarias" className="underline">Cadastre as contas bancárias e o caixa</Link> e volte aqui.
              </p>
            ) : (
              <div className="rounded-card border bg-card overflow-x-auto mt-3">
                <div className="flex min-w-[880px] items-center py-2.5 border-b px-4 font-semibold text-[12.5px] text-muted-foreground">
                  <div className="flex-1">Conta</div>
                  <div className="w-56">Saldo inicial</div>
                  <div className="w-40 text-right">Saldo hoje</div>
                </div>
                {data.accounts.map((account) => (
                  <div key={account.id} className="min-w-[880px] flex flex-row items-center gap-2 px-4 py-2.5 border-b border-border/70 last:border-b-0 hover:bg-muted/40 transition-colors text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{account.name}{account.isDefault && <span className="ml-2 text-xs font-normal rounded-chip bg-primary-soft text-primary-soft-foreground px-1.5 py-0.5 font-medium">Padrão</span>}</p>
                      <p className="text-xs text-muted-foreground">
                        {account.type === "gateway" ? `${gatewayOptions.find((g) => g.id === account.gateway)?.name ?? "Gateway"} · saldo disponível no provedor` : [bankTypeLabel(account.type), account.bankName].filter(Boolean).join(" · ")}
                      </p>
                      {account.ownDate && account.openingBalanceDate && (
                        <p className="text-xs text-amber-700 dark:text-amber-300">Tinha data própria ({formatDate(account.openingBalanceDate)}); ao salvar, passa a usar a data inicial.</p>
                      )}
                    </div>
                    <div className="w-56">
                      <Input name={`balance-${account.id}`} format="currency" value={balances[account.id] ?? 0} disabled={!canEdit}
                        onValueChange={(_, v) => setBalances((prev) => ({ ...prev, [account.id]: Number(v ?? 0) }))} />
                    </div>
                    <div className="w-40 text-right tabular-nums">
                      <span className="hidden text-xs text-muted-foreground">Saldo hoje: </span>
                      <span className={cn("font-semibold", account.balance < 0 && "text-red-600 dark:text-red-400")}>{formatMoney(account.balance)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 text-sm font-semibold">
                  <div className="flex-1">Total</div>
                  <div className="md:w-56 tabular-nums">{formatMoney(total)}</div>
                  <div className="hidden md:block md:w-40" />
                </div>
              </div>
            )}
            {canEdit && !!data.accounts.length && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3">
                <p className="text-xs text-muted-foreground flex-1">Contas criadas depois já nascem com a data inicial. Para uma conta aberta depois dessa data, edite a data dela em Contas Bancárias.</p>
                <Button disabled={isPending || future || !startDate} onClick={submit}>{isPending ? "Salvando..." : data.startDate ? "Salvar alterações" : "Salvar implantação"}</Button>
              </div>
            )}
          </section>

          {/* 3. antes da data */}
          <section className="rounded-card border bg-card p-4">
            <h2 className="font-semibold flex items-center gap-2"><Step n={3} /> O que já existe no sistema</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              <li className="flex gap-2">
                <Icon name="history" className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span>
                  <b>{data.before.received.count}</b> recebimento(s) e <b>{data.before.paid.count}</b> pagamento(s) baixados antes de {formatDate(data.before.date)}.
                  Ficam fora do saldo (já estão dentro do saldo inicial) e continuam na DRE.
                </span>
              </li>
              <li className="flex gap-2">
                <Icon name="triangle-alert" className={cn("w-4 h-4 mt-0.5 shrink-0", data.overdue.payables.count || data.overdue.receivables.count ? "text-amber-600" : "text-muted-foreground")} />
                <span>
                  <Link to="/financeiro/pagar" search={{ view: "atrasadas" } as never} className="underline"><b>{data.overdue.payables.count}</b> conta(s) a pagar vencida(s)</Link> ({formatMoney(data.overdue.payables.total)}) e{" "}
                  <Link to="/financeiro/receber" search={{ view: "atrasadas" } as never} className="underline"><b>{data.overdue.receivables.count}</b> a receber vencida(s)</Link> ({formatMoney(data.overdue.receivables.total)}).
                  Confira se ainda estão em aberto: o que já foi pago deve ser baixado com a data real do pagamento (se for antes da data inicial, não mexe no saldo) ou excluído.
                </span>
              </li>
            </ul>
          </section>

          {/* 4. próximos passos */}
          <section className="rounded-card border bg-card p-4">
            <h2 className="font-semibold flex items-center gap-2"><Step n={4} /> Para o saldo bater com o banco</h2>
            <ol className="mt-3 flex flex-col gap-2 text-sm">
              <Check done={data.progress.openPayables > 0} to="/financeiro/pagar" text="Lance as contas a pagar em aberto" detail={`${data.progress.openPayables} em aberto`} />
              <Check done={data.progress.openReceivables > 0} to="/financeiro/receber" text="Lance as contas a receber em aberto" detail={`${data.progress.openReceivables} em aberto`} />
              <Check done={false} optional to="/financeiro/recorrentes" text="Cadastre as despesas fixas (aluguel, internet, contador)" detail="lançam os próximos 12 meses" />
              <Check done={data.progress.paidSince + data.progress.receivedSince > 0} to="/financeiro/pagar"
                text={`Lance e baixe o que foi pago e recebido desde ${formatDate(data.startDate ?? startDate)}`}
                detail={`${data.progress.paidSince} pagamento(s), ${data.progress.receivedSince} recebimento(s), ${data.progress.transfersSince} transferência(s)`} />
              <Check done={data.progress.reconciled > 0} to="/financeiro/conciliacao" text="Concilie os extratos de cada conta desde a data inicial"
                detail={`${data.progress.reconciled} lançamento(s) conciliado(s) · a tela mostra se o saldo do extrato bate`} />
            </ol>
          </section>
        </div>
      )}

      <ConfirmDialog open={confirm} onOpenChange={setConfirm} slideLabel="Deslize para mudar a data"
        title="Mudar a data inicial?"
        description={`De ${formatDate(data?.startDate ?? "")} para ${formatDate(startDate)}. Todas as contas listadas passam a usar a nova data e o saldo inicial informado. O saldo das contas, o fluxo de caixa e a conciliação são recalculados.`}
        onConfirm={() => save()} />
    </>
  );
}

function Step({ n }: { n: number }) {
  return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-inverse-foreground text-xs font-bold">{n}</span>;
}

function Check({ done, optional, to, text, detail }: { done: boolean; optional?: boolean; to: string; text: string; detail: string }) {
  return (
    <li className="flex items-start gap-2">
      <Icon name={done ? "circle-check" : optional ? "circle-dashed" : "circle"} className={cn("w-4 h-4 mt-0.5 shrink-0", done ? "text-green-600 dark:text-green-400" : "text-muted-foreground")} />
      <span className="flex-1">
        <Link to={to as never} className="underline-offset-2 hover:underline font-medium">{text}</Link>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
    </li>
  );
}
