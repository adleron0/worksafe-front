import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { NumField, Tip, dateBr, errorMessage, money, newUid, todayIso } from "../../comercial/-shared/commercial";
import { MeasurementBillDialog } from "../../comercial/-shared/billing";
import { paymentMethodOptions } from "../../financeiro/_receber/-components/options";
import { STOCK_KEYS, qty } from "../-shared/stock";
import { LocationField, UnitPicker, useLocationValue } from "../-shared/stock-pickers";
import { MovementDetailDialog } from "../-shared/stock-movements";
import {
  CHARGE_LABEL, PERIOD_LABEL, RENTALS_ABILITY, RENTAL_KEYS, RENTAL_STATUS_LABEL, RENTAL_STEPS, Rental, RentalOptions, RentalStageBadge, RentalStatus, RentPeriod, rentalsApi,
} from "../-shared/rentals";

export const Route = createFileRoute("/_authenticated/suprimentos/locacoes/$rentalId")({
  component: RentalPage,
});

interface LineDraft { key: string; itemId: string; unitId: string; quantity: number; rate: number }
interface Draft {
  customerId: string; startDate: string; expectedEnd: string; period: RentPeriod; billing: "periodo" | "unico";
  deliveryAddress: string; responsibleName: string; deposit: number | null; terms: string; notes: string; lines: LineDraft[];
}
const emptyLine = (): LineDraft => ({ key: newUid(), itemId: "", unitId: "", quantity: 1, rate: 0 });
const draftOf = (rental?: Rental): Draft => ({
  customerId: rental?.customer ? String(rental.customer.id) : "", startDate: rental?.startDate ?? todayIso(), expectedEnd: rental?.expectedEnd ?? "",
  period: rental?.period ?? "dia", billing: rental?.billing ?? "periodo", deliveryAddress: rental?.deliveryAddress ?? "", responsibleName: rental?.responsibleName ?? "",
  deposit: rental?.deposit ?? null, terms: rental?.terms ?? "", notes: rental?.notes ?? "",
  lines: rental?.lines.length ? rental.lines.map((line) => ({ key: String(line.id), itemId: String(line.itemId), unitId: line.unitId ? String(line.unitId) : "", quantity: line.quantity, rate: line.rate })) : [emptyLine()],
});
const BILLING = [{ id: "periodo", name: "Por período (dia, semana ou mês)" }, { id: "unico", name: "Pagamento único" }];
const PERIOD_PLURAL: Record<RentPeriod, string> = { dia: "dias", semana: "semanas", mes: "meses" };
const EVENT_LABEL: Record<string, string> = { criado: "Criada", avancou: "Avançou", voltou: "Voltou", cancelado: "Cancelada", recusado: "Recusada" };

/**
 * Ficha da Ordem de Locação: o que vai, para quem e até quando; entrega,
 * devolução, faturamento (medição no contrato), caução, lembretes e histórico.
 * OL nova só nasce de proposta aceita: "nova" mostra o caminho.
 */
function RentalPage() {
  const { rentalId } = Route.useParams();
  if (rentalId === "nova") return <NoNewRental />;
  return <RentalSheet rentalId={rentalId} />;
}

function NoNewRental() {
  const navigate = useNavigate();
  return (
    <div className="max-w-xl rounded-lg border p-6 grid gap-3">
      <h1 className="text-xl font-bold">Nova locação</h1>
      <p className="text-sm text-muted-foreground">Toda locação nasce de uma proposta de locação aceita: ela leva o período, a caução, o frete e confere a disponibilidade. Ao ser aceita, a proposta abre a Ordem de Locação (OL) sozinha.</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate({ to: "/comercial/propostas/nova" })}><Icon name="plus" className="w-4 h-4 mr-1" /> Nova proposta de locação</Button>
        <Button variant="outline" onClick={() => navigate({ to: "/suprimentos/locacoes" })}>Ver as ordens de locação</Button>
      </div>
    </div>
  );
}

function RentalSheet({ rentalId }: { rentalId: string }) {
  const isNew = false;
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(isNew ? draftOf() : null);
  const [dialog, setDialog] = useState<"deliver" | "return" | "bill" | "measure" | "deposit" | null>(null);
  const [moving, setMoving] = useState<RentalStatus | null>(null);
  const [opened, setOpened] = useState<number | null>(null);
  const [error, setError] = useState("");
  /** endereço, caução, responsável, condições e observações ficam recolhidos */
  const [details, setDetails] = useState(false);

  const { data: rental, isLoading, error: loadError } = useQuery({
    queryKey: [RENTAL_KEYS.one, rentalId],
    queryFn: () => rentalsApi.get<Rental>(rentalId),
    enabled: !isNew,
  });
  const { data: options } = useQuery({ queryKey: [RENTAL_KEYS.options], queryFn: () => rentalsApi.get<RentalOptions>("options") });
  useEffect(() => { if (rental) setDraft(draftOf(rental)); }, [rental]);

  const apply = (result: Rental) => {
    queryClient.setQueryData([RENTAL_KEYS.one, String(result.id)], result);
    for (const key of [RENTAL_KEYS.list, RENTAL_KEYS.availability, RENTAL_KEYS.options, STOCK_KEYS.balances, STOCK_KEYS.movements, STOCK_KEYS.overview, STOCK_KEYS.unitOptions, STOCK_KEYS.itemOptions]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
  const status: RentalStatus = rental?.status ?? "reservada";
  const canUpdate = can(`update_${RENTALS_ABILITY}`);
  const reserved = isNew || status === "reservada";
  const editable = isNew ? can(`create_${RENTALS_ABILITY}`) : canUpdate && ["reservada", "ativa", "devolvida"].includes(status);
  const canMove = canUpdate && can("movimentar_estoque");
  const pendingCharges = !!rental?.charges.some((charge) => !charge.financialRecordId && charge.kind !== "aluguel");
  const canBill = !!rental && canUpdate && can("update_financeiro") && !rental.fromContract && (!!rental.nextPeriod || pendingCharges);
  const canMeasure = !!rental?.contract && rental.fromContract && can("create_financeiro") && rental.pending.length > 0;
  const canSettle = !!rental?.depositState && !rental.depositState.settled && status === "devolvida" && canUpdate && can("update_financeiro");

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (value: Draft) => {
      const body = {
        expectedEnd: value.expectedEnd || null, deliveryAddress: value.deliveryAddress, responsibleName: value.responsibleName, deposit: value.deposit,
        terms: value.terms, notes: value.notes,
        ...(reserved ? {
          customerId: Number(value.customerId), startDate: value.startDate, period: value.period, billing: value.billing,
          lines: value.lines.filter((line) => line.itemId).map((line) => ({ itemId: Number(line.itemId), unitId: line.unitId ? Number(line.unitId) : null, quantity: line.unitId ? 1 : line.quantity, rate: line.rate })),
        } : {}),
      };
      return isNew ? rentalsApi.post<Rental>("", body) : rentalsApi.put<Rental>(rentalId, body);
    },
    onSuccess: (result) => {
      apply(result);
      toast({ title: isNew ? `${result.number} criada` : "Ordem de locação salva", variant: "success" });
      if (isNew) navigate({ to: "/suprimentos/locacoes/$rentalId", params: { rentalId: String(result.id) }, replace: true });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  if (!can(`view_${RENTALS_ABILITY}`)) return null;
  if (loadError) return <div className="p-4"><p className="text-destructive font-medium">Erro: {errorMessage(loadError)}</p><Link to="/suprimentos/locacoes" className="underline text-sm">Voltar para as ordens de locação</Link></div>;
  if ((!isNew && (isLoading || !rental)) || !draft) return <div className="grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-64 w-full" /></div>;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => (current ? { ...current, [key]: value } : current));
  const setLine = (key: string, patch: Partial<LineDraft>) => set("lines", draft.lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  const itemOf = (id: string) => options?.items.find((item) => String(item.id) === id);
  const dirty = isNew || JSON.stringify(draft) !== JSON.stringify(draftOf(rental));
  const total = draft.lines.reduce((sum, line) => sum + (line.unitId ? 1 : line.quantity) * line.rate, 0);
  const others = rental ? rental.nextStatuses.filter((target) => !(status === "reservada" && target === "ativa") && !(status === "ativa" && target === "devolvida")) : [];
  const stageIndex = RENTAL_STEPS.findIndex((step) => step.id === status);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (reserved) {
      if (!draft.customerId) return setError("Escolha o cliente.");
      if (!draft.lines.some((line) => line.itemId)) return setError("Escolha o que será alugado.");
      for (const line of draft.lines.filter((l) => l.itemId)) {
        const item = itemOf(line.itemId);
        if (item?.tracking === "unidade" && !line.unitId && line.quantity !== 1) return setError(`${item.name}: peça rastreada vai uma por linha (quantidade 1).`);
        if (!(line.quantity > 0)) return setError("Informe a quantidade de cada linha.");
      }
    }
    if (draft.expectedEnd && draft.expectedEnd < draft.startDate) return setError("A devolução prevista é antes do início.");
    setError(""); save(draft);
  };
  const moveLabel = (target: RentalStatus) => target === "cancelada" ? "Cancelar a locação" : target === "encerrada" ? "Encerrar" : target === "reservada" ? "Voltar para a entregar" : status === "devolvida" && target === "ativa" ? "Reabrir (voltar a ativa)" : status === "encerrada" ? "Reabrir (voltar a devolvida)" : RENTAL_STATUS_LABEL[target];

  return (
    <>
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/suprimentos/locacoes" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Ordens de locação</Link>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Ordem de Locação</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tabular-nums">{rental?.number}</h1>
            {rental && <RentalStageBadge stage={rental.stage} />}
          </div>
          {rental && (
            <p className="text-sm text-muted-foreground truncate">
              {rental.customer?.name}
              {rental.contract && <> · venda <Link to="/comercial/contratos/$contractId" params={{ contractId: String(rental.contract.id) }} className="underline hover:text-foreground">{rental.contract.number}</Link></>}
              {rental.serviceOrder ? ` · ${rental.serviceOrder.number}` : ""} · {money(rental.ratePerPeriod)} por {PERIOD_LABEL[rental.period]}{rental.billing === "unico" ? " (pagamento único)" : ""}
            </p>
          )}
        </div>
        {rental && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {status === "reservada" && canMove && <Button type="button" disabled={dirty} onClick={() => setDialog("deliver")}><Icon name="truck" className="w-4 h-4 mr-1" /> Entregar ao cliente</Button>}
            {status === "ativa" && canMove && <Button type="button" disabled={dirty} onClick={() => setDialog("return")}><Icon name="undo-2" className="w-4 h-4 mr-1" /> Receber de volta</Button>}
            {canBill && <Button type="button" variant={status === "devolvida" ? "default" : "outline"} disabled={dirty} onClick={() => setDialog("bill")}><Icon name="receipt" className="w-4 h-4 mr-1" /> Faturar período</Button>}
            {canMeasure && <Button type="button" variant={status === "devolvida" ? "default" : "outline"} disabled={dirty} onClick={() => setDialog("measure")}><Icon name="receipt" className="w-4 h-4 mr-1" /> Faturar medição ({money(rental.pendingValue)})</Button>}
            {canSettle && <Button type="button" variant="outline" disabled={dirty} onClick={() => setDialog("deposit")}><Icon name="piggy-bank" className="w-4 h-4 mr-1" /> Acertar a caução</Button>}
            {canUpdate && others.length > 0 && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild><Button type="button" variant="outline" className="gap-1">Mais ações <Icon name="chevron-down" className="w-4 h-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {others.map((target) => (
                    <DropdownMenuItem key={target} className="gap-2" onSelect={() => setMoving(target)}>
                      <Icon name={target === "cancelada" ? "ban" : target === "encerrada" ? "check" : "undo-2"} className="w-3 h-3" /> {moveLabel(target)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>

      {rental && status !== "cancelada" && (
        <ol className="my-4 flex flex-wrap items-center gap-x-1 gap-y-2 text-xs" aria-label="Etapas da ordem de locação">
          {RENTAL_STEPS.map((step, index) => (
            <li key={step.id} className="flex items-center gap-1">
              <Tip text={step.hint}>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1", index === stageIndex ? "border-primary bg-primary/10 font-semibold text-foreground" : index < stageIndex ? "text-foreground" : "text-muted-foreground")}>
                  {index < stageIndex ? <Icon name="check" className="w-3 h-3 text-primary" /> : <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />} {step.name}
                </span>
              </Tip>
              {index < RENTAL_STEPS.length - 1 && <Icon name="chevron-right" className="w-3 h-3 text-muted-foreground" />}
            </li>
          ))}
          {(rental.stage === "a_devolver" || rental.stage === "atrasada") && (
            <li className={cn("ml-2 rounded px-2 py-1 font-medium", rental.stage === "atrasada" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200")}>
              {rental.stage === "atrasada" ? `Atrasada: devolução prevista em ${dateBr(rental.expectedEnd)}` : `A devolver em ${dateBr(rental.expectedEnd)}`}
            </li>
          )}
        </ol>
      )}
      {rental && status === "cancelada" && (
        <p className="my-4 rounded border border-red-300 dark:border-red-800 p-3 text-sm"><span className="font-semibold">Cancelada.</span> {rental.statusNote ?? ""}</p>
      )}
      {rental?.fromContract && <p className="mb-4 text-sm text-muted-foreground">Nasceu da venda {rental.contract?.number}: é cobrada por medição. Cada período vencido, as avarias e o frete entram no A Faturar (Financeiro → A Faturar ou aqui, em "Faturar medição").</p>}
      {rental && !rental.fromContract && <p className="mb-4 text-sm text-muted-foreground">Locação antiga, criada antes de toda locação passar pela proposta: continua com o "Faturar período".</p>}

      <div className="grid xl:grid-cols-3 gap-4 items-start">
        <form onSubmit={submit} className="xl:col-span-2 grid gap-4">
          <section className="rounded-lg border p-4 grid gap-4">
            <div className="grid gap-4">
              <div><Label>Cliente <span>*</span></Label>
                <Select name="customerId" searchable options={options?.customers ?? []} state={draft.customerId} disabled={!editable || !reserved || !!rental?.fromContract} onChange={(_, value) => set("customerId", String(value ?? ""))} placeholder="Escolha o cliente" /></div>
            </div>
            <div className="grid sm:grid-cols-4 gap-4">
              <div><Label>Início <span>*</span></Label>
                <CalendarPicker mode="single" name="startDate" className="mt-1 w-full" value={draft.startDate} fromYear={2024} toYear={2040} disabled={!editable || !reserved}
                  onValueChange={(_, value) => set("startDate", String(value ?? "") || todayIso())} /></div>
              <div><Label>Devolução prevista</Label>
                <CalendarPicker mode="single" name="expectedEnd" className="mt-1 w-full" value={draft.expectedEnd} placeholder="Em aberto" fromYear={2024} toYear={2040} disabled={!editable}
                  onValueChange={(_, value) => set("expectedEnd", String(value ?? ""))} /></div>
              <div><Label>Período</Label>
                <Select name="period" options={options?.periods ?? [{ id: "dia", name: "dia" }, { id: "semana", name: "semana" }, { id: "mes", name: "mês" }]} state={draft.period} disabled={!editable || !reserved}
                  onChange={(_, value) => {
                    const period = (String(value || "dia")) as RentPeriod;
                    // troca o valor de cada linha pelo do cadastro, quando houver
                    setDraft((current) => current && ({ ...current, period, lines: current.lines.map((line) => ({ ...line, rate: itemOf(line.itemId)?.rent[period] ?? line.rate })) }));
                  }} /></div>
              <div><Label>Cobrança</Label>
                <Select name="billing" options={BILLING} state={draft.billing} disabled={!editable || !reserved} onChange={(_, value) => set("billing", (String(value || "periodo")) as Draft["billing"])} /></div>
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="font-semibold">O que vai</h2>
            {rental && !reserved ? (
              <ul className="mt-2 divide-y text-sm">
                {rental.lines.map((line) => (
                  <li key={line.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex-1 min-w-0">
                      <span className="font-medium">{line.code} — {line.item}</span>
                      {line.tag && <span className="text-xs text-muted-foreground"> · peça {line.tag}{line.where ? ` (${line.where})` : ""}</span>}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">entregue {qty(line.deliveredQuantity)} · voltou {qty(line.returnedQuantity)} de {qty(line.quantity)} {line.unit}</span>
                    {line.condition && line.condition !== "ok" && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">{CONDITION_LABEL[line.condition] ?? line.condition}</span>}
                    {line.damageValue ? <span className="text-xs text-red-600 dark:text-red-400 tabular-nums">avaria/falta {money(line.damageValue)}</span> : null}
                    <span className="tabular-nums">{money(line.rate)}<span className="text-xs text-muted-foreground"> /{PERIOD_LABEL[rental.period]}</span></span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 grid gap-3">
                {draft.lines.map((line, index) => {
                  const item = itemOf(line.itemId);
                  const units = (options?.units ?? []).filter((unit) => String(unit.itemId) === line.itemId && (!draft.lines.some((other) => other.key !== line.key && other.unitId === String(unit.id))));
                  return (
                    <div key={line.key} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-12 lg:col-span-5">
                        {index === 0 && <Label className="text-xs">Item alugável</Label>}
                        <Select name={`item-${line.key}`} searchable options={(options?.items ?? []).map(({ id, name }) => ({ id, name }))} state={line.itemId} disabled={!editable}
                          onChange={(_, value) => { const picked = itemOf(String(value ?? "")); setLine(line.key, { itemId: String(value ?? ""), unitId: "", quantity: 1, rate: picked?.rent[draft.period] ?? 0 }); }} placeholder="Escolha o item" />
                      </div>
                      <div className="col-span-12 sm:col-span-5 lg:col-span-3">
                        {index === 0 && <Label className="text-xs">Peça</Label>}
                        {item?.tracking === "unidade" ? (
                          <Select name={`unit-${line.key}`} searchable options={units.map((unit) => ({ id: unit.id, name: `${unit.name}${unit.available ? "" : " (fora do estoque agora)"}` }))} state={line.unitId} clearable disabled={!editable}
                            onChange={(_, value) => setLine(line.key, { unitId: String(value ?? ""), quantity: 1 })} placeholder="Escolher na entrega" />
                        ) : <p className="text-xs text-muted-foreground pb-2.5">{item ? "Por quantidade" : "—"}</p>}
                      </div>
                      <div className="col-span-4 sm:col-span-2 lg:col-span-1">
                        {index === 0 && <Label className="text-xs">Qtd.</Label>}
                        <NumField value={line.unitId ? 1 : line.quantity} digits={item?.tracking === "unidade" ? 0 : 3} disabled={!editable || !!line.unitId || item?.tracking === "unidade"} ariaLabel={`Quantidade da linha ${index + 1}`} onChange={(value) => setLine(line.key, { quantity: value })} />
                      </div>
                      <div className="col-span-6 sm:col-span-4 lg:col-span-2">
                        {index === 0 && <Label className="text-xs">R$ por {PERIOD_LABEL[draft.period]}</Label>}
                        <NumField kind="money" value={line.rate} disabled={!editable} ariaLabel={`Valor por período da linha ${index + 1}`} onChange={(value) => setLine(line.key, { rate: value })} onEmpty={() => setLine(line.key, { rate: 0 })} />
                      </div>
                      <div className="col-span-2 lg:col-span-1 flex justify-end">
                        {editable && draft.lines.length > 1 && (
                          <Tip text="Remover a linha"><Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label={`Remover a linha ${index + 1}`} onClick={() => set("lines", draft.lines.filter((l) => l.key !== line.key))}><Icon name="trash-2" className="w-4 h-4" /></Button></Tip>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!options?.items.length && <p className="text-xs text-muted-foreground">Nenhum item marcado como alugável. Marque "Alugável" na ficha do item em Estoque → Itens.</p>}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              {editable && reserved ? <Button type="button" variant="outline" size="sm" onClick={() => set("lines", [...draft.lines, emptyLine()])}><Icon name="plus" className="w-3 h-3 mr-1" /> Adicionar item</Button> : <span />}
              <p className="text-sm">Por {PERIOD_LABEL[draft.period]}: <span className="text-lg font-bold tabular-nums">{money(rental && !reserved ? rental.ratePerPeriod : total)}</span></p>
            </div>
            {reserved && <p className="mt-1 text-xs text-muted-foreground">Peça rastreada vai uma por linha. A peça pode ser escolhida agora (reserva) ou na entrega.</p>}
          </section>

          <section className="rounded-lg border p-4 grid gap-4">
            <button type="button" className="w-fit text-sm font-semibold inline-flex items-center gap-1 text-left" aria-expanded={details} onClick={() => setDetails((value) => !value)}>
              <Icon name={details ? "chevron-up" : "chevron-down"} className="w-4 h-4 shrink-0" /> Mais detalhes
              <span className="font-normal text-muted-foreground">(endereço, caução, responsável, condições, observações)</span>
            </button>
            {details && (<>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label htmlFor="responsibleName">Responsável no cliente</Label>
                <Input id="responsibleName" name="responsibleName" value={draft.responsibleName} maxLength={160} disabled={!editable} onValueChange={(_, value) => set("responsibleName", String(value))} className="mt-1" /></div>
              <div><Label className="text-sm">Caução</Label>
                <NumField kind="money" className="mt-1" value={draft.deposit} disabled={!editable} placeholder="Sem caução" ariaLabel="Caução" onChange={(value) => set("deposit", value)} onEmpty={() => set("deposit", null)} /></div>
            </div>
            <div><Label htmlFor="deliveryAddress">Endereço de entrega</Label>
              <Input id="deliveryAddress" name="deliveryAddress" value={draft.deliveryAddress} maxLength={300} disabled={!editable} onValueChange={(_, value) => set("deliveryAddress", String(value))} className="mt-1" /></div>
            <div><Label htmlFor="terms">Condições</Label>
              <Textarea id="terms" className="mt-1" rows={3} maxLength={5000} disabled={!editable} value={draft.terms} onChange={(event) => set("terms", event.target.value)} placeholder="Responsabilidade por avaria, limpeza, transporte..." /></div>
            <div><Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" className="mt-1" rows={2} maxLength={1000} disabled={!editable} value={draft.notes} onChange={(event) => set("notes", event.target.value)} /></div>
            </>)}
          </section>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {editable && (
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving || !dirty}>{saving ? "Salvando..." : isNew ? "Reservar" : "Salvar"}</Button>
              {isNew && <Button type="button" variant="outline" onClick={() => navigate({ to: "/suprimentos/locacoes" })}>Cancelar</Button>}
              {!isNew && dirty && <Button type="button" variant="outline" onClick={() => setDraft(draftOf(rental))}>Desfazer alterações</Button>}
            </div>
          )}
        </form>

        {rental && (
          <div className="grid gap-4">
            <section className="rounded-lg border p-4 text-sm grid gap-1">
              <h2 className="font-semibold">Andamento</h2>
              {rental.deliveredAt && <p><span className="text-muted-foreground">Entregue em</span> {dateBr(rental.deliveredAt)}</p>}
              {rental.returnedAt && <p><span className="text-muted-foreground">Devolvida em</span> {dateBr(rental.returnedAt)}</p>}
              <p><span className="text-muted-foreground">Faturado até</span> {rental.billedUntil ? dateBr(rental.billedUntil) : "nada ainda"}</p>
              {rental.periods && <p><span className="text-muted-foreground">Contratado</span> {rental.periods} {rental.periods === 1 ? PERIOD_LABEL[rental.period] : PERIOD_PLURAL[rental.period]}</p>}
              {rental.fromContract && !rental.expectedEnd && <p><span className="text-muted-foreground">Prazo</span> até devolver</p>}
              {!rental.fromContract && rental.nextPeriod && <p className="text-amber-700 dark:text-amber-300">Para faturar: {dateBr(rental.nextPeriod.start)} a {dateBr(rental.nextPeriod.end)}</p>}
              {!rental.fromContract && pendingCharges && <p className="text-amber-700 dark:text-amber-300">Há cobrança de avaria/falta sem faturar.</p>}
              {rental.fromContract && rental.openPeriod && <p><span className="text-muted-foreground">Período em curso</span> {dateBr(rental.openPeriod.start)} a {dateBr(rental.openPeriod.end)}</p>}
            </section>

            {rental.fromContract && (
              <section className="rounded-lg border p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold">A faturar</h2>
                  {rental.pending.length > 0 && <span className="font-semibold tabular-nums">{money(rental.pendingValue)}</span>}
                </div>
                {rental.pending.length === 0 ? <p className="mt-1 text-muted-foreground">Nada pendente agora.{rental.openPeriod ? ` O período em curso fecha em ${dateBr(rental.openPeriod.end)}.` : ""}</p> : (
                  <ul className="mt-2 divide-y">
                    {rental.pending.map((line, index) => (
                      <li key={index} className="py-1.5 flex items-center justify-between gap-3">
                        <span className="min-w-0">{line.description}</span>
                        <span className={cn("tabular-nums shrink-0", line.value < 0 && "text-green-700 dark:text-green-400")}>{money(line.value)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {rental.measurements.length > 0 && (
                  <>
                    <h3 className="mt-3 font-medium">Medições faturadas</h3>
                    <ul className="mt-1 divide-y">
                      {rental.measurements.map((m) => (
                        <li key={m.id} className="py-1.5 flex items-center justify-between gap-3">
                          <span className="min-w-0"><span className="font-medium tabular-nums">{m.label}</span><span className="text-xs text-muted-foreground"> · {m.periodStart ? `${dateBr(m.periodStart)} a ${dateBr(m.periodEnd)}` : ""}{m.invoiceNumber ? ` · NF ${m.invoiceNumber}` : ""}</span></span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className={cn("rounded px-1.5 py-0.5 text-xs", m.recordStatus === "received" ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300" : "bg-muted")}>{m.recordStatus === "received" ? "Recebida" : m.financialRecordId ? "Faturada" : "Sem valor"}</span>
                            <span className="tabular-nums">{money(m.value)}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            )}

            {rental.depositState && (
              <section className="rounded-lg border p-4 text-sm grid gap-1">
                <h2 className="font-semibold">Caução</h2>
                <p><span className="text-muted-foreground">Valor</span> <span className="tabular-nums">{money(rental.depositState.value)}</span> · {rental.depositState.received ? "recebida" : "aguardando o pagamento (Contas a Receber)"}</p>
                {rental.depositState.abated > 0 && <p><span className="text-muted-foreground">Abatida</span> <span className="tabular-nums">{money(rental.depositState.abated)}</span></p>}
                {rental.depositState.returned > 0 && <p><span className="text-muted-foreground">Devolvida ao cliente</span> <span className="tabular-nums">{money(rental.depositState.returned)}</span> (Contas a Pagar)</p>}
                <p className={rental.depositState.settled ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}>{rental.depositState.settled ? "Acertada." : status === "devolvida" ? `Falta acertar ${money(rental.depositState.left)}.` : "Acertada depois da devolução: cobre avarias e faltas, o resto volta ao cliente."}</p>
              </section>
            )}

            {rental.reminders.length > 0 && (
              <section className="rounded-lg border p-4 text-sm">
                <h2 className="font-semibold">Lembretes no acompanhamento</h2>
                <ul className="mt-2 grid gap-1.5">
                  {rental.reminders.map((reminder) => (
                    <li key={reminder.id} className="flex items-start gap-2"><Icon name="bell" className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" /><span><span className="tabular-nums text-xs text-muted-foreground">{dateBr(reminder.dueDate)}</span> · {reminder.subject}</span></li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-lg border p-4 text-sm">
              <h2 className="font-semibold">Cobranças</h2>
              {rental.charges.length === 0 ? <p className="mt-1 text-muted-foreground">Nenhuma cobrança ainda.</p> : (
                <ul className="mt-2 divide-y">
                  {rental.charges.map((charge) => (
                    <li key={charge.id} className="py-1.5 flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span>{CHARGE_LABEL[charge.kind] ?? charge.kind}</span>
                        <span className="text-xs text-muted-foreground"> · {charge.kind === "aluguel" && !rental.fromContract ? `${dateBr(charge.periodStart)} a ${dateBr(charge.periodEnd)}` : charge.description ?? dateBr(charge.periodStart)}</span>
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className={cn("rounded px-1.5 py-0.5 text-xs", !charge.financialRecordId && !charge.measurementId ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" : charge.recordStatus === "received" || charge.recordStatus === "confirmed" ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300" : "bg-muted")}>
                          {!charge.financialRecordId && !charge.measurementId ? "Sem faturar" : charge.recordStatus === "received" || charge.recordStatus === "confirmed" ? "Recebida" : "Faturada"}
                        </span>
                        <span className="tabular-nums">{money(charge.value)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-muted-foreground">As cobranças faturadas viram contas a receber em Financeiro → Contas a Receber.</p>
            </section>

            {rental.movements.length > 0 && (
              <section className="rounded-lg border p-4 text-sm">
                <h2 className="font-semibold">Movimentações do estoque</h2>
                <ul className="mt-2 divide-y">
                  {rental.movements.map((movement) => (
                    <li key={movement.id}>
                      <button type="button" className="w-full text-left py-1.5 flex flex-wrap items-center gap-x-2 hover:bg-muted/40" onClick={() => setOpened(movement.id)}>
                        <span className="tabular-nums text-xs text-muted-foreground">{dateBr(movement.date)}</span>
                        <span className="font-medium tabular-nums">{movement.number}</span>
                        <span>{movement.typeLabel}</span>
                        {movement.signedBy && <span className="text-xs text-muted-foreground">· recebido por {movement.signedBy}</span>}
                        {movement.reversed && <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">Estornada</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-lg border p-4 text-sm">
              <h2 className="font-semibold">Histórico</h2>
              <ul className="mt-2 grid gap-2">
                {rental.events.map((event) => (
                  <li key={event.id}>
                    <p>{EVENT_LABEL[event.type] ?? event.type}{event.to && event.type !== "criado" ? `: ${RENTAL_STATUS_LABEL[event.to]}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{new Date(event.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}{event.user ? ` · ${event.user}` : ""}{event.note ? ` · ${event.note}` : ""}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>

      {rental && dialog === "deliver" && <DeliverDialog rental={rental} onClose={() => setDialog(null)} onDone={apply} />}
      {rental && dialog === "return" && <ReturnDialog rental={rental} onClose={() => setDialog(null)} onDone={apply} />}
      {rental && dialog === "bill" && <BillDialog rental={rental} onClose={() => setDialog(null)} onDone={apply} />}
      {rental && dialog === "measure" && rental.contract && rental.customer && (
        <MeasurementBillDialog contract={{ id: rental.contract.id, number: rental.contract.number, customer: rental.customer }} rental={rental} lines={rental.pending}
          onClose={() => setDialog(null)} onDone={() => { queryClient.invalidateQueries({ queryKey: [RENTAL_KEYS.one, rentalId] }); queryClient.invalidateQueries({ queryKey: [RENTAL_KEYS.list] }); queryClient.invalidateQueries({ queryKey: ["commercialBilling"] }); }} />
      )}
      {rental && dialog === "deposit" && <DepositDialog rental={rental} onClose={() => setDialog(null)} onDone={apply} />}
      {rental && moving && <MoveDialog rental={rental} target={moving} label={moveLabel(moving)} onClose={() => setMoving(null)} onDone={apply} />}
      {opened && <MovementDetailDialog id={opened} onClose={() => setOpened(null)} />}
    </>
  );
}

type DialogProps = { rental: Rental; onClose: () => void; onDone: (rental: Rental) => void };

function DeliverDialog({ rental, onClose, onDone }: DialogProps) {
  const [chosenLocation, setLocationId] = useState("");
  const locationId = useLocationValue(chosenLocation);
  const [date, setDate] = useState(todayIso());
  const [receivedBy, setReceivedBy] = useState(rental.responsibleName ?? "");
  const [note, setNote] = useState("");
  const [units, setUnits] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const toPick = rental.lines.filter((line) => line.tracking === "unidade" && !line.unitId);
  const byQuantity = rental.lines.filter((line) => line.tracking !== "unidade");
  const { mutate, isPending } = useMutation({
    mutationFn: () => rentalsApi.post<Rental>(`${rental.id}/deliver`, {
      locationId: locationId ? Number(locationId) : null, date, receivedBy: receivedBy.trim(), note: note.trim() || null,
      units: Object.fromEntries(Object.entries(units).filter(([, unitId]) => unitId).map(([lineId, unitId]) => [lineId, Number(unitId)])),
    }),
    onSuccess: (result) => { onDone(result); toast({ title: `${result.number}: entregue ao cliente`, variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (byQuantity.length && !locationId) return setError("Escolha de qual local sai.");
    const missing = toPick.find((line) => !units[line.id]);
    if (missing) return setError(`Escolha a peça de ${missing.item}.`);
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Entregar ao cliente: {rental.number}</DialogTitle>
          <DialogDescription>O equipamento sai do estoque para a locação, e ela passa a "Ativa".</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Dia da entrega</Label>
              <CalendarPicker mode="single" name="deliverDate" className="mt-1 w-full" value={date} fromYear={2024} toYear={2040} onValueChange={(_, value) => setDate(String(value ?? "") || todayIso())} /></div>
            <div><Label htmlFor="receivedBy">Quem recebeu</Label>
              <Input id="receivedBy" name="receivedBy" value={receivedBy} maxLength={160} onValueChange={(_, value) => setReceivedBy(String(value))} className="mt-1" placeholder="Nome de quem recebeu no cliente" /></div>
          </div>
          {byQuantity.length > 0 && (
            <div className="sm:w-1/2"><LocationField label="Sai de" value={chosenLocation} onChange={setLocationId} />
              <p className="text-xs text-muted-foreground mt-1">Para os itens por quantidade ({byQuantity.map((line) => line.item).join(", ")}).</p></div>
          )}
          {rental.lines.filter((line) => line.unitId).map((line) => (
            <p key={line.id} className="text-sm"><span className="font-medium">{line.item}</span> · peça {line.tag} <span className="text-xs text-muted-foreground">({line.where ?? "—"})</span></p>
          ))}
          {toPick.map((line) => (
            <div key={line.id}><Label className="text-xs">Peça de {line.item} <span>*</span></Label>
              <UnitPicker name={`unit-${line.id}`} itemId={line.itemId} holderType="local" value={units[line.id] ?? ""} onChange={(value) => setUnits((current) => ({ ...current, [line.id]: value }))}
                exclude={Object.entries(units).filter(([key]) => Number(key) !== line.id).map(([, value]) => value)} /></div>
          ))}
          <div><Label htmlFor="deliverNote">Observação (opcional)</Label>
            <Textarea id="deliverNote" className="mt-1" rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Entregando..." : "Entregar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const CONDITIONS = [{ id: "ok", name: "Voltou em ordem" }, { id: "sujo", name: "Voltou sujo" }, { id: "avariado", name: "Voltou avariado" }, { id: "faltando", name: "Não voltou" }];
/** Condição em palavras (a API guarda ok, sujo, avariado, faltando). */
const CONDITION_LABEL: Record<string, string> = Object.fromEntries(CONDITIONS.map(({ id, name }) => [id, name]));
interface BackLine { quantity: number; condition: string; damageValue: number | null; note: string; include: boolean }

function ReturnDialog({ rental, onClose, onDone }: DialogProps) {
  const pendingOf = (line: Rental["lines"][number]) => Math.max(0, Math.round((line.deliveredQuantity - line.returnedQuantity) * 1000) / 1000);
  const open = rental.lines.filter((line) => pendingOf(line) > 0);
  const [chosenLocation, setLocationId] = useState("");
  const locationId = useLocationValue(chosenLocation);
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Record<number, BackLine>>(() => Object.fromEntries(open.map((line) => [line.id, { quantity: pendingOf(line), condition: "ok", damageValue: null, note: "", include: true }])));
  const [error, setError] = useState("");
  const setLine = (id: number, patch: Partial<BackLine>) => setLines((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  const chosen = open.filter((line) => lines[line.id].condition === "faltando" || lines[line.id].quantity > 0);
  const { mutate, isPending } = useMutation({
    mutationFn: () => rentalsApi.post<Rental>(`${rental.id}/return`, {
      locationId: Number(locationId), date, note: note.trim() || null,
      lines: chosen.map((line) => {
        const back = lines[line.id];
        return { lineId: line.id, quantity: line.unitId ? 1 : back.quantity, condition: back.condition, damageValue: back.damageValue, note: back.note.trim() || null };
      }),
    }),
    onSuccess: (result) => { onDone(result); toast({ title: result.status === "devolvida" ? `${result.number}: tudo devolvido` : `${result.number}: devolução registrada`, variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!locationId) return setError("Escolha para qual local volta.");
    if (!chosen.length) return setError("Informe o que voltou.");
    const over = chosen.find((line) => lines[line.id].quantity > pendingOf(line) + 0.0005);
    if (over) return setError(`${over.item}: voltou mais do que está com o cliente (${qty(pendingOf(over))}).`);
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receber de volta: {rental.number}</DialogTitle>
          <DialogDescription>Confira cada item. Avaria e falta viram cobrança (a falta, pelo valor de reposição do item, se você não informar outro). Peça avariada volta bloqueada.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid sm:grid-cols-2 gap-3">
            <LocationField label="Volta para" value={chosenLocation} onChange={setLocationId} />
            <div><Label>Dia da devolução</Label>
              <CalendarPicker mode="single" name="returnDate" className="mt-1 w-full" value={date} fromYear={2024} toYear={2040} onValueChange={(_, value) => setDate(String(value ?? "") || todayIso())} /></div>
          </div>
          <div className="rounded border divide-y">
            {open.map((line) => {
              const back = lines[line.id];
              const charged = back.condition === "avariado" || back.condition === "faltando";
              return (
                <div key={line.id} className="p-3 grid gap-2 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">{line.item}{line.tag ? ` · peça ${line.tag}` : ""}</p>
                    <p className="text-xs text-muted-foreground">com o cliente: {qty(pendingOf(line))} {line.unit}</p>
                  </div>
                  <div className="grid sm:grid-cols-12 gap-2 items-end">
                    <div className="sm:col-span-3">
                      <Label className="text-xs">Voltou</Label>
                      {line.unitId ? <p className="text-xs text-muted-foreground pb-2.5">{back.condition === "faltando" ? "não voltou" : "1 peça"}</p> : (
                        <NumField value={back.condition === "faltando" ? 0 : back.quantity} digits={3} suffix={line.unit} disabled={back.condition === "faltando"} ariaLabel={`Quantidade que voltou de ${line.item}`} onChange={(value) => setLine(line.id, { quantity: value })} />
                      )}
                    </div>
                    <div className="sm:col-span-3">
                      <Label className="text-xs">Condição</Label>
                      <Select name={`condition-${line.id}`} options={CONDITIONS} state={back.condition} modal onChange={(_, value) => setLine(line.id, { condition: String(value || "ok") })} />
                    </div>
                    {charged && (
                      <div className="sm:col-span-3">
                        <Label className="text-xs">Valor a cobrar</Label>
                        <NumField kind="money" value={back.damageValue} placeholder={back.condition === "faltando" && line.replacementValue ? `reposição ${money(line.replacementValue)}` : "Opcional"} ariaLabel={`Valor da avaria de ${line.item}`}
                          onChange={(value) => setLine(line.id, { damageValue: value })} onEmpty={() => setLine(line.id, { damageValue: null })} />
                      </div>
                    )}
                    <div className={charged ? "sm:col-span-3" : "sm:col-span-6"}>
                      <Label className="text-xs">Observação</Label>
                      <Input name={`note-${line.id}`} value={back.note} maxLength={200} onValueChange={(_, value) => setLine(line.id, { note: String(value) })} placeholder="Opcional" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div><Label htmlFor="returnNote">Observação geral (opcional)</Label>
            <Textarea id="returnNote" className="mt-1" rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Registrando..." : "Registrar a devolução"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const plusDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function BillDialog({ rental, onClose, onDone }: DialogProps) {
  const queryClient = useQueryClient();
  const [dueDate, setDueDate] = useState(plusDays(7));
  const [paymentMethod, setPaymentMethod] = useState("boleto");
  const [error, setError] = useState("");
  const pending = rental.charges.filter((charge) => !charge.financialRecordId && charge.kind !== "aluguel");
  const { mutate, isPending } = useMutation({
    mutationFn: () => rentalsApi.post<{ created: number; rental: Rental }>(`${rental.id}/bill`, { dueDate, paymentMethod }),
    onSuccess: (result) => {
      onDone(result.rental);
      queryClient.invalidateQueries({ queryKey: ["listContas a Receber"] });
      toast({ title: `${result.created} conta(s) a receber gerada(s)`, variant: "success" }); onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Faturar: {rental.number}</DialogTitle>
          <DialogDescription>Gera as contas a receber do cliente {rental.customer?.name ?? ""}.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); setError(""); mutate(); }}>
          <ul className="text-sm grid gap-1">
            {rental.nextPeriod && <li>Aluguel de {dateBr(rental.nextPeriod.start)} a {dateBr(rental.nextPeriod.end)} ({money(rental.ratePerPeriod)} por {PERIOD_LABEL[rental.period]}; período incompleto é proporcional)</li>}
            {pending.map((charge) => <li key={charge.id}>{CHARGE_LABEL[charge.kind] ?? charge.kind}: {charge.description ?? ""} · <span className="tabular-nums">{money(charge.value)}</span></li>)}
          </ul>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Vencimento</Label>
              <CalendarPicker mode="single" name="dueDate" className="mt-1 w-full" value={dueDate} fromYear={2024} toYear={2040} onValueChange={(_, value) => setDueDate(String(value ?? "") || plusDays(7))} /></div>
            <div><Label>Forma de pagamento</Label>
              <Select name="paymentMethod" options={paymentMethodOptions} state={paymentMethod} modal onChange={(_, value) => setPaymentMethod(String(value || "boleto"))} /></div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Faturando..." : "Faturar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MoveDialog({ rental, target, label, onClose, onDone }: DialogProps & { target: RentalStatus; label: string }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const needsReason = target === "cancelada";
  const { mutate, isPending } = useMutation({
    mutationFn: () => rentalsApi.patch<Rental>(`${rental.id}/status`, { status: target, note: note.trim() }),
    onSuccess: (result) => { onDone(result); toast({ title: `${result.number}: ${result.statusLabel.toLowerCase()}`, variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const description = target === "cancelada" ? "A reserva é desfeita e as peças ficam livres para outras locações."
    : target === "encerrada" ? "Só encerra com tudo devolvido e cobrado (períodos e avarias faturados)."
      : `A locação volta para "${RENTAL_STATUS_LABEL[target]}".`;
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{label}: {rental.number}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => {
          event.preventDefault();
          if (needsReason && !note.trim()) return setError("Informe o motivo do cancelamento.");
          setError(""); mutate();
        }}>
          <div><Label htmlFor="moveNote">{needsReason ? "Motivo" : "Observação (opcional)"}{needsReason && <span> *</span>}</Label>
            <Textarea id="moveNote" className="mt-1" rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : label}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Acertar a caução: primeiro cobre avarias e faltas; o resto volta ao cliente ou abate a última fatura. */
function DepositDialog({ rental, onClose, onDone }: DialogProps) {
  const deposit = rental.depositState!;
  const damages = rental.pending.filter((line) => line.kind === "avaria" || line.kind === "falta").reduce((sum, line) => sum + line.value, 0);
  const covered = Math.min(deposit.left, damages);
  const left = Math.round((deposit.left - covered) * 100) / 100;
  const others = rental.pending.filter((line) => line.kind !== "avaria" && line.kind !== "falta").reduce((sum, line) => sum + line.value, 0);
  const [mode, setMode] = useState<"devolver" | "abater">("devolver");
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => rentalsApi.post<Rental>(`${rental.id}/deposit`, { mode }),
    onSuccess: (result) => { onDone(result); toast({ title: "Caução acertada", description: mode === "devolver" && left > 0 ? "A devolução ao cliente entrou em Contas a Pagar." : undefined, variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Acertar a caução: {rental.number}</DialogTitle>
          <DialogDescription>Caução de {money(deposit.value)}{deposit.received ? " (recebida)" : " (ainda não recebida: confira em Contas a Receber)"}.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); setError(""); mutate(); }}>
          <ul className="text-sm grid gap-1">
            <li>Cobre as avarias e faltas: <b className="tabular-nums">{money(covered)}</b> (entra na próxima medição como abatimento)</li>
            <li>Sobra: <b className="tabular-nums">{money(left)}</b></li>
          </ul>
          {left > 0 && (
            <div><Label>O que fazer com a sobra</Label>
              <div className="mt-1"><Select name="depositMode" modal state={mode} onChange={(_, value) => setMode(value === "abater" ? "abater" : "devolver")}
                options={[{ id: "devolver", name: "Devolver ao cliente (conta a pagar)" }, ...(others >= left ? [{ id: "abater", name: "Abater da última fatura" }] : [])]} /></div>
              {others < left && <p className="text-xs text-muted-foreground mt-1">Não há fatura pendente que comporte o abatimento: a sobra volta ao cliente.</p>}
            </div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Acertando..." : "Acertar a caução"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
