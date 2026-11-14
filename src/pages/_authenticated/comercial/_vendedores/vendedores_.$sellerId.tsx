import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input as ShadInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Pagination from "@/components/general-components/Pagination";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { useBankAccounts } from "../../financeiro/-shared/financial";
import { COMMERCIAL_ABILITY, NumField, Tip, commercialApi, dateBr, decimal, errorMessage, money, todayIso } from "../-shared/commercial";
import {
  EntriesResponse, EntryStatusBadge, EntryType, ORIGIN_LABEL, PAYMENT_METHODS, SELLERS_KEY, TYPE_LABEL, WALLET_ENTRIES_KEY, WALLET_KEY,
  WalletDetail, WalletEntry, WalletOrigin, initials, paymentLabel,
} from "../-shared/sellers";

export const Route = createFileRoute("/_authenticated/comercial/_vendedores/vendedores_/$sellerId")({
  component: SellerWalletPage,
});

const LIMIT = 15;
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const TYPE_FILTERS: Array<{ value: "" | EntryType; label: string }> = [
  { value: "", label: "Tudo" }, { value: "comissao", label: "Comissões" }, { value: "pagamento", label: "Pagamentos" }, { value: "ajuste", label: "Ajustes" },
];

/** A carteira de um vendedor: quanto tem a receber, de onde veio e o que já foi pago. */
function SellerWalletPage() {
  const { sellerId } = Route.useParams();
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [type, setType] = useState<"" | EntryType>("");
  const [origin, setOrigin] = useState("");
  const [page, setPage] = useState(0);
  const [dialog, setDialog] = useState<"" | "pay" | "adjust">("");
  const [reversing, setReversing] = useState<WalletEntry | null>(null);

  const { data: wallet, isLoading, error } = useQuery({
    queryKey: [WALLET_KEY, sellerId],
    queryFn: () => commercialApi.get<WalletDetail>(`sellers/${sellerId}`),
  });
  const params = { page, limit: LIMIT, ...(type ? { type } : {}), ...(origin ? { origin } : {}) };
  const { data: entries, isLoading: loadingEntries } = useQuery({
    queryKey: [WALLET_ENTRIES_KEY, sellerId, params],
    queryFn: () => commercialApi.get<EntriesResponse>(`sellers/${sellerId}/entries`, params),
    placeholderData: (previous) => previous,
    enabled: Boolean(wallet),
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [WALLET_KEY, sellerId] });
    queryClient.invalidateQueries({ queryKey: [WALLET_ENTRIES_KEY, sellerId] });
    queryClient.invalidateQueries({ queryKey: [SELLERS_KEY] });
  };
  const { mutate: unmark } = useMutation({
    mutationFn: () => commercialApi.delete(`sellers/${sellerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SELLERS_KEY] });
      toast({ title: "Não é mais vendedor", description: "A carteira e o histórico continuam guardados.", variant: "success" });
      navigate({ to: "/comercial/vendedores" });
    },
    onError: (err) => toast({ title: "Não foi possível concluir", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`view_${COMMERCIAL_ABILITY}`)) return null;
  if (error) return <div className="p-4"><p className="text-destructive font-medium">Erro: {errorMessage(error)}</p><Link to="/comercial/vendedores" className="underline text-sm">Voltar para os vendedores</Link></div>;
  if (isLoading || !wallet) return <div className="grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-72 w-full" /></div>;
  const canUpdate = can(`update_${COMMERCIAL_ABILITY}`);
  const { seller } = wallet;
  const services = wallet.byOrigin.servico.generated, trainings = wallet.byOrigin.treinamento.generated, manual = wallet.byOrigin.manual.generated;
  const split = services + trainings + manual;
  const peak = Math.max(1, ...wallet.months.map((month) => Math.max(month.generated, month.paid)));

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/comercial/vendedores" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Vendedores</Link>
          <div className="flex items-center gap-3 mt-1">
            <Avatar className="border h-11 w-11">
              <AvatarImage src={seller.imageUrl || undefined} alt={seller.name} />
              <AvatarFallback>{initials(seller.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{seller.name}</h1>
              <p className="text-sm text-muted-foreground truncate">
                {seller.email}{!seller.isSeller && " · não é mais vendedor"}{seller.inactiveAt && " · usuário inativo"}
              </p>
            </div>
          </div>
        </div>
        {canUpdate && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button type="button" onClick={() => setDialog("pay")}><Icon name="hand-coins" className="w-4 h-4 mr-1" /> Registrar pagamento</Button>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild><Button type="button" variant="ghost" aria-label="Mais ações"><Icon name="ellipsis" className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="gap-2" onSelect={() => setDialog("adjust")}><Icon name="sliders-horizontal" className="w-3 h-3" /> Lançar ajuste</DropdownMenuItem>
                {seller.isSeller && (
                  <DropdownMenuItem className="p-0" onSelect={(event) => event.preventDefault()}>
                    <ConfirmDialog title={`${seller.name} deixa de ser vendedor?`}
                      description="Ele sai da lista de vendedores e não aparece mais para novos cupons. A carteira e o histórico continuam guardados."
                      onConfirm={() => unmark()} titleBttn="Deixar de ser vendedor" iconBttn="user-round-x" />
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 my-4">
        <Figure label="Saldo a pagar" value={money(wallet.balance)} highlight negative={wallet.balance < -0.005}
          hint={wallet.balance < -0.005 ? "Pago a mais: será compensado nas próximas comissões." : "Comissões liberadas e ainda não pagas."} />
        <Figure label="A liberar" value={money(wallet.pending)} hint="Vendas feitas cujo cliente ainda não pagou." />
        <Figure label="Já pago" value={money(wallet.paid)} hint={wallet.lastPayment ? `Último: ${money(wallet.lastPayment.amount)} em ${dateBr(wallet.lastPayment.at)}.` : "Nenhum pagamento lançado."} />
        <Figure label="Total gerado" value={money(wallet.generated)} hint={wallet.sales ? `${wallet.sales} venda(s) · média de ${money(wallet.averageCommission)}.` : "Nenhuma comissão liberada ainda."} />
      </div>

      <div className="grid lg:grid-cols-2 gap-3 mb-4">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold">De onde veio</h2>
          <p className="text-xs text-muted-foreground">Comissões liberadas, por origem.</p>
          {split > 0 ? (
            <>
              <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-muted" role="img"
                aria-label={`Treinamento ${money(trainings)}, serviço ${money(services)}${manual ? `, manual ${money(manual)}` : ""}`}>
                <div className="bg-primary" style={{ width: `${(trainings / split) * 100}%` }} />
                <div className="bg-blue-500" style={{ width: `${(services / split) * 100}%` }} />
                <div className="bg-muted-foreground/50" style={{ width: `${(manual / split) * 100}%` }} />
              </div>
              <div className="mt-3 grid gap-1.5 text-sm">
                <Origin color="bg-primary" label="Treinamento" value={trainings} total={split} pending={wallet.byOrigin.treinamento.pending} sales={wallet.byOrigin.treinamento.sales} />
                <Origin color="bg-blue-500" label="Serviço" value={services} total={split} pending={wallet.byOrigin.servico.pending} sales={wallet.byOrigin.servico.sales} />
                {manual > 0 && <Origin color="bg-muted-foreground/50" label="Manual" value={manual} total={split} pending={wallet.byOrigin.manual.pending} sales={wallet.byOrigin.manual.sales} />}
              </div>
            </>
          ) : <p className="mt-3 text-sm text-muted-foreground">Ainda não há comissão liberada.</p>}
        </section>

        <section className="rounded-lg border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Últimos 12 meses</h2>
              <p className="text-xs text-muted-foreground">Comissão liberada e pagamento em cada mês.</p>
            </div>
            <p className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary" /> Gerado</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-muted-foreground/50" /> Pago</span>
            </p>
          </div>
          <div className="mt-3 flex items-end gap-1.5 h-24" role="img" aria-label="Comissão gerada e paga por mês">
            {wallet.months.map((month) => (
              <Tip key={month.month} text={`${MONTHS[Number(month.month.slice(5)) - 1]}/${month.month.slice(2, 4)} — gerado ${money(month.generated)}, pago ${money(month.paid)}`}>
                <div className="flex-1 h-full flex items-end justify-center gap-0.5">
                  <div className="w-1/2 rounded-t-sm bg-primary" style={{ height: `${(month.generated / peak) * 100}%`, minHeight: month.generated ? 2 : 0 }} />
                  <div className="w-1/2 rounded-t-sm bg-muted-foreground/50" style={{ height: `${(month.paid / peak) * 100}%`, minHeight: month.paid ? 2 : 0 }} />
                </div>
              </Tip>
            ))}
          </div>
          <div className="mt-1 flex gap-1.5 text-[10px] text-muted-foreground">
            {wallet.months.map((month) => <span key={month.month} className="flex-1 text-center">{MONTHS[Number(month.month.slice(5)) - 1]}</span>)}
          </div>
        </section>
      </div>

      <section className="rounded-lg border overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 border-b">
          <h2 className="font-semibold lg:mr-auto">Histórico</h2>
          <div className="flex flex-wrap rounded-md border overflow-hidden w-fit" role="tablist" aria-label="Tipo de lançamento">
            {TYPE_FILTERS.map((filter) => (
              <button key={filter.value || "all"} type="button" role="tab" aria-selected={type === filter.value} onClick={() => { setType(filter.value); setPage(0); }}
                className={cn("px-3 py-1.5 text-sm", type === filter.value ? "bg-primary text-inverse-foreground" : "hover:bg-muted")}>
                {filter.label}
              </button>
            ))}
          </div>
          <div className="lg:w-48">
            <Select name="origin" state={origin} modal={false} clearable placeholder="Todas as origens"
              options={(Object.keys(ORIGIN_LABEL) as WalletOrigin[]).map((id) => ({ id, name: ORIGIN_LABEL[id] }))}
              onChange={(_, value) => { setOrigin(value ? String(value) : ""); setPage(0); }} />
          </div>
        </div>

        <div className="hidden lg:flex items-center py-2 px-4 bg-muted/50 text-xs font-medium text-muted-foreground">
          <div className="w-24">Data</div>
          <div className="w-28">Tipo</div>
          <div className="flex-1">Descrição</div>
          <div className="w-24">Situação</div>
          <div className="w-32 text-right">Valor</div>
          <div className="w-10" />
        </div>
        {loadingEntries && !entries && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12 w-full my-1" />)}
        {entries && entries.rows.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">
            {type || origin ? "Nenhum lançamento com esses filtros." : "Nenhum lançamento ainda. As comissões aparecem aqui quando uma venda com este vendedor é feita."}
          </p>
        )}
        {entries?.rows.map((entry) => {
          const gone = entry.status === "cancelada" || entry.status === "estornado";
          return (
            <div key={entry.id} className={cn("flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-3 border-b last:border-b-0 text-sm", gone && "text-muted-foreground")}>
              <div className="lg:w-24 tabular-nums">{dateBr(entry.occurredAt)}</div>
              <div className="lg:w-28">
                <p className="font-medium">{TYPE_LABEL[entry.type]}</p>
                {entry.type !== "pagamento" && <p className="text-xs text-muted-foreground">{ORIGIN_LABEL[entry.origin]}</p>}
              </div>
              <div className="flex-1 min-w-0 lg:pr-4">
                <p className="truncate">{entry.description}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {entry.type === "comissao" && entry.rate !== null && entry.baseValue !== null && `${decimal(entry.rate, 2)}% de ${money(entry.baseValue)}`}
                  {entry.type === "comissao" && entry.status === "liberada" && entry.releasedAt && ` · liberada em ${dateBr(entry.releasedAt)}`}
                  {entry.type === "pagamento" && [paymentLabel(entry.paymentMethod), entry.bankAccount?.name, entry.createdBy && `por ${entry.createdBy}`].filter(Boolean).join(" · ")}
                  {entry.type === "ajuste" && entry.createdBy && `por ${entry.createdBy}`}
                  {entry.note && ` · ${entry.note}`}
                  {entry.reverseReason && ` · estornado: ${entry.reverseReason}`}
                  {entry.contract && <> · <Link to="/comercial/contratos/$contractId" params={{ contractId: String(entry.contract.id) }} className="underline">{entry.contract.number}</Link></>}
                </p>
              </div>
              <div className="lg:w-24"><EntryStatusBadge status={entry.status} /></div>
              <div className={cn("lg:w-32 lg:text-right font-semibold tabular-nums", gone && "line-through font-normal", !gone && entry.amount < 0 && "text-muted-foreground")}>
                {entry.amount < 0 ? "− " : entry.type === "comissao" ? "" : "+ "}{money(Math.abs(entry.amount))}
              </div>
              <div className="lg:w-10 flex lg:justify-end">
                {canUpdate && entry.type !== "comissao" && entry.status === "efetivado" && (
                  <Tip text="Estornar este lançamento">
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Estornar este lançamento" onClick={() => setReversing(entry)}>
                      <Icon name="undo-2" className="w-4 h-4" />
                    </Button>
                  </Tip>
                )}
              </div>
            </div>
          );
        })}
      </section>
      {entries && entries.total > LIMIT && <div className="mt-4"><Pagination totalItems={entries.total} itemsPerPage={LIMIT} currentPage={page} onPageChange={setPage} maxVisiblePages={5} /></div>}

      {dialog === "pay" && <PaymentDialog wallet={wallet} onClose={() => setDialog("")} onDone={() => { setDialog(""); refresh(); }} />}
      {dialog === "adjust" && <AdjustDialog wallet={wallet} onClose={() => setDialog("")} onDone={() => { setDialog(""); refresh(); }} />}
      {reversing && <ReverseDialog entry={reversing} onClose={() => setReversing(null)} onDone={() => { setReversing(null); refresh(); }} />}
    </>
  );
}

const Figure = ({ label, value, hint, highlight, negative }: { label: string; value: string; hint: string; highlight?: boolean; negative?: boolean }) => (
  <div className={cn("rounded-lg border p-4", highlight && !negative && "border-primary/50 bg-primary/5")}>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={cn("text-2xl font-bold tabular-nums leading-tight mt-0.5", highlight && !negative && "text-primary", negative && "text-destructive")}>{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{hint}</p>
  </div>
);

const Origin = ({ color, label, value, total, pending, sales }: { color: string; label: string; value: number; total: number; pending: number; sales: number }) => (
  <div className="flex items-baseline gap-2">
    <span className={cn("h-2 w-2 rounded-sm shrink-0 self-center", color)} />
    <span className="font-medium">{label}</span>
    <span className="text-xs text-muted-foreground">{sales} venda(s){pending > 0 ? ` · ${money(pending)} a liberar` : ""}</span>
    <span className="ml-auto tabular-nums">{money(value)} <span className="text-xs text-muted-foreground">{decimal((value / total) * 100, 0)}%</span></span>
  </div>
);

/** Baixa: o vendedor foi pago por fora e o pagamento é lançado na carteira. */
function PaymentDialog({ wallet, onClose, onDone }: { wallet: WalletDetail; onClose: () => void; onDone: () => void }) {
  const { data: accounts } = useBankAccounts();
  const [amount, setAmount] = useState<number | null>(wallet.balance > 0 ? wallet.balance : null);
  const [paidAt, setPaidAt] = useState<string | null>(todayIso());
  const [method, setMethod] = useState("pix");
  const [bankAccountId, setBankAccountId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [advance, setAdvance] = useState(false);
  const value = amount ?? 0;
  const over = value > wallet.balance + 0.005;
  const { mutate, isPending } = useMutation({
    mutationFn: (allowAdvance: boolean) => commercialApi.post(`sellers/${wallet.seller.id}/payments`, {
      amount: value, paidAt, paymentMethod: method, ...(bankAccountId ? { bankAccountId: Number(bankAccountId) } : {}), note, ...(allowAdvance ? { allowAdvance: true } : {}),
    }),
    onSuccess: () => { toast({ title: `Pagamento de ${money(value)} lançado`, variant: "success" }); onDone(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (value <= 0) return setError("Informe o valor pago");
    if (!paidAt) return setError("Informe a data do pagamento");
    setError("");
    if (over) setAdvance(true); else mutate(false);
  };

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
          <DialogDescription>
            Lance aqui o que já foi pago a {wallet.seller.name} por fora do sistema. Saldo a pagar: <b className="text-foreground tabular-nums">{money(wallet.balance)}</b>.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="payAmount" className="text-xs">Valor pago</Label>
              <NumField id="payAmount" kind="money" className="mt-1" value={amount} onChange={setAmount} onEmpty={() => setAmount(null)} /></div>
            <div><Label className="text-xs">Data do pagamento</Label>
              <div className="mt-1"><CalendarPicker mode="single" name="paidAt" className="w-full" value={paidAt} fromYear={2024} toYear={2040} onValueChange={(_, date) => setPaidAt(date)} /></div></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Forma</Label>
              <div className="mt-1"><Select name="paymentMethod" state={method} modal options={PAYMENT_METHODS} onChange={(_, selected) => setMethod(String(selected || "pix"))} /></div></div>
            <div><Label className="text-xs">Conta de saída (opcional)</Label>
              <div className="mt-1"><Select name="bankAccountId" state={bankAccountId} modal clearable placeholder="Não informar"
                options={(accounts?.rows ?? []) as never[]} onChange={(_, selected) => setBankAccountId(selected ? String(selected) : "")} /></div></div>
          </div>
          <div><Label htmlFor="payNote" className="text-xs">Observação (opcional)</Label>
            <Textarea id="payNote" className="mt-1" rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ex.: PIX enviado às 14h, comprovante no e-mail" /></div>
          {over && value > 0 && (
            <p className="rounded-md border border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200 px-3 py-2 text-xs">
              O valor é maior que o saldo a pagar. A diferença de {money(value - Math.max(wallet.balance, 0))} fica como adiantamento e é compensada nas próximas comissões.
            </p>
          )}
          {error && <p className="text-destructive text-sm" role="alert">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Lançando..." : "Lançar pagamento"}</Button>
          </DialogFooter>
        </form>
        <ConfirmDialog open={advance} onOpenChange={setAdvance} title="Lançar como adiantamento?"
          description={`O pagamento de ${money(value)} é maior que o saldo a pagar (${money(wallet.balance)}). A carteira fica com saldo negativo até novas comissões compensarem.`}
          onConfirm={() => { setAdvance(false); mutate(true); }} />
      </DialogContent>
    </Dialog>
  );
}

/** Acerto manual: crédito ou débito na carteira, sempre com o motivo. */
function AdjustDialog({ wallet, onClose, onDone }: { wallet: WalletDetail; onClose: () => void; onDone: () => void }) {
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => commercialApi.post(`sellers/${wallet.seller.id}/adjustments`, { amount: (direction === "credit" ? 1 : -1) * (amount ?? 0), description: reason }),
    onSuccess: () => { toast({ title: "Ajuste lançado", variant: "success" }); onDone(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!amount || amount <= 0) return setError("Informe o valor do ajuste");
    if (reason.trim().length < 3) return setError("Informe o motivo do ajuste");
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lançar ajuste</DialogTitle>
          <DialogDescription>Para acertos que não vêm de uma venda: um bônus, um desconto, uma correção. Entra direto no saldo de {wallet.seller.name}.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={submit}>
          <div className="inline-flex w-fit rounded-md border overflow-hidden" role="radiogroup" aria-label="Tipo de ajuste">
            {([["credit", "Crédito (soma)"], ["debit", "Débito (desconta)"]] as const).map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={direction === id} onClick={() => setDirection(id)}
                className={cn("px-3.5 h-9 text-sm font-medium border-l first:border-l-0", direction === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
                {label}
              </button>
            ))}
          </div>
          <div><Label htmlFor="adjustAmount" className="text-xs">Valor</Label>
            <NumField id="adjustAmount" kind="money" className="mt-1 w-44" value={amount} onChange={setAmount} onEmpty={() => setAmount(null)} /></div>
          <div><Label htmlFor="adjustReason" className="text-xs">Motivo</Label>
            <ShadInput id="adjustReason" className="mt-1" value={reason} maxLength={255} onChange={(event) => setReason(event.target.value)} placeholder="Ex.: bônus por meta do trimestre" /></div>
          {error && <p className="text-destructive text-sm" role="alert">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Lançando..." : "Lançar ajuste"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Estorno de um pagamento ou ajuste lançado errado. Fica no histórico, riscado, com o motivo. */
function ReverseDialog({ entry, onClose, onDone }: { entry: WalletEntry; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => commercialApi.post(`sellers/entries/${entry.id}/reverse`, { reason }),
    onSuccess: () => { toast({ title: "Lançamento estornado", variant: "success" }); onDone(); },
    onError: (err) => setError(errorMessage(err)),
  });
  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Estornar {TYPE_LABEL[entry.type].toLowerCase()} de {money(Math.abs(entry.amount))}</DialogTitle>
          <DialogDescription>Use quando o lançamento foi feito errado. Ele continua no histórico, riscado, e o valor volta para o saldo.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); if (reason.trim().length < 3) return setError("Informe o motivo do estorno"); setError(""); mutate(); }}>
          <div><Label htmlFor="reverseReason" className="text-xs">Motivo</Label>
            <ShadInput id="reverseReason" className="mt-1" value={reason} maxLength={255} onChange={(event) => setReason(event.target.value)} placeholder="Ex.: lançado em duplicidade" /></div>
          {error && <p className="text-destructive text-sm" role="alert">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" variant="destructive" disabled={isPending}>{isPending ? "Estornando..." : "Estornar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
